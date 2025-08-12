# 📱 Building ANTicP as a Native App

## Quick Setup Guide

### 1️⃣ **Install Prerequisites**

```bash
# Install Node.js first (if not installed)
# Download from: https://nodejs.org

# Install Capacitor CLI
npm install -g @capacitor/cli
```

### 2️⃣ **Initialize the Project**

```bash
# In your ANTicP folder, run:
npm install

# Initialize Capacitor
npx cap init "ANTicP Trainer" com.anticip.trainer --web-dir=.
```

### 3️⃣ **Add Mobile Platforms**

#### For iOS (Mac only):
```bash
# Install Xcode from App Store first
npm install @capacitor/ios
npx cap add ios

# Install Bluetooth plugin
npm install @capacitor-community/bluetooth-le
npx cap sync ios

# Open in Xcode
npx cap open ios
```

#### For Android:
```bash
# Install Android Studio first
npm install @capacitor/android
npx cap add android

# Install Bluetooth plugin
npm install @capacitor-community/bluetooth-le
npx cap sync android

# Open in Android Studio
npx cap open android
```

### 4️⃣ **Configure Permissions**

#### iOS (Info.plist):
```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>This app needs Bluetooth to connect to your KICKR trainer and Zwift Click</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>This app needs Bluetooth to connect to training equipment</string>
```

#### Android (AndroidManifest.xml):
```xml
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### 5️⃣ **Build & Run**

#### iOS:
```bash
# Build for testing
npx cap run ios

# Or build in Xcode:
# 1. Open Xcode project
# 2. Select your device
# 3. Click Run button
```

#### Android:
```bash
# Build for testing
npx cap run android

# Or build in Android Studio:
# 1. Open Android project
# 2. Select your device
# 3. Click Run button
```

## 🎯 **What Works in the App:**

✅ **iOS App Features:**
- Full Bluetooth connectivity to KICKR & Zwift Click
- Background operation
- No browser limitations
- Works on iPhone 6s+ and iPad

✅ **Android App Features:**
- Works on Android 5.0+
- Better battery optimization
- Background service support
- Works on older tablets

## 📲 **Distribution:**

### App Store (iOS):
1. Join Apple Developer Program ($99/year)
2. Build release version in Xcode
3. Upload to App Store Connect
4. Submit for review

### Google Play (Android):
1. Join Google Play Developer ($25 one-time)
2. Build signed APK in Android Studio
3. Upload to Play Console
4. Submit for review

### Direct Installation:
- **iOS**: Use TestFlight for beta testing
- **Android**: Share APK file directly

## 🚀 **One-Command Build Script:**

Create a file called `build-app.sh`:

```bash
#!/bin/bash

echo "🚴 Building ANTicP Native Apps..."

# Install dependencies
npm install

# Sync with Capacitor
npx cap sync

# Build for iOS (Mac only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📱 Building iOS app..."
    npx cap run ios
fi

# Build for Android
echo "🤖 Building Android app..."
npx cap run android

echo "✅ Build complete!"
```

Then run:
```bash
chmod +x build-app.sh
./build-app.sh
```

## 💡 **Pro Tips:**

1. **Test on real devices** - Bluetooth doesn't work in simulators
2. **Use Safari DevTools** for iOS debugging
3. **Use Chrome DevTools** for Android debugging
4. **Keep the web version** for desktop users

## 🆘 **Troubleshooting:**

**iOS Build Errors:**
- Update Xcode to latest version
- Check code signing settings
- Ensure valid Apple ID

**Android Build Errors:**
- Update Android Studio
- Accept SDK licenses: `sdkmanager --licenses`
- Check minimum SDK version (21+)

**Bluetooth Not Working:**
- Check permissions in settings
- Ensure Bluetooth is enabled
- Test with official Wahoo app first

---

Ready to build? Just follow steps 1-5 and you'll have a native app! 🚀