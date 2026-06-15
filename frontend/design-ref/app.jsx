// app.jsx — TanteEmma root + Tweaks
const { BottomNav } = window.TE_chrome;
const { ListenScreen, LadenScreen, VerlaufScreen, EinstellungenScreen, LoginScreen, ListsOverviewScreen } = window.TE_screens;
const { LargeTitleHeader, ThemeToggle } = window.TE_shell;

/* ── Item detail bottom sheet ──────────────────────────────── */
function DetailSheet({ item, onClose, onChange, onDelete }) {
  if (!item) return null;
  const m = CATEGORIES[item.cat] || CATEGORIES['Sonstiges'];
  const stores = ['REWE', 'Lidl', 'Aldi', 'DM'];
  const units = ['Stk.', 'g', 'kg', 'ml', 'L', 'Pkg.'];
  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end',
      background: 'rgba(20,10,24,0.42)', backdropFilter: 'blur(2px)', animation: 'fadeIn .2s ease',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: '100%', background: 'var(--surface-base)', borderRadius: '26px 26px 0 0',
        padding: '12px 20px calc(20px + env(safe-area-inset-bottom))', boxShadow: 'var(--shadow-lg)',
        animation: 'sheetUp .3s cubic-bezier(.2,.9,.3,1)', maxHeight: '78%', overflowY: 'auto',
      }} className="scroll">
        <div style={{ width: 38, height: 4, borderRadius: 4, background: 'var(--border-default)',
          margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 6 }}>
          <CatChipBig cat={item.cat} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="ff-display" style={{ fontSize: 23, fontWeight: 600, color: 'var(--text-primary)',
              lineHeight: 1.15 }}>{item.name}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: m.color }} />
              <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>{item.cat}</span>
            </div>
          </div>
        </div>
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '16px 0' }} />

        <FieldLabel>Menge</FieldLabel>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <input defaultValue={item.qty} onChange={(e) => onChange({ qty: e.target.value })}
            placeholder="z. B. 500" style={inputStyle} />
          <select onChange={(e) => {}} style={{ ...inputStyle, flex: '0 0 96px', width: 96 }}>
            {units.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>

        <FieldLabel>Laden</FieldLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {stores.map(s => {
            const on = item.store === s;
            return <button key={s} onClick={() => onChange({ store: on ? '' : s })} style={{
              padding: '8px 14px', borderRadius: 12, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              border: `1px solid ${on ? 'var(--accent)' : 'var(--border-subtle)'}`,
              background: on ? 'var(--accent-light)' : 'var(--surface-raised)',
              color: on ? 'var(--accent)' : 'var(--text-secondary)',
            }}>{s}</button>;
          })}
        </div>

        <FieldLabel>Notiz</FieldLabel>
        <input defaultValue={item.note || ''} onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Notiz hinzufügen…" style={{ ...inputStyle, width: '100%', marginBottom: 18 }} />

        <button onClick={onDelete} style={{
          width: '100%', padding: '13px', borderRadius: 14, cursor: 'pointer', marginTop: 4,
          border: '1px solid color-mix(in oklab, #ef4444 30%, transparent)', background: 'transparent',
          color: '#ef4444', fontSize: 15, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
        }}><Icon name="trash" size={18} strokeWidth={2} />Aus Liste entfernen</button>
      </div>
    </div>
  );
}
const inputStyle = {
  flex: 1, minWidth: 0, height: 44, padding: '0 14px', borderRadius: 12,
  border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)',
  fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'var(--text-primary)', outline: 'none',
};
function FieldLabel({ children }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--text-muted)', marginBottom: 8 }}>{children}</div>;
}
function CatChipBig({ cat }) {
  const m = CATEGORIES[cat] || CATEGORIES['Sonstiges'];
  return <div style={{ width: 46, height: 46, borderRadius: 15, flexShrink: 0, display: 'grid',
    placeItems: 'center', color: m.color, background: `color-mix(in oklab, ${m.color} 16%, var(--surface-base))` }}>
    <Icon name={m.icon} size={26} strokeWidth={1.9} /></div>;
}

/* ── Snackbar ───────────────────────────────────────────────── */
function Snackbar({ data, onUndo }) {
  if (!data) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 96, left: '50%', zIndex: 150,
      display: 'flex', alignItems: 'center', gap: 14, padding: '11px 12px 11px 18px',
      background: 'var(--surface-inverse, #221b27)', borderRadius: 14, boxShadow: 'var(--shadow-lg)',
      animation: 'snackUp .24s ease', whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 14, color: '#fff', fontWeight: 500 }}>„{data.item.name}" entfernt</span>
      <button onClick={onUndo} style={{
        border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', cursor: 'pointer',
        fontSize: 13.5, fontWeight: 700, padding: '6px 14px', borderRadius: 9,
        fontFamily: "'DM Sans', sans-serif",
      }}>Rückgängig</button>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '64px 40px', gap: 6 }}>
      <div style={{ width: 76, height: 76, borderRadius: 24, display: 'grid', placeItems: 'center',
        background: 'var(--accent-tint)', color: 'var(--accent)', marginBottom: 8 }}>
        <Icon name="cart" size={38} strokeWidth={1.6} /></div>
      <div className="ff-display" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>
        Liste ist leer</div>
      <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', maxWidth: 230, lineHeight: 1.5 }}>
        Tippe oben ins Feld, um deinen Einkauf zu starten.</div>
    </div>
  );
}

