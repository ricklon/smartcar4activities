# Arduino Code Layout

This folder contains the firmware sources currently used by this project, copied into one place for easier maintenance.

## Included Firmware

- `arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050/`
  - Main Arduino UNO firmware (motor/sensor/mode control).
  - Source copied from:
    - `02 Manual & Main Code & APP/02 Main Program   (Arduino UNO)/TB6612 & MPU6050/SmartRobotCarV4.0_V1_20230201/`

- `arduino-uno/SmartRobotCarV4.0_V2_20220322_TB6612_QMI8658C/`
  - Project Arduino UNO firmware for newer QMI8658C-based kits.
  - Rebased from the newer ELEGOO QMI8658C baseline and extended with project telemetry (`N=24`, `N=25`).

- `arduino-uno-stock/SmartRobotCarV4.0_V1_20230201/`
  - Preserved stock ELEGOO Arduino UNO baseline kept for comparison and troubleshooting.
  - Source copied from:
    - `02 Manual & Main Code & APP/02 Main Program   (Arduino UNO)/TB6612 & MPU6050/SmartRobotCarV4.0_V1_20230201/`

- `arduino-uno-stock/SmartRobotCarV4.0_V2_20220322_QMI8658C/`
  - Preserved stock ELEGOO Arduino UNO baseline for newer QMI8658C-based kits.
  - Source copied from:
    - `02 Manual & Main Code & APP/02 Main Program   (Arduino UNO)/TB6612 & QMI8658C/SmartRobotCarV4.0_V2_20220322/`

- `esp32-camera/ESP32_CameraServer_AP_simple/` — **Tier 2 class firmware**
  - Stable class firmware. Supports AP + LAN fallback, IMU telemetry.
  - Targets both ESP32-S3 and ESP32-WROVER via `board_profile.h`.

- `esp32-camera/ESP32_CameraServer_WS/` — **Tier 3 next firmware**
  - Adds mDNS hostname provisioning and car identity. WebSocket support planned.
  - Use `provision-car-s3.sh` or `provision-car-wrover.sh` to flash and provision in one step.
  - Targets both ESP32-S3 and ESP32-WROVER via `board_profile.h`.

- `esp32-provisioner/ESP32_Provisioner/`
  - One-shot provisioner sketch. Writes Wi-Fi credentials, mDNS hostname, and car name to NVS.
  - Do not flash directly — use the `provision-car-*.sh` scripts which generate the config and flash both this sketch and the main firmware automatically.

- `esp32-diagnostics/ESP32_S3_SerialDiag/`
  - Minimal ESP32-S3 UART diagnostic sketch for testing UNO serial traffic without camera, Wi-Fi, or socket code.

## Helper Scripts

- `bin/flash-uno-imu.sh`
  - Flash the project UNO IMU+battery firmware.
- `bin/flash-uno-qmi-imu.sh`
  - Flash the project UNO QMI8658C IMU+battery firmware for newer kits.
- `bin/flash-uno-stock.sh`
  - Flash the preserved stock UNO baseline.
- `bin/flash-uno-stock-qmi.sh`
  - Flash the newer stock UNO QMI8658C baseline.
- `bin/flash-esp32-s3.sh`
  - Flash the project ESP32-S3 firmware.
- `bin/flash-esp32-s3-stock.sh`
  - Flash the authoritative vendor ESP32-S3 V1.3 baseline.
- `bin/flash-esp32-wrover.sh`
  - Flash the project ESP32-WROVER firmware.
- `bin/flash-esp32-s3-serial-diag.sh`
  - Flash the minimal ESP32-S3 UART diagnostic sketch.
- `bin/flash-esp32-s3-ws.sh`
  - Flash the Tier 3 WS firmware to an ESP32-S3.
- `bin/flash-esp32-wrover-ws.sh`
  - Flash the Tier 3 WS firmware to an ESP32-WROVER.
- `bin/provision-car-s3.sh`
  - Provision and flash an ESP32-S3 in one step. Writes Wi-Fi, hostname, and car name to NVS, then flashes the Tier 3 WS firmware.
- `bin/provision-car-wrover.sh`
  - Same as above for ESP32-WROVER.
- `bin/verify-car.sh`
  - Automated pre-flight checks: ping, `/wifi/status` identity fields, camera HTTP, camera stream, TCP port 100. Run after provisioning or before class.

- `esp32-camera-stock/wrover/ESP32_CameraServer_AP_20220120/`
  - Authoritative stock ELEGOO WROVER baseline (RX=GPIO33, TX=GPIO4).

- `esp32-camera-stock/s3/ESP32_CameraServer_AP_2023_V1.3_vendor_s3/`
  - Authoritative vendor ESP32-S3 baseline from the 2024.01.30 ELEGOO package.
- `esp32-camera-stock/s3/ESP32_CameraServer_AP_simple_vendor_s3/`
  - Older provisional S3 baseline retained for archival comparison only.

## Notes

- These are copies to keep original vendor folders intact.
- The `arduino-uno-stock/` tree is the reference baseline.
- The `arduino-uno/` tree is the project working copy where protocol changes can be made.
- Older kits should use the MPU6050 project tree.
- Newer ESP32-S3-WROOM-1 kits should use the QMI8658C project tree.
- The `esp32-camera-stock/` tree is the ESP32 vendor reference baseline area.
- The `esp32-camera/` tree is the project working copy for ESP32 firmware.
- Main system/protocol details are documented in:
  - `docs/SYSTEM_PROTOCOL.md`
