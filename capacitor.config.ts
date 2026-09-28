import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'bj.fitila.bariba',
  appName: 'Fitila Bariba',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    useLegacyBridge: false,
    // Permissions and IME service are patched automatically by:
    //   bash scripts/install-native-keyboard.sh
  },
  ios: {
    // Add usage descriptions in Info.plist:
    //   NSCameraUsageDescription, NSMicrophoneUsageDescription
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Camera: {
      // @capacitor/camera plugin
    },
    BaribaKeyboard: {
      // Native keyboard IPC plugin — see android-native/
    },
  },
};

export default config;
