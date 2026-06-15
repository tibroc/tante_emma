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

function ListCard({ list, frWeight, onOpen, onMenu }) {
  const [fav, setFav] = React.useState(!!list.fav);
  const open = list.items.length;
  const done = list.checked.length;
  const total = open + done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const a600 = accent600For(list.accent);
  // top 4 category colors as a little palette strip
  const cats = [...new Set(list.items.map(i => i.cat))].slice(0, 5);

  return (
    <div role="button" tabIndex={0} onClick={onOpen} style={{
      width: '100%', textAlign: 'left', cursor: 'pointer',
      borderRadius: 22, overflow: 'hidden', background: 'var(--surface-base)',
      boxShadow: 'var(--shadow-md)', position: 'relative',
    }}>
      {/* accent header band */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '15px 16px 14px',
        background: `linear-gradient(135deg, ${list.accent}, ${a600})` }}>
        {/* (decorative circle removed — relying on the gradient alone) */}
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
          <button onClick={(e) => { e.stopPropagation(); setFav(f => !f); }}
            aria-label={fav ? 'Favorit entfernen' : 'Als Favorit markieren'} aria-pressed={fav} style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0, cursor: 'pointer', display: 'grid',
            placeItems: 'center', border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            <Icon name="star" size={17} strokeWidth={2} fill={fav ? 'currentColor' : 'none'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMenu(); }} aria-label="Optionen" style={{
            width: 32, height: 32, borderRadius: 10, flexShrink: 0, cursor: 'pointer', display: 'grid',
            placeItems: 'center', border: 'none', background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            <Icon name="dots" size={19} strokeWidth={2.2} />
          </button>
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
    </div>
  );
}

/* ── List action sheet: rename · accent · delete ── */
function ListActionSheet({ list, onClose, onRename, onSetAccent, onDelete }) {
  const [name, setName] = React.useState(list ? list.name : '');
  const [confirm, setConfirm] = React.useState(false);
  React.useEffect(() => { if (list) { setName(list.name); setConfirm(false); } }, [list && list.id]);
  if (!list) return null;

  const save = () => { onRename(list.id, name); onClose(); };
  const a = list.accent;

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end',
      background: 'rgba(20,10,24,0.42)', backdropFilter: 'blur(2px)', animation: 'fadeIn .2s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', background: 'var(--surface-base)', borderRadius: '26px 26px 0 0',
        padding: '12px 20px calc(22px + env(safe-area-inset-bottom))', boxShadow: 'var(--shadow-lg)',
        animation: 'sheetUp .3s cubic-bezier(.2,.9,.3,1)',
      }}>
        <div style={{ width: 38, height: 4, borderRadius: 4, background: 'var(--border-default)', margin: '0 auto 18px' }} />

        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 8 }}>Listenname</div>
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
          style={{ width: '100%', height: 48, padding: '0 15px', borderRadius: 13, marginBottom: 18,
            border: `1.5px solid ${a}`, background: 'var(--surface-raised)', outline: 'none',
            fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }} />

        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          color: 'var(--text-muted)', marginBottom: 10 }}>Listenfarbe</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
          {THEMES.map(th => {
            const on = list.accent.toLowerCase() === th.accent.toLowerCase();
            return (
              <button key={th.id} onClick={() => onSetAccent(list.id, th.accent)} aria-label={th.name} style={{
                width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, padding: 3,
                background: 'transparent', display: 'grid', placeItems: 'center',
                border: `2.5px solid ${on ? th.accent : 'transparent'}` }}>
                <span style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'grid', placeItems: 'center',
                  color: '#fff', background: `linear-gradient(150deg, ${th.accent}, ${th.accent600})` }}>
                  {on && <Icon name="check" size={18} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={save} style={{
            flex: 1, height: 50, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: a, color: '#fff', fontFamily: "'DM Sans', sans-serif",
            fontSize: 15.5, fontWeight: 700 }}>Speichern</button>
          {confirm ? (
            <button onClick={() => { onDelete(list.id); onClose(); }} style={{
              flex: 1, height: 50, borderRadius: 14, cursor: 'pointer', border: 'none',
              background: '#ef4444', color: '#fff', fontFamily: "'DM Sans', sans-serif",
              fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              <Icon name="trash" size={18} strokeWidth={2} />Wirklich löschen?</button>
          ) : (
            <button onClick={() => setConfirm(true)} aria-label="Liste löschen" style={{
              width: 50, height: 50, borderRadius: 14, flexShrink: 0, cursor: 'pointer',
              border: '1px solid color-mix(in oklab, #ef4444 30%, transparent)', background: 'transparent',
              color: '#ef4444', display: 'grid', placeItems: 'center' }}>
              <Icon name="trash" size={20} strokeWidth={2} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

function ListsOverviewScreen({ t, setTweak, lists, onOpenList, onAddList, onRename, onDelete, onSetAccent }) {
  const frWeight = FR_WEIGHT[t.typeWeight];
  const totalOpen = lists.reduce((n, l) => n + l.items.length, 0);
  const [menuId, setMenuId] = React.useState(null);
  const menuList = lists.find(l => l.id === menuId) || null;

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
          {lists.map(l => <ListCard key={l.id} list={l} frWeight={frWeight}
            onOpen={() => onOpenList(l.id)} onMenu={() => setMenuId(l.id)} />)}

          <button onClick={onAddList} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 9, width: '100%', padding: '16px', borderRadius: 22, cursor: 'pointer',
            color: 'var(--text-secondary)', background: 'transparent', border: '1.5px dashed var(--border-default)',
            fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, fontWeight: 600 }}>
            <Icon name="plus" size={18} strokeWidth={2.2} />Neue Liste
          </button>
        </div>
        <div style={{ height: 16 }} />
      </div>

      <ListActionSheet list={menuList} onClose={() => setMenuId(null)}
        onRename={onRename} onSetAccent={onSetAccent} onDelete={onDelete} />
    </React.Fragment>
  );
}

window.TE_screens = Object.assign(window.TE_screens || {}, { ListsOverviewScreen });
