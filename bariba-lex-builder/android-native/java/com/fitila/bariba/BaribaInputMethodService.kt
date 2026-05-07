package com.fitila.bariba

import android.inputmethodservice.InputMethodService
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray

class BaribaInputMethodService : InputMethodService() {

    private var isShifted = false
    private var currentWord = StringBuilder()
    private var suggestionsBar: LinearLayout? = null

    private val prefsName = "bariba_keyboard_data"

    override fun onCreateInputView(): View {
        return try {
            val layoutId = resources.getIdentifier("keyboard_bariba", "layout", packageName)
            if (layoutId == 0) return createFallbackView()
            val view = layoutInflater.inflate(layoutId, null)
            suggestionsBar = view.findViewById(
                resources.getIdentifier("suggestions_bar", "id", packageName)
            )
            try { setupKeys(view) } catch (e: Exception) { e.printStackTrace() }
            view
        } catch (e: Exception) {
            e.printStackTrace()
            createFallbackView()
        }
    }

    private fun createFallbackView(): View {
        val tv = TextView(this)
        tv.text = "Clavier Bariba — erreur de chargement"
        tv.setTextColor(0xFFFFFFFF.toInt())
        tv.setBackgroundColor(0xFF1A1A2E.toInt())
        tv.setPadding(32, 32, 32, 32)
        return tv
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        currentWord.clear()
    }

    override fun onFinishInput() {
        super.onFinishInput()
        if (currentWord.isNotEmpty()) {
            saveToHistory(currentWord.toString())
        }
        currentWord.clear()
    }

    private fun setupKeys(view: View) {
        // Standard AZERTY keys
        val row1 = listOf("a", "z", "e", "r", "t", "y", "u", "i", "o", "p")
        val row2 = listOf("q", "s", "d", "f", "g", "h", "j", "k", "l", "m")
        val row3 = listOf("w", "x", "c", "v", "b", "n")

        // Map standard keys
        for (char in row1 + row2 + row3) {
            val resId = resources.getIdentifier("key_$char", "id", packageName)
            if (resId != 0) {
                try {
                    view.findViewById<Button>(resId)?.setOnClickListener {
                        val c = if (isShifted) char.uppercase() else char
                        typeCharacter(c)
                    }
                } catch (_: Exception) {}
            }
        }

        // Bariba special keys
        val specialKeys = mapOf(
            "key_o_open" to Pair("\u0254", "\u0186"),    // ɔ Ɔ
            "key_e_open" to Pair("\u025B", "\u0190"),    // ɛ Ɛ
            "key_ng" to Pair("\u014B", "\u014A"),        // ŋ Ŋ
            "key_a_tilde" to Pair("\u00E3", "\u00C3"),   // ã Ã
            "key_i_tilde" to Pair("\u0129", "\u0128"),   // ĩ Ĩ
            "key_u_tilde" to Pair("\u0169", "\u0168")    // ũ Ũ
        )

        for ((keyId, chars) in specialKeys) {
            val resId = resources.getIdentifier(keyId, "id", packageName)
            if (resId != 0) {
                try {
                    view.findViewById<Button>(resId)?.setOnClickListener {
                        val c = if (isShifted) chars.second else chars.first
                        typeCharacter(c)
                    }
                } catch (_: Exception) {}
            }
        }

        // Space key
        val spaceId = resources.getIdentifier("key_space", "id", packageName)
        if (spaceId != 0) {
            view.findViewById<Button>(spaceId)?.setOnClickListener {
                if (currentWord.isNotEmpty()) {
                    saveToHistory(currentWord.toString())
                    currentWord.clear()
                }
                currentInputConnection?.commitText(" ", 1)
                updateSuggestions("")
            }
        }

        // Delete key
        val deleteId = resources.getIdentifier("key_delete", "id", packageName)
        if (deleteId != 0) {
            view.findViewById<Button>(deleteId)?.setOnClickListener {
                val ic = currentInputConnection ?: return@setOnClickListener
                ic.deleteSurroundingText(1, 0)
                if (currentWord.isNotEmpty()) {
                    currentWord.deleteCharAt(currentWord.length - 1)
                    updateSuggestions(currentWord.toString())
                }
            }
        }

        // Shift key
        val shiftId = resources.getIdentifier("key_shift", "id", packageName)
        if (shiftId != 0) {
            view.findViewById<Button>(shiftId)?.setOnClickListener {
                isShifted = !isShifted
                it as Button
                it.text = if (isShifted) "⬆" else "⇧"
            }
        }

        // Punctuation keys
        val punctuation = mapOf(
            "key_period" to ".",
            "key_comma" to ",",
            "key_question" to "?",
            "key_exclaim" to "!"
        )
        for ((keyId, char) in punctuation) {
            val resId = resources.getIdentifier(keyId, "id", packageName)
            if (resId != 0) {
                view.findViewById<Button>(resId)?.setOnClickListener {
                    if (currentWord.isNotEmpty()) {
                        saveToHistory(currentWord.toString())
                        currentWord.clear()
                    }
                    currentInputConnection?.commitText(char, 1)
                }
            }
        }
    }

