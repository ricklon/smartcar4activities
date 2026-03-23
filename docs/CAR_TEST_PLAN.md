# Car Acceptance Test Plan

Run these checks after provisioning a new car or before a class session.

## Automated checks (run first)

```bash
# Tier 3 WS firmware — by mDNS hostname
arduino-code/bin/verify-car.sh --hostname hiro1

# Tier 2 class firmware or AP fallback — by IP
arduino-code/bin/verify-car.sh --ip 192.168.4.1
```

The script checks:
1. Host reachable (ping)
2. `/wifi/status` returns JSON with correct `car_name`, `saved_hostname`, `sta_connected`
3. Camera HTTP server reachable (port 80)
4. Camera stream reachable (port 81)
5. Car control TCP port 100 open

Exit code is the number of failed tests. Fix any failures before continuing.

---

## Manual checks

### 6. Bridge and UI connect

1. Start the control stack: `cd wifi-control-ui && npm run car`
2. Set in UI:
   - Bridge Host:Port = `localhost:8787`
   - Car Host = `<hostname>.local` or IP
   - Car TCP Port = `100`
3. Click `Connect Bridge + Car`
4. Confirm `Bridge: online` and `Car TCP: online`

### 7. Manual control

1. Select `FPV / Manual`, click `Turn ON Selected`
2. Briefly test joystick or D-pad
3. Confirm car moves and stops cleanly
4. Press `■` (stop) to end

---

## Recovery path checks (new cars or after issues)

### 8. Serial recovery

1. Connect car via USB, open serial monitor at 115200 baud
2. Reset the car
3. Confirm prompt: `Saved Wi-Fi found. Send 'r' within 3s to clear and force AP mode...`
4. Send `r`
5. Confirm: `Credentials cleared. Starting in AP mode.`
6. Confirm car AP `ELEGOO-...` appears

### 9. Fallback AP

1. Take car out of range of the saved Wi-Fi network, or rename/disable the saved network
2. Power on
3. Wait up to 20 seconds
4. Confirm `ELEGOO-...` AP appears and `192.168.4.1` is reachable

### 10. Re-provision

1. Run provisioning script with updated hostname or car name
2. After boot, run `verify-car.sh` again
3. Confirm `/wifi/status` reflects the new values

---

## Hardware variant notes

| Check | ESP32-S3 | ESP32-WROVER |
|-------|----------|--------------|
| Serial port | `/dev/ttyACM0` | `/dev/ttyUSB0` |
| Provision script | `provision-car-s3.sh` | `provision-car-wrover.sh` |
| Flash script | `flash-esp32-s3-ws.sh` | `flash-esp32-wrover-ws.sh` |
| Ping port default | AP: `192.168.4.1` / LAN: hostname | same |

Both variants run the same firmware and pass the same tests.
