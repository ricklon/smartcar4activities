# Arduino CLI Upload Guide

This guide explains how to upload firmware to the ELEGOO Smart Robot Car V4.0 using Arduino CLI.

## Installation

### Linux

```bash
# Download and install
curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh

# Add to PATH (add to your ~/.bashrc for persistence)
export PATH="$PATH:$HOME/bin"
```

Or manually:

```bash
curl -L -o arduino-cli.tar.gz https://github.com/arduino/arduino-cli/releases/download/v0.35.3/arduino-cli_0.35.3_Linux_64bit.tar.gz
tar -xzf arduino-cli.tar.gz
sudo mv arduino-cli /usr/local/bin/
```

### macOS

```bash
brew install arduino-cli
```

### Windows (PowerShell)

```powershell
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/arduino/arduino-cli/master/install.ps1" -OutFile "install.ps1"
.\install.ps1
```

## Initial Setup

```bash
# Initialize configuration
arduino-cli config init

# Add ESP32 board URL (for camera module)
arduino-cli config set board_manager.additional_urls "https://dl.espressif.com/dl/package_esp32_index.json"

# Update package index
arduino-cli core update-index

# Install Arduino AVR core (for UNO)
arduino-cli core install arduino:avr

# Install required libraries
arduino-cli lib install FastLED
arduino-cli lib install IRremote
arduino-cli lib install "ArduinoJson"
arduino-cli lib install "Servo"
```

## Firmware Paths in This Workspace

This project is a standalone curated workspace. Use the firmware copies under `arduino-code/`:

```bash
UNO_FIRMWARE_PATH="arduino-code/arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050"
ESP32_FIRMWARE_PATH="arduino-code/esp32-camera/ESP32_CameraServer_AP_simple"
```

If you need other hardware variants (QMI8658C, DRV8835, etc.), use the original vendor package paths outside this workspace.

## Connect the Arduino

1. Connect Arduino UNO to computer via USB
2. Power ON the robot car
3. Verify the connection:

```bash
# List connected boards
arduino-cli board list

# Or check serial ports directly
ls /dev/ttyACM* /dev/ttyUSB*
```

## Compile Firmware

```bash
# Compile for Arduino UNO
arduino-cli compile --fqbn arduino:avr:uno "$UNO_FIRMWARE_PATH"
```

Expected output:
```
Sketch uses 30696 bytes (95%) of program storage space.
Global variables use 1221 bytes (59%) of dynamic memory.
```

## Upload Firmware

```bash
# Upload to Arduino UNO (replace /dev/ttyUSB0 with your port)
arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:uno "$UNO_FIRMWARE_PATH"
```

## Troubleshooting

### "Programmer is not responding" / "Not in sync"

This is common with CH340 USB-serial chips. Try:

1. **Press reset button manually**: Press the reset button on the Arduino board immediately after starting the upload

2. **Toggle DTR before upload**:
   ```bash
   # Reset via DTR toggle
   python3 -c "import serial; s=serial.Serial('/dev/ttyUSB0', 1200); s.setDTR(False); s.close()"
   
   # Then immediately upload
   arduino-cli upload -p /dev/ttyUSB0 --fqbn arduino:avr:uno "$UNO_FIRMWARE_PATH"
   ```

3. **Check permissions**:
   ```bash
   # Add user to dialout group
   sudo usermod -a -G dialout $USER
   
   # Log out and back in for changes to take effect
   ```

4. **Try different USB port**: Some USB hubs don't work well with Arduino

5. **Check if another program is using the port**:
   ```bash
   lsof /dev/ttyUSB0
   ```

### Board Not Detected

```bash
# Check USB devices
lsusb

# Look for QinHeng Electronics CH340 (common USB-serial chip)
```

### Upload Successful But Car Not Responding

1. Verify correct firmware version for your hardware
2. Check battery power (4x AA batteries)
3. Ensure power switch is ON
4. Check all cable connections

## Compiling for ESP32 Camera Module

### Identify Your ESP32 Variant

The ELEGOO Smart Robot Car V4.0 may come with either:
- **ESP32-WROVER** (original) - appears as `/dev/ttyUSB*`
- **ESP32-S3-WROOM-1** (newer) - appears as `/dev/ttyACM*` via native USB

Check the chip markings on your camera module.

### ESP32-S3 Firmware Compatibility

| Firmware | ESP32-WROVER | ESP32-S3 | Notes |
|----------|--------------|----------|-------|
| `ESP32_CameraServer_AP_simple` | ✗ | ✓ | Use this for ESP32-S3 |
| `ESP32_CameraServer_AP_20220120` | ✓ | ✗ | Face detection requires old API |

The original firmware uses `fd_forward.h` face detection API which is not available for ESP32-S3. ESP32-S3 uses a different face detection library (`esp-dl`) which requires significant code changes.

### ESP32 Core Version

```bash
# Install ESP32 core (v2.0.14 recommended for compatibility)
arduino-cli core install esp32:esp32@2.0.14
```

### Compile and Upload for ESP32-S3

**Critical:** ESP32-S3 requires `CDCOnBoot=cdc` to enable USB serial output for debugging.

```bash
# Compile for ESP32-S3 with CDC enabled
arduino-cli compile --fqbn esp32:esp32:esp32s3:PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc "$ESP32_FIRMWARE_PATH"

# Upload
arduino-cli upload -p /dev/ttyACM0 --fqbn esp32:esp32:esp32s3:PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc "$ESP32_FIRMWARE_PATH"
```

### ESP32-S3 Bootloader Mode

ESP32-S3 requires manual bootloader entry:

1. **Hold BOOT button** down
2. **Press RESET button** once (while holding BOOT)
3. **Wait 1 second**
4. **Release BOOT button**
5. Run upload command immediately

The ESP32-S3 uses native USB and appears as `/dev/ttyACM0` (not `/dev/ttyUSB0`).

### Monitor Serial Output

```bash
# Monitor ESP32-S3 serial output
stty -F /dev/ttyACM0 115200 raw -echo
cat /dev/ttyACM0
```

### ESP32-S3 Camera Pin Configuration

The ESP32-S3 uses different camera pins than ESP32-WROVER. The simplified firmware already has correct pins:

```cpp
// ESP32-S3 (ELEGOO variant)
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     15
#define SIOD_GPIO_NUM      4
#define SIOC_GPIO_NUM      5
#define Y9_GPIO_NUM       16
#define Y8_GPIO_NUM       17
#define Y7_GPIO_NUM       18
#define Y6_GPIO_NUM       12
#define Y5_GPIO_NUM       10
#define Y4_GPIO_NUM        8
#define Y3_GPIO_NUM        9
#define Y2_GPIO_NUM       11
#define VSYNC_GPIO_NUM     6
#define HREF_GPIO_NUM      7
#define PCLK_GPIO_NUM     13
```

### Verifying Camera Firmware

After upload:
1. Power cycle the ESP32 camera
2. Wait 10-15 seconds for boot
3. Check WiFi for network `ELEGOO-XXXXXXXX`
4. Connect and open `http://192.168.4.1` in browser

## Quick Reference Commands

```bash
# List all installed cores
arduino-cli core list

# List all installed libraries
arduino-cli lib list

# Update all cores and libraries
arduino-cli core upgrade
arduino-cli lib upgrade

# Get board info
arduino-cli board listall uno

# Check for compilation errors without uploading
arduino-cli compile --fqbn arduino:avr:uno "$UNO_FIRMWARE_PATH" --warnings all
```
