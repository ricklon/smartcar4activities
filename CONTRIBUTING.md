# Contributing

## Scope

Contribute within `classroom-fpv-project/` to keep custom work separated from upstream vendor package folders.

## Where to Make Changes

- UI + bridge:
  - `wifi-control-ui/`
- Firmware copies used by this project:
  - `arduino-code/`
- Documentation:
  - `docs/`

## Development Workflow

1. Create/checkout your branch.
2. Make focused changes.
3. Validate locally:
   - UI build: `cd wifi-control-ui && npm run build`
   - Firmware compile (when firmware changed):
     - UNO compile command from `arduino-code/AGENTS.md`
     - ESP32 compile command from `arduino-code/AGENTS.md`
4. Update docs when behavior/protocol changes.
5. Open PR with clear summary and test notes.

## Commit Guidance

Use clear prefixes where possible:
- `ui:` dashboard/ux/theme changes
- `bridge:` TCP/WebSocket/protocol adapter changes
- `firmware-uno:` UNO firmware changes
- `firmware-esp32:` ESP32 firmware changes
- `docs:` documentation only

## Protocol Safety

If you change command IDs, payload fields, or reply tags, update all layers together:
- UNO firmware parser
- ESP32 forwarder assumptions (if applicable)
- `wifi-control-ui/server/bridge.mjs`
- `wifi-control-ui/src/App.jsx`
- `docs/SYSTEM_PROTOCOL.md`

## Licensing

This project follows the licensing intent documented in `docs/LICENSING.md`.
Preserve all existing upstream/third-party headers and notices.
