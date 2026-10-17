package bj.fitila.fitila_native

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        KeyboardChannel(applicationContext, flutterEngine.dartExecutor.binaryMessenger)
        DunyaActionChannel(applicationContext, flutterEngine.dartExecutor.binaryMessenger)
        DunyaLlmChannel(applicationContext, flutterEngine.dartExecutor.binaryMessenger)
        DunyaByt5Channel(flutterEngine.dartExecutor.binaryMessenger)
    }
}
