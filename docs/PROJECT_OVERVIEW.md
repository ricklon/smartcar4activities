# Project Overview

## Purpose

This project modernizes control of the ELEGOO Smart Robot Car V4.0 for classroom use by combining stock firmware with a browser-based FPV and telemetry dashboard.

## What Was Added

- Web control stack (`wifi-control-ui`):
  - live camera stream view
  - joystick / D-pad / keyboard driving
  - explicit mode workflow (select + ON/OFF)
  - mode transition log
  - sensor explorer + mode-specific sensor panels
  - challenge cards for classroom activities
  - CSV recording + snapshot capture
  - theme switcher (`Current` / `Big Trak`)

- Bridge layer (`wifi-control-ui/server/bridge.mjs`):
  - WebSocket for browser clients
  - TCP link to car (`192.168.4.1:100`)
  - heartbeat reply support
  - mode-aware telemetry polling

- Consolidated firmware workspace (`arduino-code/`):
  - UNO firmware copy
  - ESP32 camera firmware copy

## Runtime Topology

1. Browser UI <-> WebSocket bridge
2. Bridge <-> ESP32 TCP socket
3. ESP32 <-> UNO UART
4. ESP32 camera stream over HTTP

See `docs/SYSTEM_PROTOCOL.md` for protocol-level details.
