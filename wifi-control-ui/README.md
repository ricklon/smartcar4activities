# WiFi Control UI

Web dashboard for ELEGOO Smart Robot Car V4.0 (ESP32 camera + UNO control path).

Stack:
- React + Vite + Tailwind
- Node WebSocket/TCP bridge (`server/bridge.mjs`)

Main goals:
- FPV-style driving in browser
- Live sensor visibility for students
- Session recording and image snapshots

## Features

- Live camera stream (`/stream`)
- Virtual joystick (fixed center) + standard D-pad + keyboard arrows
- Drive tuning controls:
  - command interval
  - min speed
  - max speed
  - dead zone
- Car mode menu:
  - FPV / Manual
  - Line Follow
  - Obstacle
  - Follow
- Sensor Explorer (grouped by type)
- CSV session recording
- Timestamped PNG snapshots

## Architecture

Browser cannot open raw TCP directly to `192.168.4.1:100`, so this project uses a local bridge:

1. UI connects to bridge over WebSocket (`ws://<host>:8787`)
2. Bridge connects to car control socket (`192.168.4.1:100`)
3. Bridge forwards commands and polls telemetry (`N21`, `N22`, `N23`)
4. Bridge replies to ESP32 heartbeat to keep TCP session alive

## Requirements

- Node.js 18+ (tested with Node 24)
- Car running ESP32 firmware that provides:
  - camera stream on port 81
  - control socket on port 100

## Quick Start

```bash
cd wifi-control-ui
npm install
npm run bridge
```

Open a second terminal:

```bash
cd wifi-control-ui
npm run dev -- --host
```

Open UI:
- Local: `http://localhost:5173`
- LAN: `http://<your-laptop-ip>:5173`

## First Connection Checklist

1. Connect your phone/laptop to car WiFi (`ELEGOO-...`) or ensure your bridge host can route to `192.168.4.1`.
2. In UI:
   - Bridge Host:Port = `localhost:8787` (or `<laptop-ip>:8787` if remote client)
   - Car Host = `192.168.4.1`
   - Car TCP Port = `100`
3. Click `Connect Bridge + Car`.
4. Verify status badges:
   - `Bridge: online`
   - `Car TCP: online`

## Controls Guide

### Driving
- Joystick drag for analog direction/speed
- D-pad buttons for direct cardinal movement
- Keyboard:
  - Arrow keys for movement
  - Space for stop

### Drive Tuning
- `Command Interval (ms)`: lower = snappier, higher = smoother/lower traffic
- `Min Speed`: baseline movement when outside dead zone
- `Max Speed`: cap for fastest movement
- `Dead Zone`: ignore tiny stick jitter near center

### Car Modes
- `FPV / Manual`: returns to command mode and sends stop
- `Line Follow`: sends mode switch command
- `Obstacle`: sends obstacle-avoidance mode command
- `Follow`: sends follow mode command

## Sensor Explorer

Grouped panels:
- Distance / Obstacle
- Line Tracking (IR L/M/R)
- Safety / Chassis (ground status)
- Link / Protocol health
- Not Exposed by Current Firmware

Current protocol-exposed telemetry:
- Ultrasonic distance
- Obstacle boolean
- IR tracking raw values
- Ground status

Telemetry nuance:
- To prevent auto-mode interruption, bridge polling skips `N22` while auto modes are active.
- IR values (`irLeft`, `irMid`, `irRight`) update live in manual mode and may be stale in auto modes.

Not currently exposed by stock protocol:
- Battery voltage
- IMU yaw/gyro
- Motor PWM telemetry
- Wheel speed (no encoder path)

## Recording and Snapshots

### CSV Session Recording
1. Click `Start Recording`
2. Drive / run activity
3. Click `Stop Recording`
4. Click `Export CSV`

CSV includes timestamped:
- connection status
- joystick vector
- derived drive command
- telemetry values
- link health counters

### Snapshot
- Click `Snapshot` to save a timestamped PNG from live stream.

## Protocol Notes

This UI/bridge uses commands compatible with current firmware behavior:
- `N3` drive (direction + speed)
- `N100` stop/standby
- `N101` mode select
- `N110` programming/manual mode
- `N21/N22/N23` telemetry probes

## Troubleshooting

### `Car TCP` goes offline quickly
- Ensure bridge heartbeat support is running (current code includes this).
- Confirm car host/port (`192.168.4.1:100`).

### Camera works but no movement
- Check UART wiring between ESP32 and UNO.
- Ensure UNO firmware is running and parsing serial JSON.

### Snapshot is blank or fails
- If browser blocks cross-origin canvas reads, use same-origin proxy or browser with permissive local policy.

### Phone cannot use the UI
- Use LAN URL from Vite output.
- Set `Bridge Host:Port` to bridge machine IP, not `localhost`.

## Classroom Tips

- Label each car with its `ELEGOO-xxxxxxxx` ID.
- Run students in pairs:
  - Driver
  - Data recorder
- Use CSV + snapshots for quick lab reports.

## Dev Notes

Build check:

```bash
npm run build
```

Important files:
- `src/App.jsx` (dashboard)
- `src/components/Joystick.jsx`
- `src/lib/protocol.js`
- `server/bridge.mjs`
