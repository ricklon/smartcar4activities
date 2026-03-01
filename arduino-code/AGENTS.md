# AGENTS.md - Arduino Code Workspace (ELEGOO V4.0)

## Scope

This `AGENTS.md` applies to everything under:
- `arduino-code/`

Use this folder as the canonical working area for firmware used by the current classroom/project setup.

## Project Layout

- `arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050/`
  - Main UNO firmware (motor, sensors, line/obstacle/follow modes, command parser).
- `esp32-camera/ESP32_CameraServer_AP_simple/`
  - ESP32 camera AP + TCP socket bridge firmware (compatible with ESP32-S3 variant in this project).

Related host-side control stack (outside this folder):
- `wifi-control-ui/`
  - React UI + Node bridge (`server/bridge.mjs`).

## System Behavior Summary

- ESP32 hosts:
  - Camera stream endpoint: `http://192.168.4.1:81/stream`
  - TCP control socket: `192.168.4.1:100`
- ESP32 forwards socket frames to UNO over `Serial2`.
- UNO parses JSON commands and returns framed replies.
- Host bridge must reply to `{Heartbeat}` to keep socket connected.

## Protocol (Current Project)

### Commands used

- `N=3` drive command (`D1` direction, `D2` speed)
- `N=100` stop / standby
- `N=110` clear to programming/manual context
- `N=101` mode switch:
  - `D1=1` line follow
  - `D1=2` obstacle avoid
  - `D1=3` follow
- `N=21` ultrasonic status/value
- `N=22` IR tracking sensor values
- `N=23` ground-contact status

### Reply framing

- UNO replies as `{<H>_<value>}` style strings.
- Heartbeat frame is `{Heartbeat}`.

## Critical Constraints

### 1) ESP32-S3 serial pin conflict

- On ESP32-S3 camera variant, camera I2C uses GPIO4.
- Do **not** place Serial2 TX on GPIO4.
- This project uses `Serial2.begin(9600, SERIAL_8N1, 3, 1)` in ESP32 sketch.

### 2) N22 side effect

- UNO `N22` handler (`CMD_TraceModuleStatus_xxx0`) sets functional mode to programming mode after responding.
- Continuous `N22` polling can interrupt auto modes.
- Bridge mitigation (already implemented in `wifi-control-ui/server/bridge.mjs`):
  - poll `N22` only in manual mode
  - in auto modes poll only `N21` + `N23`

### 3) Obstacle threshold

- Stock UNO firmware uses `ObstacleDetection = 20` cm.
- Obstacle/follow logic uses 20 cm gate in current firmware.

## Build / Upload Commands

### UNO compile

```bash
./bin/arduino-cli compile --fqbn arduino:avr:uno "arduino-code/arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050"
```

### ESP32-S3 compile (camera firmware)

```bash
./bin/arduino-cli compile --fqbn esp32:esp32:esp32s3:PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc "arduino-code/esp32-camera/ESP32_CameraServer_AP_simple"
```

### ESP32-S3 upload (example port)

```bash
./bin/arduino-cli upload -p /dev/ttyACM0 --fqbn esp32:esp32:esp32s3:PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc "arduino-code/esp32-camera/ESP32_CameraServer_AP_simple"
```

## Testing Priorities

1. Confirm ESP32 AP is up and camera stream loads.
2. Confirm bridge can connect to TCP port 100.
3. Confirm heartbeat is stable (no frequent car socket drops).
4. Confirm mode flow works:
   - select mode
   - explicit ON/OFF
   - mode transition log updates
5. Confirm obstacle mode triggers with object at <20 cm.

## UI Features Expected (Current Project)

The host UI is expected to provide:
- FPV stream
- Manual controls (joystick, D-pad, keyboard)
- Separate mode selection and explicit ON/OFF actions
- Mode transition log
- Mode-specific sensor panels
- Mode Lab tuning controls
- Challenge card per mode
- CSV recording + snapshot capture

## Editing Guidelines for Agents

- Keep original vendor directories untouched; edit under `arduino-code/` when possible.
- Preserve protocol compatibility unless explicitly changing both firmware and bridge.
- If changing command IDs or reply tags, update all of:
  - UNO parser
  - ESP32 forwarder assumptions (if needed)
  - `wifi-control-ui/server/bridge.mjs`
  - `wifi-control-ui/src/App.jsx`
  - docs (`docs/SYSTEM_PROTOCOL.md`)

## Reference Docs

- `docs/SYSTEM_PROTOCOL.md`
- `docs/ESP32_S3_TROUBLESHOOTING.md`
- `docs/ARDUINO_CLI_GUIDE.md`
