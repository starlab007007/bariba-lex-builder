package com.fitila.bariba;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Embedded Bariba dictionary loaded from assets/bariba_dictionary.json.
 * Source: ONLY the existing src/data/raw-dictionary.json (examples + entries).
 *
 * Provides:
 *  - bilingual prediction (prefix + previous-word bigram)
 *  - quick translation (Bariba ↔ French) via local lookup
 *  - quick phrases list (from dictionary examples)
 */
public final class BaribaDictionary {

    private static final String TAG = "BaribaDictionary";
    private static volatile BaribaDictionary INSTANCE;

    public static class Entry {
        public final String ba;   // Bariba (NFC)
        public final String fr;   // French short def
        public final int freq;
        Entry(String ba, String fr, int freq) { this.ba = ba; this.fr = fr; this.freq = freq; }
    }

    public static class Phrase {
        public final String ba;
        public final String fr;
        Phrase(String ba, String fr) { this.ba = ba; this.fr = fr; }
    }

    private final List<Entry> entries = new ArrayList<>();
    private final Map<String, Entry> byBa = new HashMap<>();        // lowercase ba -> entry
    private final Map<String, String> frToBa = new HashMap<>();     // lowercase fr first-token -> ba
    private final Map<String, List<String>> bigrams = new HashMap<>();
    private final List<Phrase> phrases = new ArrayList<>();

    public static BaribaDictionary get(Context ctx) {
        if (INSTANCE == null) {
            synchronized (BaribaDictionary.class) {
                if (INSTANCE == null) INSTANCE = new BaribaDictionary(ctx.getApplicationContext());
            }
        }
        return INSTANCE;
    }

    private BaribaDictionary(Context ctx) {
        try {
            InputStream is = ctx.getAssets().open("bariba_dictionary.json");
            BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            br.close();
            JSONObject root = new JSONObject(sb.toString());
            JSONArray arr = root.optJSONArray("entries");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject o = arr.optJSONObject(i);
                    if (o == null) continue;
                    String ba = nfc(o.optString("ba", ""));
                    String fr = nfc(o.optString("fr", ""));
                    if (ba.isEmpty() || fr.isEmpty()) continue;
                    Entry e = new Entry(ba, fr, o.optInt("freq", 1));
                    entries.add(e);
                    byBa.put(ba.toLowerCase(), e);
                    String firstFr = fr.split("[\\s,;.]+")[0].toLowerCase();
                    if (firstFr.length() >= 2 && !frToBa.containsKey(firstFr)) {
                        frToBa.put(firstFr, ba);
                    }
                }
            }
            JSONObject bg = root.optJSONObject("bigrams");
            if (bg != null) {
                Iterator<String> it = bg.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    JSONArray nx = bg.optJSONArray(k);
                    if (nx == null) continue;
                    List<String> list = new ArrayList<>(nx.length());
                    for (int i = 0; i < nx.length(); i++) list.add(nx.optString(i, ""));
                    bigrams.put(k.toLowerCase(), list);
                }
            }
            JSONArray ph = root.optJSONArray("phrases");
            if (ph != null) {
                for (int i = 0; i < ph.length(); i++) {
                    JSONObject o = ph.optJSONObject(i);
                    if (o == null) continue;
                    String ba = nfc(o.optString("ba", ""));
                    String fr = nfc(o.optString("fr", ""));
                    if (!ba.isEmpty() && !fr.isEmpty()) phrases.add(new Phrase(ba, fr));
                }
            }
            Log.i(TAG, "loaded entries=" + entries.size() + " bigrams=" + bigrams.size()
                    + " phrases=" + phrases.size());
        } catch (Throwable t) {
            Log.e(TAG, "failed to load asset", t);
        }
    }

    /** Predict up to N suggestions, prioritising bigram > prefix > corpus freq. */
    public List<Entry> predict(String prefix, String previousWord, int max) {
        List<Entry> out = new ArrayList<>();
        java.util.Set<String> seen = new java.util.HashSet<>();
        String pfx = prefix == null ? "" : nfc(prefix).toLowerCase();
        String prev = previousWord == null ? "" : nfc(previousWord).toLowerCase();

        // 1) bigram successors of previous word, filtered by prefix
        if (!prev.isEmpty()) {
            List<String> succ = bigrams.get(prev);
            if (succ != null) {
                for (String w : succ) {
                    String wl = w.toLowerCase();
                    if (!pfx.isEmpty() && !wl.startsWith(pfx)) continue;
                    Entry e = byBa.get(wl);
                    if (e != null && seen.add(wl)) {
                        out.add(e);
                        if (out.size() >= max) return out;
                    }
                }
            }
        }
        // 2) prefix matches by frequency
        if (!pfx.isEmpty()) {
            List<Entry> matches = new ArrayList<>();
            for (Entry e : entries) {
                if (e.ba.toLowerCase().startsWith(pfx)) matches.add(e);
                if (matches.size() > 60) break;
            }
            java.util.Collections.sort(matches, (a, b) -> b.freq - a.freq);
            for (Entry e : matches) {
                if (seen.add(e.ba.toLowerCase())) {
                    out.add(e);
                    if (out.size() >= max) return out;
                }
            }
        }
        return out;
    }

    /** Local Bariba→French lookup. Returns null if unknown. */
    public String translateBaToFr(String word) {
        if (word == null) return null;
        Entry e = byBa.get(nfc(word).toLowerCase());
        return e == null ? null : e.fr;
    }

    /** Local French→Bariba lookup (first-token match). Returns null if unknown. */
    public String translateFrToBa(String word) {
        if (word == null) return null;
        return frToBa.get(nfc(word).toLowerCase());
    }

    public List<Phrase> phrases() { return phrases; }

    private static String nfc(String s) {
        return s == null ? "" : Normalizer.normalize(s, Normalizer.Form.NFC).trim();
    }
}