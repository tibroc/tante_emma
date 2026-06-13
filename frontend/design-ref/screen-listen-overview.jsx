// screen-listen-overview.jsx — Einkaufslisten (choose a list)
const { LargeTitleHeader, ThemeToggle } = window.TE_shell;

function MemberStack({ members, size = 26 }) {
  return (
    <div style={{ display: 'flex' }}>
      {members.map((key, idx) => {
        const m = MEMBERS[key];
        return (
          <div key={key} title={m.i} style={{
            width: size, height: size, borderRadius: '50%', background: m.c, color: '#fff',
            fontSize: size * 0.4, fontWeight: 700, display: 'grid', placeItems: 'center',
            border: '2px solid var(--surface-base)', marginLeft: idx ? -size * 0.33 : 0,
            fontFamily: "'DM Sans', sans-serif",
          }}>{m.i}</div>
        );
      })}
    </div>
  );
}

function ListCard({ list, frWeight, onOpen }) {
  const open = list.items.length;
  const done = list.checked.length;
  const total = open + done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const a600 = accent600For(list.accent);
  // top 4 category colors as a little palette strip
  const cats = [...new Set(list.items.map(i => i.cat))].slice(0, 5);

  return (
    <button onClick={onOpen} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0, border: 'none',
      borderRadius: 22, overflow: 'hidden', background: 'var(--surface-base)',
      boxShadow: 'var(--shadow-md)', position: 'relative',
    }}>
      {/* accent header band */}
      <div style={{ position: 'relative', padding: '15px 16px 14px',
        background: `linear-gradient(135deg, ${list.accent}, ${a600})` }}>
        <div style={{ position: 'absolute', top: -24, right: -16, width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'grid',
            placeItems: 'center', color: '#fff', background: 'rgba(255,255,255,0.2)',
            border: '1.5px solid rgba(255,255,255,0.32)' }}>
            <Icon name={list.icon} size={24} strokeWidth={1.9} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ff-display" style={{ fontSize: 19, fontWeight: frWeight, color: '#fff',
              letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {list.name}</div>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>
              {open} offen{done ? ` · ${done} erledigt` : ''}</div>
          </div>
          <MemberStack members={list.members} />
        </div>
      </div>

      {/* body */}
      <div style={{ padding: '13px 16px 15px' }}>
        {/* progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-overlay)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4,
              background: `linear-gradient(90deg, ${list.accent}, ${a600})`, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {pct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {cats.map((c, i) => {
              const m = CATEGORIES[c] || CATEGORIES['Sonstiges'];
              return <span key={i} style={{ width: 8, height: 8, borderRadius: 3, background: m.color }} />;
            })}
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 3 }}>
              {cats.length} Kategorien</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="clock" size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>{list.edited}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function ListsOverviewScreen({ t, setTweak, lists, onOpenList, onAddList }) {
  const frWeight = FR_WEIGHT[t.typeWeight];
  const totalOpen = lists.reduce((n, l) => n + l.items.length, 0);

  return (
    <React.Fragment>
      <LargeTitleHeader
        title="Einkaufslisten" subtitle={`${lists.length} Listen · ${totalOpen} Artikel offen`}
        frWeight={frWeight}
        trailing={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle dark={t.dark} onToggle={() => setTweak('dark', !t.dark)} />
            <button onClick={onAddList} aria-label="Neue Liste" style={{ width: 36, height: 36, borderRadius: 11,
              cursor: 'pointer', display: 'grid', placeItems: 'center', border: 'none', color: '#fff',
              background: `linear-gradient(145deg, var(--accent), var(--accent-600))`, boxShadow: 'var(--shadow-pop)' }}>
              <Icon name="plus" size={20} strokeWidth={2.4} />
            </button>
          </div>
        } />

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-base)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '4px 16px 8px' }}>
          {lists.map(l => <ListCard key={l.id} list={l} frWeight={frWeight} onOpen={() => onOpenList(l.id)} />)}

          <button onClick={onAddList} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 9, width: '100%', padding: '16px', borderRadius: 22, cursor: 'pointer',
            color: 'var(--text-secondary)', background: 'transparent', border: '1.5px dashed var(--border-default)',
            fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, fontWeight: 600 }}>
            <Icon name="plus" size={18} strokeWidth={2.2} />Neue Liste
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </React.Fragment>
  );
}

window.TE_screens = Object.assign(window.TE_screens || {}, { ListsOverviewScreen });
