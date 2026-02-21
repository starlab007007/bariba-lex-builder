import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a8b67aa7de064bed97db29852f4f01ed',
  appName: 'FITILA',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    useLegacyBridge: false,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
