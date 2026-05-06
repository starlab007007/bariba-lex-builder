import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a8b67aa7de064bed97db29852f4f01ed',
  appName: 'FITILA',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    useLegacyBridge: false,
    // After `npx cap add android`, add these permissions manually
    // in android/app/src/main/AndroidManifest.xml (before <application>):
    //
    // <uses-permission android:name="android.permission.CAMERA" />
    // <uses-permission android:name="android.permission.RECORD_AUDIO" />
    // <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    // <uses-permission android:name="android.permission.INTERNET" />
  },
  ios: {
    // After `npx cap add ios`, add usage descriptions in Info.plist:
    // NSCameraUsageDescription, NSMicrophoneUsageDescription
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Camera: {
      // Uses @capacitor/camera plugin
    },
  },
};

export default config;
