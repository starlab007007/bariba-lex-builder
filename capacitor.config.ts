import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a8b67aa7de064bed97db29852f4f01ed',
  appName: 'FITILA',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    useLegacyBridge: false,
    // Permissions are declared in AndroidManifest.xml after cap sync
    // They will be requested at runtime via getUserMedia
  },
  ios: {
    // Usage descriptions for iOS permission prompts
    // These are added to Info.plist after cap sync
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
