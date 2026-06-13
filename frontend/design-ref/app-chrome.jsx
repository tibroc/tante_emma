// app.jsx — TanteEmma root
const { Checkbox, CatChip, ItemRow, ItemTile, CategoryHeader, SwipeRow } = window.TE_pieces;

/* ── Brand wordmark ─────────────────────────────────────────── */
function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
        background: `linear-gradient(150deg, var(--accent), ${accent600('var(--accent)')})`,
        display: 'grid', placeItems: 'center', color: '#fff',
        boxShadow: 'var(--shadow-pop)',
      }}>
        <Icon name="cart" size={19} strokeWidth={2} />
      </div>
      <div className="ff-display" style={{ fontSize: 22, lineHeight: 1, letterSpacing: '-0.01em' }}>
        <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--accent)' }}>Tante</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Emma</span>
      </div>
    </div>
  );
}

function Presence() {
  const people = [{ i: 'MK', c: '#d946ef' }, { i: 'JT', c: '#10b981' }];
  return (
    <div style={{ display: 'flex' }}>
      {people.map((p, idx) => (
        <div key={p.i} title={`${p.i} ist aktiv`} style={{
          width: 28, height: 28, borderRadius: '50%', background: p.c, color: '#fff',
          fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center',
          border: '2px solid var(--surface-base)', marginLeft: idx ? -9 : 0,
          fontFamily: "'DM Sans', sans-serif",
        }}>{p.i}</div>
      ))}
    </div>
  );
}

