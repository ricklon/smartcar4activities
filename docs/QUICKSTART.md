# Quickstart (Classroom Day)

This is the canonical startup checklist for this project.

## 0. Install Node.js (includes npm)

On Windows, macOS, or Linux, install Node.js LTS first:
- https://nodejs.org/en/download/

Verify:

```bash
node -v
npm -v
```

## 1. Power + Network

Choose the network mode that matches the current ESP32 state.

### Option A. Car fallback AP mode

Use this when:

- the ESP32 has no saved Wi-Fi credentials
- or it failed to join the saved local network and fell back to its own AP

Compatibility note:

- Fallback AP mode intentionally keeps the original ELEGOO network layout.
- That means the same stock-style car endpoints are preserved in fallback mode even though the project also supports LAN mode.

Steps:

1. Power on the car.
2. Join the car Wi-Fi AP (`ELEGOO-...`) from laptop/phone.
3. Use these car endpoints:
   - camera stream: `http://192.168.4.1:81/stream`
   - car host: `192.168.4.1`
   - car TCP port: `100`

### Option B. Local network mode

Use this when:

- the ESP32 successfully joined your saved LAN/Wi-Fi

Steps:

1. Power on the car.
2. Join the same LAN/Wi-Fi from laptop/phone.
3. Find the car's LAN IP from:
   - the router DHCP/client list
   - the ESP32 serial boot log
   - `/wifi/status` before leaving AP mode
4. Use these car endpoints:
   - camera stream: `http://<car-lan-ip>:81/stream`
   - car host: `<car-lan-ip>`
   - car TCP port: `100`

## 2. Start Control Stack

Preferred (one command):

```bash
cd wifi-control-ui
npm install
npm run car
```

Aliases: `npm run classroom`, `npm run start-car`

Alternative (two terminals):

```bash
# terminal A
cd wifi-control-ui
npm run bridge

# terminal B
cd wifi-control-ui
npm run dev -- --host
```

Open the UI using the local/LAN URL printed by Vite.

## 3. Connect in UI

Set:
- Bridge Host:Port = `localhost:8787` (or laptop IP for phone clients)
- Car Host =:
  - `192.168.4.1` in fallback AP mode
  - `<car-lan-ip>` in local network mode
- Car TCP Port = `100`

Click `Connect Bridge + Car`.

Expected:
- `Bridge: online`
- `Car TCP: online`
- camera image visible

## 4. Safe Control Check (Manual)

1. Select `FPV / Manual`.
2. Click `Turn ON Selected`.
3. Briefly test joystick or D-pad.
4. Press `■` (stop).

## 5. Optional Mode Check (Obstacle)

1. Select `Obstacle`.
2. Click `Turn ON Selected`.
3. Place an object at ~10-15 cm.
4. Confirm obstacle telemetry updates and car reacts.
5. Click `Turn OFF Selected`.

## 6. Optional Session Capture

1. Click `Start Recording`.
2. Run activity.
3. Click `Stop Recording`.
4. Click `Export CSV`.
5. Click `Snapshot` if image capture is needed.

## Troubleshooting

- If `Car TCP` drops: restart bridge and reconnect.
- If the ESP32 falls back to AP mode: join `ELEGOO-...` and set Car Host back to `192.168.4.1`.
- If the ESP32 is on your LAN: keep Bridge Host at `localhost:8787`, but set Car Host to the ESP32 LAN IP.
- If camera works but car does not move: verify ESP32<->UNO UART wiring.
- If obstacle mode seems inactive: ensure the mode is ON and bridge build includes mode-aware polling.
