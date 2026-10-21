package com.fitila.bariba

import java.text.Normalizer

/**
 * Deterministic refinement of an on-device (beta) translation, for the system keyboard.
 * Same surface rules as the app (dunya_refine.dart) and the server (deterministic-refine.ts):
 * characters, spacing, machine loops, capital letter and final punctuation. It never changes the
 * meaning and is never applied to attested translations. (The vocabulary-based spelling repair
 * lives in the app, which holds the memory.)
 */
object OfflineRefine {
    private val spaceBeforePunct = Regex("\\s+([,.;:!?\u2026])")
    private val missingSpace = Regex("([,;:!?])(?=\\p{L})")
    private val trailingPunct = Regex("[.,;:!?\u2026]+$")

    fun apply(source: String, candidate: String): String {
        val src = Normalizer.normalize(source, Normalizer.Form.NFC).trim()
        var text = Normalizer.normalize(candidate, Normalizer.Form.NFC)
            .replace('\u03b5', '\u025b').replace('\u2019', '\'').replace('\u2018', '\'')
            .replace(Regex("[\u200b-\u200d\ufeff]"), "")
        text = text.replace(Regex("\\s+"), " ")
            .replace(spaceBeforePunct) { it.groupValues[1] }
            .replace(missingSpace) { it.groupValues[1] + " " }
            .trim()
        val words = text.split(" ").filter { it.isNotEmpty() }.toMutableList()
        fun key(w: String) = w.lowercase().replace(trailingPunct, "")
        for (n in 1..3) {
            var i = 0
            while (i + 3 * n <= words.size) {
                val first = words.subList(i, i + n).joinToString(" ") { key(it) }
                var reps = 1
                while (i + (reps + 1) * n <= words.size &&
                    words.subList(i + reps * n, i + (reps + 1) * n).joinToString(" ") { key(it) } == first) reps++
                if (reps >= 3) {
                    repeat((reps - 1) * n) { words.removeAt(i + n) }
                } else {
                    i++
                }
            }
        }
        text = words.joinToString(" ")
        if (src.isNotEmpty() && text.isNotEmpty()) {
            val sf = src.codePointAt(0)
            val tf = text.codePointAt(0)
            if (Character.isUpperCase(sf) && Character.isLowerCase(tf)) {
                val len = Character.charCount(tf)
                text = String(Character.toChars(Character.toUpperCase(tf))) + text.substring(len)
            }
        }
        val end = src.lastOrNull()
        if (end != null && end in ".?!\u2026" && text.isNotEmpty()) {
            val last = text.last()
            text = when {
                last !in ".?!\u2026" -> text + end
                (end == '?' || end == '!') && last == '.' -> text.dropLast(1) + end
                else -> text
            }
        }
        return text
    }
}
