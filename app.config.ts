import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json. CI passes ANDROID_VERSION_CODE (the build number) so every APK
 * installs as an update over the previous one.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  android: {
    ...config.android,
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? 1),
  },
});
