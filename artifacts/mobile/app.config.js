module.exports = {
  expo: {
    name: "Trade Mock Pro",
    slug: "mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "trademock",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/logo.png",
      resizeMode: "contain",
      backgroundColor: "#000000",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.trademock.app",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.png",
        backgroundColor: "#000000",
      },
      package: "com.trademock.app",
    },
    description: "Trade Mock Pro is a crypto trading simulation app for educational purposes only. We do not provide financial advice.",
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/logo.png",
      name: "Trade Mock Pro",
      shortName: "TradeMockPro",
      description: "Trade Mock Pro is a crypto trading simulation app for educational purposes only. We do not provide financial advice.",
      lang: "en",
      backgroundColor: "#000000",
      themeColor: "#0B0E11",
    },
    plugins: [
      ["expo-router", { origin: "https://replit.com/" }],
      [
        "expo-font",
        {
          fonts: [
            "node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf",
          ],
        },
      ],
      "expo-web-browser",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY || "",
    },
  },
};
