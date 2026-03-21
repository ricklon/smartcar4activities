# System and Protocol Reference

This document describes the implemented communication path used by this project:

1. Browser UI -> local WebSocket bridge
2. Bridge -> ESP32 TCP socket server
3. ESP32 -> Arduino UNO over UART
4. UNO -> ESP32 -> bridge -> browser replies

It is based on the current code in:

- `wifi-control-ui/src/App.jsx`
- `wifi-control-ui/src/lib/protocol.js`
- `wifi-control-ui/server/bridge.mjs`
- `arduino-code/esp32-camera/ESP32_CameraServer_AP_simple/ESP32_CameraServer_AP_simple.ino`
- `arduino-code/arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050/ApplicationFunctionSet_xxx0.cpp`

## 1. System Architecture

### Hardware roles

- ESP32 camera module
  - Hosts Wi-Fi AP (`ELEGOO-...`)
  - Exposes camera stream at `http://192.168.4.1:81/stream`
  - Runs a TCP control server on port `100`
  - Bridges TCP frames to UNO over `Serial2` at `9600` baud
- Arduino UNO
  - Runs motion control and autonomous modes
  - Parses JSON control commands
  - Emits short brace-delimited reply frames
- Client laptop or phone
  - Runs the React UI in a browser
  - Connects to a local Node bridge over WebSocket

### Software roles

- `wifi-control-ui/src/App.jsx`
  - Connects to the local bridge
  - Sends drive and mode commands
  - Displays telemetry and raw frames
- `wifi-control-ui/server/bridge.mjs`
  - Accepts browser WebSocket clients on port `8787`
  - Connects to the car TCP socket
  - Polls telemetry on a timer
  - Echoes ESP32 heartbeat frames
  - Normalizes some UNO replies into browser telemetry messages
- ESP32 firmware
  - Forwards non-heartbeat TCP frames to UNO unchanged
  - Forwards UNO serial replies back to the TCP client
- UNO firmware
  - Interprets command JSON by `N` code
  - Returns telemetry and acknowledgements as short text frames

## 2. End-to-End Topology

1. Browser -> bridge:
   - `ws://<bridge-host>:8787`
2. Bridge -> ESP32:
   - raw TCP to `<car-host>:100`
   - default car host is `192.168.4.1`
3. ESP32 -> UNO:
   - `Serial2.begin(9600, SERIAL_8N1, 3, 1)`
4. Camera stream:
   - `http://<car-host>:81/stream`

The bridge is the protocol adapter. The browser never talks directly to the car.

## 2a. Wi-Fi Network Modes

The ESP32 camera firmware now supports two boot paths:

- Station mode (`STA`) when saved local Wi-Fi credentials exist and the join succeeds
- Fallback access point mode (`AP`) when there are no saved credentials or the station join times out

Provisioning flow:

1. Fresh device boots into its own AP
2. User connects to the AP and opens `/wifi`
3. User saves local Wi-Fi credentials
4. Device reboots
5. Device tries local Wi-Fi first
6. If the join fails, it falls back to its own AP again

Runtime fallback:

- if saved credentials exist
- and STA remains disconnected for an extended retry window
- the firmware re-enables the fallback AP so the device remains recoverable

## 3. Frame Types by Layer

### Browser <-> bridge

The browser and bridge exchange JSON messages over WebSocket.

Browser -> bridge messages:

- Connect to car:

```json
{"type":"connect-car","host":"192.168.4.1","port":100}
```

- Send a JSON command to the car:

```json
{"type":"send-json","payload":{"N":3,"D1":3,"D2":120,"H":"DRV"}}
```

- Send a raw frame string to the car:

```json
{"type":"send-frame","payload":"{Heartbeat}"}
```

Bridge -> browser messages:

- Status:

```json
{"type":"status","carConnected":true,"host":"192.168.4.1","port":100}
```

- Raw car frame:

```json
{"type":"frame","frame":"{US_37}"}
```

- Telemetry update:

```json
{"type":"telemetry","data":{"ultrasonicCm":37}}
```

- Error:

```json
{"type":"error","message":"socket error text"}
```

### Browser -> ESP32 camera admin

The camera web server also exposes local configuration endpoints:

- `GET /wifi`
  - simple HTML setup page for Wi-Fi provisioning
- `GET /wifi/status`
  - JSON network status
- `POST /wifi/config`
  - stores local Wi-Fi credentials in NVS and reboots
- `POST /wifi/forget`
  - clears stored local Wi-Fi credentials and reboots to AP mode

