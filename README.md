# ELEGOO Smart Robot Car V4.0 - Classroom FPV Control

[Smart Robot Car Kit V4.0 (With Camera)](https://us.elegoo.com/products/elegoo-smart-robot-car-kit-v-4-0)

This repository is a classroom-focused control stack for the ELEGOO Smart Robot Car V4.0.
It combines curated firmware copies with a browser FPV dashboard and a local bridge service.

## Default Behavior vs This Project

By default, ELEGOO cars run a local web server/control stack on the car itself, and students join the car's Wi-Fi network (`ELEGOO-...`) to control it.

This project is an alternative to the default ELEGOO Android app:
- It provides a web-based interface for anyone who can join the car network.
- It exposes telemetry/data, car modes, and control features in a browser UI.
- It retains compatibility with stock vehicle behavior and requires no firmware changes for core use.

Existing control paths still work:
- IR remote support remains available.
- The default Android app and other stock features can still be used.

Fallback AP compatibility note:
- When the ESP32 cannot join a saved local network, it falls back to the original ELEGOO-style AP workflow.
- In that mode, the project keeps using the stock-style host and ports:
  - car host: `192.168.4.1`
  - control socket: `192.168.4.1:100`
  - camera stream: `http://192.168.4.1:81/stream`
- This is intentional so fallback mode stays compatible with the original ELEGOO firmware/network model.

## Start Here

- For classroom bring-up: `docs/QUICKSTART.md`
- For protocol/system behavior: `docs/SYSTEM_PROTOCOL.md`
- For Wi-Fi, camera, and control recovery steps: `docs/ESP32_S3_TROUBLESHOOTING.md`
- For project context: `docs/PROJECT_OVERVIEW.md`
- For mixed-platform activities (stock app + this dashboard): `docs/STEM_ACTIVITY_CARDS_CROSS_PLATFORM.md`
- For no-network IR-remote activities: `docs/STEM_ACTIVITY_CARDS_IR_REMOTE.md`
- For UI usage details: `wifi-control-ui/README.md`
- For firmware layout and compile notes: `arduino-code/README.md`

## Docs Index

- [Quickstart](docs/QUICKSTART.md)
- [System Protocol](docs/SYSTEM_PROTOCOL.md)
- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [STEM Activity Cards (Classroom)](docs/STEM_ACTIVITY_CARDS.md)
- [STEM Activity Cards (Cross-Platform)](docs/STEM_ACTIVITY_CARDS_CROSS_PLATFORM.md)
- [STEM Activity Cards (IR Remote Only)](docs/STEM_ACTIVITY_CARDS_IR_REMOTE.md)
- [Arduino CLI Guide](docs/ARDUINO_CLI_GUIDE.md)
- [ESP32-S3 Troubleshooting](docs/ESP32_S3_TROUBLESHOOTING.md)
- [Licensing](docs/LICENSING.md)

## Prerequisites (Windows, macOS, Linux)

To run this project, install **Node.js LTS** (npm is included with Node.js):
- Download: [https://nodejs.org/en/download/](https://nodejs.org/en/download/)

After install, verify in a terminal:

```bash
node -v
npm -v
```

If both commands print versions, you are ready to run the project.

## What This Project Adds

- Browser-based FPV driving (joystick, D-pad, keyboard)
- Explicit mode workflow (`FPV / Manual`, `Line Follow`, `Obstacle`, `Follow`)
- Live telemetry + challenge cards for activities
- Session recording (CSV) + image snapshots
- Bridge process that adapts browser WebSocket traffic to car TCP protocol

## Runtime Topology

1. Browser UI <-> WebSocket bridge (`ws://<host>:8787`)
2. Bridge <-> ESP32 socket (`192.168.4.1:100`)
3. ESP32 <-> UNO over UART
4. Camera stream (`http://192.168.4.1:81/stream`)

## Repository Layout

- `wifi-control-ui/`
  - React/Vite dashboard
  - Bridge server at `wifi-control-ui/server/bridge.mjs`
- `arduino-code/`
  - Curated UNO and ESP32 firmware used by this project
- `docs/`
  - Quickstart, protocol, overview, troubleshooting, and licensing docs

## Quick Dev Run (UI + Bridge)

Preferred (one command):

```bash
cd wifi-control-ui
npm install
npm run car
```

Aliases: `npm run classroom`, `npm run start-car`

If you want manual split terminals instead:

```bash
# terminal A
cd wifi-control-ui
npm run bridge

# terminal B
cd wifi-control-ui
npm run dev -- --host
```

Open the Vite URL (typically `http://localhost:5173`), then use:
- Bridge Host:Port = `localhost:8787`
- Car Host =:
  - `192.168.4.1` when the ESP32 is in fallback AP mode
  - the ESP32 LAN IP when it successfully joined a local network
- Car TCP Port = `100`

## Basic Car Connection (Fast Path)

1. Power on the car.
2. Use one of these network paths:
   - fallback AP mode: join the car Wi-Fi network (`ELEGOO-...`) and use `192.168.4.1`
   - LAN mode: join the same local Wi-Fi as the car and use the ESP32 LAN IP
3. Start the app from `wifi-control-ui` with `npm run car`.
4. Open the UI URL shown in terminal (typically `http://localhost:5173`).
5. In the UI, click `Connect Bridge + Car` and verify:
   - `Bridge: online`
   - `Car TCP: online`
   - camera stream visible

## Activities

More classroom activities and mode-based workflows are documented in:
- [docs/QUICKSTART.md](docs/QUICKSTART.md)
- [docs/PROJECT_OVERVIEW.md](docs/PROJECT_OVERVIEW.md)
- [docs/STEM_ACTIVITY_CARDS.md](docs/STEM_ACTIVITY_CARDS.md)
- [docs/STEM_ACTIVITY_CARDS_CROSS_PLATFORM.md](docs/STEM_ACTIVITY_CARDS_CROSS_PLATFORM.md)
- [docs/STEM_ACTIVITY_CARDS_IR_REMOTE.md](docs/STEM_ACTIVITY_CARDS_IR_REMOTE.md)
- [wifi-control-ui/STUDENT_QUICKSTART.md](wifi-control-ui/STUDENT_QUICKSTART.md)

## Compatibility and Roadmap

- Current state:
  - Compatible with existing ELEGOO firmware/control model.
  - Supports connecting to different cars by changing host/IP in the UI.
- Planned/desired improvements:
  - Add support for more telemetry (for example, IMU and other currently unexposed data).
  - Improve multi-car networking so many cars can operate on a shared network more easily.

## Notes

- `N22` polling is intentionally disabled in auto modes to avoid UNO mode disruption.
- ESP32 heartbeat frame (`{Heartbeat}`) must be echoed by the bridge.
- Obstacle threshold in current stock UNO firmware is 20 cm.

## License

This project follows upstream ELEGOO licensing intent for derived firmware/materials, while preserving third-party component licenses.

See `docs/LICENSING.md` for details.
