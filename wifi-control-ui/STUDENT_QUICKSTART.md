# Student Quickstart - Robot WiFi Dashboard

Use this sheet during class. Startup steps match `docs/QUICKSTART.md`.

## 1) Power + Network

1. Power on your car.
2. Join your assigned WiFi network: `ELEGOO-XXXXXXXX`.
3. If asked about no internet, choose to stay connected.
4. Check camera stream opens: `http://192.168.4.1:81/stream`

## 2) Open Dashboard + Connect

1. Open browser to the class dashboard URL from instructor.
2. In the page, confirm:
   - `Bridge Host:Port` (provided by instructor, often `localhost:8787`)
   - `Car Host = 192.168.4.1`
   - `Car TCP Port = 100`
3. Click `Connect Bridge + Car`.
4. Check status badges:
   - `Bridge: online`
   - `Car TCP: online`
   - camera image visible

## 3) Safe Control Check (Manual)

1. Select `FPV / Manual`.
2. Click `Turn ON Selected`.
3. Briefly test joystick or D-pad.
4. Press `■` (stop).

## 4) Drive Controls

- Joystick: drag for smooth movement.
- D-pad: tap arrows for direct movement.
- Keyboard: arrow keys to move, space to stop.

## 5) Mode Buttons

- `FPV / Manual` = direct driving mode.
- `Line Follow` = line tracking mode.
- `Obstacle` = obstacle avoidance mode.
- `Follow` = follow mode.

## 6) Safety Rules

1. Keep one finger ready for `■` stop.
2. Do not drive off tables or near edges.
3. If control feels wrong, press stop and reconnect.

## 7) Data Collection

### Record a run

1. Click `Start Recording`.
2. Drive/test.
3. Click `Stop Recording`.
4. Click `Export CSV`.

### Save an image

- Click `Snapshot` to download a timestamped picture.

## 8) Troubleshooting

### Camera works, but car does not move

- Reconnect (`Connect Bridge + Car` again).
- Verify your team is on the correct `ELEGOO-...` network.
- Press `FPV / Manual` then try movement again.

### `Car TCP` shows offline

- Wait 3 seconds, click connect again.
- Ask instructor to check bridge connection logs.

## Team Log

- Team ID: ____________________
- Car SSID: ____________________
- Date: ____________________
- CSV filename: ____________________
- Snapshot filename: ____________________