### Bridge <-> ESP32

The bridge sends raw brace-delimited text frames over TCP.

Two kinds of frames matter:

- JSON command frames, for example:

```json
{"N":3,"D1":3,"D2":120,"H":"DRV"}
```

- Heartbeat frame:

```text
{Heartbeat}
```

The bridge sends JSON by serializing a JS object, then wrapping it in braces only if the payload did not already start with `{`.

### ESP32 <-> UNO

The ESP32 forwards frames almost transparently:

- incoming TCP `{Heartbeat}`:
  - consumed by ESP32 heartbeat logic
  - not forwarded to UNO
- any other incoming TCP `{...}`:
  - forwarded to UNO with `Serial2.print(readBuff)`
- any UNO reply ending in `}`:
  - accumulated by ESP32
  - sent to TCP client unchanged with `client.print(sendBuff)`

This means the UNO is the effective application protocol endpoint for command handling.

## 4. Framing Rules

### Command frame format

UNO commands are JSON objects inside braces:

```json
{"N":<number>,"H":"<tag>", ...}
```

Observed fields:

- `N`: command id
- `H`: host-provided tag or serial number used in many UNO replies
- `D1`, `D2`, `D3`, `D4`: command parameters
- `T`: timer for some time-limited commands

### Reply frame format

Typical UNO replies are plain text, not JSON:

```text
{<tag>_<value>}
```

Examples:

- `{DRV_ok}`
- `{US_37}`
- `{UO_true}`
- `{GR_false}`

There is also a stock acknowledgement form with no tag:

```text
{ok}
```

This is important because the bridge telemetry parser only understands `{key_value}` frames. `{ok}` is passed through to the browser as a raw `frame` message but does not become structured telemetry.

### Delimiting behavior

All three lower layers treat `}` as the frame terminator.

Implications:

- No escaping is implemented.
- No length prefix is used.
- Frames must remain simple and self-contained.
- The bridge parser is tolerant of leading garbage before the first `{`, but otherwise assumes complete brace-delimited frames.

## 5. Heartbeat Contract

Heartbeat exists only between the bridge and ESP32.

ESP32 behavior:

- sends `{Heartbeat}` about once per second
- waits for the same frame to come back from the TCP client
- increments a missed-heartbeat counter if no echo arrives
- breaks the client loop after more than 3 misses
- sends `{"N":100}` to the UNO when the client disconnects or when no Wi-Fi station remains connected

Bridge behavior:

- when it receives `{Heartbeat}`, it immediately sends `{Heartbeat}` back
- it does not forward heartbeat to the browser as telemetry

UNO behavior:

- does not participate in heartbeat directly

## 5a. Wi-Fi Credential Persistence

The ESP32 stores local Wi-Fi credentials in NVS using the Arduino-ESP32 `Preferences` library.

Stored values:

- namespace: `wifi`
- keys:
  - `ssid`
  - `password`

Operational rules:

- the firmware does not depend on the WiFi library's own flash persistence
- credentials are managed explicitly through the provisioning endpoints
- clearing saved credentials returns the device to AP-first behavior on next boot

## 6. Browser Command Semantics

### Manual drive

The browser converts joystick or keyboard input into:

- stop:

```json
{"N":100,"H":"STOP"}
```

- drive:

```json
{"N":3,"D1":<direction>,"D2":<speed>,"H":"DRV"}
```

Direction mapping from `wifi-control-ui/src/lib/protocol.js`:

- `D1=1`: left
- `D1=2`: right
- `D1=3`: forward
- `D1=4`: backward

Speed mapping:

- derived from joystick magnitude
- clamped to UI-configured range
- defaults currently target `45..210` in the UI

The browser sends manual drive commands only while `activeMode === "manual"`.

### Mode control

The UI separates mode selection from activation.

When entering an autonomous mode, the UI sends:

1. stop: `{"N":100,"H":"STOP"}`
2. programming/manual reset: `{"N":110,"H":"MODE"}`
3. activate selected mode: `{"N":101,"D1":<mode>,"H":"MODE"}`

Mode mapping:

- `D1=1`: line follow
- `D1=2`: obstacle avoid
- `D1=3`: follow

When leaving an autonomous mode, the UI sends:

1. `{"N":110,"H":"MODE"}`
2. `{"N":100,"H":"STOP"}`

## 7. Bridge Polling Model

The bridge polls the car every `180 ms` and rotates through a probe list.

### Manual mode probes

