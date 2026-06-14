// screen-listen.jsx — the shopping list (home) screen
const { Wordmark, Presence, AddBar, SortPills, CheckedFooter } = window.TE_chrome;
const { ItemRow, ItemTile, CategoryHeader, SwipeRow } = window.TE_pieces;

function ListenScreen(props) {
  const {
    t, setTweak, items, checked, sort, setSort, view, cycleView, collapsed, setCollapsed,
    onAdd, onCheckOff, onUncheck, onRemove, onOpenDetail, onClearChecked, listName, onBack,
  } = props;
  const nameWeight = NAME_WEIGHT[t.typeWeight];
  const totalActive = items.length;

  const grouped = (() => {
    if (sort !== 'cat') {
      const arr = items.slice();
      if (sort === 'az') arr.sort((a, b) => a.name.localeCompare(b.name, 'de'));
      if (sort === 'date') arr.reverse();
      return [{ cat: null, items: arr }];
    }
    const map = {};
    items.forEach(it => { (map[it.cat] = map[it.cat] || []).push(it); });
    return Object.keys(map)
      .sort((a, b) => (CATEGORIES[a]?.order || 50) - (CATEGORIES[b]?.order || 50))
      .map(cat => ({ cat, items: map[cat] }));
  })();

  const renderItem = (it) => {
    if (view === 'tile') {
      return <ItemTile key={it.id} item={it} accent={t.accent} nameWeight={nameWeight}
        onToggle={() => onCheckOff(it.id)} onOpen={() => onOpenDetail(it)} onDelete={() => onRemove(it.id)} />;
    }
    const row = <ItemRow key={it.id} item={it} accent={t.accent} nameWeight={nameWeight}
      view={view} onToggle={() => onCheckOff(it.id)} onOpen={() => onOpenDetail(it)} />;
    if (view === 'row') return <SwipeRow key={it.id} enabled onDelete={() => onRemove(it.id)}>{row}</SwipeRow>;
    return row;
  };

  const headerBg = t.header === 'verlauf'
    ? 'linear-gradient(180deg, var(--accent-tint), var(--surface-base) 78%)'
    : 'var(--surface-base)';

  return (
    <React.Fragment>
      {/* header block */}
      <div style={{ flexShrink: 0, paddingTop: 56, background: headerBg, position: 'relative', zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 18px 14px' }}>
          <button onClick={onBack} aria-label="Zurück zu den Listen" style={{
            display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'transparent',
            cursor: 'pointer', padding: 0, color: 'var(--accent)', fontFamily: "'DM Sans', sans-serif",
            fontSize: 15.5, fontWeight: 600, marginLeft: -6 }}>
            <Icon name="chevron-right" size={20} strokeWidth={2.2} style={{ transform: 'rotate(180deg)' }} />Listen
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Presence />
            <button onClick={() => setTweak('dark', !t.dark)} aria-label="Theme"
              style={{ width: 34, height: 34, borderRadius: 11, cursor: 'pointer', display: 'grid',
                placeItems: 'center', border: '1px solid var(--border-subtle)',
                background: 'var(--surface-base)', color: 'var(--text-secondary)' }}>
              <Icon name={t.dark ? 'sun' : 'moon'} size={18} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '0 18px 14px' }}>
          <h1 className="ff-display" style={{ margin: 0, fontSize: 30, fontWeight: FR_WEIGHT[t.typeWeight],
            letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>{listName || 'Wocheneinkauf'}</h1>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-muted)' }}>{totalActive} Artikel</span>
        </div>
        <AddBar accent={t.accent} header={t.header} onAdd={onAdd} />
        <SortPills sort={sort} setSort={setSort} view={view} cycleView={cycleView} />
      </div>

      {/* scrollable list */}
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-base)' }}>
        {totalActive === 0 && <EmptyState />}

        {view === 'tile'
          ? grouped.map(g => (
            <div key={g.cat || 'all'}>
              {g.cat && <CategoryHeader cat={g.cat} count={g.items.length}
                collapsed={collapsed[g.cat]} onToggle={() => setCollapsed(c => ({ ...c, [g.cat]: !c[g.cat] }))} />}
              {!collapsed[g.cat] && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, padding: '4px 16px 10px' }}>
                  {g.items.map(renderItem)}
                </div>
              )}
            </div>
          ))
          : grouped.map(g => (
            <div key={g.cat || 'all'} style={view === 'card' ? { padding: '0 16px' } : null}>
              {g.cat && <CategoryHeader cat={g.cat} count={g.items.length}
                collapsed={collapsed[g.cat]} onToggle={() => setCollapsed(c => ({ ...c, [g.cat]: !c[g.cat] }))} />}
              {!collapsed[g.cat] && (
                view === 'card'
                  ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 8 }}>{g.items.map(renderItem)}</div>
                  : <div>{g.items.map(renderItem)}</div>
              )}
            </div>
          ))
        }

        <CheckedFooter items={checked} nameWeight={nameWeight} accent={t.accent}
          onToggle={onUncheck} onClear={onClearChecked} />
        <div style={{ height: 16 }} />
      </div>
    </React.Fragment>
  );
}

window.TE_screens = Object.assign(window.TE_screens || {}, { ListenScreen });
