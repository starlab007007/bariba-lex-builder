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
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

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
        private final String typedWord;
        private final String foldedWord;
        private final int homographNumber;
        Entry(String ba, String fr, int freq) {
            this.ba = ba;
            this.fr = fr;
            this.freq = freq;
            // Normalize only once at dictionary load, never on the UI's key path.
            String word = ba.replaceFirst("(?<=\\p{L})[1-9]$", "");
            this.typedWord = word;
            this.foldedWord = word.toLowerCase(Locale.ROOT);
            this.homographNumber = word.length() < ba.length()
                    ? Character.digit(ba.charAt(ba.length() - 1), 10) : 0;
        }

        /** Lexicographic indexes (sia1/sia2) must not be typed as letters. */
        public String keyboardWord() { return typedWord; }
        String foldedWord() { return foldedWord; }
        int homographIndex() { return homographNumber; }
    }

    /**
     * Candidate displayed inside the Android system keyboard: first line is a
     * word in the detected source language, second line its dictionary meaning
     * in the opposite language. No network translation is used while typing.
     */
    public static final class Suggestion {
        public final String word;
        public final String translation;
        public final String sourceLanguage; // "ba" or "fr"
        public final int frequency;
        Suggestion(String word, String translation, String sourceLanguage, int frequency) {
            this.word = word;
            this.translation = translation;
            this.sourceLanguage = sourceLanguage;
            this.frequency = frequency;
        }
    }

    public static final class Prediction {
        public final String detectedLanguage; // "ba", "fr", "ambiguous", "unknown"
        public final List<Suggestion> suggestions;
        Prediction(String language, List<Suggestion> suggestions) {
            this.detectedLanguage = language;
            this.suggestions = suggestions;
        }
    }

    public static class Phrase {
        public final String ba;
        public final String fr;
        Phrase(String ba, String fr) { this.ba = ba; this.fr = fr; }
    }

    private final List<Entry> entries = new ArrayList<>();
    private final Map<String, Entry> byBa = new HashMap<>();        // lowercase ba -> entry
    private final Map<String, Entry> frenchHeadwords = new HashMap<>(); // verified complete FR dictionary headwords
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
                    String rawKey = ba.toLowerCase(Locale.ROOT);
                    byBa.put(rawKey, e);
                    String typedKey = e.foldedWord();
                    Entry old = byBa.get(typedKey);
                    if (old == null || (e.homographIndex() > 0
                            && old.homographIndex() > e.homographIndex())) {
                        byBa.put(typedKey, e);
                    }
                    // A reverse suggestion must correspond to a real complete
                    // French headword. Never invent an equivalent from an arbitrary
                    // French sentence fragment or a partial gloss.
                    String head = frenchHeadword(fr);
                    if (!head.isEmpty()) {
                        Entry previous = frenchHeadwords.get(head);
                        if (previous == null || preferFrenchEquivalent(e, previous)) {
                            frenchHeadwords.put(head, e);
                        }
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
                    bigrams.put(k.toLowerCase(Locale.ROOT), list);
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

    /**
     * Predict using embedded bilingual entries. Exact keyboard spellings come
     * first, then contextual bigrams, then frequency-ranked prefix matches.
     * Homograph labels like "sia1" are shown and inserted as "sia"; one
     * candidate per written word prevents redundant suggestions.
     */
    public List<Entry> predict(String prefix, String previousWord, int max) {
        List<Entry> out = new ArrayList<>();
        if (max <= 0) return out;
        java.util.Set<String> seen = new java.util.HashSet<>();
        String pfx = prefix == null ? "" : nfc(prefix).toLowerCase(Locale.ROOT);
        String prev = previousWord == null ? "" : nfc(previousWord).toLowerCase(Locale.ROOT);

        // Exact spelling: a learner typing "sia" must see "sia (demain)"
        // rather than losing it behind the more frequent "siara / siasia".
        if (!pfx.isEmpty()) {
            Entry exact = byBa.get(pfx);
            if (exact != null && exact.keyboardWord().equalsIgnoreCase(pfx)) {
                seen.add(pfx);
                out.add(exact);
                if (out.size() >= max) return out;
            }
        }

        if (!prev.isEmpty()) {
            List<String> successors = bigrams.get(prev);
            if (successors != null) {
                for (String next : successors) {
                    Entry e = byBa.get(nfc(next).toLowerCase(Locale.ROOT));
                    if (e == null) continue;
                    String typed = e.foldedWord();
                    if (!pfx.isEmpty() && !typed.startsWith(pfx)) continue;
                    if (seen.add(typed)) {
                        out.add(e);
                        if (out.size() >= max) return out;
                    }
                }
            }
        }

        if (!pfx.isEmpty()) {
            List<Entry> matches = new ArrayList<>();
            for (Entry e : entries) {
                if (e.foldedWord().startsWith(pfx)) {
                    matches.add(e);
                }
            }
            java.util.Collections.sort(matches, (a, b) -> {
                String aa = a.foldedWord();
                String bb = b.foldedWord();
                int frequency = Integer.compare(b.freq, a.freq);
                if (aa.equals(bb)) {
                    int sense = Integer.compare(a.homographIndex(), b.homographIndex());
                    if (sense != 0) return sense;
                }
                return frequency;
            });
            for (Entry e : matches) {
                String typed = e.foldedWord();
                if (seen.add(typed)) {
                    out.add(e);
                    if (out.size() >= max) return out;
                }
            }
        }
        return out;
    }


    private static boolean preferFrenchEquivalent(Entry candidate, Entry existing) {
        // Avoid showing an unnecessarily long BA example or editorial comment
        // when a canonical dictionary word is also available.
        boolean candidateSimple = candidate.keyboardWord().matches("[\\p{L}\\p{M}\\d'’-]+");
        boolean existingSimple = existing.keyboardWord().matches("[\\p{L}\\p{M}\\d'’-]+");
        if (candidateSimple != existingSimple) return candidateSimple;
        return candidate.freq > existing.freq;
    }

    /**
     * Extract a dictionary headword only, not a sentence. Parenthetical
     * grammatical qualifiers and alternative comma-separated glosses are
     * accepted; multi-word definitions are not converted into one-word
     * translations. This keeps the keyboard conservative on noisy corpora.
     */
    static String frenchHeadword(String definition) {
        if (definition == null) return "";
        String firstSense = nfc(definition).split("[,;(:/]", 2)[0]
                .trim().toLowerCase(Locale.ROOT);
        if (firstSense.length() < 3 || firstSense.length() > 32
                || !firstSense.matches("[\\p{L}\\p{M}][\\p{L}\\p{M}'’-]*")) {
            return "";
        }
        // Very frequent grammatical filler words yield misleading inverse pairs.
        if ("avec".equals(firstSense) || "pour".equals(firstSense)
                || "dans".equals(firstSense) || "sans".equals(firstSense)
                || "chez".equals(firstSense) || "une".equals(firstSense)
                || "les".equals(firstSense) || "des".equals(firstSense)
                || "que".equals(firstSense) || "qui".equals(firstSense)) return "";
        return firstSense;
    }

    /** Predict translated French headwords from the same embedded corpus. */
    public List<Suggestion> predictFrench(String prefix, int max) {
        List<Suggestion> result = new ArrayList<>();
        if (max <= 0 || prefix == null || prefix.trim().isEmpty()) return result;
        String typed = nfc(prefix).toLowerCase(Locale.ROOT);
        List<Map.Entry<String, Entry>> matches = new ArrayList<>();
        for (Map.Entry<String, Entry> item : frenchHeadwords.entrySet()) {
            if (item.getKey().startsWith(typed)) matches.add(item);
        }
        Collections.sort(matches, (a, b) -> {
            boolean ea = a.getKey().equals(typed), eb = b.getKey().equals(typed);
            if (ea != eb) return ea ? -1 : 1;
            int byFrequency = Integer.compare(b.getValue().freq, a.getValue().freq);
            if (byFrequency != 0) return byFrequency;
            return a.getKey().compareTo(b.getKey());
        });
        for (Map.Entry<String, Entry> match : matches) {
            Entry e = match.getValue();
            result.add(new Suggestion(match.getKey(), e.keyboardWord(), "fr", e.freq));
            if (result.size() >= max) break;
        }
        return result;
    }

    /**
     * Automatic per-word direction: exact known words are decisive; previous
     * context and available prefix candidates resolve incomplete words. When
     * both languages remain plausible, show real candidates from both rather
     * than assigning a fabricated confidence score.
     */
    public Prediction predictBidirectional(String prefix, String previousWord, int max) {
        List<Suggestion> out = new ArrayList<>();
        if (max <= 0 || prefix == null || prefix.trim().isEmpty()) {
            return new Prediction("unknown", out);
        }
        String pfx = nfc(prefix).toLowerCase(Locale.ROOT);
        List<Entry> baMatches = predict(prefix, previousWord, Math.max(max, 4));
        List<Suggestion> frMatches = predictFrench(prefix, Math.max(max, 4));
        boolean baExact = byBa.containsKey(pfx)
                && byBa.get(pfx).foldedWord().equals(pfx);
        boolean frExact = frenchHeadwords.containsKey(pfx);

        String language;
        if (baExact && frExact) language = "ambiguous";
        else if (baExact) language = "ba";
        else if (frExact) language = "fr";
        else if (baMatches.isEmpty() && frMatches.isEmpty()) language = "unknown";
        else if (frMatches.isEmpty()) language = "ba";
        else if (baMatches.isEmpty()) language = "fr";
        else {
            String prev = previousWord == null ? "" : nfc(previousWord).toLowerCase(Locale.ROOT);
            boolean prevBa = byBa.containsKey(prev);
            boolean prevFr = frenchHeadwords.containsKey(prev);
            if (prevBa && !prevFr) language = "ba";
            else if (prevFr && !prevBa) language = "fr";
            else if (pfx.matches(".*[ɔɛŋəãĩũõẽ].*")) language = "ba";
            else if (frMatches.size() > baMatches.size()) language = "fr";
            else if (baMatches.size() > frMatches.size()) language = "ba";
            else language = "ambiguous";
        }

        if ("ba".equals(language) || "ambiguous".equals(language)) {
            for (Entry e : baMatches) {
                out.add(new Suggestion(e.keyboardWord(), e.fr, "ba", e.freq));
                if (out.size() >= max && !"ambiguous".equals(language)) break;
            }
        }
        if ("fr".equals(language)) {
            for (Suggestion candidate : frMatches) {
                out.add(candidate);
                if (out.size() >= max) break;
            }
        } else if ("ambiguous".equals(language) && !frMatches.isEmpty()) {
            // Reserve one card for the alternate language without erasing the
            // Baatɔnum exact-word prediction when both languages are possible.
            int baQuota = Math.max(1, max - 1);
            if (out.size() > baQuota) out.subList(baQuota, out.size()).clear();
            out.add(frMatches.get(0));
        }
        if (out.size() > max) out.subList(max, out.size()).clear();
        return new Prediction(language, out);
    }

    /** Local Bariba→French lookup. Returns null if unknown. */
    public String translateBaToFr(String word) {
        if (word == null) return null;
        Entry e = byBa.get(nfc(word).toLowerCase(Locale.ROOT));
        return e == null ? null : e.fr;
    }

    /** Local French→Bariba lookup (first-token match). Returns null if unknown. */
    public String translateFrToBa(String word) {
        if (word == null) return null;
        Entry e = frenchHeadwords.get(nfc(word).toLowerCase(Locale.ROOT));
        return e == null ? null : e.keyboardWord();
    }

    public List<Phrase> phrases() { return phrases; }

    private static String nfc(String s) {
        return s == null ? "" : Normalizer.normalize(s, Normalizer.Form.NFC).trim();
    }
}