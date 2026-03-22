# ESP32-S3 Troubleshooting Guide

This guide covers the project-specific ESP32-S3 behavior used in this repository:

- local network join with saved credentials
- fallback to the original ELEGOO AP workflow
- camera stream behavior on LAN vs AP
- TCP control path through the local bridge

## Network Modes

The ESP32 now has two operating modes:

- `LAN / STA mode`
  - The ESP32 joins a saved local Wi-Fi network.
  - Use the ESP32's LAN IP as `Car Host` in the UI.
- `Fallback AP mode`
  - If the saved Wi-Fi network cannot be joined, the ESP32 starts its own AP.
  - This preserves the original ELEGOO workflow.
  - Use `192.168.4.1` as `Car Host`.

In both modes, the browser UI still talks to the local bridge first:

- `Bridge Host:Port = localhost:8787`
- `Car TCP Port = 100`

## Fast Recovery Checklist

If the car is not reachable:

1. Confirm the local bridge is running.
2. Confirm whether the ESP32 is in LAN mode or fallback AP mode.
3. Use the correct `Car Host`:
   - LAN mode: the ESP32's LAN IP
   - fallback AP mode: `192.168.4.1`
4. Check whether the camera works at `/stream`.
5. Check whether port `100` is reachable for car control.

## Problem: ESP32 Does Not Show `ELEGOO-...` AP

This is not automatically a failure.

Most likely causes:

- the ESP32 successfully joined the saved Wi-Fi network
- it is still trying to join and has not timed out yet
- it is powered but not yet fully booted

What to do:

1. Wait 20 to 30 seconds after boot.
2. Check whether it joined the LAN.
3. Only expect the `ELEGOO-...` AP when saved Wi-Fi join fails.

## Problem: Need To Find The ESP32 IP On The LAN

The most reliable identifier is the ESP32 MAC address:

- `30:ed:a0:1e:c4:38`

Use the neighbor table first:

```bash
ip neigh show | grep -i '30:ed:a0:1e:c4:38'
```

If nothing appears, scan the current subnet first.

Example for a `192.168.1.x` LAN:

```bash
nmap -sn 192.168.1.0/24 >/dev/null
ip neigh show | grep -i '30:ed:a0:1e:c4:38'
```

Example for a `192.168.4.0/22` LAN:

```bash
nmap -sn 192.168.4.0/22 >/dev/null
ip neigh show | grep -i '30:ed:a0:1e:c4:38'
```

If a line appears like:

```text
192.168.4.23 dev wlp0s20f3 lladdr 30:ed:a0:1e:c4:38 STALE
```

then the car IP is `192.168.4.23`.

## Problem: ESP32 Fails To Join Wi-Fi And Falls Back To AP

Expected behavior:

- the fallback AP is the recovery path
- join the `ELEGOO-...` SSID
- use:
  - `Car Host = 192.168.4.1`
  - `Car TCP Port = 100`
  - camera stream `http://192.168.4.1:81/stream`

This fallback behavior is intentionally kept compatible with the original ELEGOO firmware/network model.

## Problem: ESP32 Will Not Join A 5 GHz Network

This is expected.

ESP32-S3 boards used like this are effectively `2.4 GHz` Wi-Fi clients.

Implications:

- a `5 GHz-only` SSID will fail
- a dual-band SSID can work if `2.4 GHz` is available
- band steering can make onboarding unreliable

Recommended practice:

- provision the car on a `2.4 GHz` WPA2 personal network
- if using Eero or similar mesh Wi-Fi, temporarily disable `5 GHz` while onboarding IoT devices

## Problem: Camera Works But `Connect Bridge + Car` Stays Offline

The usual cause is that the bridge is not running.

Run:

```bash
cd wifi-control-ui
npm run bridge
```

or start both services:

```bash
cd wifi-control-ui
npm run car
```

Use these UI settings:

- `Bridge Host:Port = localhost:8787`
- `Car Host = <LAN IP or 192.168.4.1>`
- `Car TCP Port = 100`

Important:

- `npm run dev` starts only the frontend
- it does not start the bridge

## Problem: Camera Stream Is Slow, Freezes, Or Starts Upside Down

This repository already includes several ESP32-S3 camera fixes:

- upside-down correction with `vflip=1`
- `WiFi.setSleep(false)` to reduce LAN jitter
- default stream size reduced to `VGA`

If the stream still feels bad:

- confirm you flashed the current project firmware, not older stock firmware
- expect a short auto-exposure / white-balance settling period after boot
- LAN conditions can still affect stream quality more than direct AP use

## Problem: Camera Works But Car Controls Reset Or Disconnect

This was previously caused by AP-only disconnect logic in the ESP32 socket server.

The current project firmware removes that bug. If it reappears:

1. Reflash the current ESP32 project firmware.
2. Confirm the UI is using the current LAN IP or `192.168.4.1` in AP mode.
3. Confirm the bridge is running locally.
4. Check whether the car socket on port `100` is reachable.

Example:

```bash
nmap -Pn -p 80,81,100 192.168.4.23
```

Expected:

- `80/tcp open`
- `81/tcp open`
- `100/tcp open`

## Problem: Unsure Which Address To Use

Use this rule:

- if the ESP32 joined your Wi-Fi, use its LAN IP
- if it fell back to its own AP, use `192.168.4.1`

Do not assume `192.168.4.1` is always correct anymore. It is only correct in fallback AP mode.

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
