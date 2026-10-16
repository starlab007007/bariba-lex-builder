package com.fitila.bariba;

import static org.junit.Assert.*;
import android.text.Editable;
import android.text.InputType;
import android.widget.LinearLayout;
import java.util.List;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.BaseInputConnection;
import android.view.inputmethod.InputConnection;
import android.widget.EditText;
import android.widget.TextView;
import java.lang.reflect.*;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.robolectric.shadows.ShadowLooper;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.android.controller.ServiceController;
import org.robolectric.annotation.Config;

@RunWith(RobolectricTestRunner.class)
@Config(manifest = Config.NONE, sdk = 34)
public class KeyboardTranslatorInputTest {
    public static class TestService extends BaribaInputMethodService {
        final Editable host = Editable.Factory.getInstance().newEditable("");
        @Override public InputConnection getCurrentInputConnection() {
            return new BaseInputConnection(new EditText(TestService.this), true) {
                @Override public Editable getEditable() { return host; }
            };
        }
    }
    private ServiceController<TestService> controller;
    private TestService service;
    private View root;
    @Before public void setUp() {
        controller = Robolectric.buildService(TestService.class).create();
        service = controller.get(); root = service.onCreateInputView();
    }
    @After public void tearDown() { controller.destroy(); }
    private Object field(String name) throws Exception {
        Field field = BaribaInputMethodService.class.getDeclaredField(name); field.setAccessible(true);
        return field.get(service);
    }
    private void call(String name) throws Exception {
        Method method = BaribaInputMethodService.class.getDeclaredMethod(name); method.setAccessible(true); method.invoke(service);
    }
    private TextView key(View view, String label) {
        if (view instanceof TextView && label.contentEquals(((TextView) view).getText())) return (TextView) view;
        if (view instanceof ViewGroup) for (int i = 0; i < ((ViewGroup) view).getChildCount(); i++) {
            TextView found = key(((ViewGroup) view).getChildAt(i), label); if (found != null) return found;
        }
        return null;
    }
    private void tap(String label) { TextView view = key(root, label); assertNotNull("Missing key " + label, view); assertTrue(view.performClick()); }
    private EditText open() throws Exception { tap("⚡"); return (EditText) field("translatorInput"); }
    @Test public void translatorKeepsTypingKeysVisibleAndRoutesThemToDraft() throws Exception {
        EditText input = open();
        assertEquals(View.VISIBLE, ((View) field("keyboardContainer")).getVisibility());
        assertFalse(input.getShowSoftInputOnFocus());
        tap("b"); tap("o"); tap("n"); tap("espace"); tap("ɔ"); tap(".");
        assertEquals("bon ɔ.", input.getText().toString());
        assertEquals("", service.host.toString());
    }
    @Test public void handlesSelectionReplacementAndDeletion() throws Exception {
        EditText input = open(); input.setText("Bonjour Aïcha 12"); input.setSelection(8, 13);
        tap("ɔ"); assertEquals("Bonjour ɔ 12", input.getText().toString());
        input.setSelection(8, 9); tap("⌫"); assertEquals("Bonjour  12", input.getText().toString());
        assertEquals("", service.host.toString());
    }
    @Test public void deletionDoesNotSplitEmojiSurrogatePair() throws Exception {
        EditText input = open(); input.setText("A😀"); input.setSelection(input.length()); tap("⌫");
        assertEquals("A", input.getText().toString());
    }
    @Test public void numericModeAndBackPreserveDraft() throws Exception {
        EditText input = open(); tap("?123"); tap("1"); tap("2"); tap("ABC"); tap("ŋ");
        assertSame(input, field("translatorInput")); assertEquals("12ŋ", input.getText().toString());
        assertEquals("", service.host.toString());
    }
    @Test public void closeRestoresHostTypingAndDoesNotLeakDraft() throws Exception {
        EditText input = open(); tap("a"); tap("⚡"); tap("b");
        assertEquals("a", input.getText().toString()); assertEquals("b", service.host.toString());
        assertNull(field("translatorInput"));
    }
    @Test public void resultInsertionExplicitlyTargetsHostEvenWithDraftFocused() throws Exception {
        EditText input = open(); input.setText("Mon brouillon");
        TextView result = new TextView(service); result.setText("ɔ̀ 12");
        Method attach = BaribaInputMethodService.class.getDeclaredMethod("attachInsertOnLongPress", TextView.class);
        attach.setAccessible(true); attach.invoke(service, result);
        assertTrue(result.performLongClick());
        assertEquals("ɔ̀ 12 ", service.host.toString()); assertEquals("Mon brouillon", input.getText().toString());
    }
    @Test public void directionChangeIgnoresLateFailureAndPreservesDraft() throws Exception {
        EditText input = open(); input.setText("Aïcha n’a pas 12 livres"); tap("Traduire");
        TextView pending = (TextView) field("pendingTranslation");
        ((Future<?>) field("translationTask")).get(3, TimeUnit.SECONDS);
        tap("Baatɔnum → FR  🇧🇯");
        ShadowLooper.idleMainLooper();
        assertEquals("Traduction annulée. Vous pouvez réessayer.", pending.getText().toString());
        assertTrue(((TextView) field("translatorSend")).isEnabled());
        assertEquals("Aïcha n’a pas 12 livres", input.getText().toString());
        assertEquals("", service.host.toString());
    }
    @Test public void visibleFailurePreservesDraftAndAllowsRetryWithoutInsertingError() throws Exception {
        EditText input = open(); tap("a"); tap("Traduire");
        ((Future<?>) field("translationTask")).get(3, TimeUnit.SECONDS);
        ShadowLooper.idleMainLooper();
        assertEquals("a", input.getText().toString());
        assertTrue(((TextView) field("translatorSend")).isEnabled());
        TextView error = key(root, "Ouvrez l’application FITILA pour activer la traduction du clavier, puis réessayez.");
        assertNotNull(error); assertFalse(error.isLongClickable());
        assertEquals("", service.host.toString());
        tap("Traduire"); assertNotNull(field("pendingTranslation"));
    }
    @Test public void closedPanelCannotReceiveAReplyAfterReopening() throws Exception {
        open(); tap("a"); tap("Traduire");
        ((Future<?>) field("translationTask")).get(3, TimeUnit.SECONDS);
        tap("⚡"); EditText next = open(); tap("b");
        ShadowLooper.idleMainLooper();
        assertEquals("b", next.getText().toString());
        assertNull(key(root, "Ouvrez l’application FITILA pour activer la traduction du clavier, puis réessayez."));
        assertEquals("", service.host.toString());
    }
    @Test public void finishInputViewClosesPanelAndCancelsPendingRequest() throws Exception {
        open(); int before = (Integer) field("translationGeneration"); service.onFinishInputView(false);
        assertNull(field("translatorInput")); assertFalse((Boolean) field("translatorOpen"));
        assertTrue((Integer) field("translationGeneration") > before);
    }
    @Test public void navigationInsetIsReservedWithoutAccumulatingPadding() {
        int original = root.getPaddingBottom();
        android.view.WindowInsets insets = new android.view.WindowInsets.Builder()
            .setInsets(android.view.WindowInsets.Type.navigationBars(), android.graphics.Insets.of(0, 0, 0, 48)).build();
        root.dispatchApplyWindowInsets(insets);
        assertEquals(original + 48, root.getPaddingBottom());
        root.dispatchApplyWindowInsets(insets);
        assertEquals(original + 48, root.getPaddingBottom());
        root.dispatchApplyWindowInsets(new android.view.WindowInsets.Builder()
            .setInsets(android.view.WindowInsets.Type.navigationBars(), android.graphics.Insets.NONE).build());
        assertEquals(original, root.getPaddingBottom());
    }
    @Test public void landscapeNavigationInsetProtectsSideKeys() {
        int original = root.getPaddingRight();
        root.dispatchApplyWindowInsets(new android.view.WindowInsets.Builder()
            .setInsets(android.view.WindowInsets.Type.navigationBars(), android.graphics.Insets.of(0, 0, 48, 0)).build());
        assertEquals(original + 48, root.getPaddingRight());
        assertEquals(original, root.getPaddingLeft());
    }
    @Test public void translatorDraftIsNotSavedToKeyboardHistory() throws Exception {
        open(); tap("a"); tap("b"); tap("espace"); tap(".");
        assertEquals("[]", service.getSharedPreferences("bariba_keyboard_data", 0).getString("history", "[]"));
    }
    @Test public void bilingualSuggestionsShowWordOverActualFrenchMeaning() throws Exception {
        View keyboard = (View) field("keyboardContainer");
        for (String letter : new String[]{"s", "i", "a"}) {
            TextView letterKey = key(keyboard, letter);
            assertNotNull(letterKey);
            assertTrue(letterKey.performClick());
        }
        LinearLayout bar = (LinearLayout) field("suggestionsBar");
        assertEquals(3, bar.getChildCount());
        assertTrue("Two-line candidates must remain visible even with adaptive height",
                bar.getLayoutParams().height >= 48);
        LinearLayout first = (LinearLayout) bar.getChildAt(0);
        assertEquals("sia", ((TextView) first.getChildAt(0)).getText().toString());
        assertEquals("demain", ((TextView) first.getChildAt(1)).getText().toString());
        assertEquals("sia, demain", first.getContentDescription().toString());
        assertEquals("siara", ((TextView) ((LinearLayout) bar.getChildAt(1))
                .getChildAt(0)).getText().toString());
        assertEquals("remercier", ((TextView) ((LinearLayout) bar.getChildAt(1))
                .getChildAt(1)).getText().toString());
        assertEquals("faire vomir", BaribaInputMethodService.visibleFrenchGloss("faire vomir"));
        assertEquals("remercier", BaribaInputMethodService.visibleFrenchGloss("remercier, louer, féliciter"));
        assertTrue(first.performClick());
        assertEquals("sia ", service.host.toString());
    }

