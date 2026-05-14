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
import android.widget.GridLayout;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONArray;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Production-grade Bariba Fitila IME — Java implementation.
 *
 * BUILD_TAG: fitila-ime-2026-05-13-smart-v8-bilingue
 *
 * v8 highlights:
 *  - Bilingual suggestion bar (Bariba word + FR translation)
 *  - Auto translation banner FR ↔ Bariba (local dict + edge function fallback)
 *  - ⚡ quick-phrases popup (2-column grid) sourced from embedded dictionary
 *  - Single nasal row + single specials row (matches reference screenshot)
 *  - Combining tones (◌̀ ◌́ ◌̃) accessible via long-press on vowels
 *  - All output is plain Unicode NFC, copy-paste safe everywhere
 */
public class BaribaInputMethodService extends InputMethodService {

    private static final String TAG = "BaribaKeyboard";
    private static final String BUILD_TAG = "fitila-ime-2026-05-13-smart-v8-bilingue";
    private static final String PREFS = "bariba_keyboard_data";
    private static final int MAX_HISTORY = 50;
    private static final int MAX_SUGGESTIONS = 3;

    private static final String COMBINING_GRAVE = "\u0300";
    private static final String COMBINING_ACUTE = "\u0301";
    private static final String COMBINING_TILDE = "\u0303";

    // Edge function URL (anon key embedded — public publishable key, safe).
    private static final String TRANSLATE_URL =
            "https://pmrhezgnyffiskbaiudb.supabase.co/functions/v1/bariba-translate";
    private static final String ANON_KEY =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcmhlemdueWZmaXNrYmFpdWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODgzNzAsImV4cCI6MjA3ODg2NDM3MH0.BRqdPly5tClRwhuQes1dckaTNQkbjIqZ5I8q6km_lZ4";

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
    private static final String[][] NASALS = new String[][] {
        {"\u00E3", "\u00C3"},          // ã Ã
        {"\u0129", "\u0128"},          // ĩ Ĩ
        {"\u0169", "\u0168"},          // ũ Ũ
        {"\u00F5", "\u00D5"},          // õ Õ
        {"\u1EBD", "\u1EBC"},          // ẽ Ẽ
        {"\u025B\u0303", "\u0190\u0303"}, // ɛ̃ Ɛ̃
        {"\u0254\u0303", "\u0186\u0303"}  // ɔ̃ Ɔ̃
    };

    // Long-press variants — includes combining tones so they remain accessible.
    private static final Map<String, String[]> VARIANTS = new HashMap<String, String[]>() {{
        put("a", new String[]{"\u00E0","\u00E1","\u00E2","\u00E4","\u00E3","\u0300","\u0301","\u0303"});
        put("e", new String[]{"\u00E8","\u00E9","\u00EA","\u00EB","\u1EBD","\u025B","\u025B\u0300","\u025B\u0301","\u025B\u0303","\u0300","\u0301","\u0303"});
        put("i", new String[]{"\u00EC","\u00ED","\u00EE","\u00EF","\u0129","\u0300","\u0301","\u0303"});
        put("o", new String[]{"\u00F2","\u00F3","\u00F4","\u00F6","\u00F5","\u0254","\u0254\u0300","\u0254\u0301","\u0254\u0303","\u0300","\u0301","\u0303"});
        put("u", new String[]{"\u00F9","\u00FA","\u00FB","\u00FC","\u0169","\u0300","\u0301","\u0303"});
        put("n", new String[]{"\u014B","\u01F9","\u00F1"});
        put("\u0254", new String[]{"\u0254\u0300","\u0254\u0301","\u0254\u0303","\u0254\u0303\u0300","\u0300","\u0301","\u0303"});
        put("\u025B", new String[]{"\u025B\u0300","\u025B\u0301","\u025B\u0303","\u025B\u0303\u0300","\u0300","\u0301","\u0303"});
    }};

    private boolean isShifted = false;
    private boolean isSymbols = false;
    private final StringBuilder currentWord = new StringBuilder();
    private String lastCommittedWord = "";

    private LinearLayout suggestionsBar;
    private TextView translationBanner;
    private LinearLayout keyboardContainer;
    private TextView shiftKey;
    private PopupWindow currentPopup;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable backspaceRepeater;
    private Runnable translateDebounce;
    private String currentTranslation = "";