/* ── Coming-soon placeholder (Verlauf / Einstellungen built next) ── */
function ComingScreen({ t, setTweak, title, icon }) {
  return (
    <React.Fragment>
      <LargeTitleHeader title={title} frWeight={FR_WEIGHT[t.typeWeight]}
        trailing={<ThemeToggle dark={t.dark} onToggle={() => setTweak('dark', !t.dark)} />} />
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-base)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '0 40px' }}>
        <div style={{ width: 74, height: 74, borderRadius: 24, display: 'grid', placeItems: 'center',
          background: 'var(--accent-tint)', color: 'var(--accent)', marginBottom: 14 }}>
          <Icon name={icon} size={36} strokeWidth={1.6} /></div>
        <div className="ff-display" style={{ fontSize: 21, fontWeight: 600, color: 'var(--text-primary)' }}>In Arbeit</div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 240, lineHeight: 1.5, marginTop: 6 }}>
          „{title}" bekommt als Nächstes denselben Feinschliff.</div>
      </div>
    </React.Fragment>
  );
}

/* ════════════════════════════════════════════════════════════
   ROOT
   ════════════════════════════════════════════════════════════ */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('lists');
  const [lists, setLists] = useState(() => INITIAL_LISTS);
  const [activeListId, setActiveListId] = useState(null);
  const [sort, setSort] = useState('cat');
  const [view, setView] = useState(t.itemStyle === 'kachel' ? 'tile' : t.itemStyle === 'karte' ? 'card' : 'row');
  const [collapsed, setCollapsed] = useState({});
  const [detail, setDetail] = useState(null);
  const [snack, setSnack] = useState(null);
  const snackTimer = useRef(null);

  // Tweak → view sync
  useEffect(() => {
    setView(t.itemStyle === 'kachel' ? 'tile' : t.itemStyle === 'karte' ? 'card' : 'row');
  }, [t.itemStyle]);

  const nameWeight = NAME_WEIGHT[t.typeWeight];

  // active list (falls back to first for cross-screen adds like Verlauf)
  const targetId = activeListId || (lists[0] && lists[0].id);
  const active = lists.find(l => l.id === activeListId) || null;
  const items = active ? active.items : [];
  const checked = active ? active.checked : [];
  const patchList = (lid, fn) => setLists(prev => prev.map(l => l.id === lid ? fn(l) : l));

  /* actions — operate on the active (or target) list */
  const checkOff = (id) => {
    const lid = activeListId;
    const it = (lists.find(l => l.id === lid)?.items || []).find(x => x.id === id);
    if (!it) return;
    if (navigator.vibrate) navigator.vibrate(6);
    patchList(lid, l => ({ ...l, items: l.items.map(x => x.id === id ? { ...x, checked: true, isNew: false } : x) }));
    setTimeout(() => {
      patchList(lid, l => ({ ...l, items: l.items.filter(x => x.id !== id),
        checked: [{ ...it, checked: true }, ...l.checked] }));
    }, 430);
  };
  const uncheck = (id) => {
    const lid = activeListId;
    const it = (lists.find(l => l.id === lid)?.checked || []).find(x => x.id === id);
    if (!it) return;
    patchList(lid, l => ({ ...l, checked: l.checked.filter(x => x.id !== id),
      items: [{ ...it, checked: false, isNew: true }, ...l.items] }));
  };
  const removeItem = (id) => {
    const lid = activeListId;
    const arr = lists.find(l => l.id === lid)?.items || [];
    const idx = arr.findIndex(x => x.id === id);
    if (idx < 0) return;
    const it = arr[idx];
    patchList(lid, l => ({ ...l, items: l.items.filter(x => x.id !== id) }));
    setDetail(null);
    clearTimeout(snackTimer.current);
    setSnack({ item: it, idx, lid });
    snackTimer.current = setTimeout(() => setSnack(null), 4200);
  };
  const undo = () => {
    if (!snack) return;
    patchList(snack.lid, l => { const c = l.items.slice(); c.splice(Math.min(snack.idx, c.length), 0, snack.item);
      return { ...l, items: c }; });
    setSnack(null);
  };
  const addItem = (data) => {
    patchList(targetId, l => ({ ...l, items: [{ ...data, id: uid(), checked: false, isNew: true }, ...l.items] }));
  };
  const clearChecked = () => patchList(activeListId, l => ({ ...l, checked: [] }));
  const cycleView = () => setView(v => v === 'row' ? 'card' : v === 'card' ? 'tile' : 'row');
  const updateDetail = (patch) => {
    setDetail(d => ({ ...d, ...patch }));
    patchList(activeListId, l => ({ ...l, items: l.items.map(x => x.id === detail.id ? { ...x, ...patch } : x) }));
  };
  const addList = () => {
    const palette = ['#d946ef', '#3b82f6', '#fb6f4c', '#10b981', '#8b5cf6'];
    const id = uid();
    const accent = palette[lists.length % palette.length];
    setLists(prev => [...prev, { id, name: `Neue Liste ${prev.length + 1}`, accent, icon: 'cart',
      members: ['mk'], edited: 'gerade eben', items: [], checked: [] }]);
    setActiveListId(id);
  };
  const renameList = (id, name) => patchList(id, l => ({ ...l, name: name.trim() || l.name, edited: 'gerade eben' }));
  const setListAccent = (id, accent) => patchList(id, l => ({ ...l, accent }));
  const deleteList = (id) => {
    setLists(prev => prev.filter(l => l.id !== id));
    if (activeListId === id) setActiveListId(null);
  };

  // active list themes the whole app; overview/other contexts use global accent
  const effAccent = active ? active.accent : t.accent;
  const accentVars = { '--accent': effAccent, '--accent-600': accent600(effAccent),
    '--surface-inverse': t.dark ? '#2b2333' : '#221b27' };

  return (
    <div className="app ff-body" data-theme={t.dark ? 'dark' : 'light'}
      style={{ ...accentVars, fontSize: `${t.typeScale}rem` }}>
      <IOSDevice dark={t.dark}>
        {!authed ? (
          <LoginScreen t={t} onAuth={() => { setTab('lists'); setAuthed(true); }} />
        ) : (
        <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'var(--surface-base)', color: 'var(--text-primary)', overflow: 'hidden' }}>

          {tab === 'lists' && (
            active ? (
              <ListenScreen t={t} setTweak={setTweak} items={items} checked={checked}
                listName={active.name} onBack={() => { setActiveListId(null); setDetail(null); }}
                sort={sort} setSort={setSort} view={view} cycleView={cycleView}
                collapsed={collapsed} setCollapsed={setCollapsed}
                onAdd={addItem} onCheckOff={checkOff} onUncheck={uncheck} onRemove={removeItem}
                onOpenDetail={setDetail} onClearChecked={clearChecked} />
            ) : (
              <ListsOverviewScreen t={t} setTweak={setTweak} lists={lists}
                onOpenList={(id) => { setActiveListId(id); setCollapsed({}); }} onAddList={addList}
                onRename={renameList} onDelete={deleteList} onSetAccent={setListAccent} />
            )
          )}
          {tab === 'stores' && <LadenScreen t={t} setTweak={setTweak} items={lists.flatMap(l => l.items)} />}
          {tab === 'history' && <VerlaufScreen t={t} setTweak={setTweak} onAdd={addItem} />}
          {tab === 'settings' && <EinstellungenScreen t={t} setTweak={setTweak} onLogout={() => setAuthed(false)} />}

          <BottomNav active={tab} onChange={(id) => {
            if (id === 'lists' && tab === 'lists') { setActiveListId(null); setDetail(null); }
            setTab(id);
          }} />

          <Snackbar data={snack} onUndo={undo} />
          {tab === 'lists' && (
            <DetailSheet item={detail} onClose={() => setDetail(null)}
              onChange={updateDetail} onDelete={() => detail && removeItem(detail.id)} />
          )}
        </div>
        )}
      </IOSDevice>

      <Tweaks t={t} setTweak={setTweak} />
    </div>
  );
}

/* ── Tweaks panel ───────────────────────────────────────────── */
function Tweaks({ t, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection label="Akzent & Verlauf" />
      <TweakColor label="Akzentfarbe" value={t.accent}
        options={ACCENTS.map(a => a.v)} onChange={(v) => setTweak('accent', v)} />
      <TweakRadio label="Kopfbereich" value={t.header} options={['schlicht', 'verlauf']}
        onChange={(v) => setTweak('header', v)} />

      <TweakSection label="Artikel-Stil" />
      <TweakRadio label="Darstellung" value={t.itemStyle} options={['zeile', 'karte', 'kachel']}
        onChange={(v) => setTweak('itemStyle', v)} />

      <TweakSection label="Typografie" />
      <TweakRadio label="Schriftstärke" value={t.typeWeight} options={['leicht', 'normal', 'kräftig']}
        onChange={(v) => setTweak('typeWeight', v)} />
      <TweakSlider label="Schriftgröße" value={t.typeScale} min={0.9} max={1.15} step={0.05}
        onChange={(v) => setTweak('typeScale', v)} />

      <TweakSection label="Darstellung" />
      <TweakToggle label="Dunkelmodus" value={t.dark} onChange={(v) => setTweak('dark', v)} />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