    @Test public void embeddedDictionaryPrefersExactBaatonumAndSuppressesLexicographicDigits() {
        List<BaribaDictionary.Entry> words = BaribaDictionary.get(service).predict("sia", "", 3);
        assertEquals(3, words.size());
        assertEquals("sia", words.get(0).keyboardWord());
        assertEquals("demain", words.get(0).fr);
        assertEquals("siara", words.get(1).keyboardWord());
        assertEquals("siasia", words.get(2).keyboardWord());
        assertEquals("demain", BaribaDictionary.get(service).translateBaToFr("sia"));
    }

    @Test public void predictionsTrackWordBeforeCursorWithAccentsAndPunctuation() {
        assertEquals("siara", BaribaInputMethodService.trailingKeyboardWord("Bonjour siara"));
        assertEquals("ɔ̃", BaribaInputMethodService.trailingKeyboardWord("Bonjour, ɔ̃"));
        assertEquals("siasia", BaribaInputMethodService.trailingKeyboardWord("écrire ✨ siasia"));
        assertEquals("", BaribaInputMethodService.trailingKeyboardWord("Bonjour !"));
    }

    @Test public void suggestionEligibilityRejectsPasswordAndNumericFields() {
        assertFalse(BaribaInputMethodService.isPredictableInputType(
                InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD));
        assertFalse(BaribaInputMethodService.isPredictableInputType(
                InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD));
        assertFalse(BaribaInputMethodService.isPredictableInputType(
                InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_VARIATION_PASSWORD));
        assertFalse(BaribaInputMethodService.isPredictableInputType(
                InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS));
        assertTrue(BaribaInputMethodService.isPredictableInputType(
                InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_NORMAL));
    }

