import { useMemo, useRef, useState } from 'react';
import { clamp } from '../lib/protocol';

export default function Joystick({ onChange, disabled = false }) {
  const padRef = useRef(null);
  const activePointer = useRef(null);
  const [vector, setVector] = useState({ x: 0, y: 0 });

  const handlePoint = (clientX, clientY) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    const nx = clamp((clientX - cx) / radius, -1, 1);
    const ny = clamp((clientY - cy) / radius, -1, 1);

    const len = Math.sqrt(nx * nx + ny * ny);
    const v = len > 1 ? { x: nx / len, y: ny / len } : { x: nx, y: ny };
    setVector(v);
    onChange?.(v);
  };

  const reset = () => {
    activePointer.current = null;
    const zero = { x: 0, y: 0 };
    setVector(zero);
    onChange?.(zero);
  };

  const thumbStyle = useMemo(
    () => ({
      transform: `translate(calc(-50% + ${vector.x * 36}px), calc(-50% + ${vector.y * 36}px))`
    }),
    [vector.x, vector.y]
  );

  return (
    <div
      ref={padRef}
      className="relative mx-auto h-44 w-44 touch-none rounded-full border border-slate-600 bg-slate-900"
      onPointerDown={(e) => {
        if (disabled) return;
        activePointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        handlePoint(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (disabled) return;
        if (activePointer.current !== e.pointerId) return;
        handlePoint(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        if (disabled) return;
        if (activePointer.current !== e.pointerId) return;
        reset();
      }}
      onPointerCancel={reset}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400" />
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full border border-accent bg-sky-400/20"
        style={thumbStyle}
      />
    </div>
  );
}
