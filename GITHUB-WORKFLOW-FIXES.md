# GitHub Actions Workflow Fixes

## Issues Fixed

### 1. Deprecated `actions/upload-artifact@v3`
- **Error**: "This request has been automatically failed because it uses a deprecated version of `actions/upload-artifact: v3`"
- **Fix**: Updated all instances of `actions/upload-artifact@v3` to `actions/upload-artifact@v4`

### 2. Deprecated `actions/download-artifact@v3`
- **Fix**: Updated to `actions/download-artifact@v4`

### 3. macOS Runner Version Warning
- **Warning**: "The macos-latest label will migrate to macOS 15 beginning August 4, 2025"
- **Fix**: Changed `runs-on: macos-latest` to `runs-on: macos-15` to use a specific version

### 4. Other Action Updates
To ensure compatibility and avoid future deprecation issues, also updated:
- `actions/checkout@v3` → `actions/checkout@v4`
- `actions/setup-node@v3` → `actions/setup-node@v4`
- `actions/setup-java@v3` → `actions/setup-java@v4`
- `android-actions/setup-android@v2` → `android-actions/setup-android@v3`
- `peaceiris/actions-gh-pages@v3` → `peaceiris/actions-gh-pages@v4`
- `actions/upload-pages-artifact@v3` → `actions/upload-pages-artifact@v4`

## Files Updated

1. **.github/workflows/build-native-apps.yml** - Main workflow for building Android, iOS, and PWA apps
2. **.github/workflows/build-native-apps-fixed.yml** - Alternative fixed version with improved initialization logic
3. **.github/workflows/quick-android-build.yml** - Quick Android build workflow for manual triggers
4. **.github/workflows/static.yml** - GitHub Pages deployment workflow

## What These Changes Do

- **Ensures workflow compatibility**: GitHub has deprecated v3 of the artifact actions, and workflows using them will fail
- **Future-proofs the workflows**: Using v4 actions ensures continued support and access to latest features
- **Fixes macOS runner issues**: Using specific macOS version prevents unexpected changes when `macos-latest` updates
- **Improves reliability**: Latest action versions include bug fixes and performance improvements

## Next Steps

1. **Commit and push** these changes to your repository
2. **Re-run** the failed workflows - they should now pass
3. **Monitor** the Actions tab to ensure all workflows complete successfully

## Notes

- The artifact name in `upload-artifact@v4` must be unique across all jobs in a workflow run
- The updated actions maintain backward compatibility with existing configurations
- No changes to workflow logic were needed, only version updates

Your workflows should now run successfully without the deprecation errors!