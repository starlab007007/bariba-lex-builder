package com.fitila.bariba;

import android.app.Activity;
import android.os.Bundle;
import android.content.Context;
import android.view.inputmethod.InputMethodManager;
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
        TextView title = new TextView(this);
        title.setText("FITILA — Test du clavier Android"); title.setTextSize(22);
        root.addView(title);
        host = new EditText(this);
        host.setContentDescription("Application hôte : texte de test");
        host.setHint("La traduction sera insérée ici");
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
