# AGENTS.md - classroom-fpv-project

## Scope

This file applies to everything under:
- `classroom-fpv-project/`

This folder is the standalone project workspace (separate from vendor package roots).

## Project Structure

- `README.md`
  - Top-level project overview and quick start
- `docs/`
  - `SYSTEM_PROTOCOL.md`
  - `QUICKSTART.md`
  - `PROJECT_OVERVIEW.md`
  - `LICENSING.md`
  - `ARDUINO_CLI_GUIDE.md`
  - `ESP32_S3_TROUBLESHOOTING.md`
- `arduino-code/`
  - Curated firmware workspace used by this project
  - Has its own detailed `arduino-code/AGENTS.md`
- `wifi-control-ui/`
  - React/Vite frontend
  - Node bridge: `wifi-control-ui/server/bridge.mjs`

## Runtime Model

1. Browser UI -> WebSocket bridge (`:8787`)
2. Bridge -> ESP32 socket (`192.168.4.1:100`)
3. ESP32 -> UNO over UART
4. Camera stream -> `http://192.168.4.1:81/stream`

## Commands

### Start UI + bridge

```bash
cd wifi-control-ui
npm run bridge
# separate terminal
cd wifi-control-ui
npm run dev -- --host
```

### Build check

```bash
cd wifi-control-ui
npm run build
```

### Firmware compile examples

```bash
./bin/arduino-cli compile --fqbn arduino:avr:uno "arduino-code/arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050"
./bin/arduino-cli compile --fqbn esp32:esp32:esp32s3:PartitionScheme=huge_app,PSRAM=opi,CDCOnBoot=cdc "arduino-code/esp32-camera/ESP32_CameraServer_AP_simple"
```

## Engineering Rules

- Keep this project separate from upstream vendor directories.
- Prefer editing in:
  - `wifi-control-ui`
  - `arduino-code`
  - `docs`
- Preserve protocol compatibility unless intentionally changing all layers.
- If protocol fields/commands change, update all relevant layers:
  - UNO firmware
  - ESP32 firmware (if required)
  - bridge
  - UI
  - docs

## Known Critical Notes

- ESP32 heartbeat (`{Heartbeat}`) must be echoed by bridge.
- Avoid polling `N22` during auto modes (line/obstacle/follow), because UNO `N22` path can force programming mode.
- Obstacle threshold in current stock UNO firmware is 20 cm.

## License

Project intent is to follow upstream ELEGOO licensing terms for derived firmware/materials.
See `docs/LICENSING.md`.