```json
{"N":21,"D1":1,"H":"UO"}
{"N":21,"D1":2,"H":"US"}
{"N":22,"D1":0,"H":"IL"}
{"N":22,"D1":1,"H":"IM"}
{"N":22,"D1":2,"H":"IR"}
{"N":23,"H":"GR"}
{"N":24,"D1":1,"H":"AX"}
{"N":24,"D1":2,"H":"AY"}
{"N":24,"D1":3,"H":"AZ"}
{"N":24,"D1":4,"H":"GX"}
{"N":24,"D1":5,"H":"GY"}
{"N":24,"D1":6,"H":"GZ"}
{"N":24,"D1":7,"H":"YW"}
```

### Auto mode probes

```json
{"N":21,"D1":1,"H":"UO"}
{"N":21,"D1":2,"H":"US"}
{"N":23,"H":"GR"}
```

Auto mode intentionally excludes `N=22`.

Reason:

- UNO command `N=22` calls `CMD_TraceModuleStatus_xxx0()`
- that function forces `Functional_Mode = CMD_Programming_mode`
- repeated `N=22` polling would kick the car out of line, obstacle, or follow mode

This is the most important project-specific protocol constraint.

## 8. UNO Command Contract Used by This Project

The stock UNO parser handles many command ids, but this project relies mainly on the subset below.

### `N=3` drive, no time limit

Request:

```json
{"N":3,"D1":<direction>,"D2":<speed>,"H":"DRV"}
```

Effect:

- sets `Functional_Mode = CMD_CarControl_NoTimeLimit`
- stores direction and speed for the motion control loop

Reply:

```text
{DRV_ok}
```

### `N=21` ultrasonic module status

Request variants:

```json
{"N":21,"D1":1,"H":"UO"}
{"N":21,"D1":2,"H":"US"}
```

Semantics:

- `D1=1`: obstacle presence using stock threshold `ObstacleDetection`
- `D1=2`: raw ultrasonic distance in cm

Replies:

- `{UO_true}` or `{UO_false}`
- `{US_<cm>}`

### `N=22` tracking module status

Request variants:

```json
{"N":22,"D1":0,"H":"IL"}
{"N":22,"D1":1,"H":"IM"}
{"N":22,"D1":2,"H":"IR"}
```

Semantics:

- `D1=0`: left IR analog reading
- `D1=1`: middle IR analog reading
- `D1=2`: right IR analog reading

Replies:

- `{IL_<value>}`
- `{IM_<value>}`
- `{IR_<value>}`

Side effect:

- always forces `Functional_Mode = CMD_Programming_mode`

### `N=23` ground contact status

Request:

```json
{"N":23,"H":"GR"}
```

Reply:

- `{GR_true}` when the firmware considers the car on the ground
- `{GR_false}` when the firmware considers the car to have left the ground

The code implements this by inverting the internal `Car_LeaveTheGround` flag.

### `N=24` IMU telemetry

Request variants:

```json
{"N":24,"D1":1,"H":"AX"}
{"N":24,"D1":2,"H":"AY"}
{"N":24,"D1":3,"H":"AZ"}
{"N":24,"D1":4,"H":"GX"}
{"N":24,"D1":5,"H":"GY"}
{"N":24,"D1":6,"H":"GZ"}
{"N":24,"D1":7,"H":"YW"}
```

Semantics:

- `D1=1..3`: raw accelerometer X/Y/Z
- `D1=4..6`: raw gyroscope X/Y/Z
- `D1=7`: relative yaw from the firmware's integrated gyro-Z path

Replies:

- `{AX_<value>}`
- `{AY_<value>}`
- `{AZ_<value>}`
- `{GX_<value>}`
- `{GY_<value>}`
- `{GZ_<value>}`
- `{YW_<value>}`

Notes:

- `AX..GZ` are raw sensor values from the MPU6050
- `YW` is emitted in centi-degrees to keep the UNO reply lightweight on AVR
- current bridge polling requests IMU telemetry only in manual mode

### `N=100` standby / stop

Request:

```json
{"N":100,"H":"STOP"}
```

Effect:

- sets `Functional_Mode = CMD_ClearAllFunctions_Standby_mode`
- later transitions the car into standby via `CMD_ClearAllFunctions_xxx0()`

Reply:

```text
{ok}
```

Note:

- unlike many other commands, stock firmware does not include the host `H` tag in this acknowledgement

### `N=110` clear all functions and enter programming mode

Request:

```json
{"N":110,"H":"MODE"}
```

Effect:

- clears active functions
- returns the control logic to programming/manual context

Reply:

