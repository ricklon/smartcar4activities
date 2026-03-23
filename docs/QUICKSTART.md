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

## 0a. Pre-Provision Cars (Instructor Setup, One Time Per Car)

If using the Tier 3 WS firmware, pre-provision each car before class with its
Wi-Fi credentials, mDNS hostname, and car name. Connect the car via USB and run:

```bash
# ESP32-S3 kit
arduino-code/bin/provision-car-s3.sh \
  --ssid "ClassroomWifi" \
  --password "wifipassword" \
  --hostname "hiro1" \
  --car-name "Hiro 1"

# ESP32-WROVER kit
arduino-code/bin/provision-car-wrover.sh \
  --ssid "ClassroomWifi" \
  --password "wifipassword" \
  --hostname "hiro1" \
  --car-name "Hiro 1"
```

This flashes the provisioner (writes credentials to NVS) then flashes the main
firmware in one step. The car comes up connected with the right hostname already
set. NVS data persists through future firmware reflashes.

After provisioning, check `http://hiro1.local/wifi/status` or connect to the
serial monitor to confirm.

If you need to re-provision or clear credentials, see the serial recovery
procedure in `docs/ESP32_S3_TROUBLESHOOTING.md`.

## 1. Power + Network

Hardware note:

- Older kits may use `ESP32-WROVER + MPU6050`
- Newer kits may use `ESP32-S3-WROOM-1 + QMI8658C`
- The UI workflow is the same, but make sure the flashed firmware matches the hardware variant

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
   - or the saved mDNS hostname if one was configured during AP setup, for example `hiro1.local`
4. Use these car endpoints:
   - camera stream: `http://<car-lan-ip>:81/stream`
   - car host: `<car-lan-ip>`
   - car TCP port: `100`

During AP-mode provisioning at `/wifi`, you can optionally save a hostname such as `hiro1`.
On networks with mDNS support, you can then use `hiro1.local` instead of the raw LAN IP.

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
- Bridge Host:Port = `localhost:8787` when the browser runs on the same machine as the bridge
- Bridge Host:Port = `<laptop-lan-ip>:8787` when the browser runs on another device
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
- If the ESP32 is on your LAN: keep Bridge Host at `localhost:8787` only when the browser is on the same machine as the bridge. Otherwise use the bridge host machine's LAN IP.
- If camera works but car does not move: verify ESP32<->UNO UART wiring.
- If obstacle mode seems inactive: ensure the mode is ON and bridge build includes mode-aware polling.
- **If the car has saved credentials for an unreachable network:** connect via USB, open serial monitor at 115200, reset the car, and send `r` within 3 seconds when prompted to clear credentials and force AP mode. See `docs/ESP32_S3_TROUBLESHOOTING.md` for the full recovery procedure.
