import { useEffect, useMemo, useRef, useState } from 'react';
import Joystick from './components/Joystick';
import { driveCommandFromVector } from './lib/protocol';

const dpad = [
  null,
  { label: '↑', vec: { x: 0, y: -1 } },
  null,
  { label: '←', vec: { x: -1, y: 0 } },
  { label: '■', vec: { x: 0, y: 0 } },
  { label: '→', vec: { x: 1, y: 0 } },
  null,
  { label: '↓', vec: { x: 0, y: 1 } },
  null
];

const MODE_CODE = {
  line: 1,
  obstacle: 2,
  follow: 3
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('car-ui-theme') || 'default');
  const [bridgeHost, setBridgeHost] = useState('localhost:8787');
  const [carHost, setCarHost] = useState('192.168.4.1');
  const [tcpPort, setTcpPort] = useState(100);
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [carConnected, setCarConnected] = useState(false);
  const [lastFrame, setLastFrame] = useState('');
  const [vector, setVector] = useState({ x: 0, y: 0 });
  const [telemetry, setTelemetry] = useState({
    ultrasonicCm: null,
    obstacleDetected: null,
    irLeft: null,
    irMid: null,
    irRight: null,
    onGround: null,
    linkRxFrames: 0,
    linkParseMisses: 0,
    linkLastFrameAt: null,
    updatedAt: null
  });
  const [driveCfg, setDriveCfg] = useState({
    sendIntervalMs: 120,
    minSpeed: 45,
    maxSpeed: 210,
    deadZone: 0.2
  });
  const [activeMode, setActiveMode] = useState('manual');
  const [selectedMode, setSelectedMode] = useState('manual');
  const [modeLabCfg, setModeLabCfg] = useState({
    lineLow: 250,
    lineHigh: 850,
    obstacleTeachCm: 20,
    followTeachCm: 20
  });

  const wsRef = useRef(null);
  const lastCommandRef = useRef('');
  const streamImgRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordCount, setRecordCount] = useState(0);
  const recordRowsRef = useRef([]);
  const [modeLog, setModeLog] = useState([]);

  const cameraUrl = useMemo(() => `http://${carHost}:81/stream`, [carHost]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'bigtrak' ? 'bigtrak' : 'default');
    localStorage.setItem('car-ui-theme', theme);
  }, [theme]);

  const connectBridge = () => {
    wsRef.current?.close();
    const ws = new WebSocket(`ws://${bridgeHost}`);

    ws.onopen = () => {
      setBridgeConnected(true);
      ws.send(
        JSON.stringify({
          type: 'connect-car',
          host: carHost,
          port: Number(tcpPort)
        })
      );
    };

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.type === 'status') {
        setCarConnected(Boolean(msg.carConnected));
      }
      if (msg.type === 'frame') {
        setLastFrame(msg.frame ?? '');
      }
      if (msg.type === 'telemetry') {
        setTelemetry((prev) => ({ ...prev, ...msg.data, updatedAt: Date.now() }));
      }
    };

    ws.onclose = () => {
      setBridgeConnected(false);
      setCarConnected(false);
    };

    ws.onerror = () => {
      setBridgeConnected(false);
      setCarConnected(false);
    };

    wsRef.current = ws;
  };

  const sendJsonCommand = (payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'send-json', payload }));
  };

  const stopCar = () => {
    setVector({ x: 0, y: 0 });
    lastCommandRef.current = '';
    sendJsonCommand({ N: 100, H: 'STOP' });
  };

  const pushModeLog = (fromMode, toMode, reason) => {
    setModeLog((prev) => [
      {
        at: Date.now(),
        fromMode,
        toMode,
        reason
      },
      ...prev
    ].slice(0, 30));
  };

  const setModeWithLog = (nextMode, reason) => {
    if (nextMode === activeMode) return;
    pushModeLog(activeMode, nextMode, reason);
    setActiveMode(nextMode);
  };

  const switchToManualMode = (reason = 'switched to manual') => {
    sendJsonCommand({ N: 110, H: 'MODE' });
    stopCar();
    setModeWithLog('manual', reason);
  };

  const selectMode = (mode) => {
    setSelectedMode(mode);
  };

  const turnSelectedModeOn = () => {
    if (selectedMode === 'manual') {
      switchToManualMode('manual turned on');
      return;
    }
    if (activeMode === selectedMode) return;
    stopCar();
    sendJsonCommand({ N: 110, H: 'MODE' });
    sendJsonCommand({ N: 101, D1: MODE_CODE[selectedMode], H: 'MODE' });
    setModeWithLog(selectedMode, `${modeLabel(selectedMode)} turned on`);
  };

  const turnSelectedModeOff = () => {
    if (selectedMode === 'manual') {
      switchToManualMode('manual turned off');
      return;
    }
    if (activeMode !== selectedMode) return;
    switchToManualMode(`${modeLabel(selectedMode)} turned off`);
  };

  useEffect(() => {
    if (activeMode !== 'manual') return;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const timer = setInterval(() => {
      const cmd = driveCommandFromVector(vector.x, vector.y, driveCfg);
      const body = JSON.stringify(cmd);
      if (body === lastCommandRef.current) return;
      lastCommandRef.current = body;
      ws.send(JSON.stringify({ type: 'send-json', payload: cmd }));
    }, driveCfg.sendIntervalMs);

    return () => clearInterval(timer);
  }, [vector.x, vector.y, driveCfg, activeMode]);

  useEffect(() => {
    const onDown = (e) => {
      if (activeMode !== 'manual') return;
      if (e.repeat) return;
      if (e.key === 'ArrowUp') setVector({ x: 0, y: -1 });
      if (e.key === 'ArrowDown') setVector({ x: 0, y: 1 });
      if (e.key === 'ArrowLeft') setVector({ x: -1, y: 0 });
      if (e.key === 'ArrowRight') setVector({ x: 1, y: 0 });
      if (e.key === ' ') setVector({ x: 0, y: 0 });
    };
    const onUp = (e) => {
      if (activeMode !== 'manual') return;
      if (e.key.startsWith('Arrow') || e.key === ' ') setVector({ x: 0, y: 0 });
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [activeMode]);

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => {
      const cmd = driveCommandFromVector(vector.x, vector.y, driveCfg);
      recordRowsRef.current.push({
        timestamp_iso: new Date().toISOString(),
        bridge_connected: bridgeConnected,
        car_connected: carConnected,
        joystick_x: round3(vector.x),
        joystick_y: round3(vector.y),
        cmd_n: cmd.N ?? '',
        cmd_d1: cmd.D1 ?? '',
        cmd_d2: cmd.D2 ?? '',
        active_mode: activeMode,
        ultrasonic_cm: telemetry.ultrasonicCm ?? '',
        obstacle_detected: telemetry.obstacleDetected ?? '',
        ir_left: telemetry.irLeft ?? '',
        ir_mid: telemetry.irMid ?? '',
        ir_right: telemetry.irRight ?? '',
        on_ground: telemetry.onGround ?? '',
        link_rx_frames: telemetry.linkRxFrames ?? '',
        link_parse_misses: telemetry.linkParseMisses ?? ''
      });
      setRecordCount(recordRowsRef.current.length);
    }, 150);
    return () => clearInterval(timer);
  }, [isRecording, bridgeConnected, carConnected, vector.x, vector.y, telemetry, driveCfg, activeMode]);

  const startRecording = () => {
    recordRowsRef.current = [];
    setRecordCount(0);
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const exportCsv = () => {
    const rows = recordRowsRef.current;
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escapeCell = (v) => {
      const text = String(v ?? '');
      if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(','))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `car_session_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const saveSnapshot = () => {
    const img = streamImgRef.current;
    if (!img) return;
    const w = img.naturalWidth || 640;
    const h = img.naturalHeight || 480;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `car_snapshot_${stamp}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <main className="min-h-full bg-gradient-to-b from-appFrom via-appMid to-appTo text-ink">
      <div className="mx-auto grid max-w-7xl gap-4 p-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel">
          <h1 className="mb-3 text-xl font-semibold">Robot WiFi Control Dashboard</h1>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm">
              Theme
              <select
                className="bt-input mt-1 w-full"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
              >
                <option value="default">Current Theme</option>
                <option value="bigtrak">Big Trak Theme</option>
              </select>
            </label>
            <label className="text-sm">
              Bridge Host:Port
              <input
                className="bt-input mt-1 w-full"
                value={bridgeHost}
                onChange={(e) => setBridgeHost(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Car Host
              <input
                className="bt-input mt-1 w-full"
                value={carHost}
                onChange={(e) => setCarHost(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Car TCP Port
              <input
                className="bt-input mt-1 w-full"
                value={tcpPort}
                onChange={(e) => setTcpPort(Number(e.target.value || 100))}
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              className="bt-action"
              onClick={connectBridge}
            >
              Connect Bridge + Car
            </button>
            {!isRecording ? (
              <button className="bt-action bt-action-go" onClick={startRecording}>
                Start Recording
              </button>
            ) : (
              <button className="bt-action bt-action-warn" onClick={stopRecording}>
                Stop Recording
              </button>
            )}
            <button
              className="bt-action bt-action-kp disabled:cursor-not-allowed disabled:opacity-40"
              onClick={exportCsv}
              disabled={recordCount === 0}
            >
              Export CSV
            </button>
            <button className="bt-action" onClick={saveSnapshot}>
              Snapshot
            </button>
            <Status label="Bridge" ok={bridgeConnected} />
            <Status label="Car TCP" ok={carConnected} />
            <span className={`bt-chip-record ${isRecording ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-700 text-slate-300'}`}>
              Recording: {isRecording ? 'ON' : 'OFF'} ({recordCount} rows)
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-700 bg-black">
            <img
              ref={streamImgRef}
              src={cameraUrl}
              alt="Camera stream"
              crossOrigin="anonymous"
              className="aspect-video w-full object-cover"
            />
          </div>
          <CarModesPanel
            activeMode={activeMode}
            selectedMode={selectedMode}
            onSelectMode={selectMode}
            onModeOn={turnSelectedModeOn}
            onModeOff={turnSelectedModeOff}
            telemetry={telemetry}
            driveCfg={driveCfg}
            onDriveCfgChange={setDriveCfg}
            modeLabCfg={modeLabCfg}
            onModeLabCfgChange={setModeLabCfg}
            modeLog={modeLog}
            onClearLog={() => setModeLog([])}
          />
        </section>

        <section className="grid gap-4">
          <div className="panel">
            <h2 className="mb-2 text-lg font-semibold">Control</h2>
            <Joystick onChange={setVector} disabled={activeMode !== 'manual'} />
            <div className="mx-auto mt-3 grid w-44 grid-cols-3 gap-2">
              {dpad.map((a, i) =>
                a ? (
                  <button
                    key={`${a.label}-${i}`}
                    className={`bt-dpad disabled:cursor-not-allowed disabled:opacity-40 ${a.label === '■' ? 'bt-stop' : ''}`}
                    disabled={activeMode !== 'manual'}
                    onMouseDown={() => setVector(a.vec)}
                    onMouseUp={() => setVector({ x: 0, y: 0 })}
                    onMouseLeave={() => setVector({ x: 0, y: 0 })}
                    onTouchStart={() => setVector(a.vec)}
                    onTouchEnd={() => setVector({ x: 0, y: 0 })}
                  >
                    {a.label}
                  </button>
                ) : (
                  <div key={`blank-${i}`} />
                )
              )}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Keyboard: arrows + space for stop. Manual controls are disabled while an auto mode is ON.
            </p>
          </div>

          <SensorExplorer telemetry={telemetry} lastFrame={lastFrame} activeMode={activeMode} />
        </section>
      </div>
    </main>
  );
}

function Status({ label, ok }) {
  return (
    <span className={`bt-chip ${ok ? 'bt-chip-on bg-ok/20 text-ok' : 'bt-chip-off bg-bad/20 text-bad'}`}>
      {label}: {ok ? 'online' : 'offline'}
    </span>
  );
}

function Sensor({ label, value }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-900 p-2">
      <div className="text-slate-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function SensorGroup({ title, subtitle, rows }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-900 p-3">
      <div className="mb-2">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-slate-400">{subtitle}</div>
      </div>
      <div className="grid gap-1 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-2 rounded bg-slate-950 px-2 py-1">
            <span className="text-slate-400">{r.label}</span>
            <span className={r.muted ? 'text-slate-500' : 'font-semibold'}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarModesPanel({
  activeMode,
  selectedMode,
  onSelectMode,
  onModeOn,
  onModeOff,
  telemetry,
  driveCfg,
  onDriveCfgChange,
  modeLabCfg,
  onModeLabCfgChange,
  modeLog,
  onClearLog
}) {
  const lineLeftHit = between(telemetry.irLeft, modeLabCfg.lineLow, modeLabCfg.lineHigh);
  const lineMidHit = between(telemetry.irMid, modeLabCfg.lineLow, modeLabCfg.lineHigh);
  const lineRightHit = between(telemetry.irRight, modeLabCfg.lineLow, modeLabCfg.lineHigh);
  const obstacleTeachHit = between(telemetry.ultrasonicCm, 0, modeLabCfg.obstacleTeachCm);
  const followTeachLock = between(telemetry.ultrasonicCm, 0, modeLabCfg.followTeachCm);

  const updateDrive = (key, raw, min, max, fallback) => {
    onDriveCfgChange((prev) => ({ ...prev, [key]: clampNum(raw, min, max, fallback) }));
  };

  const updateModeLab = (key, raw, min, max, fallback) => {
    onModeLabCfgChange((prev) => ({ ...prev, [key]: clampNum(raw, min, max, fallback) }));
  };

  return (
    <div className="panel mt-4">
      <h2 className="mb-2 text-lg font-semibold">Car Modes</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          className={`bt-mode ${selectedMode === 'manual' ? 'bt-mode-active' : ''}`}
          onClick={() => onSelectMode('manual')}
        >
          FPV / Manual {activeMode === 'manual' ? '(ACTIVE)' : ''}
        </button>
        <button
          className={`bt-mode ${selectedMode === 'line' ? 'bt-mode-active' : ''}`}
          onClick={() => onSelectMode('line')}
        >
          Line Follow {activeMode === 'line' ? '(ACTIVE)' : ''}
        </button>
        <button
          className={`bt-mode ${selectedMode === 'obstacle' ? 'bt-mode-active' : ''}`}
          onClick={() => onSelectMode('obstacle')}
        >
          Obstacle {activeMode === 'obstacle' ? '(ACTIVE)' : ''}
        </button>
        <button
          className={`bt-mode ${selectedMode === 'follow' ? 'bt-mode-active' : ''}`}
          onClick={() => onSelectMode('follow')}
        >
          Follow {activeMode === 'follow' ? '(ACTIVE)' : ''}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          className="bt-action bt-action-go"
          onClick={onModeOn}
        >
          Turn ON Selected
        </button>
        <button
          className="bt-action bt-action-warn"
          onClick={onModeOff}
        >
          Turn OFF Selected
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Selected mode: <span className="font-semibold text-slate-200">{modeLabel(selectedMode)}</span>
      </p>
      <p className="mt-2 text-xs text-slate-400">
        Active mode: <span className="font-semibold text-slate-200">{modeLabel(activeMode)}</span>
      </p>
      <div className="mt-2 rounded border border-slate-700 bg-slate-900 p-2 text-xs text-slate-300">
        {activeMode === 'manual' && 'Manual FPV control is active.'}
        {activeMode === 'line' && 'Line follow is active. IR sensors drive steering until mode is turned off.'}
        {activeMode === 'obstacle' &&
          'Obstacle avoid is active. Triggered when ultrasonic distance is between 0 and 20 cm.'}
        {activeMode === 'follow' && 'Follow mode is active. Car attempts to maintain distance to target.'}
      </div>

      <div className="mt-3 rounded border border-slate-700 bg-slate-900 p-3">
        <div className="mb-2 text-sm font-semibold text-slate-100">Mode Lab: {modeLabel(selectedMode)}</div>
        {selectedMode === 'manual' && (
          <div className="grid gap-2">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <ModeMetric label="On Ground" value={boolTxt(telemetry.onGround)} />
              <ModeMetric label="Link Frames RX" value={fmt(telemetry.linkRxFrames)} />
              <ModeMetric label="Parse Misses" value={fmt(telemetry.linkParseMisses)} />
              <ModeMetric label="Distance (cm)" value={fmt(telemetry.ultrasonicCm, 'cm')} />
            </div>
            <div className="text-xs font-semibold text-slate-200">Live tunable (works now)</div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <label>
                Command Interval (ms)
                <input
                  type="number"
                  min={60}
                  max={300}
                  className="bt-input mt-1 w-full"
                  value={driveCfg.sendIntervalMs}
                  onChange={(e) => updateDrive('sendIntervalMs', e.target.value, 60, 300, 120)}
                />
              </label>
              <label>
                Dead Zone
                <input
                  type="number"
                  min={0}
                  max={0.5}
                  step={0.01}
                  className="bt-input mt-1 w-full"
                  value={driveCfg.deadZone}
                  onChange={(e) => updateDrive('deadZone', e.target.value, 0, 0.5, 0.2)}
                />
              </label>
              <label>
                Min Speed
                <input
                  type="number"
                  min={0}
                  max={255}
                  className="bt-input mt-1 w-full"
                  value={driveCfg.minSpeed}
                  onChange={(e) => updateDrive('minSpeed', e.target.value, 0, driveCfg.maxSpeed, 45)}
                />
              </label>
              <label>
                Max Speed
                <input
                  type="number"
                  min={0}
                  max={255}
                  className="bt-input mt-1 w-full"
                  value={driveCfg.maxSpeed}
                  onChange={(e) => updateDrive('maxSpeed', e.target.value, driveCfg.minSpeed, 255, 210)}
                />
              </label>
            </div>
          </div>
        )}

        {selectedMode === 'line' && (
          <div className="grid gap-2">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <ModeMetric label="IR Left" value={fmt(telemetry.irLeft)} />
              <ModeMetric label="IR Mid" value={fmt(telemetry.irMid)} />
              <ModeMetric label="IR Right" value={fmt(telemetry.irRight)} />
              <ModeMetric label="On Ground" value={boolTxt(telemetry.onGround)} />
              <ModeMetric label="Left In Range" value={boolTxt(lineLeftHit)} />
              <ModeMetric label="Mid In Range" value={boolTxt(lineMidHit)} />
              <ModeMetric label="Right In Range" value={boolTxt(lineRightHit)} />
            </div>
            <div className="text-xs font-semibold text-slate-200">Teaching thresholds (analysis only)</div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <label>
                IR Low Threshold
                <input
                  type="number"
                  min={0}
                  max={1023}
                  className="bt-input mt-1 w-full"
                  value={modeLabCfg.lineLow}
                  onChange={(e) => updateModeLab('lineLow', e.target.value, 0, modeLabCfg.lineHigh, 250)}
                />
              </label>
              <label>
                IR High Threshold
                <input
                  type="number"
                  min={0}
                  max={1023}
                  className="bt-input mt-1 w-full"
                  value={modeLabCfg.lineHigh}
                  onChange={(e) => updateModeLab('lineHigh', e.target.value, modeLabCfg.lineLow, 1023, 850)}
                />
              </label>
            </div>
            <div className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-400">
              Firmware today uses internal thresholds (`TrackingDetection_S/E`) and this web UI cannot change them yet.
            </div>
            <div className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-400">
              IR telemetry updates live in manual mode. During auto modes, the bridge skips `N22` polling to avoid mode disruption, so shown IR values may be stale.
            </div>
          </div>
        )}

        {selectedMode === 'obstacle' && (
          <div className="grid gap-2">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <ModeMetric label="Distance (cm)" value={fmt(telemetry.ultrasonicCm, 'cm')} />
              <ModeMetric label="Firmware Obstacle Flag" value={boolTxt(telemetry.obstacleDetected)} />
              <ModeMetric label="Teaching Trigger" value={boolTxt(obstacleTeachHit)} />
              <ModeMetric label="On Ground" value={boolTxt(telemetry.onGround)} />
            </div>
            <div className="text-xs font-semibold text-slate-200">Teaching threshold (analysis only)</div>
            <label className="text-sm">
              Obstacle Trigger Threshold (cm)
              <input
                type="number"
                min={5}
                max={60}
                className="bt-input mt-1 w-full"
                value={modeLabCfg.obstacleTeachCm}
                onChange={(e) => updateModeLab('obstacleTeachCm', e.target.value, 5, 60, 20)}
              />
            </label>
            <div className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-400">
              Firmware trigger is fixed at 20 cm (`ObstacleDetection`) in current UNO code.
            </div>
          </div>
        )}

        {selectedMode === 'follow' && (
          <div className="grid gap-2">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <ModeMetric label="Distance (cm)" value={fmt(telemetry.ultrasonicCm, 'cm')} />
              <ModeMetric label="Teaching Target Lock" value={boolTxt(followTeachLock)} />
              <ModeMetric label="On Ground" value={boolTxt(telemetry.onGround)} />
            </div>
            <div className="text-xs font-semibold text-slate-200">Teaching lock threshold (analysis only)</div>
            <label className="text-sm">
              Target Lock Threshold (cm)
              <input
                type="number"
                min={5}
                max={60}
                className="bt-input mt-1 w-full"
                value={modeLabCfg.followTeachCm}
                onChange={(e) => updateModeLab('followTeachCm', e.target.value, 5, 60, 20)}
              />
            </label>
            <div className="rounded border border-slate-700 bg-slate-950 p-2 text-xs text-slate-400">
              Firmware follow behavior currently checks distance against 20 cm and uses servo scan waypoints.
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 rounded border border-slate-700 bg-slate-900 p-3">
        <div className="mb-2 text-sm font-semibold text-slate-100">Challenge Card</div>
        {selectedMode === 'manual' && (
          <ChallengeCard
            title="Precision Dock"
            objective="Drive into target zone and stop smoothly."
            metricLabel="Distance in 15-30 cm window + low parse misses"
            metricValue={`${boolTxt(between(telemetry.ultrasonicCm, 15, 30))} / misses: ${fmt(telemetry.linkParseMisses)}`}
            pass={between(telemetry.ultrasonicCm, 15, 30) && Number(telemetry.linkParseMisses ?? 0) < 3}
            passText="PASS when distance is 15-30 cm and parse misses < 3."
          />
        )}
        {selectedMode === 'line' && (
          <ChallengeCard
            title="Track Lock"
            objective="Keep the center sensor on track while moving."
            metricLabel="Mid sensor in selected threshold range"
            metricValue={boolTxt(between(telemetry.irMid, modeLabCfg.lineLow, modeLabCfg.lineHigh))}
            pass={between(telemetry.irMid, modeLabCfg.lineLow, modeLabCfg.lineHigh)}
            passText="PASS when IR Mid stays inside threshold window."
          />
        )}
        {selectedMode === 'obstacle' && (
          <ChallengeCard
            title="Safe Avoid"
            objective="Detect and react before contact."
            metricLabel="Obstacle flag + distance below teach threshold"
            metricValue={`${boolTxt(telemetry.obstacleDetected)} / ${boolTxt(
              between(telemetry.ultrasonicCm, 0, modeLabCfg.obstacleTeachCm)
            )}`}
            pass={Boolean(telemetry.obstacleDetected)}
            passText="PASS when firmware obstacle flag turns true before contact."
          />
        )}
        {selectedMode === 'follow' && (
          <ChallengeCard
            title="Target Lock"
            objective="Maintain target in follow range."
            metricLabel="Distance below follow lock threshold"
            metricValue={boolTxt(between(telemetry.ultrasonicCm, 0, modeLabCfg.followTeachCm))}
            pass={between(telemetry.ultrasonicCm, 0, modeLabCfg.followTeachCm)}
            passText="PASS when target remains inside follow lock range."
          />
        )}
      </div>

      <div className="mt-2 rounded border border-slate-700 bg-slate-900 p-2 text-xs">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-semibold text-slate-200">Mode Transition Log</span>
          <button className="rounded border border-slate-600 px-2 py-1 text-slate-300" onClick={onClearLog}>
            Clear
          </button>
        </div>
        {!modeLog.length ? (
          <div className="text-slate-500">No transitions yet.</div>
        ) : (
          <div className="grid gap-1">
            {modeLog.map((e, idx) => (
              <div key={`${e.at}-${idx}`} className={`rounded px-2 py-1 ${modeLogClass(e.toMode)}`}>
                {new Date(e.at).toLocaleTimeString()} | {modeLabel(e.fromMode)} {'->'} {modeLabel(e.toMode)} |{' '}
                {e.reason}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ModeMetric({ label, value }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-950 px-2 py-1">
      <div className="text-slate-400">{label}</div>
      <div className="font-semibold text-slate-100">{value}</div>
    </div>
  );
}

function ChallengeCard({ title, objective, metricLabel, metricValue, pass, passText }) {
  return (
    <div className="rounded border border-slate-700 bg-slate-950 p-3 text-xs">
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-1 text-slate-300">Objective: {objective}</div>
      <div className="mt-1 text-slate-300">
        Metric: {metricLabel} = <span className="font-semibold text-slate-100">{metricValue}</span>
      </div>
      <div
        className={`bt-badge mt-2 ${
          pass ? 'bt-pass bg-ok/20 text-ok' : 'bt-progress bg-bad/20 text-bad'
        }`}
      >
        {pass ? 'PASS' : 'IN PROGRESS'}
      </div>
      <div className="mt-2 text-slate-400">{passText}</div>
    </div>
  );
}

function SensorExplorer({ telemetry, lastFrame, activeMode }) {
  return (
    <div className="panel">
      <h2 className="mb-2 text-lg font-semibold">Sensor Explorer</h2>
      <p className="mb-2 text-xs text-slate-400">
        Mode context: <span className="font-semibold text-slate-200">{modeLabel(activeMode)}</span>
      </p>
      <div className="grid gap-2">
        <SensorGroup
          title="Distance / Obstacle"
          subtitle="Ultrasonic status and measured range"
          rows={[
            { label: 'Obstacle Detected', value: boolTxt(telemetry.obstacleDetected) },
            { label: 'Distance (cm)', value: fmt(telemetry.ultrasonicCm, 'cm') }
          ]}
        />
        <SensorGroup
          title="Line Tracking"
          subtitle="Raw analog values from 3 IR tracking sensors"
          rows={[
            { label: 'IR Left', value: fmt(telemetry.irLeft) },
            { label: 'IR Mid', value: fmt(telemetry.irMid) },
            { label: 'IR Right', value: fmt(telemetry.irRight) }
          ]}
        />
        <SensorGroup
          title="Safety / Chassis"
          subtitle="Ground contact and stop safety context"
          rows={[{ label: 'On Ground', value: boolTxt(telemetry.onGround) }]}
        />
        <SensorGroup
          title="Link / Protocol"
          subtitle="Raw command channel health from bridge"
          rows={[
            { label: 'Frames RX', value: fmt(telemetry.linkRxFrames) },
            { label: 'Parse Misses', value: fmt(telemetry.linkParseMisses) },
            {
              label: 'Last Frame Time',
              value: telemetry.linkLastFrameAt
                ? new Date(telemetry.linkLastFrameAt).toLocaleTimeString()
                : '---'
            },
            { label: 'Last Raw Frame', value: lastFrame || '---' }
          ]}
        />
        <SensorGroup
          title="Not Exposed by Current Firmware"
          subtitle="Requires UNO protocol/firmware extension"
          rows={[
            { label: 'Battery Voltage', value: 'not exposed', muted: true },
            { label: 'IMU Tilt/Accel', value: 'not exposed', muted: true },
            { label: 'Motor PWM / Wheel Speed', value: 'not exposed', muted: true }
          ]}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {telemetry.updatedAt ? `Updated ${new Date(telemetry.updatedAt).toLocaleTimeString()}` : 'No telemetry yet'}
      </p>
    </div>
  );
}

function modeLabel(mode) {
  if (mode === 'line') return 'Line Follow';
  if (mode === 'obstacle') return 'Obstacle Avoid';
  if (mode === 'follow') return 'Follow';
  return 'FPV / Manual';
}

function modeLogClass(mode) {
  if (mode === 'line') return 'bg-emerald-500/20 text-emerald-100';
  if (mode === 'obstacle') return 'bg-amber-500/20 text-amber-100';
  if (mode === 'follow') return 'bg-fuchsia-500/20 text-fuchsia-100';
  return 'bg-cyan-500/20 text-cyan-100';
}

function fmt(v, suffix = '') {
  if (v == null) return '---';
  return `${v}${suffix ? ` ${suffix}` : ''}`;
}

function boolTxt(v) {
  if (v == null) return '---';
  return v ? 'yes' : 'no';
}

function between(v, min, max) {
  if (v == null) return null;
  return v >= min && v <= max;
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

function clampNum(raw, min, max, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
