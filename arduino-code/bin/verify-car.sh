#!/usr/bin/env bash
# Car acceptance test script — runs automated pre-flight checks (tests 1-6 from issue #13).
# Manual tests (bridge connect, car control, recovery) must be done by hand.
set -euo pipefail

HOST=""
PASS=0
FAIL=0

usage() {
  cat <<'EOF'
Usage: verify-car.sh --hostname HOSTNAME | --ip IP

Runs automated connectivity checks against a provisioned car.
Covers: mDNS/IP reachability, /wifi/status identity, camera stream, car TCP port.

Options:
  --hostname   mDNS hostname without .local, e.g. hiro1
  --ip         Direct IP address, e.g. 192.168.4.1 or 192.168.1.42

Examples:
  arduino-code/bin/verify-car.sh --hostname hiro1
  arduino-code/bin/verify-car.sh --ip 192.168.4.1
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --hostname) HOST="$2.local"; shift 2 ;;
    --ip)       HOST="$2";       shift 2 ;;
    -h|--help)  usage; exit 0 ;;
    *) printf 'Unknown argument: %s\n' "$1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$HOST" ]]; then
  printf 'Error: --hostname or --ip is required.\n' >&2
  usage
  exit 1
fi

pass() { printf '  [PASS] %s\n' "$1"; PASS=$((PASS + 1)); }
fail() { printf '  [FAIL] %s\n' "$1"; FAIL=$((FAIL + 1)); }
info() { printf '  [INFO] %s\n' "$1"; }

printf '\n=== Car verification: %s ===\n\n' "$HOST"

# Test 1 — Host reachable
printf 'Test 1: Host reachable\n'
if ping -c1 -W3 "$HOST" >/dev/null 2>&1; then
  pass "$HOST responds to ping"
else
  fail "$HOST did not respond to ping"
fi

# Test 2 — /wifi/status returns JSON
printf '\nTest 2: /wifi/status JSON\n'
STATUS_JSON=""
if STATUS_JSON=$(curl -sf --max-time 5 "http://$HOST/wifi/status" 2>/dev/null); then
  pass "/wifi/status returned JSON"
  # Extract and display key fields
  for field in car_name saved_hostname mdns_name sta_connected sta_ip mode; do
    val=$(printf '%s' "$STATUS_JSON" | python3 -c \
      "import sys,json; d=json.load(sys.stdin); print(d.get('$field','(missing)'))" 2>/dev/null || echo "(parse error)")
    info "$field = $val"
  done
  # Check sta_connected
  sta=$(printf '%s' "$STATUS_JSON" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(d.get('sta_connected',''))" 2>/dev/null || echo "")
  if [[ "$sta" == "True" || "$sta" == "true" ]]; then
    pass "sta_connected = true"
  else
    info "sta_connected = $sta  (expected true for LAN mode; ok if using AP mode)"
  fi
else
  fail "/wifi/status not reachable at http://$HOST/wifi/status"
fi

# Test 3 — Camera HTTP server on port 80
printf '\nTest 3: Camera HTTP server (port 80)\n'
HTTP_CODE=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "http://$HOST/" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  pass "Camera HTTP server reachable (HTTP $HTTP_CODE)"
else
  fail "Camera HTTP server not reachable (HTTP $HTTP_CODE)"
fi

# Test 4 — Camera stream endpoint on port 81
printf '\nTest 4: Camera stream endpoint (port 81)\n'
STREAM_CODE=$(curl -sf -o /dev/null -w "%{http_code}" --max-time 5 "http://$HOST:81/stream" 2>/dev/null || echo "000")
if [[ "$STREAM_CODE" == "200" ]]; then
  pass "Camera stream reachable on port 81 (HTTP $STREAM_CODE)"
else
  fail "Camera stream not reachable on port 81 (HTTP $STREAM_CODE)"
fi

# Test 5 — Car control TCP port 100
printf '\nTest 5: Car control TCP port 100\n'
if command -v nmap >/dev/null 2>&1; then
  NMAP_OUT=$(nmap -Pn -p 100 "$HOST" 2>/dev/null)
  if printf '%s' "$NMAP_OUT" | grep -q "100/tcp open"; then
    pass "Port 100/tcp open (car control)"
  else
    fail "Port 100/tcp not open — car control bridge will not connect"
  fi
elif command -v nc >/dev/null 2>&1; then
  if nc -z -w3 "$HOST" 100 2>/dev/null; then
    pass "Port 100/tcp open (car control, via nc)"
  else
    fail "Port 100/tcp not open (car control, via nc)"
  fi
else
  info "Neither nmap nor nc found — skipping TCP port 100 check"
fi

# Summary
printf '\n=== Results: %d passed, %d failed ===\n' "$PASS" "$FAIL"
if [[ $FAIL -eq 0 ]]; then
  printf 'Car is ready. Proceed with manual tests:\n'
  printf '  6. Start bridge and confirm Bridge+Car online in UI\n'
  printf '  7. FPV mode: brief joystick test, confirm car moves and stops\n'
else
  printf 'Fix the failed checks before class.\n'
  printf 'See docs/ESP32_S3_TROUBLESHOOTING.md for help.\n'
fi
printf '\n'

exit $FAIL
