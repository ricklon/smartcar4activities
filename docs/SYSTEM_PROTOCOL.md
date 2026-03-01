# System and Protocol Reference

This document describes how the ELEGOO car firmware pieces work together in this project and the protocol used by `wifi-control-ui`.

## 1. System Architecture

### Hardware roles

- **ESP32 camera module**
  - Hosts Wi-Fi AP (`ELEGOO-...`), camera HTTP stream, and TCP socket server.
  - Forwards TCP JSON command frames to UNO over `Serial2`.
  - Forwards UNO serial reply frames back to TCP client.

- **Arduino UNO**
  - Executes vehicle logic: drive, line follow, obstacle avoid, follow mode, sensor reads.
  - Parses JSON commands and sends `{<H>_<value>}` style replies.

- **Client laptop/phone**
  - Browser UI for FPV and controls.
  - Node bridge process to connect browser WebSocket to car TCP socket.

### Software roles

- **`wifi-control-ui` (React/Vite)**
  - UI controls, mode UX, telemetry display, challenge cards.
- **`wifi-control-ui/server/bridge.mjs`**
  - WebSocket server for browser.
  - TCP client to car (`192.168.4.1:100`).
  - Heartbeat handling and telemetry polling.

## 2. Transport Topology

1. Browser -> Bridge: `ws://<host>:8787`
2. Bridge -> ESP32: TCP `192.168.4.1:100`
3. ESP32 -> UNO: UART (`Serial2`, 9600 baud)
4. Camera stream: `http://192.168.4.1:81/stream`

## 3. ESP32 Camera Firmware Protocol Behavior

From `arduino-code/esp32-camera/ESP32_CameraServer_AP_simple/ESP32_CameraServer_AP_simple.ino`:

- TCP server listens on port `100`.
- Frames are expected as `{...}`.
- If frame is `{Heartbeat}`, ESP32 marks heartbeat alive.
- Any non-heartbeat frame is forwarded to UNO via `Serial2.print(readBuff)`.
- ESP32 emits `{Heartbeat}` to TCP client every 1s.
- If heartbeat reply is missed for >3 intervals, socket loop breaks.
- On disconnect / no station, ESP32 sends `{"N":100}` to UNO (stop).

## 4. Message Framing

### Command frames (to car)

- JSON object enclosed in braces, e.g.:
  - `{"N":3,"D1":3,"D2":120,"H":"DRV"}`
  - `{"N":101,"D1":2,"H":"MODE"}`

### Reply frames (from UNO)

- String frame format:
  - `{<H>_<value>}`
- Examples:
  - `{US_37}` (ultrasonic cm)
  - `{UO_true}` (obstacle bool)
  - `{GR_false}` (ground contact state)

### Heartbeat frame

- `{Heartbeat}`
- Bridge must echo `{Heartbeat}` back to keep TCP session alive.

## 5. Browser <-> Bridge Protocol

### Browser -> Bridge

- `{"type":"connect-car","host":"192.168.4.1","port":100}`
- `{"type":"send-json","payload":{...}}`
- `{"type":"send-frame","payload":"{...}"}`

### Bridge -> Browser

- `{"type":"status","carConnected":true|false,...}`
- `{"type":"frame","frame":"{US_32}"}`
- `{"type":"telemetry","data":{...}}`
- `{"type":"error","message":"..."}`

## 6. Command Set Used in This Project

UNO command parser location:
- `arduino-code/arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050/ApplicationFunctionSet_xxx0.cpp`

Key commands:

- `N=3` no-time-limit car motion (`D1` direction, `D2` speed)
- `N=100` clear/standby (stop)
- `N=110` clear/programming mode
- `N=101` mode select:
  - `D1=1` line follow
  - `D1=2` obstacle avoid
  - `D1=3` follow
- `N=21` ultrasonic:
  - `D1=1` obstacle boolean
  - `D1=2` distance value
- `N=22` IR tracking module values
- `N=23` ground status

## 7. Telemetry Map in Bridge/UI

Bridge polling tags (`H`) and mapped UI fields:

- `H=UO` (`N21 D1=1`) -> `telemetry.obstacleDetected`
- `H=US` (`N21 D1=2`) -> `telemetry.ultrasonicCm`
- `H=IL` (`N22 D1=0`) -> `telemetry.irLeft`
- `H=IM` (`N22 D1=1`) -> `telemetry.irMid`
- `H=IR` (`N22 D1=2`) -> `telemetry.irRight`
- `H=GR` (`N23`) -> `telemetry.onGround`

Note:
- In auto modes (`line`, `obstacle`, `follow`), `N22` polling is disabled intentionally.
- `irLeft/irMid/irRight` values shown in UI during auto modes are the last values sampled in manual mode.

Also exposed by bridge:
- `linkRxFrames`, `linkParseMisses`, `linkLastFrameAt`

## 8. Mode Control Semantics (Current UI)

- Mode selection and mode activation are separate.
- User flow:
  1. Select a mode.
  2. Click `Turn ON Selected`.
  3. Click `Turn OFF Selected` to return to manual.
- Transition safety:
  - sends stop (`N100`) before entering a new auto mode.

## 9. Important Behavior Constraints

### N22 can disrupt auto modes

UNO `CMD_TraceModuleStatus_xxx0` sets functional mode to programming mode after response.
This can interrupt active auto modes if polled continuously.

Mitigation in `bridge.mjs`:
- In auto modes (`line`, `obstacle`, `follow`), bridge polls only `N21` and `N23`.
- `N22` polling is limited to manual mode.

### Obstacle trigger threshold

- Firmware obstacle threshold constant is `ObstacleDetection = 20` cm.
- Obstacle and follow logic currently use 20 cm checks in stock firmware.

### Follow mode behavior (stock firmware)

- Entered via `N=101, D1=3`.
- Follow mode uses ultrasonic distance + servo scan waypoints to choose move/turn behavior.
- If target is not within the stock near-range check (~20 cm), the car stops and continues scanning.
- If ground-status safety indicates the car is not on ground, motion is stopped.
- Current UI follow threshold fields are teaching/analysis aids; they do not retune the stock follow algorithm.

## 10. Bring-up Checklist

1. Power car and ensure ESP32 AP is visible.
2. Connect laptop/phone to car AP.
3. Start control stack: `npm run car` (in `wifi-control-ui/`).
4. (Optional fallback) Start bridge and UI separately with `npm run bridge` and `npm run dev -- --host`.
5. In UI click `Connect Bridge + Car`.
6. Verify:
   - Bridge online
   - Car TCP online
   - Camera stream active
7. For auto mode testing:
   - Select mode -> `Turn ON Selected`
   - observe relevant mode telemetry/challenge card

## 11. Source of Truth Files

- UI dashboard: `wifi-control-ui/src/App.jsx`
- Drive command mapping: `wifi-control-ui/src/lib/protocol.js`
- Bridge/protocol adapter: `wifi-control-ui/server/bridge.mjs`
- ESP32 socket/camera firmware: `arduino-code/esp32-camera/ESP32_CameraServer_AP_simple/`
- UNO control firmware: `arduino-code/arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050/`