    private fun typeCharacter(char: String) {
        currentInputConnection?.commitText(char, 1)
        currentWord.append(char)
        updateSuggestions(currentWord.toString())
        if (isShifted) {
            isShifted = false
        }
    }

    private fun saveToHistory(word: String) {
        if (word.isBlank() || word.length < 2) return
        try {
            val prefs = getSharedPreferences(prefsName, MODE_PRIVATE)
            val existing = prefs.getString("history", "[]") ?: "[]"
            val arr = JSONArray(existing)

            // Remove duplicates
            val newArr = JSONArray()
            newArr.put(word)
            for (i in 0 until arr.length()) {
                val item = arr.getString(i)
                if (item != word && newArr.length() < 50) {
                    newArr.put(item)
                }
            }

            prefs.edit().putString("history", newArr.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun updateSuggestions(partial: String) {
        try {
            val prefs = getSharedPreferences(prefsName, MODE_PRIVATE)
            val history = prefs.getString("history", "[]") ?: "[]"
            val arr = JSONArray(history)

            val suggestions = JSONArray()
            if (partial.isNotEmpty()) {
                val lowerPartial = partial.lowercase()
                for (i in 0 until arr.length()) {
                    if (suggestions.length() >= 5) break
                    val item = arr.getString(i)
                    if (item.lowercase().startsWith(lowerPartial) && item != partial) {
                        suggestions.put(item)
                    }
                }
            }

            prefs.edit()
                .putString("suggestions", suggestions.toString())
                .putString("lastWord", partial)
                .apply()

            // Update suggestion bar UI
            updateSuggestionBar(suggestions)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun updateSuggestionBar(suggestions: JSONArray) {
        suggestionsBar?.let { bar ->
            bar.removeAllViews()
            for (i in 0 until suggestions.length()) {
                val word = suggestions.getString(i)
                val tv = TextView(this).apply {
                    text = word
                    setPadding(24, 8, 24, 8)
                    setTextColor(0xFFFFFFFF.toInt())
                    textSize = 14f
                    setBackgroundColor(0xFF0F3460.toInt())
                    setOnClickListener {
                        // Replace current partial word with suggestion
                        val ic = currentInputConnection ?: return@setOnClickListener
                        val partial = currentWord.toString()
                        if (partial.isNotEmpty()) {
                            ic.deleteSurroundingText(partial.length, 0)
                        }
                        ic.commitText("$word ", 1)
                        saveToHistory(word)
                        currentWord.clear()
                        updateSuggestions("")
                    }
                }
                val params = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.MATCH_PARENT
                )
                params.setMargins(4, 4, 4, 4)
                bar.addView(tv, params)
            }
        }
    }
}