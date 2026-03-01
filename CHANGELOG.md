# Changelog

All notable changes to this project should be documented here.

## [Unreleased]

### Added
- Separate project workspace at `classroom-fpv-project/`.
- Consolidated firmware copies under `arduino-code/`.
- System/protocol docs under `docs/`.
- Browser control UI with:
  - FPV stream
  - joystick + D-pad + keyboard control
  - explicit mode selection + ON/OFF activation
  - mode transition log
  - mode-specific sensor panels and mode lab settings
  - challenge cards
  - CSV recording and snapshot capture
  - theme switcher (`Current`, `Big Trak`)
- Bridge improvements:
  - heartbeat echo support
  - mode-aware polling to avoid `N22` disrupting auto modes

### Changed
- Project custom code moved out of vendor root into standalone folder.

### Fixed
- Car TCP stability issue caused by missing heartbeat response.
- Obstacle mode interruption caused by polling `N22` during auto modes.
