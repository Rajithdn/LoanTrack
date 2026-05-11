# LoanTracker APK Build Guide
# How to Build an Android APK from Replit Shell

---

## Overview

This app is a React Native Expo project. There are two ways to build an APK:

| Method | Where it builds | Requires | APK Type |
|--------|----------------|----------|----------|
| **EAS Build (Recommended)** | Expo cloud servers | Free Expo account | Release / Preview APK |
| **Local Build** | Your machine (not Replit) | Android Studio + JDK | Debug / Release APK |

> Replit shell **cannot** run Android Studio or Gradle directly (no GUI, limited RAM).
> Use EAS Build — it runs entirely in Expo's cloud and gives you a download link.

---

## Method 1: EAS Build (Recommended — works from Replit Shell)

### Step 1 — Install EAS CLI in the Replit Shell

```bash
npm install -g eas-cli
```

### Step 2 — Log in to your Expo account

```bash
eas login
```

Enter your Expo username and password.
(Create a free account at https://expo.dev/signup if you don't have one.)

### Step 3 — Go to the loan-tracker app folder

```bash
cd /home/runner/workspace/artifacts/loan-tracker
```

### Step 4 — Link the project to your Expo account

```bash
eas init
```

This creates a project on expo.dev and updates `app.json` with your project ID.

### Step 5 — Build the APK

For a **preview APK** (installs directly without Play Store, best for testing):

```bash
eas build -p android --profile preview
```

For a **release AAB** (for uploading to Google Play Store):

```bash
eas build -p android --profile production
```

### Step 6 — Download the APK

- EAS will show a build URL like: `https://expo.dev/accounts/YOUR_NAME/projects/loan-tracker/builds/...`
- Open that URL in your browser
- Click **Download** to get the `.apk` file
- Transfer to your Android phone and install it

> First build takes ~10-15 minutes. Subsequent builds are faster.

---

## Method 2: Local Build (Requires your own machine, not Replit)

Do this on your **local computer** (Windows/Mac/Linux), not on Replit.

### Prerequisites

1. Install [Node.js 18+](https://nodejs.org)
2. Install [Java JDK 17](https://adoptium.net)
3. Install [Android Studio](https://developer.android.com/studio) with Android SDK
4. Set environment variables:

```bash
# Mac/Linux — add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Steps

```bash
# 1. Clone or download the project from Replit

# 2. Install dependencies
cd /path/to/project
pnpm install

# 3. Go to the app folder
cd artifacts/loan-tracker

# 4. Generate the Android native project
npx expo prebuild --platform android

# 5. Build the debug APK
cd android
./gradlew assembleDebug

# APK will be at:
# android/app/build/outputs/apk/debug/app-debug.apk

# 6. For a release APK (needs keystore)
./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

---

## Current eas.json Config

The project already has a working `eas.json` at the root:

```json
{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": { "buildType": "apk" },
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

The `preview` profile builds a direct-install `.apk` file (not a `.aab`).
The `production` profile builds a `.aab` bundle for the Play Store.

---

## Quick Reference — Replit Shell Commands

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Go to app
cd /home/runner/workspace/artifacts/loan-tracker

# Build APK (preview — direct install)
eas build -p android --profile preview

# Check build status
eas build:list

# View build logs
eas build:view
```

---

## Installing the APK on Your Phone

1. Transfer the `.apk` file to your phone (via USB, Google Drive, WhatsApp, etc.)
2. On your phone: **Settings → Security → Install unknown apps → Allow**
3. Open the `.apk` file from your file manager and tap **Install**
4. Open **LoanTracker** from your app drawer

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `eas: command not found` | Run `npm install -g eas-cli` again |
| `Not logged in` | Run `eas login` |
| `Project not found` | Run `eas init` inside `artifacts/loan-tracker/` |
| Build fails with Firebase error | Make sure all `EXPO_PUBLIC_FIREBASE_*` env vars are set in `eas.json` or Expo dashboard |
| APK won't install on phone | Enable "Install from unknown sources" in phone settings |

---

## Setting Firebase Secrets for EAS Build

Since Firebase keys are in Replit env vars, you must add them to EAS:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "your_value"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "your_value"
```

Or set them in the Expo dashboard under your project → Secrets.

---

*Generated for LoanTracker — May 2026*
