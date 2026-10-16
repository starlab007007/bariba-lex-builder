package bj.fitila.fitila_native

import android.content.Context
import android.content.Intent
import android.provider.AlarmClock
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodChannel

/**
 * DUNYA "Agir" bridge: offline actions executed by the phone's own clock app.
 *
 * MethodChannel `fitila/dunya_actions`
 *   setAlarm {hour, minute, message} -> {ok, reason}
 *   setTimer {seconds, message}      -> {ok, reason}
 *
 * The alarm lives in the system clock: it rings even if FITILA is closed and
 * needs no network. DUNYA only calls these after the user confirmed by voice/tap.
 */
class DunyaActionChannel(private val context: Context, messenger: BinaryMessenger) {
    init {
        MethodChannel(messenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "setAlarm" -> {
                    val hour = call.argument<Int>("hour")
                    val minute = call.argument<Int>("minute") ?: 0
                    val message = call.argument<String>("message") ?: "DUNYA"
                    if (hour == null || hour !in 0..23 || minute !in 0..59) {
                        result.success(mapOf("ok" to false, "reason" to "invalid_time"))
                        return@setMethodCallHandler
                    }
                    val intent = Intent(AlarmClock.ACTION_SET_ALARM)
                        .putExtra(AlarmClock.EXTRA_HOUR, hour)
                        .putExtra(AlarmClock.EXTRA_MINUTES, minute)
                        .putExtra(AlarmClock.EXTRA_MESSAGE, message.take(60))
                        .putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                    result.success(launch(intent))
                }
                "setTimer" -> {
                    val seconds = call.argument<Int>("seconds")
                    val message = call.argument<String>("message") ?: "DUNYA"
                    if (seconds == null || seconds !in 1..86_400) {
                        result.success(mapOf("ok" to false, "reason" to "invalid_duration"))
                        return@setMethodCallHandler
                    }
                    val intent = Intent(AlarmClock.ACTION_SET_TIMER)
                        .putExtra(AlarmClock.EXTRA_LENGTH, seconds)
                        .putExtra(AlarmClock.EXTRA_MESSAGE, message.take(60))
                        .putExtra(AlarmClock.EXTRA_SKIP_UI, true)
                    result.success(launch(intent))
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun launch(intent: Intent): Map<String, Any> {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        if (intent.resolveActivity(context.packageManager) == null) {
            return mapOf("ok" to false, "reason" to "no_clock_app")
        }
        return try {
            context.startActivity(intent)
            mapOf("ok" to true, "reason" to "")
        } catch (error: Exception) {
            mapOf("ok" to false, "reason" to (error.message ?: "launch_failed"))
        }
    }

    companion object {
        const val CHANNEL = "fitila/dunya_actions"
    }
}