```text
{MODE_ok}
```

### `N=101` switch autonomous mode

Request:

```json
{"N":101,"D1":1,"H":"MODE"}
```

or `D1=2`, `D1=3`

Effect:

- `1`: line follow
- `2`: obstacle avoid
- `3`: follow

Reply:

```text
{ok}
```

Again, this stock acknowledgement is not tagged with `H`.

## 9. Reply Parsing in the Bridge

The bridge only parses reply frames matching:

```text
^\{([^_{}]+)_([^{}]+)\}$
```

That means:

- `{US_37}` parses successfully
- `{MODE_ok}` parses successfully
- `{ok}` does not parse
- malformed or concatenated frames do not parse

Parsed keys are mapped as follows:

- `US` -> `telemetry.ultrasonicCm`
- `UO` -> `telemetry.obstacleDetected`
- `IL` -> `telemetry.irLeft`
- `IM` -> `telemetry.irMid`
- `IR` -> `telemetry.irRight`
- `GR` -> `telemetry.onGround`
- `AX` -> `telemetry.imuAx`
- `AY` -> `telemetry.imuAy`
- `AZ` -> `telemetry.imuAz`
- `GX` -> `telemetry.imuGx`
- `GY` -> `telemetry.imuGy`
- `GZ` -> `telemetry.imuGz`
- `YW` -> `telemetry.imuYawCdeg`

All parsed and unparsed non-heartbeat frames are still forwarded to the browser as raw `frame` messages.

The bridge also publishes link-health counters:

- `linkRxFrames`
- `linkParseMisses`
- `linkLastFrameAt`

## 10. Important Behavior Constraints

### `N=22` disrupts autonomous modes

This is implemented in the UNO firmware, not the bridge:

- `CMD_TraceModuleStatus_xxx0()` ends by forcing programming mode
- therefore `N=22` is safe only when the car is already in manual/programming mode

The bridge mitigation is correct and should be preserved.

### Obstacle threshold is stock firmware logic

`N=21, D1=1` uses the UNO constant `ObstacleDetection`, currently `20 cm`.

This means:

- obstacle-detected telemetry is a boolean derived on the UNO
- changing the UI teaching threshold does not change firmware behavior

### Acknowledgements are inconsistent

The UNO parser mixes two response styles:

- tagged: `{H_ok}`
- untagged: `{ok}`

The project currently tolerates this because:

- mode and stop commands are not driven by parsing their acknowledgements
- UI state is maintained on the browser side

If future tooling needs command correlation, the firmware or bridge would need normalization.

## 11. Practical Examples

### Start manual driving

Browser sends to bridge:

```json
{"type":"send-json","payload":{"N":3,"D1":3,"D2":120,"H":"DRV"}}
```

Bridge sends to ESP32:

```json
{"N":3,"D1":3,"D2":120,"H":"DRV"}
```

UNO replies:

```text
{DRV_ok}
```

Bridge forwards browser messages:

```json
{"type":"frame","frame":"{DRV_ok}"}
```

### Poll ultrasonic distance

Bridge sends:

```json
{"N":21,"D1":2,"H":"US"}
```

UNO replies:

```text
{US_37}
```

Bridge emits:

```json
{"type":"frame","frame":"{US_37}"}
```

and:

```json
{"type":"telemetry","data":{"ultrasonicCm":37}}
```

### Enter line-follow mode

Browser sends:

```json
{"type":"send-json","payload":{"N":100,"H":"STOP"}}
{"type":"send-json","payload":{"N":110,"H":"MODE"}}
{"type":"send-json","payload":{"N":101,"D1":1,"H":"MODE"}}
```

Typical UNO replies:

```text
{ok}
{MODE_ok}
{ok}
```

Bridge then switches its own polling plan to the auto-mode probe list and stops sending `N=22`.

## 12. Source of Truth

For future protocol work, treat these files as authoritative:

- browser message flow:
  - `wifi-control-ui/src/App.jsx`
- browser drive encoding:
  - `wifi-control-ui/src/lib/protocol.js`
- bridge transport and polling:
  - `wifi-control-ui/server/bridge.mjs`
- ESP32 TCP/UART relay and heartbeat:
  - `arduino-code/esp32-camera/ESP32_CameraServer_AP_simple/ESP32_CameraServer_AP_simple.ino`
- UNO command parser and replies:
  - `arduino-code/arduino-uno/SmartRobotCarV4.0_V1_20230201_TB6612_MPU6050/ApplicationFunctionSet_xxx0.cpp`
