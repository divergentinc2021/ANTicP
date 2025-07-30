# ANT+ Device Diagnostic Script
# Run this in PowerShell as Administrator to check ANT+ device status

Write-Host "🔍 ANT+ Device Diagnostic" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

# Check for ANT+ devices in Device Manager
Write-Host "📋 Searching for ANT+ devices..." -ForegroundColor Yellow

# Look for ANT devices
$antDevices = Get-WmiObject -Class Win32_PnPEntity | Where-Object { $_.Name -like "*ANT*" -or $_.Description -like "*ANT*" }

if ($antDevices) {
    Write-Host "✅ Found ANT+ devices:" -ForegroundColor Green
    foreach ($device in $antDevices) {
        Write-Host "   📱 Name: $($device.Name)" -ForegroundColor Cyan
        Write-Host "   🔧 Status: $($device.Status)" -ForegroundColor Cyan
        Write-Host "   📍 Location: $($device.DeviceID)" -ForegroundColor Cyan
        Write-Host ""
    }
} else {
    Write-Host "❌ No ANT+ devices found in Device Manager" -ForegroundColor Red
}

# Check for libusb devices
Write-Host "🔍 Checking for libusb-win32 devices..." -ForegroundColor Yellow
$libusbDevices = Get-WmiObject -Class Win32_PnPEntity | Where-Object { $_.Name -like "*libusb*" -or $_.Service -like "*libusb*" }

if ($libusbDevices) {
    Write-Host "⚠️  Found libusb devices (may include your ANT+ stick):" -ForegroundColor Yellow
    foreach ($device in $libusbDevices) {
        Write-Host "   📱 Name: $($device.Name)" -ForegroundColor Cyan
        Write-Host "   🔧 Status: $($device.Status)" -ForegroundColor Cyan
        Write-Host ""
    }
} else {
    Write-Host "✅ No libusb devices found" -ForegroundColor Green
}

# Check for COM ports
Write-Host "🔍 Checking available COM ports..." -ForegroundColor Yellow
$comPorts = Get-WmiObject -Class Win32_SerialPort

if ($comPorts) {
    Write-Host "📋 Available COM ports:" -ForegroundColor Green
    foreach ($port in $comPorts) {
        Write-Host "   🔌 $($port.DeviceID): $($port.Description)" -ForegroundColor Cyan
    }
} else {
    Write-Host "❌ No COM ports found" -ForegroundColor Red
}

# Check for USB Serial devices
Write-Host ""
Write-Host "🔍 Checking for USB Serial devices..." -ForegroundColor Yellow
$usbSerial = Get-WmiObject -Class Win32_PnPEntity | Where-Object { 
    $_.Name -like "*Serial*" -or 
    $_.Name -like "*CP210*" -or 
    $_.Name -like "*UART*" -or
    $_.Name -like "*USB-to-Serial*"
}

if ($usbSerial) {
    Write-Host "✅ Found USB Serial devices:" -ForegroundColor Green
    foreach ($device in $usbSerial) {
        Write-Host "   📱 $($device.Name)" -ForegroundColor Cyan
        Write-Host "   🔧 Status: $($device.Status)" -ForegroundColor Cyan
        Write-Host ""
    }
} else {
    Write-Host "❌ No USB Serial devices found" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Diagnostic Summary:" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green

if ($antDevices -and $comPorts) {
    Write-Host "✅ GOOD: ANT+ devices found AND COM ports available" -ForegroundColor Green
    Write-Host "   Your ANT+ stick should work with Web Serial API" -ForegroundColor Green
} elseif ($antDevices -and $libusbDevices) {
    Write-Host "⚠️  ISSUE: ANT+ device found but using libusb driver" -ForegroundColor Yellow
    Write-Host "   Need to install proper ANT+ drivers to create COM port" -ForegroundColor Yellow
    Write-Host "   📋 Action needed: Install Garmin ANT+ drivers" -ForegroundColor Yellow
} elseif (!$antDevices) {
    Write-Host "❌ PROBLEM: No ANT+ devices detected" -ForegroundColor Red
    Write-Host "   📋 Check: USB stick properly plugged in" -ForegroundColor Red
    Write-Host "   📋 Try: Different USB port" -ForegroundColor Red
} else {
    Write-Host "❓ UNKNOWN: Mixed results - manual investigation needed" -ForegroundColor Magenta
}

Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Green
Write-Host "1. If ANT+ device uses libusb: Install Garmin ANT+ drivers" -ForegroundColor Cyan
Write-Host "2. If no ANT+ device found: Check USB connection" -ForegroundColor Cyan
Write-Host "3. If COM ports available: Test Web Serial API connection" -ForegroundColor Cyan
Write-Host "4. Download drivers from: https://www.garmin.com/en-US/software/ant/" -ForegroundColor Cyan

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
