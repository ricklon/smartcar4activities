import net from 'node:net';
import { WebSocketServer } from 'ws';

const WS_PORT = Number(process.env.WS_PORT || 8787);

let carSocket = null;
let carConnected = false;
let readBuffer = '';
let pollTimer = null;
let pollIndex = 0;
let rxFrames = 0;
let parseMisses = 0;
let bridgeMode = 'manual';

const wss = new WebSocketServer({ port: WS_PORT });
console.log(`[bridge] websocket listening on ws://0.0.0.0:${WS_PORT}`);

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'status', carConnected }));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(String(raw));
      handleClientMessage(msg);
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: `Bad JSON message: ${err.message}` }));
    }
  });

  ws.on('close', () => {
    // keep bridge running for reconnects
  });
});

function handleClientMessage(msg) {
  if (msg.type === 'connect-car') {
    connectCar(msg.host || '192.168.4.1', Number(msg.port || 100));
    return;
  }

  if (msg.type === 'send-frame' && typeof msg.payload === 'string') {
    sendRawToCar(msg.payload);
    return;
  }

  if (msg.type === 'send-json' && msg.payload && typeof msg.payload === 'object') {
    updateBridgeModeFromPayload(msg.payload);
    sendRawToCar(JSON.stringify(msg.payload));
  }
}

function connectCar(host, port) {
  disconnectCar();

  carSocket = new net.Socket();
  carSocket.setNoDelay(true);
  carSocket.connect(port, host, () => {
    carConnected = true;
    readBuffer = '';
    rxFrames = 0;
    parseMisses = 0;
    broadcast({ type: 'status', carConnected, host, port });
    startPolling();
    console.log(`[bridge] connected to ${host}:${port}`);
  });

  carSocket.on('data', (chunk) => {
    readBuffer += chunk.toString('utf8');
    while (true) {
      const end = readBuffer.indexOf('}');
      if (end < 0) break;
      const frame = readBuffer.slice(0, end + 1);
      readBuffer = readBuffer.slice(end + 1);
      if (!frame.includes('{')) continue;
      const cleaned = frame.slice(frame.indexOf('{'));
      processCarFrame(cleaned);
    }
  });

  carSocket.on('error', (err) => {
    console.error(`[bridge] socket error: ${err.message}`);
    broadcast({ type: 'error', message: err.message });
  });

  carSocket.on('close', () => {
    carConnected = false;
    stopPolling();
    broadcast({ type: 'status', carConnected });
    console.log('[bridge] car socket closed');
  });
}

function disconnectCar() {
  stopPolling();
  carConnected = false;
  if (carSocket) {
    carSocket.destroy();
    carSocket = null;
  }
}

function sendRawToCar(frame) {
  if (!carSocket || !carConnected) return;
  const payload = frame.startsWith('{') ? frame : `{${frame}}`;
  carSocket.write(payload);
}

function startPolling() {
  stopPolling();

  pollTimer = setInterval(() => {
    if (!carConnected || !carSocket) return;
    const probes = probesForMode(bridgeMode);
    if (!probes.length) return;
    const probe = probes[pollIndex % probes.length];
    pollIndex += 1;
    sendRawToCar(JSON.stringify(probe));
  }, 180);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function processCarFrame(frame) {
  if (String(frame).trim() === '{Heartbeat}') {
    sendRawToCar('{Heartbeat}');
    return;
  }

  rxFrames += 1;
  broadcast({ type: 'frame', frame });
  broadcast({
    type: 'telemetry',
    data: { linkRxFrames: rxFrames, linkParseMisses: parseMisses, linkLastFrameAt: Date.now() }
  });

  const parsed = parseReply(frame);
  if (!parsed) {
    parseMisses += 1;
    broadcast({
      type: 'telemetry',
      data: { linkParseMisses: parseMisses, linkLastFrameAt: Date.now() }
    });
    return;
  }

  if (parsed.key === 'US') {
    broadcast({ type: 'telemetry', data: { ultrasonicCm: parsed.number } });
  }
  if (parsed.key === 'UO') {
    const val = parsed.value.toLowerCase();
    if (val === 'true' || val === 'false') {
      broadcast({ type: 'telemetry', data: { obstacleDetected: val === 'true' } });
    }
  }
  if (parsed.key === 'IL') {
    broadcast({ type: 'telemetry', data: { irLeft: parsed.number } });
  }
  if (parsed.key === 'IM') {
    broadcast({ type: 'telemetry', data: { irMid: parsed.number } });
  }
  if (parsed.key === 'IR') {
    broadcast({ type: 'telemetry', data: { irRight: parsed.number } });
  }
  if (parsed.key === 'GR') {
    const val = parsed.value.toLowerCase();
    if (val === 'true' || val === 'false') {
      broadcast({ type: 'telemetry', data: { onGround: val === 'true' } });
    }
  }
}

function parseReply(frame) {
  const text = String(frame || '').trim();
  const m = text.match(/^\{([^_{}]+)_([^{}]+)\}$/);
  if (!m) return null;
  const key = m[1];
  const value = m[2];
  const number = Number(value);
  return {
    key,
    value,
    number: Number.isFinite(number) ? number : null
  };
}

function updateBridgeModeFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return;
  if (payload.N === 101) {
    if (payload.D1 === 1) bridgeMode = 'line';
    if (payload.D1 === 2) bridgeMode = 'obstacle';
    if (payload.D1 === 3) bridgeMode = 'follow';
  }
  if (payload.N === 100 || payload.N === 110 || payload.N === 102) {
    bridgeMode = 'manual';
  }
}

function probesForMode(mode) {
  // N22 (IR status) forces CMD_Programming_mode on UNO firmware.
  // Keep it out of auto modes so line/obstacle/follow can continue running.
  if (mode === 'line' || mode === 'obstacle' || mode === 'follow') {
    return [
      { N: 21, D1: 1, H: 'UO' },
      { N: 21, D1: 2, H: 'US' },
      { N: 23, H: 'GR' }
    ];
  }
  return [
    { N: 21, D1: 1, H: 'UO' },
    { N: 21, D1: 2, H: 'US' },
    { N: 22, D1: 0, H: 'IL' },
    { N: 22, D1: 1, H: 'IM' },
    { N: 22, D1: 2, H: 'IR' },
    { N: 23, H: 'GR' }
  ];
}

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

process.on('SIGINT', () => {
  disconnectCar();
  wss.close();
  process.exit(0);
});
