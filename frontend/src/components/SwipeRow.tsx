// SwipeRow.tsx — swipe-left-to-delete wrapper, ported from design-ref/app-pieces.jsx.
import { useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { Icon } from './Icon';

export function SwipeRow({
  children,
  onDelete,
  enabled = true,
}: {
  children: ReactNode;
  onDelete: () => void;
  enabled?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dx = useRef(0);
  const [armed, setArmed] = useState(false);

  if (!enabled) return <div>{children}</div>;

  const setX = (x: number) => {
    if (ref.current) ref.current.style.transform = `translateX(${x}px)`;
  };
  const snap = (x: number) => {
    if (ref.current) ref.current.style.transition = 'transform .22s cubic-bezier(.2,.8,.3,1)';
    setX(x);
    dx.current = x;
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, y: e.clientY };
    if (ref.current) ref.current.style.transition = 'none';
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current == null) return;
    let d = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dy) > Math.abs(d) && Math.abs(dy) > 8) {
      start.current = null;
      snap(0);
      return;
    }
    if (d > 0) d = d * 0.25;
    d = Math.max(d, -132);
    dx.current = d;
    setX(d);
    setArmed(d < -78);
  };
  const up = () => {
    if (start.current == null) return;
    start.current = null;
    if (dx.current < -78) {
      if (navigator.vibrate) navigator.vibrate(8);
      if (ref.current) ref.current.style.transition = 'transform .18s ease';
      setX(-window.innerWidth);
      setTimeout(onDelete, 160);
    } else {
      snap(0);
      setArmed(false);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 22,
          gap: 7,
          background: 'linear-gradient(90deg, transparent, #ef4444 32%)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <Icon
          name="trash"
          size={20}
          strokeWidth={2}
          style={{ transform: armed ? 'scale(1.18)' : 'scale(1)', transition: 'transform .15s' }}
        />
      </div>
      <div
        ref={ref}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{ position: 'relative', background: 'var(--surface-base)', touchAction: 'pan-y' }}
      >
        {children}
      </div>
    </div>
  );
}
