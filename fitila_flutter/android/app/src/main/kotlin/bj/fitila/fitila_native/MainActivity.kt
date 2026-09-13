package bj.fitila.fitila_native

import android.content.Intent
import android.content.ComponentName
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "fitila/keyboard"
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "openInputMethodSettings" -> {
                    startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS))
                    result.success(null)
                }
                "showInputMethodPicker" -> {
                    val manager = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
                    manager.showInputMethodPicker()
                    result.success(null)
                }
                "getKeyboardStatus" -> {
                    val component = ComponentName(
                        this,
                        com.fitila.bariba.BaribaInputMethodService::class.java
                    ).flattenToString()
                    val enabled = Settings.Secure.getString(
                        contentResolver,
                        Settings.Secure.ENABLED_INPUT_METHODS
                    ).orEmpty().split(':').any { it.substringBefore(';') == component }
                    val selected = Settings.Secure.getString(
                        contentResolver,
                        Settings.Secure.DEFAULT_INPUT_METHOD
                    ).orEmpty().substringBefore(';') == component
                    result.success(mapOf("enabled" to enabled, "selected" to selected))
                }
                else -> result.notImplemented()
            }
        }
    }
}
