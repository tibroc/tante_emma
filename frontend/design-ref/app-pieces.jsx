// app.jsx — TanteEmma · Listen (shopping list) screen
const { useState, useRef, useEffect, useCallback } = React;

/* ════════════════════════════════════════════════════════════
   Tweak defaults
   ════════════════════════════════════════════════════════════ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#d946ef",
  "header": "verlauf",
  "itemStyle": "zeile",
  "typeWeight": "normal",
  "typeScale": 1.0,
  "dark": false
}/*EDITMODE-END*/;

const ACCENTS = THEMES.map(t => ({ v: t.accent, label: t.name }));
const accent600 = (hex) => accent600For(hex);
const FR_WEIGHT = { leicht: 500, normal: 600, kräftig: 700 };
const NAME_WEIGHT = { leicht: 400, normal: 500, kräftig: 600 };

/* ════════════════════════════════════════════════════════════
   Small pieces
   ════════════════════════════════════════════════════════════ */
function Checkbox({ checked, accent, onToggle }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={checked ? 'Abwählen' : 'Erledigt'}
      style={{
        width: 26, height: 26, flexShrink: 0, padding: 0, cursor: 'pointer',
        borderRadius: 8, border: `2px solid ${checked ? 'var(--emerald-500)' : 'var(--border-default)'}`,
        background: checked ? 'var(--emerald-500)' : 'transparent',
        display: 'grid', placeItems: 'center',
        transition: 'background .18s, border-color .18s',
        animation: checked ? 'checkPop .26s ease' : 'none',
      }}>
      {checked && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff"
          strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7" style={{ strokeDasharray: 30, animation: 'drawCheck .26s ease .02s both' }} />
        </svg>
      )}
    </button>
  );
}

function CatChip({ cat, size = 34 }) {
  const m = CATEGORIES[cat] || CATEGORIES['Sonstiges'];
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
      display: 'grid', placeItems: 'center', color: m.color,
      background: `color-mix(in oklab, ${m.color} 15%, var(--surface-base))`,
    }}>
      <Icon name={m.icon} size={size * 0.62} strokeWidth={1.9} />
    </div>
  );
}

function QtyBadge({ children }) {
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
      background: 'var(--surface-overlay)', borderRadius: 7,
      padding: '3px 8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
    }}>{children}</span>
  );
}

function StoreBadge({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
      border: '1px solid var(--border-subtle)', borderRadius: 7,
      padding: '2px 7px 2px 5px', whiteSpace: 'nowrap',
    }}>
      <Icon name="store" size={12} strokeWidth={2} />{children}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   Swipeable row (row view) — reveal delete on swipe-left
   ════════════════════════════════════════════════════════════ */
function SwipeRow({ children, onDelete, enabled }) {
  const ref = useRef(null);
  const start = useRef(null);
  const dx = useRef(0);
  const [armed, setArmed] = useState(false);

  if (!enabled) return <div>{children}</div>;

  const setX = (x) => { if (ref.current) ref.current.style.transform = `translateX(${x}px)`; };

  const down = (e) => {
    start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    if (ref.current) ref.current.style.transition = 'none';
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (start.current == null) return;
    let d = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dy) > Math.abs(d) && Math.abs(dy) > 8) { start.current = null; snap(0); return; }
    if (d > 0) d = d * 0.25;            // resist right
    d = Math.max(d, -132);
    dx.current = d;
    setX(d);
    setArmed(d < -78);
  };
  const snap = (x) => {
    if (ref.current) { ref.current.style.transition = 'transform .22s cubic-bezier(.2,.8,.3,1)'; }
    setX(x); dx.current = x;
  };
  const up = () => {
    if (start.current == null) return;
    start.current = null;
    if (dx.current < -78) {
      if (navigator.vibrate) navigator.vibrate(8);
      if (ref.current) ref.current.style.transition = 'transform .18s ease';
      setX(-window.innerWidth);
      setTimeout(onDelete, 160);
    } else { snap(0); setArmed(false); }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* delete reveal */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'flex-end', paddingRight: 22, gap: 7,
        background: 'linear-gradient(90deg, transparent, #ef4444 32%)',
        color: '#fff', fontSize: 13, fontWeight: 600,
      }}>
        <Icon name="trash" size={20} strokeWidth={2}
          style={{ transform: armed ? 'scale(1.18)' : 'scale(1)', transition: 'transform .15s' }} />
      </div>
      <div ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        style={{ position: 'relative', background: 'var(--surface-base)', touchAction: 'pan-y' }}>
        {children}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Item renderers — row / card / tile
   ════════════════════════════════════════════════════════════ */
