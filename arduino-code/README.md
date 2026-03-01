# Arduino Code Layout

This folder contains the firmware sources currently used by this project, copied into one place for easier maintenance.

## Included Firmware

- `arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050/`
  - Main Arduino UNO firmware (motor/sensor/mode control).
  - Source copied from:
    - `02 Manual & Main Code & APP/02 Main Program   (Arduino UNO)/TB6612 & MPU6050/SmartRobotCarV4.0_V1_20230201/`

- `esp32-camera/ESP32_CameraServer_AP_simple/`
  - ESP32 camera/AP/socket bridge firmware used with ESP32-S3 camera module.
  - Source copied from:
    - `02 Manual & Main Code & APP/04 Code of Carmer (ESP32)/ESP32-WROVER-Camera/ESP32_CameraServer_AP_simple/`

## Notes

- These are copies to keep original vendor folders intact.
- Main system/protocol details are documented in:
  - `docs/SYSTEM_PROTOCOL.md`
