package com.fitila.bariba

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import android.inputmethodservice.InputMethodService
import android.util.Log
import android.util.TypedValue
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray

/**
 * Production-grade Bariba Fitila IME.
 *
 * Design goals:
 *  - Zero hard dependency on AppCompat / Material at runtime.
 *  - All UI built programmatically with TextView (framework Button pulls in
 *    theme attributes some OEM IME themes do not fully provide).
 *  - Inflation entièrement défensive : tout chemin renvoie une vue valide.
 *  - Logs lifecycle systématiques pour diagnostiquer un crash d'activation
 *    via `adb logcat -s BaribaKeyboard:V`.
 *  - Compatible Android 10 → 15, Samsung / Xiaomi / Pixel.
 */
class BaribaInputMethodService : InputMethodService() {

    companion object {
        private const val TAG = "BaribaKeyboard"
        private const val BUILD_TAG = "fitila-ime-2026-05-11-programmatic-v4"
        private const val PREFS = "bariba_keyboard_data"
        private const val MAX_HISTORY = 50
        private const val MAX_SUGGESTIONS = 5

        private val ROW1 = listOf("a","z","e","r","t","y","u","i","o","p")
        private val ROW2 = listOf("q","s","d","f","g","h","j","k","l","m")
        private val ROW3 = listOf("w","x","c","v","b","n")
        private val SPECIALS = listOf(
            "\u0254" to "\u0186", // ɔ Ɔ
            "\u025B" to "\u0190", // ɛ Ɛ
            "\u014B" to "\u014A", // ŋ Ŋ
            "\u00E3" to "\u00C3", // ã Ã
            "\u0129" to "\u0128", // ĩ Ĩ
            "\u0169" to "\u0168"  // ũ Ũ
        )
    }

    private var isShifted = false
    private val currentWord = StringBuilder()
    private var suggestionsBar: LinearLayout? = null
    private var shiftKey: TextView? = null

