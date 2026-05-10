package com.fitila.bariba

import android.content.Context
import android.inputmethodservice.InputMethodService
import android.util.Log
import android.view.ContextThemeWrapper
import android.view.LayoutInflater
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray

class BaribaInputMethodService : InputMethodService() {

    companion object {
        private const val TAG = "BaribaKeyboard"
        private const val BUILD_TAG = "fitila-ime-2026-05-10-safeInflater-v3"
    }

    private var isShifted = false
    private var currentWord = StringBuilder()
    private var suggestionsBar: LinearLayout? = null

    private val prefsName = "bariba_keyboard_data"

    /**
     * Inflate using a ContextThemeWrapper based on a non-AppCompat theme.
     * This avoids AppCompatViewInflater being used inside the IME context,
     * which would crash because InputMethodService has no AppCompatDelegate.
     */
    private fun safeInflater(): LayoutInflater {
        val wrapped = ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault_Light)
        return LayoutInflater.from(wrapped).cloneInContext(wrapped)
    }

    override fun onCreateInputView(): View {
        return try {
            Log.i(TAG, "onCreateInputView BUILD_TAG=$BUILD_TAG package=$packageName")
            val layoutId = resources.getIdentifier("keyboard_bariba", "layout", packageName)
            if (layoutId == 0) {
                Log.e(TAG, "keyboard_bariba layout not found for package: $packageName")
                return createFallbackView()
            }
            val inflater = safeInflater()
            val view = inflater.inflate(layoutId, null)
            suggestionsBar = view.findViewById(
                resources.getIdentifier("suggestions_bar", "id", packageName)
            )
            try {
                setupKeys(view)
                Log.i(TAG, "Keyboard keys setup complete")
            } catch (e: Throwable) {
                Log.e(TAG, "Error setting up keys", e)
            }
            view
        } catch (e: Throwable) {
            Log.e(TAG, "Fatal error in onCreateInputView, falling back to programmatic view", e)
            createFallbackView()
        }
    }

    private fun createFallbackView(): View {
        val tv = TextView(this)
        tv.text = "Clavier Bariba — erreur d'affichage"
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
        val row1 = listOf("a", "z", "e", "r", "t", "y", "u", "i", "o", "p")
        val row2 = listOf("q", "s", "d", "f", "g", "h", "j", "k", "l", "m")
        val row3 = listOf("w", "x", "c", "v", "b", "n")

        for (char in row1 + row2 + row3) {
            val resId = resources.getIdentifier("key_$char", "id", packageName)
            if (resId != 0) {
                try {
                    view.findViewById<Button>(resId)?.setOnClickListener {
                        val c = if (isShifted) char.uppercase() else char
                        typeCharacter(c)
                    }
                } catch (_: Throwable) {}
            }
        }

        val specialKeys = mapOf(
            "key_o_open" to Pair("\u0254", "\u0186"),
            "key_e_open" to Pair("\u025B", "\u0190"),
            "key_ng" to Pair("\u014B", "\u014A"),
            "key_a_tilde" to Pair("\u00E3", "\u00C3"),
            "key_i_tilde" to Pair("\u0129", "\u0128"),
            "key_u_tilde" to Pair("\u0169", "\u0168")
        )

        for ((keyId, chars) in specialKeys) {
            val resId = resources.getIdentifier(keyId, "id", packageName)
            if (resId != 0) {
                try {
                    view.findViewById<Button>(resId)?.setOnClickListener {
                        val c = if (isShifted) chars.second else chars.first
                        typeCharacter(c)
                    }
                } catch (_: Throwable) {}
            }
        }

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

        val deleteId = resources.getIdentifier("key_delete", "id", packageName)
        if (deleteId != 0) {
            view.findViewById<Button>(deleteId)?.setOnClickListener {
                try {
                    currentInputConnection?.deleteSurroundingText(1, 0)
                    if (currentWord.isNotEmpty()) {
                        currentWord.deleteCharAt(currentWord.length - 1)
                        updateSuggestions(currentWord.toString())
                    }
                } catch (_: Throwable) {}
            }
        }

        val shiftId = resources.getIdentifier("key_shift", "id", packageName)
        if (shiftId != 0) {
            view.findViewById<Button>(shiftId)?.setOnClickListener {
                isShifted = !isShifted
                (it as? Button)?.text = if (isShifted) "⬆" else "⇧"
            }
        }

        val enterId = resources.getIdentifier("key_enter", "id", packageName)
        if (enterId != 0) {
            view.findViewById<Button>(enterId)?.setOnClickListener {
                try {
                    if (currentWord.isNotEmpty()) {
                        saveToHistory(currentWord.toString())
                        currentWord.clear()
                    }
                    val ic = currentInputConnection ?: return@setOnClickListener
                    val editorInfo = currentInputEditorInfo
                    if (editorInfo != null) {
                        ic.performEditorAction(editorInfo.imeOptions and EditorInfo.IME_MASK_ACTION)
                    } else {
                        ic.commitText("\n", 1)
                    }
                } catch (_: Throwable) {}
            }
        }

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
        try {
            currentInputConnection?.commitText(char, 1)
            currentWord.append(char)
            updateSuggestions(currentWord.toString())
            if (isShifted) isShifted = false
        } catch (e: Throwable) {
            Log.e(TAG, "typeCharacter failed", e)
        }
    }

    private fun saveToHistory(word: String) {
        if (word.isBlank() || word.length < 2) return
        try {
            val prefs = getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            val existing = prefs.getString("history", "[]") ?: "[]"
            val arr = JSONArray(existing)
            val newArr = JSONArray()
            newArr.put(word)
            for (i in 0 until arr.length()) {
                val item = arr.getString(i)
                if (item != word && newArr.length() < 50) newArr.put(item)
            }
            prefs.edit().putString("history", newArr.toString()).apply()
        } catch (e: Throwable) {
            Log.e(TAG, "saveToHistory failed", e)
        }
    }

    private fun updateSuggestions(partial: String) {
        try {
            val prefs = getSharedPreferences(prefsName, Context.MODE_PRIVATE)
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
            updateSuggestionBar(suggestions)
        } catch (e: Throwable) {
            Log.e(TAG, "updateSuggestions failed", e)
        }
    }

    private fun updateSuggestionBar(suggestions: JSONArray) {
        val bar = suggestionsBar ?: return
        try {
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
                        try {
                            val ic = currentInputConnection ?: return@setOnClickListener
                            val partial = currentWord.toString()
                            if (partial.isNotEmpty()) {
                                ic.deleteSurroundingText(partial.length, 0)
                            }
                            ic.commitText("$word ", 1)
                            saveToHistory(word)
                            currentWord.clear()
                            updateSuggestions("")
                        } catch (_: Throwable) {}
                    }
                }
                val params = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.MATCH_PARENT
                )
                params.setMargins(4, 4, 4, 4)
                bar.addView(tv, params)
            }
        } catch (e: Throwable) {
            Log.e(TAG, "updateSuggestionBar failed", e)
        }
    }
}
