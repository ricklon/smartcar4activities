export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export function driveCommandFromVector(x, y, cfg = {}) {
  const deadZone = cfg.deadZone ?? 0.2;
  const minSpeed = cfg.minSpeed ?? 35;
  const maxSpeed = cfg.maxSpeed ?? 255;
  if (Math.abs(x) < deadZone && Math.abs(y) < deadZone) {
    return { N: 100, H: 'STOP' };
  }

  let direction = 3;
  const dominant = Math.max(Math.abs(x), Math.abs(y));
  const speed = clamp(Math.round(minSpeed + dominant * (maxSpeed - minSpeed)), minSpeed, maxSpeed);

  if (Math.abs(y) >= Math.abs(x)) {
    direction = y < 0 ? 3 : 4;
  } else {
    direction = x < 0 ? 1 : 2;
  }

  return {
    N: 3,
    D1: direction,
    D2: speed,
    H: 'DRV'
  };
}

export function parseCarFrame(frame) {
  const text = String(frame || '').trim();
  if (!text.startsWith('{') || !text.endsWith('}')) return null;
  const inner = text.slice(1, -1);
  const split = inner.split('_');
  if (split.length < 2) return null;

  const key = split[0];
  const value = split.slice(1).join('_');
  const number = Number(value);
  return {
    key,
    value,
    numericValue: Number.isFinite(number) ? number : null
  };
}
