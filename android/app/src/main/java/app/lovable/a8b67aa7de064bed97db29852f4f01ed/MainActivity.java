package app.lovable.a8b67aa7de064bed97db29852f4f01ed;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.fitila.bariba.BaribaKeyboardPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BaribaKeyboardPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
