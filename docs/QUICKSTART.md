# Quickstart (Classroom Day)

This is the canonical startup checklist for this project.

## 1. Power + Network

1. Power on the car.
2. Join the car Wi-Fi AP (`ELEGOO-...`) from laptop/phone.
3. Confirm the camera stream opens:
   - `http://192.168.4.1:81/stream`

## 2. Start Control Stack

Terminal A:

```bash
cd wifi-control-ui
npm run bridge
```

Terminal B:

```bash
cd wifi-control-ui
npm run dev -- --host
```

Open the UI using the local/LAN URL printed by Vite.

## 3. Connect in UI

Set:
- Bridge Host:Port = `localhost:8787` (or laptop IP for phone clients)
- Car Host = `192.168.4.1`
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
- If camera works but car does not move: verify ESP32<->UNO UART wiring.
- If obstacle mode seems inactive: ensure the mode is ON and bridge build includes mode-aware polling.
