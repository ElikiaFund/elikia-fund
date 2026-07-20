// Single source of truth for Expo config — no app.json. Using app.config.js lets the
// OAuth plugin config (Facebook/Google) read real values from process.env instead of
// being hardcoded/placeholder strings. Expo CLI loads mobile/.env into process.env for
// every command (expo start, prebuild, eas build), including vars without the
// EXPO_PUBLIC_ prefix — that prefix only controls what also gets inlined into the
// client JS bundle.
// Not secret (already plaintext in eas.json/.env) — hardcoded as a fallback because some EAS
// CLI subcommands (e.g. the `eas update:configure` step triggered by installing expo-updates)
// evaluate this config without the build profile's env vars injected, leaving this undefined
// and making react-native-fbsdk-next's plugin reject the build for a "missing appID".
const facebookAppId = process.env.FACEBOOK_APP_ID || '1553741169527311';
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

module.exports = {
  expo: {
    name: 'Elikia Fund',
    slug: 'elikia-fund',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'elikiafund',
    userInterfaceStyle: 'automatic',
    owner: 'arden28',
    ios: {
      icon: './assets/images/icon.png',
      bundleIdentifier: 'com.elikiafund.mobile',
      infoPlist: {
        SKAdNetworkItems: [
          { SKAdNetworkIdentifier: 'v9wttpbfk9.skadnetwork' },
          { SKAdNetworkIdentifier: 'n38lu8286q.skadnetwork' },
        ],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.elikiafund.mobile',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['android.permission.INTERNET'],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#208AEF',
          image: './assets/images/splash-icon.png',
          imageWidth: 76,
        },
      ],
      'expo-secure-store',
      'expo-sqlite',
      // Adds the com.apple.developer.applesignin entitlement — without this in `plugins`,
      // Sign in with Apple fails on a real device even though the JS call compiles fine.
      'expo-apple-authentication',
      [
        'expo-camera',
        {
          cameraPermission: "Elikia Fund utilise l'appareil photo pour scanner les codes QR d'invitation aux tontines.",
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'Elikia Fund accède à vos photos pour vous permettre de choisir une photo de profil.',
        },
      ],
      [
        '@react-native-google-signin/google-signin',
        {
          // This plugin hard-requires a value even when only building for Android — an
          // undefined iosUrlScheme crashes config resolution for every platform, not just iOS.
          // The fallback must be a syntactically valid URL scheme (RFC1738: alphanumeric, '.',
          // '-', '+' only) — Apple's App Store binary validation rejects underscores, so an
          // obviously-fake-but-valid placeholder fails safely (Google Sign-In just won't work
          // on iOS) instead of getting the whole submission rejected.
          iosUrlScheme: googleIosClientId
            ? `com.googleusercontent.apps.${googleIosClientId.replace('.apps.googleusercontent.com', '')}`
            : 'com.googleusercontent.apps.replace-with-your-ios-client-id',
        },
      ],
      [
        'react-native-fbsdk-next',
        {
          appID: facebookAppId,
          clientToken: process.env.FACEBOOK_CLIENT_TOKEN,
          displayName: 'Elikia Fund',
          scheme: facebookAppId ? `fb${facebookAppId}` : undefined,
          isAutoInitEnabled: true,
        },
      ],
      [
        'expo-notifications',
        {
          color: '#1B6F52',
        },
      ],
      [
        'expo-build-properties',
        {
          ios: {
            extraPods: [
              { name: 'GoogleUtilities', modular_headers: true },
              { name: 'RecaptchaInterop', modular_headers: true },
              { name: 'AppCheckCore', modular_headers: true },
            ],
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '3ef8c045-c306-4f07-be76-12cad16c0824',
      },
    },
  },
};