function ItemMeta({ item }) {
  const bits = [];
  if (item.store) bits.push(<StoreBadge key="s">{item.store}</StoreBadge>);
  if (item.qty) bits.push(<QtyBadge key="q">{item.qty}</QtyBadge>);
  return bits.length ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{bits}</div> : null;
}

function ItemRow({ item, accent, nameWeight, onToggle, onOpen, view }) {
  const m = CATEGORIES[item.cat] || CATEGORIES['Sonstiges'];
  const checked = item.checked;
  const nameEl = (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{
        fontSize: 16, fontWeight: nameWeight, color: checked ? 'var(--text-muted)' : 'var(--text-primary)',
        textDecoration: checked ? 'line-through' : 'none', letterSpacing: '-0.01em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{item.name}</div>
      {item.brand && (
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 1,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.brand}</div>
      )}
    </div>
  );

  if (view === 'card') {
    return (
      <div onClick={onOpen} style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px',
        background: 'var(--surface-base)', borderRadius: 18,
        border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)',
        opacity: checked ? 0.62 : 1, cursor: 'pointer',
        animation: item.isNew ? 'slideInItem .26s ease' : 'none',
      }}>
        <Checkbox checked={checked} accent={accent} onToggle={onToggle} />
        <CatChip cat={item.cat} />
        {nameEl}
        <ItemMeta item={item} />
      </div>
    );
  }

  // row (flat)
  return (
    <div onClick={onOpen} style={{
      display: 'flex', alignItems: 'center', gap: 13, padding: '12px 18px',
      minHeight: 60, cursor: 'pointer', opacity: checked ? 0.6 : 1,
      animation: item.isNew ? 'slideInItem .26s ease' : 'none',
    }}>
      <Checkbox checked={checked} accent={accent} onToggle={onToggle} />
      <div style={{ width: 3.5, height: 26, borderRadius: 2, background: m.color, flexShrink: 0,
        opacity: checked ? 0.4 : 1 }} />
      {nameEl}
      <ItemMeta item={item} />
    </div>
  );
}

function ItemTile({ item, accent, nameWeight, onToggle, onOpen, onDelete }) {
  const m = CATEGORIES[item.cat] || CATEGORIES['Sonstiges'];
  const checked = item.checked;
  return (
    <div onClick={onOpen} style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 8,
      padding: '13px 13px 14px', borderRadius: 18, cursor: 'pointer',
      background: checked ? 'var(--surface-overlay)' : 'var(--surface-base)',
      borderLeft: `4px solid ${checked ? 'var(--border-default)' : m.color}`,
      border: '1px solid var(--border-subtle)', borderLeftWidth: 4,
      boxShadow: checked ? 'none' : 'var(--shadow-sm)', opacity: checked ? 0.6 : 1,
      minHeight: 96, animation: item.isNew ? 'slideInItem .26s ease' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <CatChip cat={item.cat} size={30} />
        <Checkbox checked={checked} accent={accent} onToggle={onToggle} />
      </div>
      <div style={{ marginTop: 'auto' }}>
        <div style={{ fontSize: 14.5, fontWeight: nameWeight + 100, lineHeight: 1.25,
          color: checked ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: checked ? 'line-through' : 'none',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.name}</div>
        {item.brand && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{item.brand}</div>}
        {(item.qty || item.store) && <div style={{ marginTop: 7 }}><ItemMeta item={item} /></div>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Category header
   ════════════════════════════════════════════════════════════ */
function CategoryHeader({ cat, count, collapsed, onToggle }) {
  const m = CATEGORIES[cat] || CATEGORIES['Sonstiges'];
  return (
    <button onClick={onToggle} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 9,
      padding: '14px 18px 7px', background: 'transparent', border: 'none',
      cursor: 'pointer', textAlign: 'left',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: m.color }} />
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{cat}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0,
        background: 'var(--surface-overlay)', borderRadius: 20, padding: '1px 8px',
        fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      <span style={{ flex: 1 }} />
      <Icon name="chevron-down" size={17} style={{ color: 'var(--text-muted)',
        transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform .2s' }} />
    </button>
  );
}

window.TE_pieces = { Checkbox, CatChip, ItemRow, ItemTile, CategoryHeader, SwipeRow, QtyBadge, StoreBadge };
