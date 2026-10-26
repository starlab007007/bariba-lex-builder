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
import android.text.InputType;
import android.text.TextWatcher;
import android.util.Log;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.BaseInputConnection;
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
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

/**
 * Production-grade Bariba Fitila IME — Java implementation.
 *
 * BUILD_TAG: fitila-ime-2026-10-16-v14-byt5-copy-send
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
    private static final String BUILD_TAG = "fitila-ime-2026-10-16-v14-byt5-copy-send";
    private static final String PREFS = "bariba_keyboard_data";
    private static final int MAX_HISTORY = 50;
    private static final int MAX_SUGGESTIONS = 3;
    private static final int EDITOR_CONTEXT_CHARS = 96;
    // On smaller displays Android 15 can reserve a second navigation-bar
    // inset after it measures the IME. Make every action row reachable even
    // when the IME is confined to roughly 225dp of usable vertical space.
    private static final int COMPACT_DISPLAY_HEIGHT_DP = 780;
    private static final int COMPACT_PREDICTION_HEIGHT_DP = 80;
    private static final int REGULAR_PREDICTION_HEIGHT_DP = 92;

    private static final String COMBINING_GRAVE = "\u0300";
    private static final String COMBINING_ACUTE = "\u0301";
    private static final String COMBINING_TILDE = "\u0303";

    // Remote translation config is pushed by the Flutter app through the
    // `fitila/keyboard` MethodChannel (syncConfig) into the shared prefs, so no
    // key is hardcoded here. Without it the keyboard stays fully offline.
    private static final String PREF_SUPABASE_URL = "supabase_url";
    private static final String PREF_SUPABASE_KEY = "supabase_key";


    private static final List<String> ROW1 =
            Arrays.asList("a","z","e","r","t","y","u","i","o","p");
    private static final List<String> ROW2 =
            Arrays.asList("q","s","d","f","g","h","j","k","l","m");
    private static final List<String> ROW3 =
            Arrays.asList("w","x","c","v","b","n");

    private static final String[][] SPECIALS = new String[][] {
        {"\u0254", "\u0186"},   // ɔ Ɔ
        {"\u025B", "\u0190"},   // ɛ Ɛ
        {"\u014B", "\u014A"},   // ŋ Ŋ
        {"\u0259", "\u018F"}    // ə Ə
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
    private EditText translatorInput;
    private TextView translatorSend;
    private TextView pendingTranslation;
    private boolean translatorBusy;
    private int translationGeneration;
    private final ExecutorService translationWorker = Executors.newSingleThreadExecutor();
    private Future<?> translationTask;
    private volatile KeyboardTranslationClient activeTranslationClient;
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
        Log.i(TAG, "startInput restarting=" + restarting + " translator=" + translatorOpen
                + " target=" + (attribute == null ? "none" : attribute.packageName));
        if (!restarting && translatorOpen) closeTranslator();
        currentWord.setLength(0);
        lastCommittedWord = "";
        if (suggestionsBar != null) renderBilingualBar(Collections.emptyList());
    }

    @Override
    public void onStartInputView(EditorInfo info, boolean restarting) {
        super.onStartInputView(info, restarting);
        if (!translatorOpen) refreshSuggestionsFromEditor();
    }

    @Override
    public void onUpdateSelection(int oldSelStart, int oldSelEnd,
            int newSelStart, int newSelEnd, int candidatesStart, int candidatesEnd) {
        super.onUpdateSelection(oldSelStart, oldSelEnd, newSelStart, newSelEnd,
                candidatesStart, candidatesEnd);
        if (translatorOpen || suggestionsBar == null) return;
        if (newSelStart != newSelEnd) {
            currentWord.setLength(0);
            renderBilingualBar(Collections.emptyList());
        } else {
            refreshSuggestionsFromEditor();
        }
    }

    @Override
    public void onFinishInput() {
        if (currentWord.length() > 0) saveToHistory(currentWord.toString());
        currentWord.setLength(0);
        if (translatorOpen) closeTranslator();
        super.onFinishInput();
    }

    @Override
    public void onFinishInputView(boolean finishingInput) {
        Log.i(TAG, "finishInputView finishing=" + finishingInput + " translator=" + translatorOpen);
        stopBackspaceRepeat();
        if (translatorOpen) closeTranslator();
        super.onFinishInputView(finishingInput);
    }

    @Override
    public void onDestroy() {
        cancelTranslation();
        stopBackspaceRepeat();
        dismissPopup();
        translationWorker.shutdownNow();
        OfflineByt5.INSTANCE.release();
        super.onDestroy();
    }

    @Override
    public boolean onEvaluateFullscreenMode() { return false; }

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
        cancelTranslation();
        translatorOpen = false;
        translatorInput = null;
        root = new LinearLayout(ctx);
        root.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xFF1A1A2E);
        int pad = dp(ctx, 2);
        root.setPadding(pad, pad, pad, pad);
        // Android 15+ can draw an IME behind the system navigation bar. Keep
        // the space/translator/enter row above its touch area in both navigation
        // modes. Use the supplied insets so an already-inset parent adds none.
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override public WindowInsets onApplyWindowInsets(View view, WindowInsets insets) {
                int left, right, bottom;
                if (android.os.Build.VERSION.SDK_INT >= 30) {
                    android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.navigationBars());
                    left = bars.left; right = bars.right; bottom = bars.bottom;
                } else {
                    left = insets.getSystemWindowInsetLeft();
                    right = insets.getSystemWindowInsetRight();
                    bottom = insets.getSystemWindowInsetBottom();
                }
                view.setPadding(pad + left, pad, pad + right, pad + bottom);
                // Android 15 may apply the 48dp navigation inset after the
                // initial WRAP_CONTENT pass. Enforce a new measured minimum
                // including this inset, otherwise the last row is clipped
                // although its children exist in the view hierarchy.
                if (!translatorOpen) {
                    int letterRows = isSymbols ? 3 : 4;
                    int contentDp = (compactImeRows() ? COMPACT_PREDICTION_HEIGHT_DP : REGULAR_PREDICTION_HEIGHT_DP) + letterRows * 42 + 44;
                    int requiredHeight = dp(ctx, contentDp) + bottom + 2 * pad;
                    view.setMinimumHeight(requiredHeight);
                }
                return insets;
            }
        });
        root.addOnAttachStateChangeListener(new View.OnAttachStateChangeListener() {
            @Override public void onViewAttachedToWindow(View view) { view.requestApplyInsets(); }
            @Override public void onViewDetachedFromWindow(View view) {}
        });

        // (v10) The green auto-translation banner has been removed — only the
        // bilingual FR↔BA dictionary suggestion bar remains below.
        translationBanner = null;

        // Suggestions bar (bilingual chips: Bariba on top, FR definition below)
        suggestionsBar = new LinearLayout(ctx);
        suggestionsBar.setLayoutParams(new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(ctx, compactImeRows() ? COMPACT_PREDICTION_HEIGHT_DP
                        : REGULAR_PREDICTION_HEIGHT_DP)));
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

    private boolean compactImeRows() {
        return useCompactImeRows(getResources().getConfiguration().screenHeightDp);
    }

    static boolean useCompactImeRows(int screenHeightDp) {
        return screenHeightDp > 0 && screenHeightDp < COMPACT_DISPLAY_HEIGHT_DP;
    }

    private LinearLayout.LayoutParams rowParams(Context ctx, int heightDp) {
        int height = translatorOpen ? Math.min(heightDp, compactTranslator() ? 32 : 40)
                : (compactImeRows() ? (heightDp >= 44 ? 36 : 33) : heightDp);
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(ctx, height));
    }

    private LinearLayout buildLetterRow(Context ctx, final List<String> letters, final boolean useShift) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 42));
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
        row.setLayoutParams(rowParams(ctx, 42));
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
        row.setLayoutParams(rowParams(ctx, 42));
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

    /** Unique Bariba row: 7 nasals + 4 specials (ɔ ɛ ŋ ə) + ◌̀ combining grave. */
    private LinearLayout buildBaribaRow(Context ctx) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 42));
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
            InputConnection ic = typingConnection();
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
            if (!translatorOpen) refreshSuggestionsFromEditor();
        } catch (Throwable t) { Log.w(TAG, "toggleCombining failed", t); }
    }

    private LinearLayout buildBottomRow(Context ctx, boolean symbols) {
        LinearLayout row = new LinearLayout(ctx);
        row.setLayoutParams(rowParams(ctx, 44));
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
                if (translatorOpen) {
                    InputConnection ic = typingConnection();
                    if (ic != null) ic.commitText(" ", 1);
                    return;
                }
                if (currentWord.length() > 0) {
                    saveToHistory(currentWord.toString());
                    lastCommittedWord = currentWord.toString();
                    currentWord.setLength(0);
                }
                try {
                    InputConnection ic = typingConnection();
                    if (ic != null) ic.commitText(" ", 1);
                } catch (Throwable ignored) {}
                refreshSuggestionsFromEditor();
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
            InputConnection ic = typingConnection();
            if (ic != null) ic.commitText(s, 1);
            if (translatorOpen) {
                if (isShifted) { isShifted = false; if (shiftKey != null) shiftKey.setText("\u21E7"); }
                return;
            }
            if (!s.equals(COMBINING_GRAVE) && !s.equals(COMBINING_ACUTE)
                    && !s.equals(COMBINING_TILDE) && isWordCodePoint(s.codePointAt(0))) {
                currentWord.append(s);
            } else if (!isWordCodePoint(s.codePointAt(0))) {
                currentWord.setLength(0);
            }
            refreshSuggestionsFromEditor();
            scheduleAutoTranslate();
            if (isShifted) {
                isShifted = false;
                if (shiftKey != null) shiftKey.setText("\u21E7");
            }
        } catch (Throwable t) { Log.w(TAG, "typeCharacter failed", t); }
    }

    private void doBackspace() {
        try {
            InputConnection ic = typingConnection();
            if (ic != null) {
                CharSequence selected = ic.getSelectedText(0);
                if (selected != null && selected.length() > 0) ic.commitText("", 1);
                else {
                    CharSequence before = ic.getTextBeforeCursor(2, 0);
                    int count = before != null && before.length() > 1
                            && Character.isSurrogatePair(before.charAt(before.length() - 2), before.charAt(before.length() - 1)) ? 2 : 1;
                    ic.deleteSurroundingText(count, 0);
                }
            }
            if (translatorOpen) return;
            if (currentWord.length() > 0) {
                int end = currentWord.length();
                currentWord.delete(end - Character.charCount(
                        Character.codePointBefore(currentWord, end)), end);
            }
            refreshSuggestionsFromEditor();
            scheduleAutoTranslate();
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
        if (translatorOpen) {
            InputConnection ic = typingConnection();
            if (ic != null) ic.commitText(p, 1);
            return;
        }
        if (currentWord.length() > 0) {
            saveToHistory(currentWord.toString());
            lastCommittedWord = currentWord.toString();
            currentWord.setLength(0);
        }
        try {
            InputConnection ic = typingConnection();
            if (ic != null) ic.commitText(p, 1);
        } catch (Throwable ignored) {}
        refreshSuggestionsFromEditor();
        hideTranslationBanner();
    }

    private void performEnter() {
        if (translatorOpen) {
            if (translatorSend != null) translatorSend.performClick();
            return;
        }
        try {
            if (currentWord.length() > 0) {
                saveToHistory(currentWord.toString());
                lastCommittedWord = currentWord.toString();
                currentWord.setLength(0);
            }
            InputConnection ic = typingConnection();
            if (ic == null) return;
            EditorInfo ei = getCurrentInputEditorInfo();
            if (ei != null) ic.performEditorAction(ei.imeOptions & EditorInfo.IME_MASK_ACTION);
            else ic.commitText("\n", 1);
        } catch (Throwable t) { Log.w(TAG, "enter failed", t); }
        refreshSuggestionsFromEditor();
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
        if (!maySuggestInCurrentField()) return;
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

    /** Never predict or remember passwords, PINs, or fields opting out. */
    private boolean maySuggestInCurrentField() {
        EditorInfo info = getCurrentInputEditorInfo();
        return info == null || isPredictableInputType(info.inputType);
    }

    static boolean isPredictableInputType(int inputType) {
        int fieldClass = inputType & InputType.TYPE_MASK_CLASS;
        if (fieldClass != InputType.TYPE_CLASS_TEXT) return false;
        int variation = inputType & InputType.TYPE_MASK_VARIATION;
        return variation != InputType.TYPE_TEXT_VARIATION_PASSWORD
                && variation != InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
                && variation != InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD
                && (inputType & InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS) == 0;
    }

    private static boolean isWordCodePoint(int point) {
        int kind = Character.getType(point);
        return Character.isLetterOrDigit(point)
                || kind == Character.NON_SPACING_MARK
                || kind == Character.COMBINING_SPACING_MARK;
    }

    /** Read the word actually before the cursor, including after paste/navigation. */
    static String trailingKeyboardWord(CharSequence beforeCursor) {
        if (beforeCursor == null || beforeCursor.length() == 0) return "";
        String value = beforeCursor.toString();
        int end = value.length();
        int start = end;
        while (start > 0) {
            int cp = Character.codePointBefore(value, start);
            if (!isWordCodePoint(cp)) break;
            start -= Character.charCount(cp);
        }
        return Normalizer.normalize(value.substring(start, end), Normalizer.Form.NFC);
    }

    /** Use existing text around the cursor when the IME is opened mid-sentence. */
    static String previousKeyboardWord(CharSequence beforeCursor) {
        if (beforeCursor == null) return "";
        String value = beforeCursor.toString();
        String current = trailingKeyboardWord(value);
        String earlier = value.substring(0, value.length() - current.length()).trim();
        return trailingKeyboardWord(earlier);
    }

    private void refreshSuggestionsFromEditor() {
        if (translatorOpen || suggestionsBar == null) return;
        if (!maySuggestInCurrentField()) {
            currentWord.setLength(0);
            renderBilingualBar(Collections.emptyList());
            return;
        }
        try {
            InputConnection host = getCurrentInputConnection();
            if (host != null) {
                CharSequence context = host.getTextBeforeCursor(EDITOR_CONTEXT_CHARS, 0);
                if (context != null) {
                    currentWord.setLength(0);
                    currentWord.append(trailingKeyboardWord(context));
                    lastCommittedWord = previousKeyboardWord(context);
                }
            }
        } catch (Throwable t) { Log.w(TAG, "editor context unavailable", t); }
        updateSuggestions(currentWord.toString());
    }

    private void updateSuggestions(String partial) {
        if (!maySuggestInCurrentField()) {
            renderBilingualBar(Collections.emptyList());
            return;
        }
        try {
            BaribaDictionary dict = BaribaDictionary.get(this);
            BaribaDictionary.Prediction result = dict.predictBidirectional(
                    partial, lastCommittedWord, MAX_SUGGESTIONS);
            renderBilingualBar(result.suggestions);
        } catch (Throwable t) { Log.w(TAG, "updateSuggestions failed", t); }
    }

    /**
     * A two-line suggestion has limited horizontal space. Show the first
     * dictionary sense; a long press and TalkBack retain the complete gloss.
     */
    static String visibleFrenchGloss(String definition) {
        if (definition == null) return "";
        String value = definition.trim();
        int comma = value.indexOf(',');
        int semicolon = value.indexOf(';');
        int first = comma < 0 ? semicolon : (semicolon < 0 ? comma : Math.min(comma, semicolon));
        return first < 0 ? value : value.substring(0, first).trim();
    }

    private void renderBilingualBar(List<BaribaDictionary.Suggestion> picks) {
        final LinearLayout bar = suggestionsBar;
        if (bar == null) return;
        Context ctx = bar.getContext();
        bar.removeAllViews();
        if (picks == null || picks.isEmpty()) return;
        for (int i = 0; i < picks.size(); i++) {
            final BaribaDictionary.Suggestion e = picks.get(i);
            LinearLayout chip = new LinearLayout(ctx);
            chip.setOrientation(LinearLayout.VERTICAL);
            chip.setGravity(Gravity.CENTER);
            chip.setBackgroundColor(0xFF0F3460);
            int hp = dp(ctx, 4), vp = dp(ctx, 5);
            chip.setPadding(hp, vp, hp, vp);
            chip.setClickable(true);

            TextView ba = new TextView(ctx);
            ba.setText(e.word);
            ba.setTextColor(Color.WHITE);
            ba.setTypeface(null, Typeface.BOLD);
            ba.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f);
            ba.setGravity(Gravity.CENTER);
            ba.setMaxLines(1);
            ba.setEllipsize(android.text.TextUtils.TruncateAt.END);
            chip.addView(ba);

            TextView fr = new TextView(ctx);
            fr.setText("ba".equals(e.sourceLanguage)
                    ? visibleFrenchGloss(e.translation) : e.translation);
            fr.setTextColor(0xFFFFD54F);
            fr.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f);
            fr.setGravity(Gravity.CENTER);
            fr.setMaxLines(2);
            fr.setMinLines(2);
            fr.setIncludeFontPadding(true);
            fr.setLineSpacing(0f, 1.08f);
            fr.setEllipsize(android.text.TextUtils.TruncateAt.END);
            LinearLayout.LayoutParams flp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            flp.topMargin = dp(ctx, 3);
            chip.addView(fr, flp);

            chip.setContentDescription(e.word + ", " + e.translation);
            chip.setOnLongClickListener(new View.OnLongClickListener() {
                @Override public boolean onLongClick(View v) {
                    Toast.makeText(BaribaInputMethodService.this,
                            e.word + " : " + e.translation, Toast.LENGTH_LONG).show();
                    return true;
                }
            });
            chip.setOnClickListener(new View.OnClickListener() {
                @Override public void onClick(View v) { commitSuggestion(e.word); }
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
            InputConnection ic = typingConnection();
            if (ic == null) return;
            CharSequence selected = ic.getSelectedText(0);
            if (selected == null || selected.length() == 0) {
                CharSequence context = ic.getTextBeforeCursor(EDITOR_CONTEXT_CHARS, 0);
                String replace = context == null ? currentWord.toString() : trailingKeyboardWord(context);
                if (!replace.isEmpty()) ic.deleteSurroundingText(replace.length(), 0);
            }
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
        try { cb.onResult(translationClient().translate(text, direction)); }
        catch (Exception ignored) { cb.onResult(null); }
    }

    private boolean isNetworkAvailable() {
        try {
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return true;
            android.net.Network net = cm.getActiveNetwork();
            if (net == null) return false;
            android.net.NetworkCapabilities caps = cm.getNetworkCapabilities(net);
            return caps != null && caps.hasCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Throwable t) { return true; }
    }

    private KeyboardTranslationClient translationClient() {
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        return new KeyboardTranslationClient(prefs.getString(PREF_SUPABASE_URL, ""),
                prefs.getString(PREF_SUPABASE_KEY, ""));
    }

    private InputConnection typingConnection() {
        // An IME's current connection belongs to the host app, even when an
        // EditText inside the IME has focus. Use a local editable connection.
        if (translatorOpen && translatorInput != null) {
            return new BaseInputConnection(translatorInput, true) {
                @Override public Editable getEditable() { return translatorInput.getText(); }
            };
        }
        return getCurrentInputConnection();
    }

    private boolean compactTranslator() {
        return getResources().getConfiguration().screenHeightDp < 420;
    }

    private void cancelTranslation() {
        translationGeneration++;
        if (translationTask != null) translationTask.cancel(true);
        KeyboardTranslationClient client = activeTranslationClient;
        if (client != null) client.cancel();
        activeTranslationClient = null;
        translationTask = null;
        translatorBusy = false;
        if (pendingTranslation != null) pendingTranslation.setText("Traduction annulée. Vous pouvez réessayer.");
        pendingTranslation = null;
        if (translatorSend != null) { translatorSend.setEnabled(true); translatorSend.setAlpha(1f); }
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
            InputConnection ic = typingConnection();
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
        if (root == null || keyboardContainer == null || translatorOpen) return;
        dismissPopup();
        stopBackspaceRepeat();
        currentWord.setLength(0);
        translatorOpen = true;
        translatorPanel = buildTranslatorPanel(root.getContext());
        if (suggestionsBar != null) suggestionsBar.setVisibility(View.GONE);
        // Keep the keys visible beneath the panel: a keyboard cannot summon a
        // second system keyboard to type into its own editor.
        root.addView(translatorPanel, 0, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(root.getContext(), compactTranslator() ? 154 : 194)));
        rebuildKeyboard();
        translatorInput.requestFocus();
    }

    private void closeTranslator() {
        cancelTranslation();
        dismissPopup();
        stopBackspaceRepeat();
        if (root != null && translatorPanel != null) root.removeView(translatorPanel);
        translatorPanel = null;
        translatorInput = null;
        translatorSend = null;
        translatorOpen = false;
        currentWord.setLength(0);
        if (suggestionsBar != null) suggestionsBar.setVisibility(View.VISIBLE);
        rebuildKeyboard();
    }

    private LinearLayout buildTranslatorPanel(final Context ctx) {
        final LinearLayout panel = new LinearLayout(ctx);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackgroundColor(0xFFF5F3FA);

        // ── Header (purple, like the in-app Traducteur IA) ──
        LinearLayout header = new LinearLayout(ctx);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setBackgroundColor(0xFF7C5CFF);
        int hp = dp(ctx, 14);
        header.setPadding(hp, dp(ctx, 2), hp, dp(ctx, 2));
        TextView title = new TextView(ctx);
        title.setText("\uD83C\uDF10  Traducteur IA \u00B7 ByT5");
        title.setTextColor(Color.WHITE);
        title.setTypeface(null, Typeface.BOLD);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f);
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
        close.setContentDescription("Fermer le traducteur");
        close.setFocusable(false);
        header.addView(close);
        panel.addView(header);

        // ── Direction pills (FR→BA / BA→FR) ──
        final TextView dirFrBa = new TextView(ctx);
        final TextView dirBaFr = new TextView(ctx);
        LinearLayout dirRow = new LinearLayout(ctx);
        dirRow.setOrientation(LinearLayout.HORIZONTAL);
        dirRow.setPadding(dp(ctx, 6), 0, dp(ctx, 6), 0);
        panel.addView(dirRow, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        final Runnable applyDir = new Runnable() {
            @Override public void run() {
                boolean fr = "fr-ba".equals(translatorDirection);
                dirFrBa.setBackgroundColor(fr ? 0xFF7C5CFF : 0xFFE6E2F5);
                dirFrBa.setTextColor(fr ? Color.WHITE : 0xFF4A3A8A);
                dirBaFr.setBackgroundColor(!fr ? 0xFF7C5CFF : 0xFFE6E2F5);
                dirBaFr.setTextColor(!fr ? Color.WHITE : 0xFF4A3A8A);
            }
        };
        dirFrBa.setText("\uD83C\uDDEB\uD83C\uDDF7  FR \u2192 Baatɔnum");
        styleDirChip(ctx, dirFrBa);
        dirFrBa.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { cancelTranslation(); translatorDirection = "fr-ba"; applyDir.run(); }
        });
        dirBaFr.setText("Baatɔnum \u2192 FR  \uD83C\uDDE7\uD83C\uDDEF");
        styleDirChip(ctx, dirBaFr);
        dirBaFr.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { cancelTranslation(); translatorDirection = "ba-fr"; applyDir.run(); }
        });
        LinearLayout.LayoutParams cw = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        cw.setMargins(dp(ctx, 4), 0, dp(ctx, 4), 0);
        dirRow.addView(dirFrBa, cw);
        dirRow.addView(dirBaFr, new LinearLayout.LayoutParams(cw));
        applyDir.run();

        // ── Conversation (chat bubbles) ──
        ScrollView scroll = new ScrollView(ctx);
        scroll.setBackgroundColor(0xFFF5F3FA);
        final LinearLayout messages = new LinearLayout(ctx);
        messages.setOrientation(LinearLayout.VERTICAL);
        messages.setPadding(dp(ctx, 12), dp(ctx, 8), dp(ctx, 12), dp(ctx, 8));
        scroll.addView(messages, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        LinearLayout.LayoutParams slp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f);
        panel.addView(scroll, slp);

        // Greeting bubble
        addBotBubble(ctx, messages, "Écrivez avec les touches ci-dessous, puis appuyez sur Traduire.");

        // ── Input row (text + send) ──
        LinearLayout inputRow = new LinearLayout(ctx);
        inputRow.setOrientation(LinearLayout.HORIZONTAL);
        inputRow.setBackgroundColor(0xFFFFFFFF);
        inputRow.setPadding(dp(ctx, 10), dp(ctx, 8), dp(ctx, 10), dp(ctx, 10));
        inputRow.setGravity(Gravity.CENTER_VERTICAL);

        final EditText input = new EditText(ctx);
        translatorInput = input;
        input.setContentDescription("Texte à traduire");
        input.setShowSoftInputOnFocus(false);
        input.setFocusableInTouchMode(true);
        input.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE
                | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        input.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(5000)});
        input.setHint("Tapez votre texte\u2026");
        input.setHintTextColor(0xFF9A93B5);
        input.setTextColor(0xFF1F1638);
        input.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f);
        input.setBackgroundColor(0xFFEFECF7);
        int ip = dp(ctx, 12);
        input.setPadding(ip, dp(ctx, 10), ip, dp(ctx, 10));
        input.setMinLines(1);
        input.setMaxLines(3);
        LinearLayout.LayoutParams ilp = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        inputRow.addView(input, ilp);

        final TextView send = new TextView(ctx);
        translatorSend = send;
        send.setText("Traduire");
        send.setContentDescription("Traduire le texte");
        send.setTextColor(Color.WHITE);
        send.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f);
        send.setTypeface(null, Typeface.BOLD);
        send.setGravity(Gravity.CENTER);
        send.setBackgroundColor(0xFF7C5CFF);
        int sp = dp(ctx, 12);
        send.setPadding(dp(ctx, 16), sp, dp(ctx, 16), sp);
        send.setClickable(true);
        send.setFocusable(false);
        LinearLayout.LayoutParams selp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        selp.leftMargin = dp(ctx, 8);
        inputRow.addView(send, selp);

        panel.addView(inputRow, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        final ScrollView scrollRef = scroll;
        send.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                final String txt = input.getText() != null ? input.getText().toString().trim() : "";
                if (txt.isEmpty() || translatorBusy) return;
                final String direction = translatorDirection;
                final int generation = ++translationGeneration;
                translatorBusy = true;
                send.setEnabled(false);
                send.setAlpha(0.5f);
                addUserBubble(ctx, messages, ("ba-fr".equals(direction) ? "Baatɔnum → FR\n" : "FR → Baatɔnum\n") + txt);
                final TextView pending = addBotBubble(ctx, messages, "Traduction en cours…");
                pendingTranslation = pending;
                scrollToBottom(scrollRef);
                // Preserve the draft on failure; it remains editable while the
                // request runs, and nothing is inserted into the host implicitly.
                final KeyboardTranslationClient client = translationClient();
                activeTranslationClient = client;
                translationTask = translationWorker.submit(new Runnable() {
                    @Override public void run() {
                        String result = null;
                        String error = null;
                        boolean betaResult = false;
                        boolean offlineResult = false;
                        boolean networkIssue = false;
                        boolean networkUp = isNetworkAvailable();
                        if (networkUp || !client.isConfigured()) {
                            try { result = client.translate(txt, direction); }
                            catch (KeyboardTranslationClient.TranslationException e) {
                                error = e.getMessage();
                                networkIssue = e.connectivity;
                            }
                        } else {
                            networkIssue = true;
                        }
                        if (result == null && networkIssue) {
                            // No usable network: exact dictionary entry first, then the on-device ByT5 (beta).
                            try {
                                BaribaDictionary dict = BaribaDictionary.get(BaribaInputMethodService.this);
                                String exact = "ba-fr".equals(direction) ? dict.translateBaToFr(txt) : dict.translateFrToBa(txt);
                                if (exact != null && !exact.isEmpty()) { result = exact; offlineResult = true; }
                            } catch (Throwable ignored) { }
                            if (result == null) {
                                String model = OfflineByt5.INSTANCE.translate(BaribaInputMethodService.this, txt, direction);
                                if (model != null && !model.isEmpty()) { result = model; betaResult = true; offlineResult = true; }
                            }
                            if (result == null && !networkUp) {
                                error = OfflineByt5.INSTANCE.isInstalled(BaribaInputMethodService.this)
                                        ? "Hors ligne : le modèle n’a pas pu traduire ce texte. Essayez une phrase plus courte."
                                        : "Hors ligne : installez le modèle de traduction dans FITILA (DUNYA > Réglages) pour traduire sans Internet.";
                            }
                        }
                        final String translated = result;
                        final String failure = error;
                        final boolean beta = betaResult;
                        final boolean offlineNote = offlineResult;
                        handler.post(new Runnable() {
                            @Override public void run() {
                                if (!translatorOpen || translatorPanel != panel || generation != translationGeneration) return;
                                translatorBusy = false;
                                activeTranslationClient = null;
                                translationTask = null;
                                pendingTranslation = null;
                                send.setEnabled(true);
                                send.setAlpha(1f);
                                pending.setText(translated != null ? translated : failure);
                                if (translated != null) {
                                    attachInsertOnLongPress(pending);
                                    if (beta) addBotBubble(ctx, messages, "Hors ligne \u00b7 test (b\u00eata) : \u00e0 v\u00e9rifier avant d\u2019envoyer");
                                    else if (offlineNote) addBotBubble(ctx, messages, "Hors ligne \u00b7 dictionnaire local");
                                    addTranslationActions(messages, translated);
                                }
                                scrollToBottom(scrollRef);
                            }
                        });
                    }
                });
            }
        });

        return panel;
    }

    private TextView addBotBubble(Context ctx, LinearLayout container, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text);
        tv.setTextColor(0xFF1F1638);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        tv.setBackgroundColor(0xFFFFFFFF);
        int p = dp(ctx, 10);
        tv.setPadding(p, p, p, p);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(ctx, 4);
        lp.bottomMargin = dp(ctx, 4);
        lp.gravity = Gravity.START;
        container.addView(tv, lp);
        return tv;
    }

    private TextView addUserBubble(Context ctx, LinearLayout container, String text) {
        TextView tv = new TextView(ctx);
        tv.setText(text);
        tv.setTextColor(Color.WHITE);
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f);
        tv.setTypeface(null, Typeface.BOLD);
        tv.setBackgroundColor(0xFF7C5CFF);
        int p = dp(ctx, 10);
        tv.setPadding(p, p, p, p);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(ctx, 4);
        lp.bottomMargin = dp(ctx, 4);
        lp.gravity = Gravity.END;
        container.addView(tv, lp);
        return tv;
    }

    /**
     * A keyboard can ask the active editor to perform SEND, but cannot directly
     * transmit a WhatsApp/SMS/Messenger message itself. Only dispatch a SEND
     * action if that host field explicitly advertises IME_ACTION_SEND.
     */
    enum TranslationDelivery {
        UNAVAILABLE, INSERTED_ONLY, SEND_REQUESTED
    }

    static TranslationDelivery deliverTranslatedText(
            InputConnection host, EditorInfo editor, String translated) {
        if (host == null || translated == null || translated.trim().isEmpty()) {
            return TranslationDelivery.UNAVAILABLE;
        }
        String clean = Normalizer.normalize(translated, Normalizer.Form.NFC);
        try {
            if (!host.commitText(clean, 1)) return TranslationDelivery.UNAVAILABLE;
        } catch (Throwable t) {
            return TranslationDelivery.UNAVAILABLE;
        }
        // Never treat DONE, GO, SEARCH, ENTER or an unknown custom action as
        // "send": those can navigate, submit forms or introduce line breaks.
        if (editor != null
                && (editor.imeOptions & EditorInfo.IME_MASK_ACTION) == EditorInfo.IME_ACTION_SEND) {
            try {
                if (host.performEditorAction(EditorInfo.IME_ACTION_SEND)) {
                    return TranslationDelivery.SEND_REQUESTED;
                }
            } catch (Throwable ignored) {
                // The translation has already been inserted. Leave the user in
                // control of sending it through the app's own send button.
            }
        }
        return TranslationDelivery.INSERTED_ONLY;
    }

    /** Explicit, accessible result actions; the original draft is preserved. */
    void addTranslationActions(LinearLayout messages, final String translated) {
        if (messages == null || translated == null || translated.trim().isEmpty()) return;
        Context ctx = messages.getContext();
        LinearLayout actions = new LinearLayout(ctx);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.setGravity(Gravity.CENTER_VERTICAL);
        actions.setPadding(0, dp(ctx, 2), 0, dp(ctx, 5));

        TextView copy = translationActionButton(ctx, "Copier", "Copier la traduction",
                0xFFE9E4F5, 0xFF382864);
        copy.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { copyTranslatedText(translated); }
        });
        LinearLayout.LayoutParams weight = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        weight.rightMargin = dp(ctx, 8);
        actions.addView(copy, weight);

        TextView sendToHost = translationActionButton(ctx, "Envoyer", "Envoyer la traduction",
                0xFF7C5CFF, Color.WHITE);
        sendToHost.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                TranslationDelivery outcome = deliverTranslatedText(
                        getCurrentInputConnection(), getCurrentInputEditorInfo(), translated);
                if (outcome == TranslationDelivery.UNAVAILABLE) {
                    Toast.makeText(BaribaInputMethodService.this,
                            "Champ indisponible. Utilisez Copier.", Toast.LENGTH_LONG).show();
                    return;
                }
                // The native input connection acknowledged the send action,
                // not a delivery receipt. Never tell the user it was delivered.
                if (outcome == TranslationDelivery.SEND_REQUESTED) {
                    Toast.makeText(BaribaInputMethodService.this,
                            "Envoi demandé à l’application", Toast.LENGTH_SHORT).show();
                } else {
                    Toast.makeText(BaribaInputMethodService.this,
                            "Traduction insérée. Envoyez depuis l’application.", Toast.LENGTH_LONG).show();
                }
                sendToHost.setEnabled(false);
                if (translatorOpen) closeTranslator();
            }
        });
        actions.addView(sendToHost, new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        messages.addView(actions, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
    }

    private TextView translationActionButton(Context ctx, String label,
            String description, int background, int foreground) {
        TextView button = new TextView(ctx);
        button.setText(label);
        button.setContentDescription(description);
        button.setTextColor(foreground);
        button.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f);
        button.setTypeface(null, Typeface.BOLD);
        button.setGravity(Gravity.CENTER);
        button.setBackgroundColor(background);
        button.setPadding(dp(ctx, 10), dp(ctx, 8), dp(ctx, 10), dp(ctx, 8));
        button.setMinHeight(dp(ctx, 40));
        button.setClickable(true);
        button.setFocusable(false);
        return button;
    }

    private void copyTranslatedText(String translated) {
        try {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null) throw new IllegalStateException("clipboard unavailable");
            clipboard.setPrimaryClip(ClipData.newPlainText("Traduction FITILA",
                    Normalizer.normalize(translated, Normalizer.Form.NFC)));
            Toast.makeText(this, "Traduction copiée", Toast.LENGTH_SHORT).show();
        } catch (Throwable t) {
            Log.w(TAG, "copy translation failed", t);
            Toast.makeText(this, "Copie indisponible. Réessayez.", Toast.LENGTH_SHORT).show();
        }
    }

    private void attachInsertOnLongPress(final TextView bubble) {
        bubble.setContentDescription("Traduction reçue. Touchez pour copier, appui long pour insérer.");
        bubble.setLongClickable(true);
        bubble.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) {
                CharSequence r = bubble.getText();
                if (r == null || r.length() == 0) return false;
                try {
                    InputConnection ic = getCurrentInputConnection();
                    if (ic == null || !ic.commitText(
                            Normalizer.normalize(r.toString(), Normalizer.Form.NFC) + " ", 1)) {
                        Toast.makeText(BaribaInputMethodService.this, "Insertion impossible. Copiez la traduction.", Toast.LENGTH_SHORT).show();
                        return true;
                    }
                    Toast.makeText(BaribaInputMethodService.this, "Ins\u00E9r\u00E9", Toast.LENGTH_SHORT).show();
                } catch (Throwable ignored) {}
                return true;
            }
        });
        bubble.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) {
                try {
                    ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                    if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("traduction", bubble.getText().toString()));
                    Toast.makeText(BaribaInputMethodService.this, "Copi\u00E9 \u2022 appui long pour ins\u00E9rer", Toast.LENGTH_SHORT).show();
                } catch (Throwable ignored) {}
            }
        });
    }

    private void scrollToBottom(final ScrollView sv) {
        sv.post(new Runnable() {
            @Override public void run() { sv.fullScroll(View.FOCUS_DOWN); }
        });
    }

    private void styleDirChip(Context ctx, TextView tv) {
        tv.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13f);
        tv.setTypeface(null, Typeface.BOLD);
        tv.setGravity(Gravity.CENTER);
        tv.setPadding(0, dp(ctx, 5), 0, dp(ctx, 5));
        tv.setClickable(true);
    }

    private int dp(Context ctx, int v) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v, ctx.getResources().getDisplayMetrics());
    }
}