    private static final List<String> SYM_ROW1 =
            Arrays.asList("1","2","3","4","5","6","7","8","9","0");
    private static final List<String> SYM_ROW2 =
            Arrays.asList("@","#","$","_","&","-","+","(",")","/");
    private static final List<String> SYM_ROW3 =
            Arrays.asList("*","\"","'",":",";","!","?","%","=");

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "onCreate BUILD_TAG=" + BUILD_TAG
                + " sdk=" + android.os.Build.VERSION.SDK_INT
                + " oem=" + android.os.Build.MANUFACTURER + "/" + android.os.Build.MODEL);
        // Pre-load the embedded dictionary off the UI thread.
        new Thread(new Runnable() {
            @Override public void run() {
                try { BaribaDictionary.get(BaribaInputMethodService.this); }
                catch (Throwable t) { Log.w(TAG, "preload dict failed", t); }
            }
        }).start();
    }

    @Override
    public void onStartInput(EditorInfo attribute, boolean restarting) {
        super.onStartInput(attribute, restarting);
        currentWord.setLength(0);
        lastCommittedWord = "";
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
        try { return buildRoot(); }
        catch (Throwable t) {
            Log.e(TAG, "onCreateInputView crashed", t);
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
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF1A1A2E);
        int pad = dp(ctx, 2);
        root.setPadding(pad, pad, pad, pad);

        // Suggestions bar (bilingual chips)
        suggestionsBar = new LinearLayout(ctx);
        suggestionsBar.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(ctx, 48)));
        suggestionsBar.setOrientation(LinearLayout.HORIZONTAL);
        suggestionsBar.setBackgroundColor(0xFF16213E);
        suggestionsBar.setGravity(Gravity.CENTER_VERTICAL);
        int h = dp(ctx, 6);
        suggestionsBar.setPadding(h, 0, h, 0);
        root.addView(suggestionsBar);

        // Translation banner (auto FR ↔ Bariba)
        translationBanner = new TextView(ctx);
        translationBanner.setTextColor(0xFFFFE082);
        translationBanner.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f);
        translationBanner.setPadding(dp(ctx, 12), dp(ctx, 6), dp(ctx, 12), dp(ctx, 6));
        translationBanner.setBackgroundColor(0xFF0F3460);
        translationBanner.setVisibility(View.GONE);
        translationBanner.setMaxLines(2);
        translationBanner.setEllipsize(android.text.TextUtils.TruncateAt.END);
        translationBanner.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { commitTranslation(); }
        });
        LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        blp.topMargin = dp(ctx, 2);
        root.addView(translationBanner, blp);

        // Keyboard
        keyboardContainer = new LinearLayout(ctx);
        keyboardContainer.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        keyboardContainer.setOrientation(LinearLayout.VERTICAL);
        root.addView(keyboardContainer);

        rebuildKeyboard();
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
            keyboardContainer.addView(buildBottomRow(ctx, true));
        } else {
            keyboardContainer.addView(buildLetterRow(ctx, ROW_DIGITS, false));
            keyboardContainer.addView(buildLetterRow(ctx, ROW1, true));
            LinearLayout row2 = buildLetterRow(ctx, ROW2, true);
            LinearLayout.LayoutParams r2 = (LinearLayout.LayoutParams) row2.getLayoutParams();
            if (r2 != null) { r2.leftMargin = dp(ctx, 12); r2.rightMargin = dp(ctx, 12); }
            keyboardContainer.addView(row2);
            keyboardContainer.addView(buildRow3(ctx));
            keyboardContainer.addView(buildNasalsRow(ctx));   // UNIQUE rangée nasales
            keyboardContainer.addView(buildSpecialsRow(ctx)); // ɔ ɛ ŋ
            keyboardContainer.addView(buildBottomRow(ctx, false));
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

        shiftKey = makeKey(ctx, "\u21E7", new Runnable() {
            @Override public void run() {
                isShifted = !isShifted;
                if (shiftKey != null) shiftKey.setText(isShifted ? "\u2B06" : "\u21E7");
            }
        });
        row.addView(shiftKey, weightedParams(1.5f));

        for (final String c : ROW3) {
            TextView k = makeKey(ctx, c, new Runnable() {
                @Override public void run() { typeCharacter(isShifted ? c.toUpperCase() : c); }
            });
            attachLongPressVariants(k, c);
            row.addView(k, weightedParams(1f));
        }

        TextView del = makeKey(ctx, "\u232B", new Runnable() {
            @Override public void run() { doBackspace(); }
        });
        del.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) { startBackspaceRepeat(); return true; }
        });
        del.setOnTouchListener(new View.OnTouchListener() {
            @Override public boolean onTouch(View v, android.view.MotionEvent e) {
                if (e.getAction() == android.view.MotionEvent.ACTION_UP
                        || e.getAction() == android.view.MotionEvent.ACTION_CANCEL) stopBackspaceRepeat();
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
        row.addView(makeKey(ctx, "\u2248", new Runnable() {
            @Override public void run() { typeCharacter("\u2248"); }
        }), weightedParams(1.5f));
        for (final String s : SYM_ROW3) {
            row.addView(makeKey(ctx, s, new Runnable() {
                @Override public void run() { typeCharacter(s); }
            }), weightedParams(1f));
        }
        row.addView(makeKey(ctx, "\u232B", new Runnable() {
            @Override public void run() { doBackspace(); }
        }), weightedParams(1.5f));
        return row;
    }

    private LinearLayout buildNasalsRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 46));
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setBackgroundColor(0xFF0F3460);
        for (final String[] pair : NASALS) {
            final String lo = pair[0]; final String up = pair[1];
            TextView k = makeKey(ctx, lo, new Runnable() {
                @Override public void run() { typeCharacter(isShifted ? up : lo); }
            });
            k.setTextColor(0xFFFFE082);
            row.addView(k, weightedParams(1f));
        }
        return row;
    }

    private LinearLayout buildSpecialsRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 46));
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setBackgroundColor(0xFF0F3460);
        for (final String[] pair : SPECIALS) {
            final String lo = pair[0]; final String up = pair[1];
            TextView k = makeKey(ctx, lo, new Runnable() {
                @Override public void run() { typeCharacter(isShifted ? up : lo); }
            });
            attachLongPressVariants(k, lo);
            row.addView(k, weightedParams(1f));
        }
        return row;
    }

    private void attachLongPressVariants(final TextView key, final String baseChar) {
        final String[] variants = VARIANTS.get(baseChar.toLowerCase());
        if (variants == null || variants.length == 0) return;
        key.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) { showVariantsPopup(v, variants); return true; }
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
                String label = v;
                if (v.length() == 1 && v.charAt(0) >= 0x0300 && v.charAt(0) <= 0x036F) {
                    label = "\u25CC" + v;
                }
                final String fLabel = label;
                TextView b = makeKey(ctx, fLabel, new Runnable() {
                    @Override public void run() {
                        if (v.length() == 1 && v.charAt(0) >= 0x0300 && v.charAt(0) <= 0x036F) {
                            toggleCombining(v);
                        } else {
                            typeCharacter(v);
                        }
                        dismissPopup();
                    }
                });
                LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(ctx, 44), dp(ctx, 44));
                lp.setMargins(4, 0, 4, 0);
                panel.addView(b, lp);
            }
            currentPopup = new PopupWindow(panel,
                    ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, true);
            currentPopup.setOutsideTouchable(true);
            currentPopup.showAsDropDown(anchor, 0, -dp(ctx, 110));
        } catch (Throwable t) { Log.w(TAG, "popup failed", t); }
    }

    private void dismissPopup() {
        try { if (currentPopup != null && currentPopup.isShowing()) currentPopup.dismiss(); }
        catch (Throwable ignored) {}
        currentPopup = null;
    }

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

        TextView modeKey = makeKey(ctx, symbols ? "ABC" : "?123", new Runnable() {
            @Override public void run() { isSymbols = !isSymbols; rebuildKeyboard(); }
        });
        row.addView(modeKey, weightedParams(1.5f));

        // ⚡ phrases rapides
        TextView quick = makeKey(ctx, "\u26A1", new Runnable() {
            @Override public void run() { showQuickPhrases(); }
        });
        quick.setTextColor(0xFFFFE082);
        row.addView(quick, weightedParams(1f));

        row.addView(makeKey(ctx, ",", new Runnable() {
            @Override public void run() { commitPunctuation(","); }
        }), weightedParams(1f));

        TextView globe = makeKey(ctx, "\uD83C\uDF10", new Runnable() {
            @Override public void run() { showImePicker(); }
        });
        globe.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) { showImePicker(); return true; }
        });
        row.addView(globe, weightedParams(1f));

        row.addView(makeKey(ctx, "espace", new Runnable() {
            @Override public void run() {
                if (currentWord.length() > 0) {
                    saveToHistory(currentWord.toString());
                    lastCommittedWord = currentWord.toString();
                    currentWord.setLength(0);
                }
                try {
                    InputConnection ic = getCurrentInputConnection();
                    if (ic != null) ic.commitText(" ", 1);
                } catch (Throwable ignored) {}
                updateSuggestions("");
                hideTranslationBanner();
            }
        }), weightedParams(3.5f));

        row.addView(makeKey(ctx, ".", new Runnable() {
            @Override public void run() { commitPunctuation("."); }
        }), weightedParams(1f));

        row.addView(makeKey(ctx, "\u21B5", new Runnable() {
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
            if (!s.equals(COMBINING_GRAVE) && !s.equals(COMBINING_ACUTE) && !s.equals(COMBINING_TILDE)) {
                currentWord.append(s);
            }
            updateSuggestions(currentWord.toString());
            scheduleAutoTranslate();
            if (isShifted) {
                isShifted = false;
                if (shiftKey != null) shiftKey.setText("\u21E7");
            }
        } catch (Throwable t) { Log.w(TAG, "typeCharacter failed", t); }
    }

    private void doBackspace() {
        try {
            InputConnection ic = getCurrentInputConnection();
            if (ic != null) ic.deleteSurroundingText(1, 0);
            if (currentWord.length() > 0) {
                currentWord.deleteCharAt(currentWord.length() - 1);
                updateSuggestions(currentWord.toString());
                scheduleAutoTranslate();
            }
        } catch (Throwable t) { Log.w(TAG, "backspace failed", t); }
    }

    private void startBackspaceRepeat() {
        stopBackspaceRepeat();
        backspaceRepeater = new Runnable() {
            @Override public void run() { doBackspace(); handler.postDelayed(this, 55); }
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
            lastCommittedWord = currentWord.toString();
            currentWord.setLength(0);
        }
        try {
            InputConnection ic = getCurrentInputConnection();
            if (ic != null) ic.commitText(p, 1);
        } catch (Throwable ignored) {}
        hideTranslationBanner();
    }

    private void performEnter() {
        try {
            if (currentWord.length() > 0) {
                saveToHistory(currentWord.toString());
                lastCommittedWord = currentWord.toString();
                currentWord.setLength(0);
            }
            InputConnection ic = getCurrentInputConnection();
            if (ic == null) return;
            EditorInfo ei = getCurrentInputEditorInfo();
            if (ei != null) ic.performEditorAction(ei.imeOptions & EditorInfo.IME_MASK_ACTION);
            else ic.commitText("\n", 1);
        } catch (Throwable t) { Log.w(TAG, "enter failed", t); }
        hideTranslationBanner();
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

    // ─── Suggestions (bilingual) ────────────────────────────────────────────

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
                if (!item.isEmpty() && !item.equals(word) && newArr.length() < MAX_HISTORY) newArr.put(item);
            }
            prefs.edit().putString("history", newArr.toString()).apply();
        } catch (Throwable t) { Log.w(TAG, "saveToHistory failed", t); }
    }

    private void updateSuggestions(String partial) {
        try {
            BaribaDictionary dict = BaribaDictionary.get(this);
            List<BaribaDictionary.Entry> picks = dict.predict(partial, lastCommittedWord, MAX_SUGGESTIONS);
            renderBilingualBar(picks);
        } catch (Throwable t) { Log.w(TAG, "updateSuggestions failed", t); }
    }

    private void renderBilingualBar(List<BaribaDictionary.Entry> picks) {
        final LinearLayout bar = suggestionsBar;
        if (bar == null) return;
        Context ctx = bar.getContext();
        bar.removeAllViews();
        if (picks == null || picks.isEmpty()) return;
        for (final BaribaDictionary.Entry e : picks) {
            LinearLayout chip = new LinearLayout(ctx);
            chip.setOrientation(LinearLayout.VERTICAL);
            chip.setGravity(Gravity.CENTER);
            chip.setBackgroundColor(0xFF0F3460);
            int hp = dp(ctx, 12), vp = dp(ctx, 4);
            chip.setPadding(hp, vp, hp, vp);
            chip.setClickable(true);

            TextView ba = new TextView(ctx);
            ba.setText(e.ba);
            ba.setTextColor(Color.WHITE);
            ba.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f);
            ba.setGravity(Gravity.CENTER);
            chip.addView(ba);

            TextView fr = new TextView(ctx);
            fr.setText(e.fr);
            fr.setTextColor(0xFFFFE082);
            fr.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f);
            fr.setGravity(Gravity.CENTER);
            fr.setMaxLines(1);
            fr.setEllipsize(android.text.TextUtils.TruncateAt.END);
            chip.addView(fr);

            chip.setOnClickListener(new View.OnClickListener() {
                @Override public void onClick(View v) { commitSuggestion(e.ba); }
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
            lp.setMargins(dp(ctx, 4), dp(ctx, 4), dp(ctx, 4), dp(ctx, 4));
            bar.addView(chip, lp);
        }
    }

    private void commitSuggestion(String word) {
        try {
            InputConnection ic = getCurrentInputConnection();
            if (ic == null) return;
            if (currentWord.length() > 0) ic.deleteSurroundingText(currentWord.length(), 0);
            ic.commitText(word + " ", 1);
            saveToHistory(word);
            lastCommittedWord = word;
            currentWord.setLength(0);
            updateSuggestions("");
            hideTranslationBanner();
        } catch (Throwable t) { Log.w(TAG, "commitSuggestion failed", t); }
    }

    // ─── Auto-translation banner ────────────────────────────────────────────

    private void scheduleAutoTranslate() {
        if (translateDebounce != null) handler.removeCallbacks(translateDebounce);
        final String word = currentWord.toString();
        if (word.length() < 2) { hideTranslationBanner(); return; }
        translateDebounce = new Runnable() {
            @Override public void run() { runAutoTranslate(word); }
        };
        handler.postDelayed(translateDebounce, 600);
    }

    private void runAutoTranslate(final String word) {
        try {
            BaribaDictionary dict = BaribaDictionary.get(this);
            boolean isBariba = word.matches(".*[\u0254\u025B\u014B\u00E3\u0129\u0169\u00F5\u1EBD].*");
            String local = isBariba ? dict.translateBaToFr(word) : dict.translateFrToBa(word);
            if (local != null && !local.isEmpty()) {
                showTranslation((isBariba ? "FR : " : "BA : ") + local, local);
                return;
            }
            // Remote fallback (best-effort, off main thread)
            final String direction = isBariba ? "ba-fr" : "fr-ba";
            new Thread(new Runnable() {
                @Override public void run() { fetchRemoteTranslation(word, direction); }
            }).start();
        } catch (Throwable t) { Log.w(TAG, "auto-translate failed", t); }
    }

    private void fetchRemoteTranslation(String word, String direction) {
        try {
            URL url = new URL(TRANSLATE_URL);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(2500);
            conn.setReadTimeout(3500);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", ANON_KEY);
            conn.setRequestProperty("Authorization", "Bearer " + ANON_KEY);
            String payload = "{\"text\":" + jsonStr(word) + ",\"direction\":\"" + direction + "\"}";
            conn.getOutputStream().write(payload.getBytes(StandardCharsets.UTF_8));
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) return;
            BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String l; while ((l = br.readLine()) != null) sb.append(l);
            br.close();
            String body = sb.toString();
            // crude extraction of "translation":"..." or "result":"..."
            String t = extractField(body, "translation");
            if (t == null) t = extractField(body, "result");
            if (t == null) t = extractField(body, "text");
            if (t == null || t.isEmpty()) return;
            final String prefix = direction.equals("ba-fr") ? "FR : " : "BA : ";
            final String txt = t;
            handler.post(new Runnable() {
                @Override public void run() { showTranslation(prefix + txt, txt); }
            });
        } catch (Throwable t) { /* silent */ }
    }

    private static String extractField(String json, String key) {
        int i = json.indexOf("\"" + key + "\"");
        if (i < 0) return null;
        int colon = json.indexOf(':', i);
        int q1 = json.indexOf('"', colon + 1);
        if (q1 < 0) return null;
        StringBuilder sb = new StringBuilder();
        boolean esc = false;
        for (int k = q1 + 1; k < json.length(); k++) {
            char c = json.charAt(k);
            if (esc) { sb.append(c); esc = false; continue; }
            if (c == '\\') { esc = true; continue; }
            if (c == '"') return sb.toString();
            sb.append(c);
        }
        return null;
    }

    private static String jsonStr(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' || c == '\\') sb.append('\\').append(c);
            else if (c == '\n') sb.append("\\n");
            else sb.append(c);
        }
        sb.append('"'); return sb.toString();
    }

    private void showTranslation(String label, String insertable) {
        if (translationBanner == null) return;
        currentTranslation = insertable;
        translationBanner.setText(label + "  \u21A9");
        translationBanner.setVisibility(View.VISIBLE);
    }

    private void hideTranslationBanner() {
        if (translationBanner != null) translationBanner.setVisibility(View.GONE);
        currentTranslation = "";
    }

    private void commitTranslation() {
        if (currentTranslation == null || currentTranslation.isEmpty()) return;
        try {
            InputConnection ic = getCurrentInputConnection();
            if (ic == null) return;
            if (currentWord.length() > 0) ic.deleteSurroundingText(currentWord.length(), 0);
            ic.commitText(Normalizer.normalize(currentTranslation, Normalizer.Form.NFC) + " ", 1);
            currentWord.setLength(0);
            hideTranslationBanner();
        } catch (Throwable t) { Log.w(TAG, "commitTranslation failed", t); }
    }

    // ─── ⚡ quick phrases popup ──────────────────────────────────────────────

    private void showQuickPhrases() {
        try {
            dismissPopup();
            Context ctx = themedContext();
            BaribaDictionary dict = BaribaDictionary.get(this);
            List<BaribaDictionary.Phrase> ph = dict.phrases();

            ScrollView scroll = new ScrollView(ctx);
            scroll.setBackgroundColor(0xFF1A1A2E);

            GridLayout grid = new GridLayout(ctx);
            grid.setColumnCount(2);
            int pad = dp(ctx, 8);
            grid.setPadding(pad, pad, pad, pad);

            for (final BaribaDictionary.Phrase p : ph) {
                LinearLayout cell = new LinearLayout(ctx);
                cell.setOrientation(LinearLayout.VERTICAL);
                cell.setBackground(makeKeyBackground());
                int cp = dp(ctx, 8);
                cell.setPadding(cp, cp, cp, cp);
                cell.setClickable(true);

                TextView ba = new TextView(ctx);
                ba.setText(p.ba);
                ba.setTextColor(Color.WHITE);
                ba.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f);
                ba.setMaxLines(2);
                ba.setEllipsize(android.text.TextUtils.TruncateAt.END);
                cell.addView(ba);

                TextView fr = new TextView(ctx);
                fr.setText(p.fr);
                fr.setTextColor(0xFFFFE082);
                fr.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10f);
                fr.setMaxLines(2);
                fr.setEllipsize(android.text.TextUtils.TruncateAt.END);
                cell.addView(fr);

                cell.setOnClickListener(new View.OnClickListener() {
                    @Override public void onClick(View v) {
                        try {
                            InputConnection ic = getCurrentInputConnection();
                            if (ic != null) ic.commitText(
                                    Normalizer.normalize(p.ba, Normalizer.Form.NFC) + " ", 1);
                        } catch (Throwable ignored) {}
                        dismissPopup();
                    }
                });

                GridLayout.LayoutParams lp = new GridLayout.LayoutParams();
                lp.width = 0;
                lp.height = ViewGroup.LayoutParams.WRAP_CONTENT;
                lp.columnSpec = GridLayout.spec(GridLayout.UNDEFINED, 1, 1f);
                lp.setMargins(dp(ctx, 4), dp(ctx, 4), dp(ctx, 4), dp(ctx, 4));
                grid.addView(cell, lp);
            }
            scroll.addView(grid);

            int w = getResources().getDisplayMetrics().widthPixels;
            currentPopup = new PopupWindow(scroll, w - dp(ctx, 16), dp(ctx, 280), true);
            currentPopup.setOutsideTouchable(true);
            View root = getWindow() != null ? getWindow().getWindow().getDecorView() : null;
            if (root != null) {
                currentPopup.showAtLocation(root, Gravity.BOTTOM, 0, dp(ctx, 60));
            }
        } catch (Throwable t) { Log.w(TAG, "showQuickPhrases failed", t); }
    }

    private int dp(Context ctx, int v) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v, ctx.getResources().getDisplayMetrics());
    }
}