// screen-verlauf.jsx — Verlauf (history)
const { LargeTitleHeader, ThemeToggle, SearchField } = window.TE_shell;

function HistoryRow({ item, added, onAdd }) {
  const m = CATEGORIES[item.cat] || CATEGORIES['Sonstiges'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 4px', minHeight: 56 }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center',
        color: m.color, background: `color-mix(in oklab, ${m.color} 14%, var(--surface-base))` }}>
        <Icon name={m.icon} size={18} strokeWidth={1.9} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.brand || item.cat}</div>
      </div>
      <button onClick={onAdd} disabled={added} aria-label="Wieder hinzufügen" style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0, cursor: added ? 'default' : 'pointer',
        display: 'grid', placeItems: 'center', transition: 'all .2s',
        border: added ? 'none' : '1.5px solid var(--border-default)',
        background: added ? 'var(--emerald-500)' : 'transparent',
        color: added ? '#fff' : 'var(--text-secondary)',
      }}>
        <Icon name={added ? 'check' : 'plus'} size={added ? 16 : 19} strokeWidth={added ? 3 : 2.2} />
      </button>
    </div>
  );
}

function VerlaufScreen({ t, setTweak, onAdd }) {
  const [q, setQ] = React.useState('');
  const [added, setAdded] = React.useState({});
  const frWeight = FR_WEIGHT[t.typeWeight];
  const query = q.trim().toLowerCase();

  const reAdd = (key, item) => {
    if (added[key]) return;
    onAdd({ name: item.name, brand: item.brand || '', cat: item.cat, qty: '' });
    if (navigator.vibrate) navigator.vibrate(6);
    setAdded(a => ({ ...a, [key]: true }));
  };

  const groups = HISTORY
    .map(g => ({ ...g, items: g.items.filter(it => !query || it.name.toLowerCase().includes(query)) }))
    .filter(g => g.items.length);

  return (
    <React.Fragment>
      <LargeTitleHeader title="Verlauf" subtitle="Tippe + zum Wiederholen"
        frWeight={frWeight}
        trailing={<ThemeToggle dark={t.dark} onToggle={() => setTweak('dark', !t.dark)} />} />

      <div style={{ flexShrink: 0, background: 'var(--surface-base)', position: 'relative', zIndex: 20 }}>
        <SearchField value={q} onChange={setQ} placeholder="Verlauf durchsuchen…" />
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-base)' }}>
        {groups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-muted)' }}>
            <div className="ff-display" style={{ fontSize: 19, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Nichts gefunden</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Für „{q}" gibt es keinen Eintrag.</div>
          </div>
        )}
        {groups.map(g => (
          <div key={g.label} style={{ padding: '0 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0 4px' }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                color: 'var(--text-secondary)' }}>{g.label}</span>
              <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>
            {g.items.map(it => {
              const key = g.label + '|' + it.name;
              return <HistoryRow key={key} item={it} added={!!added[key]} onAdd={() => reAdd(key, it)} />;
            })}
          </div>
        ))}
        <div style={{ height: 16 }} />
      </div>
    </React.Fragment>
  );
}

window.TE_screens = Object.assign(window.TE_screens || {}, { VerlaufScreen });
