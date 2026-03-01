# ELEGOO Smart Robot Car V4.0 - Classroom FPV Control

[Smart Robot Car Kit V4.0 (With Camera)](https://us.elegoo.com/products/elegoo-smart-robot-car-kit-v-4-0)

This repository contains an open-source classroom adaptation of the ELEGOO Smart Robot Car V4.0 firmware + web control stack.

Primary goals:
- Browser-based FPV driving
- Mode-based experiments (manual, line follow, obstacle, follow)
- Live telemetry and challenge-based STEM activities

## Project Components

- `arduino-code/`
  - Curated firmware workspace for this project
  - UNO firmware + ESP32 camera firmware copies used by the current setup
- `wifi-control-ui/`
  - React/Vite dashboard
  - Node bridge (`server/bridge.mjs`) for WebSocket <-> car TCP
- `docs/`
  - Setup, troubleshooting, protocol, and licensing documentation

## Key Documentation

- System/protocol reference: `docs/SYSTEM_PROTOCOL.md`
- Licensing notice: `docs/LICENSING.md`
- Arduino code workspace notes: `arduino-code/README.md`
- Arduino workspace agent instructions: `arduino-code/AGENTS.md`

## Quick Start (Web UI)

```bash
cd wifi-control-ui
npm install
npm run bridge
# in a second terminal
cd wifi-control-ui
npm run dev -- --host
```

Then open:
- `http://localhost:5173`

## License

This project is intended to follow the same licensing terms as the upstream ELEGOO firmware/materials it is derived from, with third-party components retaining their own licenses.

See `docs/LICENSING.md` for details.
