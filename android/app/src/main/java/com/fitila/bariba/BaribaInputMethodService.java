package com.fitila.bariba;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.inputmethodservice.InputMethodService;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.view.inputmethod.InputMethodManager;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.TextView;

import org.json.JSONArray;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.text.Normalizer;

/**
 * Production-grade Bariba Fitila IME — Java implementation.
 *
 * BUILD_TAG: fitila-ime-2026-05-12-smart-v6
 *
 * v6 additions:
 *  - Digits row (0-9) toggleable
 *  - Symbols page (?123) like Gboard
 *  - Tone-low combining grave key (U+0300) — combinable on any vowel,
 *    even already-nasalized (ɔ̃ → ɔ̃̀, ɛ̃ → ɛ̃̀)
 *  - Long-press backspace = continuous delete
 *  - Long-press globe key = system IME picker
 *  - All output is plain Unicode NFC, copy-paste safe in any document
 */
public class BaribaInputMethodService extends InputMethodService {

    private static final String TAG = "BaribaKeyboard";
    private static final String BUILD_TAG = "fitila-ime-2026-05-12-smart-v7-alphabet";
    private static final String PREFS = "bariba_keyboard_data";
    private static final int MAX_HISTORY = 50;
    private static final int MAX_SUGGESTIONS = 5;
    private static final String COMBINING_GRAVE = "\u0300";
    private static final String COMBINING_ACUTE = "\u0301";
    private static final String COMBINING_TILDE = "\u0303";

    private static final List<String> ROW_DIGITS =
            Arrays.asList("1","2","3","4","5","6","7","8","9","0");
    private static final List<String> ROW1 =
            Arrays.asList("a","z","e","r","t","y","u","i","o","p");
    private static final List<String> ROW2 =
            Arrays.asList("q","s","d","f","g","h","j","k","l","m");
    private static final List<String> ROW3 =
            Arrays.asList("w","x","c","v","b","n");
    private static final String[][] SPECIALS = new String[][] {
        {"\u0254", "\u0186"},   // ɔ Ɔ
        {"\u025B", "\u0190"},   // ɛ Ɛ
        {"\u014B", "\u014A"}    // ŋ Ŋ
    };

    // Voyelles nasalisées Bariba (lower / upper)
    private static final String[][] NASALS = new String[][] {
        {"\u00E3", "\u00C3"},          // ã Ã
        {"\u0129", "\u0128"},   // ĩ Ĩ
        {"\u0169", "\u0168"},   // ũ Ũ
        {"\u00F5", "\u00D5"},   // õ Õ
        {"\u1EBD", "\u1EBC"},   // ẽ Ẽ
        {"\u025B\u0303", "\u0190\u0303"}, // ɛ̃ Ɛ̃
        {"\u0254\u0303", "\u0186\u0303"}  // ɔ̃ Ɔ̃
    };

    // Variantes long-press (clé = voyelle ASCII/Unicode → variantes)
    private static final Map<String, String[]> VARIANTS = new HashMap<String, String[]>() {{
        put("a", new String[]{"\u00E0","\u00E1","\u00E2","\u00E4","\u00E3"});
        put("e", new String[]{"\u00E8","\u00E9","\u00EA","\u00EB","\u1EBD","\u025B","\u025B\u0300","\u025B\u0301","\u025B\u0303","\u025B\u0303\u0300"});
        put("i", new String[]{"\u00EC","\u00ED","\u00EE","\u00EF","\u0129"});
        put("o", new String[]{"\u00F2","\u00F3","\u00F4","\u00F6","\u00F5","\u0254","\u0254\u0300","\u0254\u0301","\u0254\u0303","\u0254\u0303\u0300"});
        put("u", new String[]{"\u00F9","\u00FA","\u00FB","\u00FC","\u0169"});
        put("n", new String[]{"\u014B","\u01F9","\u00F1"});
        put("\u0254", new String[]{"\u0254\u0300","\u0254\u0301","\u0254\u0303","\u0254\u0303\u0300"});
        put("\u025B", new String[]{"\u025B\u0300","\u025B\u0301","\u025B\u0303","\u025B\u0303\u0300"});
    }};

