# 🚀 GitHub Actions - Automatic Native App Builder

## What These Workflows Do

Your GitHub repository now has **automatic app building**! Every time you push code, GitHub will:

1. **Build Android APK** - Ready to install on any Android device
2. **Prepare iOS build** - Ready for Xcode installation
3. **Create PWA** - Deploy to GitHub Pages
4. **Generate releases** - Downloadable apps for your users

## 📱 How to Use

### Option 1: Automatic Builds (On Every Push)

1. **Push your code** to GitHub:
   ```bash
   git add .
   git commit -m "Update training platform"
   git push
   ```

2. **Wait 5-10 minutes** for builds to complete

3. **Download your apps**:
   - Go to **Actions** tab in your GitHub repo
   - Click the latest workflow run
   - Download artifacts (APK files)

### Option 2: Manual Build (Quick Android)

1. Go to **Actions** tab in GitHub
2. Select **"Quick Android Build"**
3. Click **"Run workflow"**
4. Choose build type (debug/release)
5. Click **"Run workflow"** button
6. Wait ~5 minutes
7. Download APK from artifacts

## 📥 Installing the Apps

### Android Installation:
1. Download `anticip-debug.apk` from GitHub Actions artifacts
2. Send to your Android device (email, Google Drive, etc.)
3. On your device:
   - Open Settings → Security
   - Enable "Unknown sources" or "Install unknown apps"
   - Open the APK file
   - Tap "Install"
4. Open "ANTicP Trainer" app
5. Allow Bluetooth permissions when asked

### iOS Installation (Requires Mac):
1. Download iOS archive from artifacts
2. Open in Xcode
3. Connect your iPhone/iPad
4. Select your device in Xcode
5. Click "Run" button

## 🎯 Quick Setup (One-Time)

### Enable GitHub Actions:
1. Go to your repo Settings
2. Navigate to Actions → General
3. Select "Allow all actions"

### Enable GitHub Pages (for PWA):
1. Go to Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: "gh-pages" / folder: "/ (root)"
4. Save

## 📊 Workflow Status

You can see build status in your README by adding:

```markdown
![Build Status](https://github.com/YOUR_USERNAME/ANTicP/workflows/Build%20Native%20Apps/badge.svg)
```

## 🔧 Customization

### Change App Name:
Edit `.github/workflows/build-native-apps.yml`:
```yaml
npx cap init "Your App Name" com.yourcompany.app --web-dir=.
```

### Change App Icon:
1. Create `icon-192.png` and `icon-512.png`
2. Add to repository root
3. Push to GitHub

### Sign Android APK:
Add these secrets to your repo (Settings → Secrets):
- `ANDROID_KEYSTORE` (base64 encoded)
- `ANDROID_KEY_PASSWORD`
- `ANDROID_STORE_PASSWORD`

## 🚨 Troubleshooting

### Build Failed?
- Check Actions tab for error logs
- Most common: Missing `index.html`
  - Solution: Rename your main HTML file to `index.html`

### APK Won't Install?
- Enable "Unknown sources" in Android settings
- Uninstall old version first if updating

### iOS Build Issues?
- iOS builds need a Mac runner (costs GitHub Actions minutes)
- For free option, build locally on your Mac

## 💰 GitHub Actions Limits

**Free tier includes:**
- 2,000 minutes/month (Linux)
- 10 minutes/month (macOS for iOS builds)
- Unlimited public repo builds

**Tips to save minutes:**
- Use manual trigger for iOS builds
- Disable iOS build if not needed
- Use quick Android build for testing

## 🎉 Success!

Your GitHub repo now automatically builds native apps! 

Every push creates:
- ✅ Android APK (works on all Android 5.0+ devices)
- ✅ iOS build files (requires Xcode to install)
- ✅ PWA on GitHub Pages (https://YOUR_USERNAME.github.io/ANTicP)

Just push your code and GitHub does the rest! 🚀