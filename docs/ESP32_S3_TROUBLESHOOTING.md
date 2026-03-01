# ESP32-S3 Troubleshooting Guide

## Lessons Learned

### 1. CDCOnBoot Required for Serial Output

**Problem:** ESP32-S3 uploads successfully but produces no serial output.

**Cause:** ESP32-S3 uses native USB (Hardware CDC). By default, USB CDC is not enabled on boot.

**Solution:** Add `CDCOnBoot=cdc` to the FQBN:

```bash
# Wrong - no serial output
arduino-cli compile --fqbn esp32:esp32:esp32s3:PSRAM=opi sketch

# Correct - serial output works
arduino-cli compile --fqbn esp32:esp32:esp32s3:PSRAM=opi,CDCOnBoot=cdc sketch
```

### 2. ESP32-S3 vs ESP32-WROVER Differences

| Feature | ESP32-WROVER | ESP32-S3 |
|---------|--------------|----------|
| USB | External USB-serial chip | Native USB (CDC) |
| Device path | `/dev/ttyUSB*` | `/dev/ttyACM*` |
| PSRAM option | `PSRAM=enabled` | `PSRAM=opi` |
| Camera pins | Different | Different |
| Face detection | `fd_forward.h` | `esp-dl` library |

### 3. Original Firmware Incompatible with ESP32-S3

**Problem:** Original `ESP32_CameraServer_AP_20220120` fails to compile with:
```
fatal error: fd_forward.h: No such file or directory
```

**Cause:** Original firmware uses old face detection API (`fd_forward.h`) not available for ESP32-S3.

**Solution:** Use `ESP32_CameraServer_AP_simple` which has ESP32-S3 compatible code without face detection.

### 4. PSRAM Options Differ by Board

**Problem:** `PSRAM=opi` fails for regular ESP32.

**Cause:** Different ESP32 variants have different PSRAM options.

**Solution:**
```bash
# ESP32 (original)
--fqbn esp32:esp32:esp32:PartitionScheme=huge_app,PSRAM=enabled

# ESP32-S3
--fqbn esp32:esp32:esp32s3:PartitionScheme=huge_app,PSRAM=opi
```

Check available options:
```bash
arduino-cli board details -b esp32:esp32:esp32s3 | grep -A5 "PSRAM"
```

## Quick Test: Build + Upload Current Camera Firmware

Use the current project firmware sketch:
`arduino-code/esp32-camera/ESP32_CameraServer_AP_simple`

```bash
# Compile
arduino-cli compile --fqbn esp32:esp32:esp32s3:PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc arduino-code/esp32-camera/ESP32_CameraServer_AP_simple

# Upload (enter bootloader mode first)
arduino-cli upload -p /dev/ttyACM0 --fqbn esp32:esp32:esp32s3:PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc arduino-code/esp32-camera/ESP32_CameraServer_AP_simple

# Monitor output
cat /dev/ttyACM0
```

## Serial Monitor Commands

```bash
# Set baud rate and read
stty -F /dev/ttyACM0 115200 raw -echo
cat /dev/ttyACM0

# Or use timeout
timeout 10 cat /dev/ttyACM0
```

## GPIO 4 Conflict (Critical) - RESOLVED

**Problem:** Camera firmware causes boot loop with `TG1WDT_SYS_RST` error.

**Cause:** GPIO 4 is used by BOTH:
- Camera I2C data (SIOD) - required for camera communication
- Serial2 TX - used for Arduino UNO communication (on original ESP32-WROVER)

**Solution for ESP32-S3:**

ESP32-S3 uses different Serial2 pins than ESP32-WROVER:

| Board | Serial2 TX | Serial2 RX |
|-------|------------|------------|
| ESP32-WROVER | GPIO 4 | GPIO 33 |
| ESP32-S3 | GPIO 1 | GPIO 3 |

Use this configuration for ESP32-S3:
```cpp
Serial2.begin(9600, SERIAL_8N1, 3, 1);  // RX=GPIO3, TX=GPIO1
```

**Why GPIO 1/3 work on ESP32-S3:**
- ESP32-WROVER uses GPIO 1/3 for USB-serial (UART0)
- ESP32-S3 uses GPIO 43/44 for native USB (USB CDC)
- GPIO 1/3 are available on ESP32-S3 for Serial2

### Camera Pins Used by ESP32-S3
| Pin | Camera Signal |
|-----|---------------|
| 4   | SIOD (I2C Data) |
| 5   | SIOC (I2C Clock) |
| 6   | VSYNC |
| 7   | HREF |
| 8   | Y4 |
| 9   | Y3 |
| 10  | Y5 |
| 11  | Y2 |
| 12  | Y6 |
| 13  | PCLK |
| 15  | XCLK |
| 16  | Y9 |
| 17  | Y8 |
| 18  | Y7 |

These pins CANNOT be used for Serial2 or other purposes.