    // ─── Lifecycle logs ─────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        Log.i(TAG, "onCreate BUILD_TAG=$BUILD_TAG package=$packageName sdk=${android.os.Build.VERSION.SDK_INT} oem=${android.os.Build.MANUFACTURER}/${android.os.Build.MODEL}")
    }

    override fun onBindInput() {
        super.onBindInput()
        Log.i(TAG, "onBindInput")
    }

    override fun onStartInput(attribute: EditorInfo?, restarting: Boolean) {
        super.onStartInput(attribute, restarting)
        Log.i(TAG, "onStartInput restarting=$restarting inputType=${attribute?.inputType}")
        currentWord.clear()
    }

    override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
        super.onStartInputView(info, restarting)
        Log.i(TAG, "onStartInputView restarting=$restarting")
    }

    override fun onFinishInput() {
        Log.i(TAG, "onFinishInput")
        if (currentWord.isNotEmpty()) saveToHistory(currentWord.toString())
        currentWord.clear()
        super.onFinishInput()
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy")
        super.onDestroy()
    }

    // ─── View creation ──────────────────────────────────────────────────────

    override fun onCreateInputView(): View {
        Log.i(TAG, "onCreateInputView() called")
        return try {
            buildKeyboardView()
        } catch (t: Throwable) {
            Log.e(TAG, "onCreateInputView crashed, returning fallback", t)
            createFallbackView(t.message ?: "erreur inconnue")
        }
    }

    private fun themedContext(): Context =
        ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault)

    private fun buildKeyboardView(): View {
        val ctx = themedContext()
        val root = LinearLayout(ctx).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF1A1A2E.toInt())
            val pad = dp(ctx, 2)
            setPadding(pad, pad, pad, pad)
        }

        // Suggestions bar
        suggestionsBar = LinearLayout(ctx).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(ctx, 40)
            )
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(0xFF16213E.toInt())
            gravity = Gravity.CENTER_VERTICAL
            val h = dp(ctx, 8)
            setPadding(h, 0, h, 0)
        }
        root.addView(suggestionsBar)

        // Row 1
        root.addView(buildLetterRow(ctx, ROW1))

        // Row 2 (indent like AZERTY)
        val row2 = buildLetterRow(ctx, ROW2)
        (row2.layoutParams as? LinearLayout.LayoutParams)?.apply {
            leftMargin = dp(ctx, 12); rightMargin = dp(ctx, 12)
        }
        root.addView(row2)

        // Row 3 : shift + letters + delete
        root.addView(buildRow3(ctx))

        // Row 4 : Bariba specials
        root.addView(buildSpecialsRow(ctx))

        // Row 5 : punctuation + space + enter
        root.addView(buildBottomRow(ctx))

        Log.i(TAG, "Keyboard view built successfully")
        return root
    }

    private fun rowParams(ctx: Context, heightDp: Int = 48): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(ctx, heightDp))

    private fun buildLetterRow(ctx: Context, letters: List<String>): LinearLayout {
        val row = LinearLayout(ctx).apply {
            layoutParams = rowParams(ctx)
            orientation = LinearLayout.HORIZONTAL
        }
        for (c in letters) {
            val key = makeKey(ctx, c) { typeCharacter(if (isShifted) c.uppercase() else c) }
            row.addView(key, weightedParams())
        }
        return row
    }

    private fun buildRow3(ctx: Context): LinearLayout {
        val row = LinearLayout(ctx).apply {
            layoutParams = rowParams(ctx)
            orientation = LinearLayout.HORIZONTAL
        }
        // Shift (weight 1.5)
        shiftKey = makeKey(ctx, "⇧") {
            isShifted = !isShifted
            shiftKey?.text = if (isShifted) "⬆" else "⇧"
        }
        row.addView(shiftKey, weightedParams(1.5f))

        for (c in ROW3) {
            row.addView(makeKey(ctx, c) {
                typeCharacter(if (isShifted) c.uppercase() else c)
            }, weightedParams())
        }
        // Delete (weight 1.5)
        row.addView(makeKey(ctx, "⌫") {
            try {
                currentInputConnection?.deleteSurroundingText(1, 0)
                if (currentWord.isNotEmpty()) {
                    currentWord.deleteCharAt(currentWord.length - 1)
                    updateSuggestions(currentWord.toString())
                }
            } catch (t: Throwable) { Log.w(TAG, "delete failed", t) }
        }, weightedParams(1.5f))
        return row
    }

    private fun buildSpecialsRow(ctx: Context): LinearLayout {
        val row = LinearLayout(ctx).apply {
            layoutParams = rowParams(ctx)
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(0xFF0F3460.toInt())
        }
        for ((lower, upper) in SPECIALS) {
            row.addView(makeKey(ctx, lower) {
                typeCharacter(if (isShifted) upper else lower)
            }, weightedParams())
        }
        return row
    }

    private fun buildBottomRow(ctx: Context): LinearLayout {
        val row = LinearLayout(ctx).apply {
            layoutParams = rowParams(ctx)
            orientation = LinearLayout.HORIZONTAL
        }
        for (p in listOf(",", ".", "?", "!")) {
            row.addView(makeKey(ctx, p) { commitPunctuation(p) }, weightedParams())
        }
        row.addView(makeKey(ctx, "espace") {
            if (currentWord.isNotEmpty()) {
                saveToHistory(currentWord.toString())
                currentWord.clear()
            }
            try { currentInputConnection?.commitText(" ", 1) } catch (_: Throwable) {}
            updateSuggestions("")
        }, weightedParams(4f))
        row.addView(makeKey(ctx, "↵") { performEnter() }, weightedParams(2f))
        return row
    }

    private fun weightedParams(weight: Float = 1f): LinearLayout.LayoutParams =
        LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, weight).apply {
            val m = 3
            setMargins(m, m, m, m)
        }

    /**
     * TextView-based key. Avoids framework Button to remove dependency on
     * theme attributes (?attr/buttonStyle, colorAccent) that some OEM IME
     * themes don't fully provide on Android 13+.
     */
    private fun makeKey(ctx: Context, label: String, onClick: () -> Unit): TextView {
        return TextView(ctx).apply {
            text = label
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            isClickable = true
            isFocusable = false
            isAllCaps = false
            background = makeKeyBackground()
            setOnClickListener {
                try { onClick() } catch (t: Throwable) { Log.w(TAG, "key click failed: $label", t) }
            }
        }
    }

    private fun makeKeyBackground(): StateListDrawable {
        val radius = 14f
        val normal = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(0xFF2D2D5E.toInt())
            cornerRadius = radius
        }
        val pressed = GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            setColor(0xFF4A4E8C.toInt())
            cornerRadius = radius
        }
        return StateListDrawable().apply {
            addState(intArrayOf(android.R.attr.state_pressed), pressed)
            addState(intArrayOf(), normal)
        }
    }

    private fun commitPunctuation(p: String) {
        if (currentWord.isNotEmpty()) {
            saveToHistory(currentWord.toString())
            currentWord.clear()
        }
        try { currentInputConnection?.commitText(p, 1) } catch (_: Throwable) {}
    }

    private fun performEnter() {
        try {
            if (currentWord.isNotEmpty()) {
                saveToHistory(currentWord.toString())
                currentWord.clear()
            }
            val ic = currentInputConnection ?: return
            val ei = currentInputEditorInfo
            if (ei != null) {
                ic.performEditorAction(ei.imeOptions and EditorInfo.IME_MASK_ACTION)
            } else {
                ic.commitText("\n", 1)
            }
        } catch (t: Throwable) { Log.w(TAG, "enter failed", t) }
    }

    private fun typeCharacter(c: String) {
        try {
            currentInputConnection?.commitText(c, 1)
            currentWord.append(c)
            updateSuggestions(currentWord.toString())
            if (isShifted) {
                isShifted = false
                shiftKey?.text = "⇧"
            }
        } catch (t: Throwable) { Log.w(TAG, "typeCharacter failed", t) }
    }

    private fun createFallbackView(reason: String): View {
        val ctx = themedContext()
        return TextView(ctx).apply {
            text = "Clavier Bariba — $reason"
            setTextColor(Color.WHITE)
            setBackgroundColor(0xFF1A1A2E.toInt())
            setPadding(48, 48, 48, 48)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
        }
    }

    // ─── Suggestions & history ──────────────────────────────────────────────

    private fun saveToHistory(word: String) {
        if (word.isBlank() || word.length < 2) return
        try {
            val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val arr = JSONArray(prefs.getString("history", "[]") ?: "[]")
            val newArr = JSONArray().put(word)
            for (i in 0 until arr.length()) {
                val item = arr.optString(i, "")
                if (item.isNotEmpty() && item != word && newArr.length() < MAX_HISTORY) {
                    newArr.put(item)
                }
            }
            prefs.edit().putString("history", newArr.toString()).apply()
        } catch (t: Throwable) { Log.w(TAG, "saveToHistory failed", t) }
    }

    private fun updateSuggestions(partial: String) {
        try {
            val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val arr = JSONArray(prefs.getString("history", "[]") ?: "[]")
            val suggestions = JSONArray()
            if (partial.isNotEmpty()) {
                val lower = partial.lowercase()
                var i = 0
                while (i < arr.length() && suggestions.length() < MAX_SUGGESTIONS) {
                    val item = arr.optString(i, "")
                    if (item.lowercase().startsWith(lower) && item != partial) suggestions.put(item)
                    i++
                }
            }
            prefs.edit()
                .putString("suggestions", suggestions.toString())
                .putString("lastWord", partial)
                .apply()
            renderSuggestionBar(suggestions)
        } catch (t: Throwable) { Log.w(TAG, "updateSuggestions failed", t) }
    }

    private fun renderSuggestionBar(suggestions: JSONArray) {
        val bar = suggestionsBar ?: return
        val ctx = bar.context
        try {
            bar.removeAllViews()
            for (i in 0 until suggestions.length()) {
                val word = suggestions.optString(i, "")
                if (word.isEmpty()) continue
                val tv = TextView(ctx).apply {
                    text = word
                    setPadding(24, 8, 24, 8)
                    setTextColor(Color.WHITE)
                    setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
                    setBackgroundColor(0xFF0F3460.toInt())
                    isClickable = true
                    setOnClickListener {
                        try {
                            val ic = currentInputConnection ?: return@setOnClickListener
                            val partial = currentWord.toString()
                            if (partial.isNotEmpty()) ic.deleteSurroundingText(partial.length, 0)
                            ic.commitText("$word ", 1)
                            saveToHistory(word)
                            currentWord.clear()
                            updateSuggestions("")
                        } catch (_: Throwable) {}
                    }
                }
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.MATCH_PARENT
                ).apply { setMargins(4, 4, 4, 4) }
                bar.addView(tv, lp)
            }
        } catch (t: Throwable) { Log.w(TAG, "renderSuggestionBar failed", t) }
    }

    private fun dp(ctx: Context, v: Int): Int =
        (v * ctx.resources.displayMetrics.density).toInt()

    // LayoutInflater retenu pour compatibilité ascendante si une autre partie
    // du code appelait safeInflater() ; aucune inflation XML utilisée ici.
    @Suppress("unused")
    private fun safeInflater(): LayoutInflater {
        val wrapped = ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault)
        return LayoutInflater.from(wrapped).cloneInContext(wrapped)
    }
}
