package com.fitila.bariba;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.inputmethodservice.InputMethodService;
import android.util.Log;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;

import java.util.Arrays;
import java.util.List;

/**
 * Production-grade Bariba Fitila IME — Java implementation.
 *
 * BUILD_TAG: fitila-ime-2026-05-12-java-v5
 *
 * Why Java and not Kotlin?
 *   The Capacitor Android project ships with no Kotlin Gradle plugin and no
 *   kotlin-stdlib dependency, so any .kt source is silently skipped at compile
 *   time. The previous Kotlin service therefore never made it into the DEX,
 *   which caused ClassNotFoundException on IME activation. Keeping the service
 *   in Java aligns it with BaribaKeyboardPlugin.java and removes the entire
 *   Kotlin toolchain risk.
 *
 * Design goals:
 *  - Zero hard dependency on AppCompat / Material at runtime.
 *  - All UI built programmatically with TextView (framework Button pulls in
 *    theme attributes some OEM IME themes do not fully provide).
 *  - Defensive view creation : every path returns a valid view.
 *  - Systematic lifecycle logs to diagnose activation crashes via
 *    `adb logcat -s BaribaKeyboard:V`.
 *  - Compatible Android 10 → 15, Samsung / Xiaomi / Pixel.
 */
public class BaribaInputMethodService extends InputMethodService {

    private static final String TAG = "BaribaKeyboard";
    private static final String BUILD_TAG = "fitila-ime-2026-05-12-java-v5";
    private static final String PREFS = "bariba_keyboard_data";
    private static final int MAX_HISTORY = 50;
    private static final int MAX_SUGGESTIONS = 5;

    private static final List<String> ROW1 = Arrays.asList("a","z","e","r","t","y","u","i","o","p");
    private static final List<String> ROW2 = Arrays.asList("q","s","d","f","g","h","j","k","l","m");
    private static final List<String> ROW3 = Arrays.asList("w","x","c","v","b","n");
    // Pairs: lower / upper Bariba specials (ɔ Ɔ, ɛ Ɛ, ŋ Ŋ, ã Ã, ĩ Ĩ, ũ Ũ)
    private static final String[][] SPECIALS = new String[][] {
        {"\u0254", "\u0186"},
        {"\u025B", "\u0190"},
        {"\u014B", "\u014A"},
        {"\u00E3", "\u00C3"},
        {"\u0129", "\u0128"},
        {"\u0169", "\u0168"}
    };

    private boolean isShifted = false;
    private final StringBuilder currentWord = new StringBuilder();
    private LinearLayout suggestionsBar;
    private TextView shiftKey;

