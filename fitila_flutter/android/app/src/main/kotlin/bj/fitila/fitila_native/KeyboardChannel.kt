package bj.fitila.fitila_native

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.inputmethod.InputMethodManager
import com.fitila.bariba.BaribaInputMethodService
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel

/**
 * Bridge Flutter <-> Bariba IME.
 *
 * MethodChannel `fitila/keyboard`
 *   getKeyboardStatus        -> {enabled, selected, platform}
 *   openInputMethodSettings  -> opens Android "Keyboards" settings
 *   showInputMethodPicker    -> system keyboard picker
 *   syncConfig {supabaseUrl, anonKey} -> shared prefs read by the IME for remote translation
 *
 * EventChannel `fitila/keyboard/status` streams {enabled, selected} whenever the
 * user toggles the keyboard in system settings (ContentObserver on Settings.Secure).
 */
class KeyboardChannel(private val context: Context, messenger: BinaryMessenger) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val main = Handler(Looper.getMainLooper())
    private var observer: ContentObserver? = null

    init {
        MethodChannel(messenger, METHOD_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "openInputMethodSettings" -> {
                    val intent = Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    try {
                        context.startActivity(intent)
                        result.success(null)
                    } catch (e: Exception) {
                        result.error("unavailable", e.message, null)
                    }
                }
                "showInputMethodPicker" -> {
                    val manager = context.getSystemService(Context.INPUT_METHOD_SERVICE)
                        as InputMethodManager
                    manager.showInputMethodPicker()
                    result.success(null)
                }
                "getKeyboardStatus" -> result.success(status())
                "syncConfig" -> {
                    prefs.edit()
                        .putString("supabase_url", call.argument<String>("supabaseUrl") ?: "")
                        .putString("supabase_key", call.argument<String>("anonKey") ?: "")
                        .apply()
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }

        EventChannel(messenger, EVENT_CHANNEL).setStreamHandler(object : EventChannel.StreamHandler {
            override fun onListen(arguments: Any?, events: EventChannel.EventSink) {
                events.success(status())
                val obs = object : ContentObserver(main) {
                    override fun onChange(selfChange: Boolean, uri: Uri?) {
                        events.success(status())
                    }
                }
                observer = obs
                val resolver = context.contentResolver
                resolver.registerContentObserver(
                    Settings.Secure.getUriFor(Settings.Secure.ENABLED_INPUT_METHODS), false, obs)
                resolver.registerContentObserver(
                    Settings.Secure.getUriFor(Settings.Secure.DEFAULT_INPUT_METHOD), false, obs)
            }

            override fun onCancel(arguments: Any?) {
                observer?.let { context.contentResolver.unregisterContentObserver(it) }
                observer = null
            }
        })
    }

    private fun status(): Map<String, Any> {
        val component = ComponentName(context, BaribaInputMethodService::class.java).flattenToString()
        val resolver = context.contentResolver
        val enabled = Settings.Secure.getString(resolver, Settings.Secure.ENABLED_INPUT_METHODS)
            .orEmpty().split(':').any { it.substringBefore(';') == component }
        val selected = Settings.Secure.getString(resolver, Settings.Secure.DEFAULT_INPUT_METHOD)
            .orEmpty().substringBefore(';') == component
        return mapOf("enabled" to enabled, "selected" to selected, "platform" to "android")
    }

    companion object {
        const val METHOD_CHANNEL = "fitila/keyboard"
        const val EVENT_CHANNEL = "fitila/keyboard/status"
        const val PREFS = "bariba_keyboard_data"
    }
}
