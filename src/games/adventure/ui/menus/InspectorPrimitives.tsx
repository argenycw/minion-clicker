import { useRef, useState, type ReactNode } from 'react';

export function InspectorHeader({ icon, color, name, itemNo }: { icon: ReactNode; color?: string; name: string; itemNo: number }) {
  return (
    <div className="inspector-header">
      <span style={{ color }}>{icon}</span>
      <div>
        <h3 style={{ color }}>{name}</h3>
      </div>
      <small className="inspector-item-no">Item #{itemNo}</small>
    </div>
  );
}

export function DisposeButton({ disabled, onDispose }: { disabled?: boolean; onDispose: () => void }) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(0);
  const startRef = useRef(0);

  const stop = () => {
    window.cancelAnimationFrame(frameRef.current);
    setHolding(false);
    setProgress(0);
  };

  const start = () => {
    if (disabled) return;
    startRef.current = performance.now();
    setHolding(true);
    const step = (now: number) => {
      const next = Math.min(1, (now - startRef.current) / 900);
      setProgress(next);
      if (next >= 1) {
        setHolding(false);
        onDispose();
        return;
      }
      frameRef.current = window.requestAnimationFrame(step);
    };
    frameRef.current = window.requestAnimationFrame(step);
  };

  return (
    <button
      className="dispose-button"
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
    >
      <span>{holding ? 'Hold...' : 'Dispose'}</span>
      <i style={{ width: `${progress * 100}%` }} />
    </button>
  );
}

