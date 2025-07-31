# Cross-Platform Bluetooth ANT+ Receiver

A modern, cross-platform implementation of ANT+ device connectivity using Web Bluetooth API.

## 🔄 Recent Changes

**This workspace has been cleaned and simplified to focus exclusively on Bluetooth ANT+ connections:**

- ❌ **Removed**: All USB ANT+ functionality 
- ❌ **Removed**: Railway deployment configurations
- ❌ **Removed**: WebUSB implementations
- ✅ **Kept**: Full Bluetooth ANT+ support
- ✅ **Kept**: Cross-platform compatibility
- ✅ **Kept**: Device detection and permissions

## 📁 Structure

```
📁 Project Root/
├── 📄 index.html                    # Main Bluetooth-only interface
├── 📄 index_workingbluetooth.html   # Reference implementation
├── 📄 LICENSE
├── 📄 README.md
├── 📁 css/
│   └── styles.css                   # All CSS styles
├── 📁 js/
│   ├── 📁 core/
│   │   ├── app.js                   # Main application controller
│   │   ├── logger.js                # Centralized logging system
│   │   └── platform.js              # Platform detection & capabilities
│   ├── 📁 connections/
│   │   ├── bluetooth.js             # Bluetooth connection module
│   │   └── connection-manager.js    # Bluetooth-only connection manager
│   ├── 📁 ui/
│   │   └── ui-manager.js            # UI updates and interactions
│   └── 📁 utils/
│       └── event-emitter.js         # Event system for module communication
└── 📁 backup/                       # All removed files safely stored
```

## ✅ Features

### Bluetooth Device Support
- **Wahoo Kickr Core** - Smart trainer with power, cadence, speed data
- **Zwift Click** - Wireless shifter for virtual cycling
- **Heart Rate Monitors** - Standard BLE heart rate devices
- **Generic ANT+ over Bluetooth** - Compatible with BLE-enabled ANT+ devices

### Cross-Platform Compatibility
- 🤖 **Android** - Chrome browser with Web Bluetooth
- 🖥️ **Windows** - Chrome, Edge browsers
- 🍎 **macOS** - Chrome, Safari browsers  
- 📱 **iOS** - Safari browser (iOS 13.4+)

### Smart Features
- **Automatic Platform Detection** - Detects device capabilities
- **Permission Management** - Guides users through required permissions
- **Real-time Metrics** - Live power, cadence, speed, heart rate display
- **Session Tracking** - Distance, time, max power tracking
- **Connection Recovery** - Automatic reconnection on disconnect

## 🚀 Quick Start

1. **Open the app**: Load `index.html` in a modern browser
2. **Check permissions**: App will guide you through HTTPS and location permissions
3. **Scan devices**: Use "Scan Bluetooth" or device-specific pairing buttons
4. **Start training**: Watch real-time data from your ANT+ devices

## 📱 Platform Requirements

### Android
- Chrome browser (recommended)
- Enable "Experimental Web Platform features" in `chrome://flags`
- Location permission (required for Bluetooth scanning)
- HTTPS connection (for Web Bluetooth API)

### Windows/Mac
- Chrome or Edge browser
- HTTPS connection
- Bluetooth adapter enabled

### iOS
- Safari browser (iOS 13.4+)
- HTTPS connection

## 🔧 Development

### Architecture
- **Modular Design** - ES6 modules with clear separation of concerns
- **Event-Driven** - Custom event system for component communication
- **Platform Agnostic** - Adaptive UI based on device capabilities
- **Error Resilient** - Comprehensive error handling and recovery

### Key Files
- `js/core/app.js` - Main application orchestrator
- `js/connections/bluetooth.js` - Bluetooth device communication
- `js/ui/ui-manager.js` - User interface management
- `js/core/platform.js` - Platform detection and capabilities

## 🔄 Migration Notes

If you need the original USB ANT+ functionality, all removed files are available in the `/backup/` directory:

- `backup/index_old.html` - Original interface with USB support
- `backup/package.json` - Node.js dependencies for USB bridge
- `backup/ant-bridge-server.js` - USB ANT+ bridge server
- `backup/*.yml` - GitHub Actions deployment workflows

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

This is now a Bluetooth-focused ANT+ receiver. Contributions for additional Bluetooth device support, UI improvements, and cross-platform compatibility are welcome.
