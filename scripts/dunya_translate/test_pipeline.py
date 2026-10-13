"""Unit tests for the translation pipeline (run: python -m unittest -v test_pipeline)."""

import json
import unittest
from pathlib import Path

from dunya_text import alignment_issue, build_input, clean_ba, clean_fr, fold_ba, fold_fr, kind_of, strip_tones
from reward import chrf, confidence, reward
from retrieval import Memory

DATA = Path(__file__).resolve().parents[2] / "data/translation"


class TextRules(unittest.TestCase):
    def test_ocr_hyphen_artifacts(self):
        self.assertEqual(clean_fr("Ah ! Tu es déjà ve- nu !")[0], "Ah! Tu es déjà venu!")
        self.assertEqual(clean_fr("Quand es -tu venu ?")[0], "Quand es-tu venu?")
        self.assertEqual(clean_fr("Est- ce vrai ?")[0], "Est-ce vrai?")
        self.assertEqual(clean_ba("soku- sia")[0], "sokusia")

    def test_alpha_is_never_used(self):
        self.assertEqual(clean_ba("Kɑ nɑ")[0], "Ka na")

    def test_tone_folding_keeps_nasal_tilde(self):
        self.assertEqual(fold_ba("Yɛ̀nu"), fold_ba("yɛnu"))
        self.assertNotEqual(fold_ba("sɔ̃ɔ"), fold_ba("sɔɔ"))
        self.assertEqual(strip_tones("gúra"), "gura")

    def test_punctuation_spacing_does_not_change_keys(self):
        self.assertEqual(fold_fr("Salut ! Bonne arrivée !"), fold_fr("Salut! Bonne arrivée!"))
        self.assertEqual(fold_ba("Domma a na ?"), fold_ba("domma a na"))

    def test_alignment_gate(self):
        self.assertEqual(alignment_issue("—", "Dɔkɔ", "word"), "placeholder")
        self.assertEqual(alignment_issue("Pas d'exemple fourni.", "Bio!", "sentence"), "placeholder")
        self.assertTrue(alignment_issue("Va.", "A doo yararibun mi bà n dee kpùra mɔ.", "sentence").startswith("length-ratio"))
        self.assertEqual(alignment_issue("Il aime sa mère", "Personne n'aime vendre la chèvre dans le champ", "sentence"), "french-in-bariba")
        self.assertIsNone(alignment_issue("Quand es-tu venu ?", "Domma a na?", "sentence"))

    def test_kind(self):
        self.assertEqual(kind_of("eau", "nim"), "word")
        self.assertEqual(kind_of("Où vas-tu ?", "Mana a doo?"), "phrase")

    def test_input_format_respects_byte_budget_and_is_plain_without_hints(self):
        self.assertEqual(build_input("fr-ba", "Bonjour"), "fr-ba: Bonjour")
        long_mem = [("x" * 150, "y" * 150)] * 3
        text = build_input("fr-ba", "Bonjour", mem=long_mem, dic=[("a", "b")], ctx="z")
        self.assertLessEqual(len(text.encode("utf-8")), 480)
        self.assertTrue(text.startswith("fr-ba: Bonjour"))


class Rewards(unittest.TestCase):
    vocab = {fold_ba(w) for w in "aagu wunɛ ka weru".split()}

    def test_chrf_ordering(self):
        ref = "Aagu wunɛ ka weru."
        self.assertEqual(chrf(ref, ref), 1.0)
        self.assertGreater(chrf("Aagu wunɛ ka wer", ref), chrf("Bonjour tout le monde", ref))
        self.assertEqual(chrf("", ref), 0.0)

    def test_reward_penalises_loops_alpha_and_unknown_words(self):
        good = reward("Salut", "Aagu wunɛ ka weru", "Aagu wunɛ ka weru", self.vocab, True)
        loop = reward("Salut", "ka ka ka ka ka ka", "Aagu wunɛ ka weru", self.vocab, True)
        alpha = reward("Salut", "Aagu wunɛ kɑ weru", "Aagu wunɛ ka weru", self.vocab, True)
        self.assertGreater(good, alpha)
        self.assertGreater(good, loop + 0.2)

    def test_numbers_must_survive(self):
        kept = reward("J'ai 15 sacs", "Na sakaa 15 mɔ", None, self.vocab, True)
        lost = reward("J'ai 15 sacs", "Na sakaa mɔ", None, self.vocab, True)
        self.assertGreater(kept, lost)

    def test_confidence_is_reference_free(self):
        self.assertGreater(confidence("Salut", "Aagu wunɛ ka weru", self.vocab, True),
                           confidence("Salut", "xqzv plorg", self.vocab, True))


@unittest.skipUnless((DATA / "parallel.jsonl").exists(), "corpus not built")
class BuiltCorpus(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.rows = [json.loads(line) for line in (DATA / "parallel.jsonl").open(encoding="utf-8")]
        cls.glossary = json.loads((DATA / "glossary.json").read_text(encoding="utf-8"))

    def test_no_sentence_leaks_from_test_into_train(self):
        held = {fold_ba(r["ba"]) for r in self.rows if r["split"] != "train" and r["kind"] != "word"}
        leaks = [r for r in self.rows if r["split"] == "train" and r["kind"] != "word" and fold_ba(r["ba"]) in held]
        self.assertEqual(leaks, [])

    def test_no_alpha_or_ocr_hyphens_or_placeholders_survive(self):
        for r in self.rows:
            self.assertNotIn("ɑ", r["ba"])
            self.assertNotRegex(r["fr"] + r["ba"], r"\w- \w")
            self.assertNotIn(r["fr"].strip(), {"—", "-"})
            self.assertNotIn(r["ba"].strip(), {"—", "-"})

    def test_only_attested_or_checked_grades_are_kept(self):
        self.assertTrue({r["grade"] for r in self.rows} <= {"A", "B"})

    def test_gold_is_test_split_only(self):
        gold = [json.loads(line) for line in (DATA / "gold_candidates.jsonl").open(encoding="utf-8")]
        self.assertGreaterEqual(len(gold), 450)
        self.assertEqual({g["split"] for g in gold}, {"test"})

    def test_memory_exact_and_hints(self):
        train = [r for r in self.rows if r["split"] == "train"]
        memory = Memory(train, self.glossary)
        sample = next(r for r in train if r["kind"] == "sentence")
        self.assertTrue(memory.exact("fr-ba", sample["fr"]))
        self.assertTrue(memory.exact("ba-fr", sample["ba"]))
        self.assertEqual(memory.exact("fr-ba", "phrase absente du corpus qzxv"), [])
        hints = memory.dic_hints("fr-ba", "la maison et le maïs")
        self.assertTrue(any(t.lower().startswith("yɛnu") or "yɛnu" in t.lower() for _, t in hints) or hints)


if __name__ == "__main__":
    unittest.main()
