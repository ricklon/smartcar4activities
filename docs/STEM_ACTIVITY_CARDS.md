# STEM Activity Cards (Classroom)

This document provides teacher-ready STEM activity cards aligned to the current dashboard modes and stock firmware behavior.

Use with:
- `docs/QUICKSTART.md` for setup
- `wifi-control-ui/STUDENT_QUICKSTART.md` as the student handout

## Safety Baseline (All Activities)

1. Run on floor-level tracks only (not on tables).
2. Keep a clear stop zone and one student assigned as safety driver.
3. Use `FPV / Manual` + `■` stop to regain control immediately.
4. Keep obstacles soft/lightweight for testing.

## Card Format (Reusable Template)

- `Title`:
- `Grade Band`:
- `Time`:
- `Mode` (`FPV / Manual`, `Line Follow`, `Obstacle`, `Follow`):
- `Big Idea`:
- `Learning Targets`:
- `Materials`:
- `Setup`:
- `Student Task`:
- `Evidence to Collect` (CSV/snapshot/notes):
- `Success Criteria`:
- `Extensions`:

## Card 1: Braking Distance vs Speed

- `Grade Band`: 4-8
- `Time`: 20-30 min
- `Mode`: FPV / Manual
- `Big Idea`: Speed changes stopping distance.
- `Learning Targets`:
  - Predict how speed affects stopping distance.
  - Collect repeated trials and compare averages.
- `Materials`:
  - Tape measure or ruler tape on floor
  - Start line tape and stop marker
- `Setup`:
  - Straight lane (~2-3 m)
  - One operator, one recorder, one safety spotter
- `Student Task`:
  1. Drive from start at low speed and stop at marker.
  2. Repeat at medium and high speed (3 trials each).
  3. Record where the car actually stops each trial.
- `Evidence to Collect`:
  - Table of distance error by speed
  - CSV export from session (optional)
- `Success Criteria`:
  - Team reports a claim backed by trial data.
- `Extensions`:
  - Compare joystick vs keyboard control consistency.

## Card 2: Line Sensor Mapping

- `Grade Band`: 4-8
- `Time`: 20 min
- `Mode`: FPV / Manual then Line Follow
- `Big Idea`: Sensors convert environment patterns to decisions.
- `Learning Targets`:
  - Interpret left/mid/right IR readings.
  - Relate sensor patterns to steering behavior.
- `Materials`:
  - High-contrast tape line (dark tape on light floor)
- `Setup`:
  - Place car over different parts of the line by hand.
- `Student Task`:
  1. In manual mode, observe IR telemetry while moving car over line.
  2. Build a small mapping table: `IR pattern -> expected turn`.
  3. Turn on `Line Follow` and verify prediction quality.
- `Evidence to Collect`:
  - Sensor pattern table with at least 5 states
  - 1-2 snapshots of test positions
- `Success Criteria`:
  - Team correctly predicts turn direction for most tested states.
- `Extensions`:
  - Test curves and intersections; explain failures.

## Card 3: Obstacle Threshold Investigation

- `Grade Band`: 5-9
- `Time`: 20-30 min
- `Mode`: Obstacle
- `Big Idea`: Behavior depends on trigger thresholds.
- `Learning Targets`:
  - Measure response distance in obstacle mode.
  - Compare measured behavior to firmware expectation.
- `Materials`:
  - Soft object (box, foam block)
  - Measuring tape
- `Setup`:
  - Straight lane with centimeter marks
- `Student Task`:
  1. Place obstacle at different distances.
  2. Observe when car changes behavior (stop/turn/avoid).
  3. Estimate trigger range from repeated trials.
- `Evidence to Collect`:
  - Trial table (`distance`, `response happened?`)
  - CSV with ultrasonic telemetry where possible
- `Success Criteria`:
  - Team reports an estimated threshold and uncertainty range.
- `Teacher Note`:
  - Stock firmware uses ~20 cm obstacle threshold.
- `Extensions`:
  - Compare two floor surfaces or lighting conditions.

## Card 4: Follow Mode Reliability

- `Grade Band`: 6-10
- `Time`: 25-35 min
- `Mode`: Follow
- `Big Idea`: Autonomous systems have operating envelopes.
- `Learning Targets`:
  - Identify when follow mode tracks well vs fails.
  - Explain failure cases using distance/safety constraints.
- `Materials`:
  - Target object (student badge, folder, marker board)
- `Setup`:
  - One student acts as target with safe walking path.
- `Student Task`:
  1. Run 3 follow trials with different target distances.
  2. Log conditions where tracking starts/stops.
  3. Suggest one procedural improvement (not firmware change).
- `Evidence to Collect`:
  - Trial log (`distance band`, `follow success`, `notes`)
- `Success Criteria`:
  - Team describes at least 2 reliable conditions and 2 failure conditions.
- `Extensions`:
  - Compare stationary target vs moving target.

## Card 5: Mode Transition Robustness

- `Grade Band`: 7-12
- `Time`: 20-30 min
- `Mode`: Manual <-> Auto transitions
- `Big Idea`: System design includes safe state transitions.
- `Learning Targets`:
  - Verify stop-before-mode-change behavior.
  - Interpret transition log and status indicators.
- `Materials`:
  - Any safe driving area
- `Setup`:
  - Dashboard visible to all team members
- `Student Task`:
  1. Execute scripted transitions:
     - Manual -> Obstacle -> Off -> Line -> Off -> Follow -> Off
  2. Confirm car stops during each transition.
  3. Capture any unexpected motion or delays.
- `Evidence to Collect`:
  - Transition checklist with pass/fail
  - Screenshot of transition log
- `Success Criteria`:
  - All transitions execute with no unsafe movement.
- `Extensions`:
  - Propose one UI safeguard improvement with rationale.

## Card 6: Data Story Challenge

- `Grade Band`: 6-12
- `Time`: 30-40 min
- `Mode`: Any (recommended: Obstacle or Line Follow)
- `Big Idea`: Engineering decisions should be data-backed.
- `Learning Targets`:
  - Use CSV/snapshots to support a technical claim.
  - Communicate method, evidence, and uncertainty.
- `Materials`:
  - CSV export and at least one snapshot
- `Setup`:
  - Teams select one prior activity run
- `Student Task`:
  1. Form a claim (example: "Obstacle mode responded most reliably between X and Y cm").
  2. Extract supporting evidence from run data.
  3. Present a 2-minute evidence brief.
- `Evidence to Collect`:
  - One claim-evidence-reasoning slide/poster
- `Success Criteria`:
  - Claim is testable and supported by recorded evidence.
- `Extensions`:
  - Compare results between teams and discuss variance causes.

## Assessment Rubric (Quick)

- `4 - Exceeds`: strong claim, valid data, repeat trials, clear uncertainty discussion.
- `3 - Meets`: claim supported by adequate data and correct interpretation.
- `2 - Approaching`: limited data or partial interpretation.
- `1 - Beginning`: claim lacks evidence or method is unclear.

## Teacher Planning Notes

- Keep teams to 3-4 roles: driver, recorder, safety lead, analyst.
- Rotate roles each activity to balance participation.
- Start with Card 1 or 2 before autonomous mode cards.
- Use Card 6 as a capstone reflection after any two cards.
