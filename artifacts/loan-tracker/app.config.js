module.exports = {
  expo: {
    name: "Loan Tracker",
    slug: "loan-tracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "loan-tracker",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: false,
    },
    android: {
      package: "com.rajith07.loantracker",
      googleServicesFile: "./google-services.json",
    },
    web: {
      favicon: "./assets/images/icon.png",
    },
    plugins: [
      [
        "expo-router",
        {
          origin: "https://replit.com/",
        },
      ],
      "expo-font",
      "expo-web-browser",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#00A86B",
          sounds: [],
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      // Baked-in Firebase config — guaranteed available in all build types
      firebaseApiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY            ?? "AIzaSyDK6PP3uRu6zB6DNPIe4vhM2zS0cd__D1c",
      firebaseAuthDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? "loantrackerapp-49abf.firebaseapp.com",
      firebaseProjectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID         ?? "loantrackerapp-49abf",
      firebaseStorageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? "loantrackerapp-49abf.firebasestorage.app",
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "341766430854",
      firebaseAppId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID             ?? "1:341766430854:web:ced3dc2456c03b73297107",
    },
    owner: "rajith07",
  },
};