    @Test public void detectsFrenchWordAndDisplaysBaatonumUnderFrenchCandidate() throws Exception {
        View keyboard = (View) field("keyboardContainer");
        for (char letter : "demain".toCharArray()) {
            TextView key = key(keyboard, String.valueOf(letter));
            assertNotNull(key);
            assertTrue(key.performClick());
        }
        LinearLayout bar = (LinearLayout) field("suggestionsBar");
        assertTrue(bar.getChildCount() > 0);
        LinearLayout first = (LinearLayout) bar.getChildAt(0);
        assertEquals("demain", ((TextView) first.getChildAt(0)).getText().toString());
        assertEquals("sia", ((TextView) first.getChildAt(1)).getText().toString());
        assertEquals("demain, sia", first.getContentDescription().toString());
        assertTrue(first.performClick());
        assertEquals("demain ", service.host.toString());
    }

    @Test public void compactKeyboardKeepsBottomActionsInViewHierarchy() throws Exception {
        assertNotNull(key(root, "⚡"));
        assertNotNull(key(root, "espace"));
        assertNotNull(key(root, "↵"));
        LinearLayout container = (LinearLayout) field("keyboardContainer");
        assertEquals(5, container.getChildCount());
        int keyTotal = 0;
        for (int i = 0; i < container.getChildCount(); i++) {
            keyTotal += container.getChildAt(i).getLayoutParams().height;
        }
        assertTrue(keyTotal > 0);
    }

