#!/usr/bin/env python3
"""Audit de production : traducteur FR<->Baatɔnum et chaîne vocale DUNYA, par vrais appels.

  A. phrases attestées (jeu d'or)          -> doivent revenir mot pour mot (mémoire)
  B. deux phrases attestées enchaînées      -> le serveur doit les découper et rester exact
  C. phrases nouvelles du quotidien         -> sortie ByT5, couverture lexicale, aller-retour
  D. DUNYA : question -> fitila-ia-chat (FR) -> bariba phrase par phrase -> bariba-tts -> bariba-stt

Écrit audit.json et audit.md dans --out. Aucune clé secrète : clé publique du site seulement.
"""
from __future__ import annotations

import argparse
import base64
import json
import random
import time
import urllib.error
import urllib.request
from pathlib import Path

from dunya_text import fold_ba, fold_fr, split_sentences
from reward import chrf

URL = "https://dvswhjawiooprghzeyol.supabase.co/functions/v1/"
KEY = "sb_publishable_Rs6ysvbwQ0oGpHuYulZ5Hw_loUqyGKw"

NOVEL_FR = [
    "Bonjour, comment va ta famille ?",
    "Je vais au marché acheter du maïs.",
    "L'enfant a de la fièvre depuis hier soir.",
    "Il faut semer avant la grande pluie.",
    "Où se trouve le centre de santé ?",
    "Merci beaucoup pour ton aide.",
    "Nous allons manger ensemble ce soir.",
    "Le prix de l'igname a augmenté cette année.",
]
QUESTIONS = [
    "Comment protéger mes enfants du paludisme ?",
    "Quand faut-il semer le maïs dans le Borgou ?",
    "Donne-moi un conseil pour bien conserver les ignames.",
]


def call(fn: str, body: dict, timeout: int = 60) -> tuple[int, dict]:
    req = urllib.request.Request(
        URL + fn,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "apikey": KEY, "Authorization": f"Bearer {KEY}"},
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = json.loads(r.read().decode() or "{}")
            status = r.status
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            data = json.loads(e.read().decode() or "{}")
        except Exception:
            data = {}
    except Exception as e:  # timeout, network
        status, data = 0, {"error": str(e)}
    data["_ms"] = int((time.time() - t0) * 1000)
    return status, data


def translate(text: str, direction: str) -> tuple[int, dict]:
    src, tgt = ("french", "bariba") if direction == "fr-ba" else ("bariba", "french")
    return call("byt5-bariba-translate", {"text": text, "sourceLang": src, "targetLang": tgt})


def same(a: str, b: str, direction: str) -> bool:
    f = fold_ba if direction == "fr-ba" else fold_fr
    return f(a) == f(b)


