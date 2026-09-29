import Flutter
import UIKit

/// Flutter <-> FITILA Bariba keyboard extension bridge (iOS).
///
/// MethodChannel `fitila/keyboard`
///   getKeyboardStatus       -> {enabled, selected:false, fullAccess, platform:"ios"}
///   openInputMethodSettings -> this app's page in Settings (Keyboards ▸ FITILA Bariba)
///   syncConfig              -> App Group defaults read by the extension for online translation
/// EventChannel `fitila/keyboard/status` re-emits the status when the app becomes active
/// (returning from Settings).
final class KeyboardChannel: NSObject, FlutterStreamHandler {
    static let appGroup = "group.bj.fitila.fitilaFlutter"
    private static let extensionSuffix = ".BaribaKeyboard"

    private var sink: FlutterEventSink?
    private var observer: NSObjectProtocol?

    static func register(with messenger: FlutterBinaryMessenger) {
        let instance = KeyboardChannel()
        let method = FlutterMethodChannel(name: "fitila/keyboard", binaryMessenger: messenger)
        method.setMethodCallHandler(instance.handle)
        FlutterEventChannel(name: "fitila/keyboard/status", binaryMessenger: messenger)
            .setStreamHandler(instance)
        // Keep the instance alive for the app lifetime.
        retained = instance
    }

    private static var retained: KeyboardChannel?

    private func handle(_ call: FlutterMethodCall, _ result: @escaping FlutterResult) {
        switch call.method {
        case "getKeyboardStatus":
            result(status())
        case "openInputMethodSettings":
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                result(FlutterError(code: "unavailable", message: "Settings URL unavailable", details: nil))
                return
            }
            UIApplication.shared.open(url, options: [:]) { ok in
                ok ? result(nil) : result(FlutterError(code: "unavailable", message: "Could not open Settings", details: nil))
            }
        case "showInputMethodPicker":
            // iOS exposes no picker: users switch with the globe key.
            result(FlutterMethodNotImplemented)
        case "syncConfig":
            let args = call.arguments as? [String: Any]
            let defaults = UserDefaults(suiteName: KeyboardChannel.appGroup)
            defaults?.set(args?["supabaseUrl"] as? String ?? "", forKey: "supabase_url")
            defaults?.set(args?["anonKey"] as? String ?? "", forKey: "supabase_key")
            result(nil)
        default:
            result(FlutterMethodNotImplemented)
        }
    }

    /// `enabled`: the keyboard is in the user's active input modes.
    /// `fullAccess`: last value written by the extension (needs Full Access to write).
    private func status() -> [String: Any] {
        let enabled = UITextInputMode.activeInputModes.contains { mode in
            guard let id = mode.value(forKey: "identifier") as? String else { return false }
            return id.hasSuffix(KeyboardChannel.extensionSuffix)
        }
        let fullAccess = UserDefaults(suiteName: KeyboardChannel.appGroup)?.bool(forKey: "full_access") ?? false
        return ["enabled": enabled, "selected": false, "fullAccess": fullAccess, "platform": "ios"]
    }

    // MARK: FlutterStreamHandler

    func onListen(withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink) -> FlutterError? {
        sink = events
        events(status())
        observer = NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            self.sink?(self.status())
        }
        return nil
    }

    func onCancel(withArguments arguments: Any?) -> FlutterError? {
        if let o = observer { NotificationCenter.default.removeObserver(o) }
        observer = nil
        sink = nil
        return nil
    }
}
