# Modular ANT+ Receiver

A modern, modular implementation of the ANT+ receiver with proper separation of concerns and ES6 modules.

## Structure

```
modular-receiver/
├── index.html              # Main HTML page
├── css/
│   └── styles.css          # All CSS styles
├── js/
│   ├── core/
│   │   ├── app.js          # Main application controller
│   │   ├── logger.js       # Centralized logging system
│   │   └── platform.js     # Platform detection & capabilities
│   ├── connections/
│   │   ├── usb-ant.js      # USB ANT+ connection module
│   │   ├── bluetooth.js    # Bluetooth connection module
│   │   └── connection-manager.js # Manages both connection types
│   ├── ui/
│   │   └── ui-manager.js   # Handles all UI updates and interactions
│   └── utils/
│       └── event-emitter.js # Custom event system for module communication
└── pages/                  # Future expansion (workout.html, settings.html)
```

## Features

### ✅ Working Features
- **Modular Architecture**: Clean separation of concerns with ES6 modules
- **Platform Detection**: Automatic detection of OS and browser capabilities
- **Permission Management**: Proper handling of HTTPS, location, and Bluetooth permissions
- **USB ANT+ Support**: Full ANT+ protocol implementation with proper initialization
- **Bluetooth Support**: Comprehensive Bluetooth Low Energy support
- **Device-Specific Pairing**: Dedicated pairing for Kickr, Zwift Click, and HRM devices
- **Real-time Data Processing**: Live metrics display with session tracking
- **Event-Driven Architecture**: Clean module communication via custom events
- **Centralized Logging**: Advanced logging with export capabilities
- **Responsive UI**: Mobile-friendly design with platform-specific instructions

### 🔧 Modules

#### Core Modules
- **App**: Main orchestrator that initializes and coordinates all modules
- **Logger**: Centralized logging with different levels and export functionality
- **Platform**: Detects OS, browser capabilities, and manages permissions

#### Connection Modules  
- **USB ANT+**: Handles USB ANT+ stick connections with full protocol support
- **Bluetooth**: Manages Bluetooth Low Energy connections with service discovery
- **Connection Manager**: Coordinates and manages multiple connection types

#### UI Module
- **UI Manager**: Handles all user interface updates and user interactions

#### Utility Modules
- **Event Emitter**: Custom event system for clean module communication

## How It Works

1. **Initialization**: `app.js` initializes all modules and sets up event listeners
2. **Platform Detection**: Detects OS, browser capabilities, and checks permissions
3. **UI Setup**: UI Manager caches elements and sets up event handlers
4. **Connection Handling**: User interactions trigger connection attempts via Connection Manager
5. **Data Processing**: Incoming data is processed and routed to appropriate UI updates
6. **Event Flow**: All modules communicate via events for loose coupling

## Integration with Fixes

This modular version incorporates all the fixes from:
- `usb-fix.js` - Proper USB ANT+ device filtering and initialization
- `bluetooth-fix.js` - Improved Bluetooth service discovery and connection handling

## Advantages

### For Development
- **Maintainability**: Each module has a single responsibility
- **Testability**: Modules can be unit tested independently  
- **Debugging**: Issues can be isolated to specific modules
- **Extensibility**: Easy to add new device types or connection methods

### For Future Expansion
- **Workout Pages**: Can import device modules for workout tracking
- **Settings Pages**: Can reuse platform and storage modules
- **Mobile Apps**: Connection modules can be reused with different UI
- **Third-party Integration**: Others can import specific modules

## Usage

1. Serve the files over HTTPS (required for Bluetooth on mobile)
2. Open `index.html` in a modern browser
3. The app will automatically detect platform and check permissions
4. Connect USB ANT+ stick or pair Bluetooth devices
5. Monitor real-time data from connected devices

## Browser Compatibility

- **Chrome/Edge**: Full support for both USB and Bluetooth
- **Firefox**: Bluetooth support, no USB support
- **Safari**: Limited Bluetooth support
- **Mobile Chrome**: Full Bluetooth support with location permission

## Future Expansion

The modular structure makes it easy to add:
- Workout tracking pages
- Settings and configuration
- Data export and analysis
- Integration with training platforms
- PWA capabilities for mobile installation

This modular approach provides a solid foundation for building a complete cycling training ecosystem while maintaining clean, maintainable code.