    @Test public void autoDirectionUsesFrenchAndBaatonumConfirmedEntries() {
        BaribaDictionary dict = BaribaDictionary.get(service);
        BaribaDictionary.Prediction fr = dict.predictBidirectional("demain", "", 3);
        assertEquals("fr", fr.detectedLanguage);
        assertEquals("demain", fr.suggestions.get(0).word);
        assertEquals("sia", fr.suggestions.get(0).translation);
        assertEquals("fr", fr.suggestions.get(0).sourceLanguage);

        BaribaDictionary.Prediction ba = dict.predictBidirectional("sia", "", 3);
        assertEquals("ba", ba.detectedLanguage);
        assertEquals("sia", ba.suggestions.get(0).word);
        assertEquals("demain", ba.suggestions.get(0).translation);
        assertEquals("ba", ba.suggestions.get(0).sourceLanguage);

        BaribaDictionary.Prediction thanks = dict.predictBidirectional("remercier", "", 3);
        assertEquals("fr", thanks.detectedLanguage);
        assertEquals("siara", thanks.suggestions.get(0).translation);
        assertEquals("siara", dict.translateFrToBa("remercier"));
    }

    @Test public void prefixPredictionRecognizesFrenchWithoutLanguageToggle() {
        BaribaDictionary dict = BaribaDictionary.get(service);
        BaribaDictionary.Prediction fr = dict.predictBidirectional("dem", "", 3);
        assertTrue("Incomplete ambiguous words must be handled without switching modes",
                "fr".equals(fr.detectedLanguage) || "ambiguous".equals(fr.detectedLanguage));
        assertTrue(fr.suggestions.stream().anyMatch(s -> "demain".equals(s.word) && "sia".equals(s.translation)));
        BaribaDictionary.Prediction ba = dict.predictBidirectional("sia", "", 3);
        assertEquals("ba", ba.detectedLanguage);
    }

    @Test public void hostTextContextIsUsedWhenTypingInAnExistingSentence() {
        assertEquals("demain", BaribaInputMethodService.previousKeyboardWord("bonjour demain si"));
        assertEquals("sia", BaribaInputMethodService.previousKeyboardWord("bonjour sia siara"));
        assertEquals("demain", BaribaInputMethodService.previousKeyboardWord("demain "));
        assertEquals("", BaribaInputMethodService.previousKeyboardWord("siara"));
    }

    @Test public void noInventedTranslationsOnUnknownWords() {
        BaribaDictionary dict = BaribaDictionary.get(service);
        BaribaDictionary.Prediction unknown = dict.predictBidirectional("zzzzzzz", "", 3);
        assertEquals("unknown", unknown.detectedLanguage);
        assertTrue(unknown.suggestions.isEmpty());
        assertNull(dict.translateFrToBa("zzzzzzz"));
        assertEquals("", BaribaDictionary.frenchHeadword("faire vomir"));
        assertEquals("venir", BaribaDictionary.frenchHeadword("venir (présent)"));
    }

}
