package com.fitila.bariba;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.StateListDrawable;
import android.inputmethodservice.InputMethodService;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

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
 * BUILD_TAG: fitila-ime-2026-05-15-smart-v10-chatbot
 *
 * v10 highlights:
 *  - Auto green translation banner REMOVED (FR↔BA dictionary stays in suggestion bar).
 *  - Bilingual suggestion chips: Bariba (white) + FR definition (yellow, 2 lines, fully visible).
 *  - ⚡ opens an inline AI chatbot translator (light theme, ~320dp tall, like the in-app
 *    Traducteur IA / ByT5 module). Second tap closes it.
 *  - All output is plain Unicode NFC, copy-paste safe everywhere.
 */
public class BaribaInputMethodService extends InputMethodService {

    private static final String TAG = "BaribaKeyboard";
    private static final String BUILD_TAG = "fitila-ime-2026-05-15-smart-v10-chatbot";
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

    // Long-press variants — combining tones (◌̀ ◌́ ◌̃) remain available here.
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
    private boolean translatorOpen = false;
    private final StringBuilder currentWord = new StringBuilder();
    private String lastCommittedWord = "";

    private LinearLayout root;
    private LinearLayout suggestionsBar;
    private TextView translationBanner;
    private LinearLayout keyboardContainer;
    private LinearLayout translatorPanel;
    private TextView shiftKey;
    private TextView quickKey; // ⚡
    private PopupWindow currentPopup;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable backspaceRepeater;
    private Runnable translateDebounce;
    private String currentTranslation = "";
    private String currentTranslationSource = "";
    private String translatorDirection = "fr-ba";

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
        if (translatorOpen) closeTranslator();
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
        root = new LinearLayout(ctx);
        root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF1A1A2E);
        int pad = dp(ctx, 2);
        root.setPadding(pad, pad, pad, pad);

        // (v10) The green auto-translation banner has been removed — only the
        // bilingual FR↔BA dictionary suggestion bar remains below.
        translationBanner = null;

        // Suggestions bar (bilingual chips: Bariba on top, FR definition below)
        suggestionsBar = new LinearLayout(ctx);
        suggestionsBar.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(ctx, 78)));
        suggestionsBar.setOrientation(LinearLayout.HORIZONTAL);
        suggestionsBar.setBackgroundColor(0xFF0F3460);
        suggestionsBar.setGravity(Gravity.CENTER_VERTICAL);
        int h = dp(ctx, 4);
        suggestionsBar.setPadding(h, h, h, h);
        root.addView(suggestionsBar);

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
            // 5 rows total
            keyboardContainer.addView(buildLetterRow(ctx, ROW1, true));   // 1
            LinearLayout row2 = buildLetterRow(ctx, ROW2, true);          // 2
            LinearLayout.LayoutParams r2 = (LinearLayout.LayoutParams) row2.getLayoutParams();
            if (r2 != null) { r2.leftMargin = dp(ctx, 12); r2.rightMargin = dp(ctx, 12); }
            keyboardContainer.addView(row2);
            keyboardContainer.addView(buildRow3(ctx));                     // 3
            keyboardContainer.addView(buildBaribaRow(ctx));                // 4 — UNIQUE Bariba row
            keyboardContainer.addView(buildBottomRow(ctx, false));         // 5
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

    /** Unique Bariba row: 7 nasals (jaune) + 3 specials (ɔ ɛ ŋ) + ◌̀ combining grave. */
    private LinearLayout buildBaribaRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 46));
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setBackgroundColor(0xFF0F3460);

        for (final String[] pair : NASALS) {
            final String lo = pair[0]; final String up = pair[1];
            TextView k = makeKey(ctx, lo, new Runnable() {
                @Override public void run() { typeCharacter(isShifted ? up : lo); }
            });
            k.setTextColor(0xFFFFD54F);
            row.addView(k, weightedParams(1f));
        }
        for (final String[] pair : SPECIALS) {
            final String lo = pair[0]; final String up = pair[1];
            TextView k = makeKey(ctx, lo, new Runnable() {
                @Override public void run() { typeCharacter(isShifted ? up : lo); }
            });
            attachLongPressVariants(k, lo);
            row.addView(k, weightedParams(1f));
        }
        // ◌̀ combining low-tone grave — applies to plain or already-accented vowels (NFC).
        TextView graveKey = makeKey(ctx, "\u25CC\u0300", new Runnable() {
            @Override public void run() { toggleCombining(COMBINING_GRAVE); }
        });
        graveKey.setTextColor(0xFFFFD54F);
        row.addView(graveKey, weightedParams(1f));
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
                // NFC normalize last char + mark to compose properly
                CharSequence prev2 = ic.getTextBeforeCursor(2, 0);
                if (prev2 != null && prev2.length() >= 1) {
                    String composed = Normalizer.normalize(prev2.toString() + mark, Normalizer.Form.NFC);
                    ic.deleteSurroundingText(prev2.length(), 0);
                    ic.commitText(composed, 1);
                } else {
                    ic.commitText(mark, 1);
                }
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

        // ⚡ toggle integrated AI Translator
        quickKey = makeKey(ctx, "\u26A1", new Runnable() {
            @Override public void run() { toggleTranslator(); }
        });
        quickKey.setTextColor(translatorOpen ? 0xFFFFD54F : 0xFFFFFFFF);
        row.addView(quickKey, weightedParams(1f));

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
        for (int i = 0; i < picks.size(); i++) {
            final BaribaDictionary.Entry e = picks.get(i);
            LinearLayout chip = new LinearLayout(ctx);
            chip.setOrientation(LinearLayout.VERTICAL);
            chip.setGravity(Gravity.CENTER);
            chip.setBackgroundColor(0xFF0F3460);
            int hp = dp(ctx, 6), vp = dp(ctx, 6);
            chip.setPadding(hp, vp, hp, vp);
            chip.setClickable(true);

            TextView ba = new TextView(ctx);
            ba.setText(e.ba);
            ba.setTextColor(Color.WHITE);
            ba.setTypeface(null, Typeface.BOLD);
            ba.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f);
            ba.setGravity(Gravity.CENTER);
            ba.setMaxLines(1);
            ba.setEllipsize(android.text.TextUtils.TruncateAt.END);
            chip.addView(ba);

            TextView fr = new TextView(ctx);
            fr.setText(e.fr);
            fr.setTextColor(0xFFFFD54F);
            fr.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f);
            fr.setGravity(Gravity.CENTER);
            fr.setMaxLines(2);
            fr.setEllipsize(android.text.TextUtils.TruncateAt.END);
            LinearLayout.LayoutParams flp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            flp.topMargin = dp(ctx, 3);
            chip.addView(fr, flp);

            chip.setOnClickListener(new View.OnClickListener() {
                @Override public void onClick(View v) { commitSuggestion(e.ba); }
            });
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
            int m = dp(ctx, 3);
            lp.setMargins(m, m, m, m);
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
        // (v10) Auto green translation banner removed — no-op.
        if (translateDebounce != null) handler.removeCallbacks(translateDebounce);
    }

    private void runAutoTranslate(final String word) {
        try {
            BaribaDictionary dict = BaribaDictionary.get(this);
            boolean isBariba = word.matches(".*[\u0254\u025B\u014B\u00E3\u0129\u0169\u00F5\u1EBD].*");
            String local = isBariba ? dict.translateBaToFr(word) : dict.translateFrToBa(word);
            if (local != null && !local.isEmpty()) {
                showTranslation(word, local, isBariba);
                return;
            }
            final String direction = isBariba ? "ba-fr" : "fr-ba";
            final boolean fromBariba = isBariba;
            new Thread(new Runnable() {
                @Override public void run() {
                    fetchRemoteTranslation(word, direction, new RemoteTranslateCallback() {
                        @Override public void onResult(final String translated) {
                            handler.post(new Runnable() {
                                @Override public void run() { showTranslation(word, translated, fromBariba); }
                            });
                        }
                    });
                }
            }).start();
        } catch (Throwable t) { Log.w(TAG, "auto-translate failed", t); }
    }

    private interface RemoteTranslateCallback { void onResult(String translated); }

    private void fetchRemoteTranslation(String text, String direction, RemoteTranslateCallback cb) {
        try {
            URL url = new URL(TRANSLATE_URL);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(2500);
            conn.setReadTimeout(4000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", ANON_KEY);
            conn.setRequestProperty("Authorization", "Bearer " + ANON_KEY);
            String payload = "{\"text\":" + jsonStr(text) + ",\"direction\":\"" + direction + "\"}";
            conn.getOutputStream().write(payload.getBytes(StandardCharsets.UTF_8));
            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) return;
            BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            String l; while ((l = br.readLine()) != null) sb.append(l);
            br.close();
            String body = sb.toString();
            String t = extractField(body, "translation");
            if (t == null) t = extractField(body, "result");
            if (t == null) t = extractField(body, "text");
            if (t == null || t.isEmpty()) return;
            cb.onResult(t);
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

    private void showTranslation(String source, String translated, boolean fromBariba) {
        // (v10) Banner removed — no-op kept for binary compat.
    }

    private void hideTranslationBanner() {
        currentTranslation = "";
        currentTranslationSource = "";
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

    // ─── ⚡ Integrated AI Translator panel ───────────────────────────────────

    private void toggleTranslator() {
        if (translatorOpen) closeTranslator();
        else openTranslator();
    }

    private void openTranslator() {
        try {
            if (root == null || keyboardContainer == null) return;
            Context ctx = root.getContext();
            translatorPanel = buildTranslatorPanel(ctx);
            keyboardContainer.setVisibility(View.GONE);
            if (suggestionsBar != null) suggestionsBar.setVisibility(View.GONE);
            root.addView(translatorPanel, new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
            translatorOpen = true;
            if (quickKey != null) quickKey.setTextColor(0xFFFFD54F);
        } catch (Throwable t) { Log.w(TAG, "openTranslator failed", t); }
    }

    private void closeTranslator() {
        try {
            if (root != null && translatorPanel != null) {
                root.removeView(translatorPanel);
            }
            translatorPanel = null;
            if (keyboardContainer != null) keyboardContainer.setVisibility(View.VISIBLE);
            if (suggestionsBar != null) suggestionsBar.setVisibility(View.VISIBLE);
            translatorOpen = false;
            if (quickKey != null) quickKey.setTextColor(0xFFFFFFFF);
        } catch (Throwable t) { Log.w(TAG, "closeTranslator failed", t); }
    }

    private LinearLayout buildTranslatorPanel(final Context ctx) {
        final LinearLayout panel = new LinearLayout(ctx);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackgroundColor(0xFF1A1A2E);
        int p = dp(ctx, 10);
        panel.setPadding(p, p, p, p);

        // Header
        LinearLayout header = new LinearLayout(ctx);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setBackgroundColor(0xFF0F3460);
        int hp = dp(ctx, 12);
        header.setPadding(hp, dp(ctx, 8), hp, dp(ctx, 8));
        TextView title = new TextView(ctx);
        title.setText("\u26A1  Traducteur IA \u00B7 FR \u2194 Bariba");
        title.setTextColor(Color.WHITE);
        title.setTypeface(null, Typeface.BOLD);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        LinearLayout.LayoutParams tlp = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        header.addView(title, tlp);
        TextView close = new TextView(ctx);
        close.setText("\u2715");
        close.setTextColor(Color.WHITE);
        close.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f);
        close.setPadding(dp(ctx, 12), dp(ctx, 4), dp(ctx, 12), dp(ctx, 4));
        close.setClickable(true);
        close.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { closeTranslator(); }
        });
        header.addView(close);
        panel.addView(header);

        // Direction selector
        final TextView dirFrBa = new TextView(ctx);
        final TextView dirBaFr = new TextView(ctx);
        LinearLayout dirRow = new LinearLayout(ctx);
        dirRow.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams drlp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        drlp.topMargin = dp(ctx, 8);
        panel.addView(dirRow, drlp);

        final Runnable applyDir = new Runnable() {
            @Override public void run() {
                boolean fr = "fr-ba".equals(translatorDirection);
                dirFrBa.setBackgroundColor(fr ? 0xFF1A6E5A : 0xFF2D2D5E);
                dirBaFr.setBackgroundColor(!fr ? 0xFF1A6E5A : 0xFF2D2D5E);
            }
        };

        dirFrBa.setText("FR \u2192 BA");
        styleDirChip(ctx, dirFrBa);
        dirFrBa.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { translatorDirection = "fr-ba"; applyDir.run(); }
        });
        dirBaFr.setText("BA \u2192 FR");
        styleDirChip(ctx, dirBaFr);
        dirBaFr.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { translatorDirection = "ba-fr"; applyDir.run(); }
        });
        LinearLayout.LayoutParams cw = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        cw.setMargins(dp(ctx, 4), 0, dp(ctx, 4), 0);
        dirRow.addView(dirFrBa, cw);
        dirRow.addView(dirBaFr, new LinearLayout.LayoutParams(cw));
        applyDir.run();

        // Source input
        final EditText input = new EditText(ctx);
        input.setHint("Tapez le texte \u00E0 traduire\u2026");
        input.setHintTextColor(0xFF8A8AA8);
        input.setTextColor(Color.WHITE);
        input.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f);
        input.setBackgroundColor(0xFF16213E);
        int ip = dp(ctx, 10);
        input.setPadding(ip, ip, ip, ip);
        input.setMinLines(2);
        input.setMaxLines(3);
        LinearLayout.LayoutParams ilp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        ilp.topMargin = dp(ctx, 8);
        panel.addView(input, ilp);

        // Translate button + result
        final TextView result = new TextView(ctx);
        result.setText("");
        result.setTextColor(Color.WHITE);
        result.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f);
        result.setBackgroundColor(0xFF16213E);
        result.setPadding(ip, ip, ip, ip);
        result.setMinLines(2);

        TextView translateBtn = new TextView(ctx);
        translateBtn.setText("Traduire");
        translateBtn.setTextColor(Color.WHITE);
        translateBtn.setTypeface(null, Typeface.BOLD);
        translateBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f);
        translateBtn.setGravity(Gravity.CENTER);
        translateBtn.setBackgroundColor(0xFF1A6E5A);
        translateBtn.setPadding(0, dp(ctx, 12), 0, dp(ctx, 12));
        translateBtn.setClickable(true);
        LinearLayout.LayoutParams blp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        blp.topMargin = dp(ctx, 8);
        panel.addView(translateBtn, blp);

        LinearLayout.LayoutParams rlp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        rlp.topMargin = dp(ctx, 8);
        panel.addView(result, rlp);

        translateBtn.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                final String txt = input.getText() != null ? input.getText().toString().trim() : "";
                if (txt.isEmpty()) return;
                result.setText("\u2026");
                // Try local first
                try {
                    BaribaDictionary dict = BaribaDictionary.get(BaribaInputMethodService.this);
                    String local = "ba-fr".equals(translatorDirection)
                            ? dict.translateBaToFr(txt) : dict.translateFrToBa(txt);
                    if (local != null && !local.isEmpty()) { result.setText(local); return; }
                } catch (Throwable ignored) {}
                // Remote
                new Thread(new Runnable() {
                    @Override public void run() {
                        fetchRemoteTranslation(txt, translatorDirection, new RemoteTranslateCallback() {
                            @Override public void onResult(final String translated) {
                                handler.post(new Runnable() {
                                    @Override public void run() {
                                        result.setText(translated != null && !translated.isEmpty()
                                                ? translated : "(pas de traduction)");
                                    }
                                });
                            }
                        });
                        handler.postDelayed(new Runnable() {
                            @Override public void run() {
                                if ("\u2026".contentEquals(result.getText()))
                                    result.setText("(pas de traduction)");
                            }
                        }, 4500);
                    }
                }).start();
            }
        });

        // Action buttons
        LinearLayout actions = new LinearLayout(ctx);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout.LayoutParams alp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        alp.topMargin = dp(ctx, 8);
        panel.addView(actions, alp);

        TextView insertBtn = new TextView(ctx);
        insertBtn.setText("Ins\u00E9rer");
        styleActionBtn(ctx, insertBtn, 0xFF2D2D5E);
        insertBtn.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                CharSequence r = result.getText();
                if (r == null || r.length() == 0) return;
                try {
                    InputConnection ic = getCurrentInputConnection();
                    if (ic != null) ic.commitText(
                            Normalizer.normalize(r.toString(), Normalizer.Form.NFC) + " ", 1);
                } catch (Throwable ignored) {}
                closeTranslator();
            }
        });

        TextView copyBtn = new TextView(ctx);
        copyBtn.setText("Copier");
        styleActionBtn(ctx, copyBtn, 0xFF2D2D5E);
        copyBtn.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                CharSequence r = result.getText();
                if (r == null || r.length() == 0) return;
                try {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("traduction", r.toString()));
                    Toast.makeText(BaribaInputMethodService.this, "Copi\u00E9", Toast.LENGTH_SHORT).show();
                } catch (Throwable ignored) {}
            }
        });

        LinearLayout.LayoutParams hw = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        hw.setMargins(dp(ctx, 4), 0, dp(ctx, 4), 0);
        actions.addView(insertBtn, hw);
        actions.addView(copyBtn, new LinearLayout.LayoutParams(hw));

        return panel;
    }

    private void styleDirChip(Context ctx, TextView tv) {
        tv.setTextColor(Color.WHITE);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        tv.setGravity(Gravity.CENTER);
        tv.setPadding(0, dp(ctx, 10), 0, dp(ctx, 10));
        tv.setClickable(true);
    }

    private void styleActionBtn(Context ctx, TextView tv, int bg) {
        tv.setTextColor(Color.WHITE);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        tv.setTypeface(null, Typeface.BOLD);
        tv.setGravity(Gravity.CENTER);
        tv.setBackgroundColor(bg);
        tv.setPadding(0, dp(ctx, 12), 0, dp(ctx, 12));
        tv.setClickable(true);
    }

    private int dp(Context ctx, int v) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v, ctx.getResources().getDisplayMetrics());
    }
}
