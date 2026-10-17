package bj.fitila.fitila_native

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.os.StatFs

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        KeyboardChannel(applicationContext, flutterEngine.dartExecutor.binaryMessenger)
        DunyaActionChannel(applicationContext, flutterEngine.dartExecutor.binaryMessenger)
        DunyaLlmChannel(applicationContext, flutterEngine.dartExecutor.binaryMessenger)
        DunyaByt5Channel(flutterEngine.dartExecutor.binaryMessenger)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "fitila/offline/storage")
            .setMethodCallHandler { call, result ->
                if (call.method == "freeBytes") {
                    result.success(StatFs(filesDir.absolutePath).availableBytes)
                } else {
                    result.notImplemented()
                }
            }
    }
}