    private PopupWindow currentPopup;
    };

    private static final List<String> SYM_ROW1 =
            Arrays.asList("1","2","3","4","5","6","7","8","9","0");
    private static final List<String> SYM_ROW2 =
            Arrays.asList("@","#","$","_","&","-","+","(",")","/");
    private static final List<String> SYM_ROW3 =
            Arrays.asList("*","\"","'",":",";","!","?","%","=");

    private boolean isShifted = false;
    private boolean isSymbols = false;
    private final StringBuilder currentWord = new StringBuilder();
    private LinearLayout suggestionsBar;
    private LinearLayout keyboardContainer;
    private TextView shiftKey;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable backspaceRepeater;

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "onCreate BUILD_TAG=" + BUILD_TAG
                + " package=" + getPackageName()
                + " sdk=" + android.os.Build.VERSION.SDK_INT
                + " oem=" + android.os.Build.MANUFACTURER + "/" + android.os.Build.MODEL);
    }

    @Override
    public void onStartInput(EditorInfo attribute, boolean restarting) {
        super.onStartInput(attribute, restarting);
        currentWord.setLength(0);
    }

    @Override
    public void onFinishInput() {
        if (currentWord.length() > 0) saveToHistory(currentWord.toString());
        currentWord.setLength(0);
        super.onFinishInput();
    }

    // ─── View ───────────────────────────────────────────────────────────────

    @Override
    public View onCreateInputView() {
        Log.i(TAG, "onCreateInputView()");
        try {
            return buildRoot();
        } catch (Throwable t) {
            Log.e(TAG, "onCreateInputView crashed, fallback", t);
            return createFallbackView(t.getMessage() != null ? t.getMessage() : "erreur");
        }
    }

    private Context themedContext() {
        return new ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault);
    }

    private View buildRoot() {
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

        // Dynamic keyboard container
        keyboardContainer = new LinearLayout(ctx);
        keyboardContainer.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));
        keyboardContainer.setOrientation(LinearLayout.VERTICAL);
        root.addView(keyboardContainer);

        rebuildKeyboard();
        Log.i(TAG, "Keyboard view built");
        return root;
    }

    private void rebuildKeyboard() {
        if (keyboardContainer == null) return;
        Context ctx = keyboardContainer.getContext();
        keyboardContainer.removeAllViews();

        if (isSymbols) {
            keyboardContainer.addView(buildLetterRow(ctx, SYM_ROW1, false));
            keyboardContainer.addView(buildLetterRow(ctx, SYM_ROW2, false));
            keyboardContainer.addView(buildSymRow3(ctx));
            keyboardContainer.addView(buildBottomRow(ctx, /*symbols*/ true));
        } else {
            keyboardContainer.addView(buildLetterRow(ctx, ROW_DIGITS, false));
            keyboardContainer.addView(buildLetterRow(ctx, ROW1, true));
            LinearLayout row2 = buildLetterRow(ctx, ROW2, true);
            LinearLayout.LayoutParams row2lp = (LinearLayout.LayoutParams) row2.getLayoutParams();
            if (row2lp != null) {
                row2lp.leftMargin = dp(ctx, 12);
                row2lp.rightMargin = dp(ctx, 12);
            }
            keyboardContainer.addView(row2);
            keyboardContainer.addView(buildRow3(ctx));
            keyboardContainer.addView(buildNasalsRow(ctx));
            keyboardContainer.addView(buildSpecialsRow(ctx));
            keyboardContainer.addView(buildCombiningRow(ctx));
            keyboardContainer.addView(buildBottomRow(ctx, /*symbols*/ false));
        }
    }

    private LinearLayout.LayoutParams rowParams(Context ctx, int heightDp) {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(ctx, heightDp));
    }

    private LinearLayout buildLetterRow(Context ctx, final List<String> letters, final boolean useShift) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 46));
        row.setOrientation(LinearLayout.HORIZONTAL);
        for (final String c : letters) {
            TextView k = makeKey(ctx, c, new Runnable() {
                @Override public void run() {
                    typeCharacter(useShift && isShifted ? c.toUpperCase() : c);
                }
            });
            attachLongPressVariants(k, c);
            row.addView(k, weightedParams(1f));
        }
        return row;
    }

    private LinearLayout buildRow3(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 46));
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

        TextView del = makeKey(ctx, "⌫", new Runnable() {
            @Override public void run() { doBackspace(); }
        });
        del.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) {
                startBackspaceRepeat();
                return true;
            }
        });
        del.setOnTouchListener(new View.OnTouchListener() {
            @Override public boolean onTouch(View v, android.view.MotionEvent e) {
                if (e.getAction() == android.view.MotionEvent.ACTION_UP
                        || e.getAction() == android.view.MotionEvent.ACTION_CANCEL) {
                    stopBackspaceRepeat();
                }
                return false;
            }
        });
        row.addView(del, weightedParams(1.5f));
        return row;
    }

    private LinearLayout buildSymRow3(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 46));
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.addView(makeKey(ctx, "≈", new Runnable() {
            @Override public void run() { typeCharacter("≈"); }
        }), weightedParams(1.5f));
        for (final String s : SYM_ROW3) {
            row.addView(makeKey(ctx, s, new Runnable() {
                @Override public void run() { typeCharacter(s); }
            }), weightedParams(1f));
        }
        row.addView(makeKey(ctx, "⌫", new Runnable() {
            @Override public void run() { doBackspace(); }
        }), weightedParams(1.5f));
        return row;
    }

    private LinearLayout buildSpecialsRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 46));
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setBackgroundColor(0xFF0F3460);
        for (final String[] pair : SPECIALS) {
            final String lower = pair[0];
            final String upper = pair[1];
            TextView k = makeKey(ctx, lower, new Runnable() {
                @Override public void run() {
                    typeCharacter(isShifted ? upper : lower);
                }
            });
            attachLongPressVariants(k, lower);
            row.addView(k, weightedParams(1f));
        }
        return row;
    }

    private LinearLayout buildNasalsRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 46));
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setBackgroundColor(0xFF0F3460);
        for (final String[] pair : NASALS) {
            final String lower = pair[0];
            final String upper = pair[1];
            TextView k = makeKey(ctx, lower, new Runnable() {
                @Override public void run() { typeCharacter(isShifted ? upper : lower); }
            });
            k.setTextColor(0xFFFFE082);
            row.addView(k, weightedParams(1f));
        }
        return row;
    }

    private LinearLayout buildCombiningRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 42));
        row.setOrientation(LinearLayout.HORIZONTAL);

        // ◌̀ ton bas
        TextView low = makeKey(ctx, "\u25CC\u0300", new Runnable() {
            @Override public void run() { toggleCombining(COMBINING_GRAVE); }
        });
        low.setTextColor(0xFFFFD166);
        row.addView(low, weightedParams(1f));

        // ◌́ ton haut
        TextView high = makeKey(ctx, "\u25CC\u0301", new Runnable() {
            @Override public void run() { toggleCombining(COMBINING_ACUTE); }
        });
        high.setTextColor(0xFFFFD166);
        row.addView(high, weightedParams(1f));

        // ◌̃ nasalisation
        TextView til = makeKey(ctx, "\u25CC\u0303", new Runnable() {
            @Override public void run() { toggleCombining(COMBINING_TILDE); }
        });
        til.setTextColor(0xFFFFD166);
        row.addView(til, weightedParams(1f));

        return row;
    }

    private void attachLongPressVariants(final TextView key, final String baseChar) {
        final String[] variants = VARIANTS.get(baseChar.toLowerCase());
        if (variants == null || variants.length == 0) return;
        key.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) {
                showVariantsPopup(v, variants);
                return true;
            }
        });
    }

    private void showVariantsPopup(View anchor, final String[] variants) {
        try {
            dismissPopup();
            Context ctx = anchor.getContext();
            LinearLayout panel = new LinearLayout(ctx);
            panel.setOrientation(LinearLayout.HORIZONTAL);
            panel.setBackgroundColor(0xFF1A1A2E);
            int pad = dp(ctx, 6);
            panel.setPadding(pad, pad, pad, pad);
            for (final String v : variants) {
                TextView b = makeKey(ctx, v, new Runnable() {
                    @Override public void run() { typeCharacter(v); dismissPopup(); }
                });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        dp(ctx, 44), dp(ctx, 44));
                lp.setMargins(4, 0, 4, 0);
                panel.addView(b, lp);
            }
            currentPopup = new PopupWindow(panel,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT, true);
            currentPopup.setOutsideTouchable(true);
            currentPopup.showAsDropDown(anchor, 0, -dp(ctx, 110));
        } catch (Throwable t) { Log.w(TAG, "popup failed", t); }
    }

    private void dismissPopup() {
        try {
            if (currentPopup != null && currentPopup.isShowing()) currentPopup.dismiss();
        } catch (Throwable ignored) {}
        currentPopup = null;
    }

    /**
     * Generic combining-mark toggle (works for ◌̀ ◌́ ◌̃).
     */
    private void toggleCombining(String mark) {
        try {
            InputConnection ic = getCurrentInputConnection();
            if (ic == null) return;
            CharSequence prev = ic.getTextBeforeCursor(1, 0);
            if (prev != null && prev.length() == 1 && prev.charAt(0) == mark.charAt(0)) {
                ic.deleteSurroundingText(1, 0);
                if (currentWord.length() > 0
                        && currentWord.charAt(currentWord.length() - 1) == mark.charAt(0)) {
                    currentWord.deleteCharAt(currentWord.length() - 1);
                }
            } else {
                ic.commitText(mark, 1);
            }
        } catch (Throwable t) { Log.w(TAG, "toggleCombining failed", t); }
    }

    private LinearLayout buildBottomRow(Context ctx, boolean symbols) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 48));
        row.setOrientation(LinearLayout.HORIZONTAL);

        // Mode switch
        TextView modeKey = makeKey(ctx, symbols ? "ABC" : "?123", new Runnable() {
            @Override public void run() {
                isSymbols = !isSymbols;
                rebuildKeyboard();
            }
        });
        row.addView(modeKey, weightedParams(1.5f));

        // Comma
        row.addView(makeKey(ctx, ",", new Runnable() {
            @Override public void run() { commitPunctuation(","); }
        }), weightedParams(1f));

        // Globe / IME picker (long-press)
        TextView globe = makeKey(ctx, "🌐", new Runnable() {
            @Override public void run() { showImePicker(); }
        });
        globe.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) {
                showImePicker();
                return true;
            }
        });
        row.addView(globe, weightedParams(1f));

        // Space
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

        // Period
        row.addView(makeKey(ctx, ".", new Runnable() {
            @Override public void run() { commitPunctuation("."); }
        }), weightedParams(1f));

        // Enter
        row.addView(makeKey(ctx, "↵", new Runnable() {
            @Override public void run() { performEnter(); }
        }), weightedParams(1.5f));

        return row;
    }

    private LinearLayout.LayoutParams weightedParams(float weight) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.MATCH_PARENT, weight);
        int m = 3;
        lp.setMargins(m, m, m, m);
        return lp;
    }

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

    // ─── Input actions ──────────────────────────────────────────────────────

    private void typeCharacter(String c) {
        try {
            String s = Normalizer.normalize(c, Normalizer.Form.NFC);
            InputConnection ic = getCurrentInputConnection();
            if (ic != null) ic.commitText(s, 1);
            // Track word only if it's a "letter-like" char (skip combining marks
            // and punctuation in the word buffer for cleaner suggestions).
            if (!s.equals(COMBINING_GRAVE) && !s.equals(COMBINING_ACUTE) && !s.equals(COMBINING_TILDE)) {
                currentWord.append(s);
            }
            updateSuggestions(currentWord.toString());
            if (isShifted) {
                isShifted = false;
                if (shiftKey != null) shiftKey.setText("⇧");
            }
        } catch (Throwable t) { Log.w(TAG, "typeCharacter failed", t); }
    }

    /**
     * Insert / remove the combining grave accent (U+0300) — "ton nasal bas".
     * It stacks visually on the previous character (even an already-accented
     * vowel like ɔ̃) producing ɔ̃̀.  Toggle behaviour: tap once to add, tap
     * again to remove the most recent grave.
     */
    private void toggleToneLow() {
        toggleCombining(COMBINING_GRAVE);
    }

    private void doBackspace() {
        try {
            InputConnection ic = getCurrentInputConnection();
            if (ic != null) ic.deleteSurroundingText(1, 0);
            if (currentWord.length() > 0) {
                currentWord.deleteCharAt(currentWord.length() - 1);
                updateSuggestions(currentWord.toString());
            }
        } catch (Throwable t) { Log.w(TAG, "backspace failed", t); }
    }

    private void startBackspaceRepeat() {
        stopBackspaceRepeat();
        backspaceRepeater = new Runnable() {
            @Override public void run() {
                doBackspace();
                handler.postDelayed(this, 55);
            }
        };
        handler.post(backspaceRepeater);
    }

    private void stopBackspaceRepeat() {
        if (backspaceRepeater != null) {
            handler.removeCallbacks(backspaceRepeater);
            backspaceRepeater = null;
        }
    }

    private void showImePicker() {
        try {
            InputMethodManager imm = (InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
            if (imm != null) imm.showInputMethodPicker();
        } catch (Throwable t) { Log.w(TAG, "showImePicker failed", t); }
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
                            if (ic != null) {
                                if (currentWord.length() > 0) {
                                    ic.deleteSurroundingText(currentWord.length(), 0);
                                }
                                ic.commitText(word + " ", 1);
                                currentWord.setLength(0);
                                saveToHistory(word);
                                updateSuggestions("");
                            }
                        } catch (Throwable t) { Log.w(TAG, "suggestion click failed", t); }
                    }
                });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.WRAP_CONTENT,
                        ViewGroup.LayoutParams.WRAP_CONTENT);
                lp.rightMargin = 12;
                bar.addView(tv, lp);
            }
        } catch (Throwable t) { Log.w(TAG, "renderSuggestionBar failed", t); }
    }

    private int dp(Context ctx, int v) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v, ctx.getResources().getDisplayMetrics());
    }
}
