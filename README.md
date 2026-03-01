# ELEGOO Smart Robot Car V4.0 - Classroom FPV Control

[Smart Robot Car Kit V4.0 (With Camera)](https://us.elegoo.com/products/elegoo-smart-robot-car-kit-v-4-0)

This repository is a classroom-focused control stack for the ELEGOO Smart Robot Car V4.0.
It combines curated firmware copies with a browser FPV dashboard and a local bridge service.

## Start Here

- For classroom bring-up: `docs/QUICKSTART.md`
- For protocol/system behavior: `docs/SYSTEM_PROTOCOL.md`
- For project context: `docs/PROJECT_OVERVIEW.md`
- For UI usage details: `wifi-control-ui/README.md`
- For firmware layout and compile notes: `arduino-code/README.md`

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

Terminal A:

```bash
cd wifi-control-ui
npm install
npm run bridge
```

Terminal B:

```bash
cd wifi-control-ui
npm run dev -- --host
```

Open the Vite URL (typically `http://localhost:5173`), then use:
- Bridge Host:Port = `localhost:8787`
- Car Host = `192.168.4.1`
- Car TCP Port = `100`

## Notes

- `N22` polling is intentionally disabled in auto modes to avoid UNO mode disruption.
- ESP32 heartbeat frame (`{Heartbeat}`) must be echoed by the bridge.
- Obstacle threshold in current stock UNO firmware is 20 cm.

## License

This project follows upstream ELEGOO licensing intent for derived firmware/materials, while preserving third-party component licenses.

See `docs/LICENSING.md` for details.