    // ─── Lifecycle logs ─────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "onCreate BUILD_TAG=" + BUILD_TAG
                + " package=" + getPackageName()
                + " sdk=" + android.os.Build.VERSION.SDK_INT
                + " oem=" + android.os.Build.MANUFACTURER + "/" + android.os.Build.MODEL);
    }

    @Override
    public void onBindInput() {
        super.onBindInput();
        Log.i(TAG, "onBindInput");
    }

    @Override
    public void onStartInput(EditorInfo attribute, boolean restarting) {
        super.onStartInput(attribute, restarting);
        Log.i(TAG, "onStartInput restarting=" + restarting
                + " inputType=" + (attribute != null ? attribute.inputType : -1));
        currentWord.setLength(0);
    }

    @Override
    public void onStartInputView(EditorInfo info, boolean restarting) {
        super.onStartInputView(info, restarting);
        Log.i(TAG, "onStartInputView restarting=" + restarting);
    }

    @Override
    public void onFinishInput() {
        Log.i(TAG, "onFinishInput");
        if (currentWord.length() > 0) saveToHistory(currentWord.toString());
        currentWord.setLength(0);
        super.onFinishInput();
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "onDestroy");
        super.onDestroy();
    }

    // ─── View creation ──────────────────────────────────────────────────────

    @Override
    public View onCreateInputView() {
        Log.i(TAG, "onCreateInputView() called");
        try {
            return buildKeyboardView();
        } catch (Throwable t) {
            Log.e(TAG, "onCreateInputView crashed, returning fallback", t);
            return createFallbackView(t.getMessage() != null ? t.getMessage() : "erreur inconnue");
        }
    }

    private Context themedContext() {
        return new ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault);
    }

    private View buildKeyboardView() {
        Context ctx = themedContext();
        LinearLayout root = new LinearLayout(ctx);
        root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF1A1A2E);
        int pad = dp(ctx, 2);
        root.setPadding(pad, pad, pad, pad);

        // Suggestions bar
        suggestionsBar = new LinearLayout(ctx);
        suggestionsBar.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(ctx, 40)));
        suggestionsBar.setOrientation(LinearLayout.HORIZONTAL);
        suggestionsBar.setBackgroundColor(0xFF16213E);
        suggestionsBar.setGravity(Gravity.CENTER_VERTICAL);
        int h = dp(ctx, 8);
        suggestionsBar.setPadding(h, 0, h, 0);
        root.addView(suggestionsBar);

        // Row 1
        root.addView(buildLetterRow(ctx, ROW1));

        // Row 2 (indent like AZERTY)
        LinearLayout row2 = buildLetterRow(ctx, ROW2);
        LinearLayout.LayoutParams row2lp = (LinearLayout.LayoutParams) row2.getLayoutParams();
        if (row2lp != null) {
            row2lp.leftMargin = dp(ctx, 12);
            row2lp.rightMargin = dp(ctx, 12);
        }
        root.addView(row2);

        // Row 3: shift + letters + delete
        root.addView(buildRow3(ctx));

        // Row 4: Bariba specials
        root.addView(buildSpecialsRow(ctx));

        // Row 5: punctuation + space + enter
        root.addView(buildBottomRow(ctx));

        Log.i(TAG, "Keyboard view built successfully");
        return root;
    }

    private LinearLayout.LayoutParams rowParams(Context ctx, int heightDp) {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(ctx, heightDp));
    }

    private LinearLayout buildLetterRow(Context ctx, final List<String> letters) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 48));
        row.setOrientation(LinearLayout.HORIZONTAL);
        for (final String c : letters) {
            TextView key = makeKey(ctx, c, new Runnable() {
                @Override public void run() {
                    typeCharacter(isShifted ? c.toUpperCase() : c);
                }
            });
            row.addView(key, weightedParams(1f));
        }
        return row;
    }

    private LinearLayout buildRow3(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 48));
        row.setOrientation(LinearLayout.HORIZONTAL);

        shiftKey = makeKey(ctx, "⇧", new Runnable() {
            @Override public void run() {
                isShifted = !isShifted;
                if (shiftKey != null) shiftKey.setText(isShifted ? "⬆" : "⇧");
            }
        });
        row.addView(shiftKey, weightedParams(1.5f));

        for (final String c : ROW3) {
            row.addView(makeKey(ctx, c, new Runnable() {
                @Override public void run() {
                    typeCharacter(isShifted ? c.toUpperCase() : c);
                }
            }), weightedParams(1f));
        }

        row.addView(makeKey(ctx, "⌫", new Runnable() {
            @Override public void run() {
                try {
                    InputConnection ic = getCurrentInputConnection();
                    if (ic != null) ic.deleteSurroundingText(1, 0);
                    if (currentWord.length() > 0) {
                        currentWord.deleteCharAt(currentWord.length() - 1);
                        updateSuggestions(currentWord.toString());
                    }
                } catch (Throwable t) { Log.w(TAG, "delete failed", t); }
            }
        }), weightedParams(1.5f));
        return row;
    }

    private LinearLayout buildSpecialsRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 48));
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setBackgroundColor(0xFF0F3460);
        for (final String[] pair : SPECIALS) {
            final String lower = pair[0];
            final String upper = pair[1];
            row.addView(makeKey(ctx, lower, new Runnable() {
                @Override public void run() {
                    typeCharacter(isShifted ? upper : lower);
                }
            }), weightedParams(1f));
        }
        return row;
    }

    private LinearLayout buildBottomRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 48));
        row.setOrientation(LinearLayout.HORIZONTAL);
        for (final String p : new String[]{",", ".", "?", "!"}) {
            row.addView(makeKey(ctx, p, new Runnable() {
                @Override public void run() { commitPunctuation(p); }
            }), weightedParams(1f));
        }
        row.addView(makeKey(ctx, "espace", new Runnable() {
            @Override public void run() {
                if (currentWord.length() > 0) {
                    saveToHistory(currentWord.toString());
                    currentWord.setLength(0);
                }
                try {
                    InputConnection ic = getCurrentInputConnection();
                    if (ic != null) ic.commitText(" ", 1);
                } catch (Throwable ignored) {}
                updateSuggestions("");
            }
        }), weightedParams(4f));
        row.addView(makeKey(ctx, "↵", new Runnable() {
            @Override public void run() { performEnter(); }
        }), weightedParams(2f));
        return row;
    }

    private LinearLayout.LayoutParams weightedParams(float weight) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.MATCH_PARENT, weight);
        int m = 3;
        lp.setMargins(m, m, m, m);
        return lp;
    }

    /**
     * TextView-based key. Avoids framework Button to remove dependency on
     * theme attributes (?attr/buttonStyle, colorAccent) that some OEM IME
     * themes don't fully provide on Android 13+.
     */
    private TextView makeKey(Context ctx, final String label, final Runnable onClick) {
        TextView tv = new TextView(ctx);
        tv.setText(label);
        tv.setGravity(Gravity.CENTER);
        tv.setTextColor(Color.WHITE);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f);
        tv.setClickable(true);
        tv.setFocusable(false);
        tv.setAllCaps(false);
        tv.setBackground(makeKeyBackground());
        tv.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                try { onClick.run(); }
                catch (Throwable t) { Log.w(TAG, "key click failed: " + label, t); }
            }
        });
        return tv;
    }

    private StateListDrawable makeKeyBackground() {
        float radius = 14f;
        GradientDrawable normal = new GradientDrawable();
        normal.setShape(GradientDrawable.RECTANGLE);
        normal.setColor(0xFF2D2D5E);
        normal.setCornerRadius(radius);

        GradientDrawable pressed = new GradientDrawable();
        pressed.setShape(GradientDrawable.RECTANGLE);
        pressed.setColor(0xFF4A4E8C);
        pressed.setCornerRadius(radius);

        StateListDrawable sld = new StateListDrawable();
        sld.addState(new int[]{android.R.attr.state_pressed}, pressed);
        sld.addState(new int[]{}, normal);
        return sld;
    }

    private void commitPunctuation(String p) {
        if (currentWord.length() > 0) {
            saveToHistory(currentWord.toString());
            currentWord.setLength(0);
        }
        try {
            InputConnection ic = getCurrentInputConnection();
            if (ic != null) ic.commitText(p, 1);
        } catch (Throwable ignored) {}
    }

    private void performEnter() {
        try {
            if (currentWord.length() > 0) {
                saveToHistory(currentWord.toString());
                currentWord.setLength(0);
            }
            InputConnection ic = getCurrentInputConnection();
            if (ic == null) return;
            EditorInfo ei = getCurrentInputEditorInfo();
            if (ei != null) {
                ic.performEditorAction(ei.imeOptions & EditorInfo.IME_MASK_ACTION);
            } else {
                ic.commitText("\n", 1);
            }
        } catch (Throwable t) { Log.w(TAG, "enter failed", t); }
    }

    private void typeCharacter(String c) {
        try {
            InputConnection ic = getCurrentInputConnection();
            if (ic != null) ic.commitText(c, 1);
            currentWord.append(c);
            updateSuggestions(currentWord.toString());
            if (isShifted) {
                isShifted = false;
                if (shiftKey != null) shiftKey.setText("⇧");
            }
        } catch (Throwable t) { Log.w(TAG, "typeCharacter failed", t); }
    }

    private View createFallbackView(String reason) {
        Context ctx = themedContext();
        TextView tv = new TextView(ctx);
        tv.setText("Clavier Bariba — " + reason);
        tv.setTextColor(Color.WHITE);
        tv.setBackgroundColor(0xFF1A1A2E);
        tv.setPadding(48, 48, 48, 48);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        return tv;
    }

    // ─── Suggestions & history ──────────────────────────────────────────────

    private void saveToHistory(String word) {
        if (word == null || word.trim().length() < 2) return;
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = prefs.getString("history", "[]");
            if (raw == null) raw = "[]";
            JSONArray arr = new JSONArray(raw);
            JSONArray newArr = new JSONArray().put(word);
            for (int i = 0; i < arr.length(); i++) {
                String item = arr.optString(i, "");
                if (!item.isEmpty() && !item.equals(word) && newArr.length() < MAX_HISTORY) {
                    newArr.put(item);
                }
            }
            prefs.edit().putString("history", newArr.toString()).apply();
        } catch (Throwable t) { Log.w(TAG, "saveToHistory failed", t); }
    }

    private void updateSuggestions(String partial) {
        try {
            SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = prefs.getString("history", "[]");
            if (raw == null) raw = "[]";
            JSONArray arr = new JSONArray(raw);
            JSONArray suggestions = new JSONArray();
            if (partial != null && !partial.isEmpty()) {
                String lower = partial.toLowerCase();
                int i = 0;
                while (i < arr.length() && suggestions.length() < MAX_SUGGESTIONS) {
                    String item = arr.optString(i, "");
                    if (item.toLowerCase().startsWith(lower) && !item.equals(partial)) {
                        suggestions.put(item);
                    }
                    i++;
                }
            }
            prefs.edit()
                    .putString("suggestions", suggestions.toString())
                    .putString("lastWord", partial == null ? "" : partial)
                    .apply();
            renderSuggestionBar(suggestions);
        } catch (Throwable t) { Log.w(TAG, "updateSuggestions failed", t); }
    }

    private void renderSuggestionBar(JSONArray suggestions) {
        final LinearLayout bar = suggestionsBar;
        if (bar == null) return;
        Context ctx = bar.getContext();
        try {
            bar.removeAllViews();
            for (int i = 0; i < suggestions.length(); i++) {
                final String word = suggestions.optString(i, "");
                if (word.isEmpty()) continue;
                TextView tv = new TextView(ctx);
                tv.setText(word);
                tv.setPadding(24, 8, 24, 8);
                tv.setTextColor(Color.WHITE);
                tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
                tv.setBackgroundColor(0xFF0F3460);
                tv.setClickable(true);
                tv.setOnClickListener(new View.OnClickListener() {
                    @Override public void onClick(View v) {
                        try {
                            InputConnection ic = getCurrentInputConnection();
                            if (ic == null) return;
                            String partial = currentWord.toString();
                            if (!partial.isEmpty()) ic.deleteSurroundingText(partial.length(), 0);
                            ic.commitText(word + " ", 1);
                            saveToHistory(word);
                            currentWord.setLength(0);
                            updateSuggestions("");
                        } catch (Throwable ignored) {}
                    }
                });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.MATCH_PARENT);
                lp.setMargins(4, 4, 4, 4);
                bar.addView(tv, lp);
            }
        } catch (Throwable t) { Log.w(TAG, "renderSuggestionBar failed", t); }
    }

    private int dp(Context ctx, int v) {
        return (int) (v * ctx.getResources().getDisplayMetrics().density);
    }
}