/* ── Add bar + suggestions ──────────────────────────────────── */
function AddBar({ accent, header, onAdd }) {
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const inputRef = useRef(null);
  const query = q.trim();

  const matches = query
    ? PRODUCT_DB.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];
  const exact = PRODUCT_DB.some(p => p.name.toLowerCase() === query.toLowerCase());
  const open = focus && query.length > 0;

  const commit = (prod) => {
    if (prod) onAdd({ name: prod.name, brand: prod.brand || '', cat: prod.cat, qty: '' });
    else if (query) onAdd({ name: query, brand: '', cat: 'Sonstiges', qty: '' });
    setQ('');
    inputRef.current?.focus();
  };

  const gradientBtn = header === 'verlauf';

  return (
    <div style={{ position: 'relative', padding: '0 16px 12px', zIndex: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 50,
        background: 'var(--surface-overlay)', borderRadius: 15, padding: '0 8px 0 14px',
        outline: focus ? `2px solid var(--accent)` : '2px solid transparent',
        transition: 'outline-color .15s', boxShadow: focus ? 'var(--shadow-md)' : 'none',
      }}>
        <Icon name="search" size={19} style={{ color: focus ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0, transition: 'color .15s' }} />
        <input
          ref={inputRef} value={q}
          onChange={(e) => { setQ(e.target.value); setFocus(true); }}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 140)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(matches[0]); if (e.key === 'Escape') { setQ(''); e.target.blur(); } }}
          placeholder="Hinzufügen…"
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 500,
            color: 'var(--text-primary)',
          }} />
        <button aria-label="Scannen" style={{
          width: 34, height: 34, border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--text-muted)', display: 'grid', placeItems: 'center', flexShrink: 0,
        }}><Icon name="camera" size={21} /></button>
        <button aria-label="Hinzufügen" onClick={() => commit(matches[0])} style={{
          width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0,
          background: gradientBtn ? `linear-gradient(145deg, var(--accent), ${accent600('var(--accent)')})` : 'var(--accent)',
          color: '#fff', display: 'grid', placeItems: 'center',
          boxShadow: 'var(--shadow-pop)', transition: 'transform .08s',
        }}
          onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
          onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          <Icon name="plus" size={20} strokeWidth={2.4} />
        </button>
      </div>

      {open && (
        <div style={{
          position: 'absolute', left: 16, right: 16, top: 54, zIndex: 60,
          background: 'var(--surface-base)', border: '1px solid var(--border-subtle)',
          borderRadius: 16, boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
          animation: 'suggIn .16s ease',
        }}>
          {matches.map((p, i) => (
            <button key={p.name} onMouseDown={(e) => e.preventDefault()} onClick={() => commit(p)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 14px',
                background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
              <CatChip cat={p.cat} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {p.name}{p.brand && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {p.brand}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.cat}</div>
              </div>
              {p.freq && <Icon name="clock" size={15} style={{ color: 'var(--text-muted)' }} />}
            </button>
          ))}
          {!exact && (
            <button onMouseDown={(e) => e.preventDefault()} onClick={() => commit(null)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              background: 'var(--accent-tint)', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, display: 'grid', placeItems: 'center',
                background: 'var(--accent)', color: '#fff' }}><Icon name="plus" size={18} strokeWidth={2.4} /></div>
              <span style={{ fontSize: 14.5, color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                „{query}" neu anlegen</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sort pills ─────────────────────────────────────────────── */
function SortPills({ sort, setSort, view, cycleView }) {
  const pills = [
    { id: 'cat', icon: 'rows', label: 'Kategorie' },
    { id: 'date', icon: 'clock', label: 'Datum' },
    { id: 'az', label: 'A–Z' },
  ];
  const viewIcon = view === 'tile' ? 'grid' : view === 'card' ? 'card-rows' : 'rows';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px 12px' }}>
      <div style={{ display: 'flex', gap: 8, flex: 1, overflowX: 'auto' }} className="scroll">
        {pills.map(p => {
          const on = sort === p.id;
          return (
            <button key={p.id} onClick={() => setSort(p.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 13px',
              borderRadius: 20, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
              fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600,
              border: `1px solid ${on ? 'var(--accent)' : 'var(--border-subtle)'}`,
              background: on ? 'var(--accent-light)' : 'var(--surface-base)',
              color: on ? 'var(--accent)' : 'var(--text-secondary)', transition: 'all .15s',
            }}>
              {p.icon && <Icon name={p.icon} size={15} strokeWidth={2} />}{p.label}
            </button>
          );
        })}
      </div>
      <button onClick={cycleView} aria-label="Ansicht wechseln" style={{
        width: 36, height: 32, borderRadius: 10, flexShrink: 0, cursor: 'pointer',
        border: '1px solid var(--border-subtle)', background: 'var(--surface-base)',
        color: 'var(--text-secondary)', display: 'grid', placeItems: 'center',
      }}><Icon name={viewIcon} size={18} strokeWidth={2} /></button>
    </div>
  );
}

/* ── Checked footer ─────────────────────────────────────────── */
function CheckedFooter({ items, nameWeight, accent, onToggle, onClear }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 18px' }}>
        <button onClick={() => setOpen(o => !o)} style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 8, border: 'none',
          background: 'transparent', cursor: 'pointer', textAlign: 'left',
          color: 'var(--text-secondary)', fontFamily: "'DM Sans', sans-serif",
        }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--emerald-500)',
            display: 'grid', placeItems: 'center', color: '#fff' }}>
            <Icon name="check" size={13} strokeWidth={3} /></span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{items.length} erledigt</span>
          <Icon name="chevron-down" size={16} style={{ color: 'var(--text-muted)',
            transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }} />
        </button>
        <button onClick={onClear} style={{
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: '#ef4444', fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
        }}>Alle löschen</button>
      </div>
      {open && (
        <div style={{ paddingBottom: 6 }}>
          {items.map(it => (
            <ItemRow key={it.id} item={it} accent={accent} nameWeight={nameWeight}
              view="row" onToggle={() => onToggle(it.id)} onOpen={() => {}} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Bottom nav ─────────────────────────────────────────────── */
function BottomNav({ active, onChange }) {
  const tabs = [
    { id: 'lists', icon: 'cart', label: 'Listen' },
    { id: 'stores', icon: 'store', label: 'Läden' },
    { id: 'history', icon: 'clock', label: 'Verlauf' },
    { id: 'settings', icon: 'gear', label: 'Einst.' },
  ];
  return (
    <div style={{
      flexShrink: 0, display: 'flex', padding: '8px 10px 26px',
      borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-base)',
      position: 'relative', zIndex: 40,
    }}>
      {tabs.map(t => {
        const on = active === t.id;
        return (
          <button key={t.id} onClick={() => onChange(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0',
            color: on ? 'var(--accent)' : 'var(--text-muted)',
          }}>
            <div style={{
              display: 'grid', placeItems: 'center', width: 52, height: 30, borderRadius: 16,
              background: on ? 'var(--accent-light)' : 'transparent', transition: 'background .18s',
            }}><Icon name={t.icon} size={22} strokeWidth={on ? 2.1 : 1.8} /></div>
            <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 500, fontFamily: "'DM Sans', sans-serif" }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

window.TE_chrome = { Wordmark, Presence, AddBar, SortPills, CheckedFooter, BottomNav };