def main() -> None:
    root = Path(__file__).resolve().parents[2] / "data/translation"
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="audit")
    ap.add_argument("--n", type=int, default=12)
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    random.seed(13)
    gold = [json.loads(l) for l in (root / "gold_candidates.jsonl").open(encoding="utf-8")]
    gold = [g for g in gold if 12 < len(g["fr"]) < 90 and ":" not in g["fr"]]
    random.shuffle(gold)
    report: dict = {"A": [], "B": [], "C": [], "D": []}

    for g in gold[: args.n]:
        for d, src, ref in (("fr-ba", g["fr"], g["ba"]), ("ba-fr", g["ba"], g["fr"])):
            st, r = translate(src, d)
            hyp = r.get("translation", "")
            report["A"].append({"dir": d, "src": src, "ref": ref, "hyp": hyp, "status": st, "method": r.get("method"),
                                "confidence": r.get("confidence"), "exact": same(hyp, ref, d), "ms": r["_ms"]})

    rest = gold[args.n:]
    for i in range(args.n // 2):
        a, b = rest[2 * i], rest[2 * i + 1]
        for d, src, ref in (("fr-ba", f"{a['fr'].rstrip()} {b['fr']}", f"{a['ba'].rstrip()} {b['ba']}"),
                            ("ba-fr", f"{a['ba'].rstrip()} {b['ba']}", f"{a['fr'].rstrip()} {b['fr']}")):
            st, r = translate(src, d)
            hyp = r.get("translation", "")
            report["B"].append({"dir": d, "src": src, "ref": ref, "hyp": hyp, "status": st, "method": r.get("method"),
                                "confidence": r.get("confidence"), "chrf": round(chrf(hyp, ref), 3), "ms": r["_ms"]})

    for fr in NOVEL_FR:
        st, r = translate(fr, "fr-ba")
        ba = r.get("translation", "")
        st2, back = translate(ba, "ba-fr") if ba else (0, {})
        report["C"].append({"fr": fr, "ba": ba, "status": st, "method": r.get("method"), "confidence": r.get("confidence"),
                            "back": back.get("translation", ""), "roundtrip_chrf": round(chrf(back.get("translation", ""), fr), 3),
                            "ms": r["_ms"]})

    for q in QUESTIONS:
        st, r = call("fitila-ia-chat", {"message": q, "history": [], "temperature": 0.4, "max_tokens": 200,
                                        "systemPrompt": "Réponds comme à l'oral : une à quatre phrases courtes. "
                                                        "Ta réponse sera traduite en baatɔnum : phrases très courtes et simples."})
        fr = r.get("response_fr", "") or ""
        row = {"question": q, "chat_status": st, "chat_error": r.get("error") or r.get("message") or r.get("msg"),
               "fr": fr, "ba_server": r.get("response_ba"), "sentences": [], "chat_ms": r["_ms"]}
        for s in split_sentences(fr)[:4]:
            _, t = translate(s, "fr-ba")
            row["sentences"].append({"fr": s, "ba": t.get("translation", ""), "method": t.get("method"),
                                     "confidence": t.get("confidence")})
        report["D"].append(row)

    # Voice: speak one Baatɔnum sentence, then listen to it again.
    probe = report["A"][0]["ref"] if report["A"] and report["A"][0]["dir"] == "fr-ba" else "A kua"
    st, tts = call("bariba-tts", {"text": probe, "skipRefine": True}, timeout=90)
    voice = {"text": probe, "tts_status": st, "tts_keys": sorted(k for k in tts if not k.startswith("_")),
             "audio_url": tts.get("audio_url") or tts.get("audioUrl"), "tts_ms": tts["_ms"]}
    audio_b64 = tts.get("audio_base64") or tts.get("audioContent")
    if not audio_b64 and voice["audio_url"]:
        try:
            with urllib.request.urlopen(voice["audio_url"], timeout=60) as r:
                audio_b64 = base64.b64encode(r.read()).decode()
        except Exception as e:
            voice["download_error"] = str(e)
    if audio_b64:
        st, stt = call("bariba-stt", {"audio": "data:audio/wav;base64," + audio_b64, "robustMode": True}, timeout=120)
        heard = stt.get("transcription") or stt.get("text") or ""
        voice.update({"stt_status": st, "heard": heard, "stt_chrf": round(chrf(heard, probe), 3), "stt_ms": stt["_ms"],
                      "stt_error": stt.get("error")})
    report["voice"] = voice

    def mean(xs):
        xs = [x for x in xs if x is not None]
        return round(sum(xs) / len(xs), 3) if xs else None

    summary = {
        "A_exact_rate": mean([1.0 if r["exact"] else 0.0 for r in report["A"]]),
        "A_methods": sorted({str(r["method"]) for r in report["A"]}),
        "B_chrf_fr_ba": mean([r["chrf"] for r in report["B"] if r["dir"] == "fr-ba"]),
        "B_chrf_ba_fr": mean([r["chrf"] for r in report["B"] if r["dir"] == "ba-fr"]),
        "B_methods": sorted({str(r["method"]) for r in report["B"]}),
        "C_roundtrip_chrf": mean([r["roundtrip_chrf"] for r in report["C"]]),
        "D_chat_ok": sum(1 for r in report["D"] if r["fr"]),
        "voice_tts_status": voice.get("tts_status"),
        "voice_stt_chrf": voice.get("stt_chrf"),
    }
    report["summary"] = summary
    (out / "audit.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    md = ["# Audit de production FITILA", "", "```json", json.dumps(summary, ensure_ascii=False, indent=1), "```", ""]
    for r in report["B"]:
        md.append(f"- B {r['dir']} chrF {r['chrf']} [{r['method']}]\n  - src: {r['src']}\n  - ref: {r['ref']}\n  - hyp: {r['hyp']}")
    for r in report["C"]:
        md.append(f"- C {r['fr']} → {r['ba']} → {r['back']} [{r['method']} {r['confidence']}]")
    for r in report["D"]:
        md.append(f"- D {r['question']} (chat {r['chat_status']} {r['chat_error'] or ''})\n  - FR: {r['fr']}")
        for s in r["sentences"]:
            md.append(f"  - {s['fr']} → {s['ba']} [{s['method']} {s['confidence']}]")
    md.append(f"- Voix : {json.dumps(voice, ensure_ascii=False)[:600]}")
    (out / "audit.md").write_text("\n".join(md), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
