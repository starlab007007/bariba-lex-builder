package com.fitila.bariba;

import android.app.Activity;
import android.os.Bundle;
import android.content.Context;
import android.view.inputmethod.InputMethodManager;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Debug-only host for testing the real system IME; absent from release APKs. */
public class KeyboardTestActivity extends Activity {
    private EditText host;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getSharedPreferences("bariba_keyboard_data", MODE_PRIVATE).edit()
                .putString("supabase_url", "https://dvswhjawiooprghzeyol.supabase.co")
                .putString("supabase_key", "sb_publishable_Rs6ysvbwQ0oGpHuYulZ5Hw_loUqyGKw").apply();
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(20, 30, 20, 20);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(android.view.WindowInsets.Type.systemBars());
                view.setPadding(20 + bars.left, 30 + bars.top, 20 + bars.right, 20 + bars.bottom);
            }
            return insets;
        });
        TextView title = new TextView(this);
        title.setText("FITILA — Test du clavier Android"); title.setTextSize(22);
        root.addView(title);
        host = new EditText(this);
        host.setContentDescription("Application hôte : texte de test");
        host.setHint("La traduction sera insérée ici");
        // Debug-only application host advertising SEND, so the real Android
        // keyboard can prove end-to-end dispatch without sending any network
        // message or impersonating WhatsApp/SMS.
        host.setSingleLine(true);
        host.setImeOptions(EditorInfo.IME_ACTION_SEND);
        host.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                title.setContentDescription("Application hôte : action SEND reçue");
                return true;
            }
            return false;
        });
        root.addView(host);
        setContentView(root);
        host.requestFocus();
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) host.postDelayed(() -> ((InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE))
                .showSoftInput(host, InputMethodManager.SHOW_IMPLICIT), 300);
    }
}
