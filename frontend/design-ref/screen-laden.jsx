// screen-laden.jsx — Läden (stores)
const { LargeTitleHeader, ThemeToggle } = window.TE_shell;

function ShelfDots({ shelf }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {shelf.map((cat, i) => {
        const m = CATEGORIES[cat] || CATEGORIES['Sonstiges'];
        return <span key={i} style={{ width: 7, height: 7, borderRadius: 2, background: m.color }} />;
      })}
    </div>
  );
}

function StoreCard({ store, count, frWeight }) {
  return (
    <button style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
      padding: '14px 14px', borderRadius: 20, cursor: 'pointer',
      background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)',
    }}>
      {/* brand tile */}
      <div style={{ width: 50, height: 50, borderRadius: 15, flexShrink: 0, display: 'grid', placeItems: 'center',
        color: '#fff', background: `linear-gradient(150deg, ${store.color}, color-mix(in oklab, ${store.color} 72%, black))`,
        boxShadow: `0 6px 14px color-mix(in oklab, ${store.color} 36%, transparent)` }}>
        <Icon name="store" size={26} strokeWidth={1.9} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ff-display" style={{ fontSize: 18, fontWeight: frWeight, color: 'var(--text-primary)',
            letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{store.name}</span>
          {store.isDefault && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10.5, fontWeight: 700,
              letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--accent)',
              background: 'var(--accent-light)', borderRadius: 6, padding: '2px 7px' }}>Standard</span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
          {store.type} · {store.city}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9 }}>
          <ShelfDots shelf={store.shelf} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Regal-Reihenfolge</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          color: count ? 'var(--accent)' : 'var(--text-muted)',
          background: count ? 'var(--accent-light)' : 'var(--surface-overlay)', borderRadius: 20,
          padding: '3px 10px' }}>{count}</span>
        <Icon name="chevron-right" size={17} style={{ color: 'var(--text-muted)' }} />
      </div>
    </button>
  );
}

function LadenScreen({ t, setTweak, items }) {
  const frWeight = FR_WEIGHT[t.typeWeight];
  const countFor = (name) => items.filter(i => i.store === name).length;

  return (
    <React.Fragment>
      <LargeTitleHeader
        title="Läden" subtitle={`${STORES.length} Läden · Regal-Reihenfolge spart Zeit`}
        frWeight={frWeight}
        trailing={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle dark={t.dark} onToggle={() => setTweak('dark', !t.dark)} />
            <button aria-label="Laden hinzufügen" style={{ width: 36, height: 36, borderRadius: 11, cursor: 'pointer',
              display: 'grid', placeItems: 'center', border: 'none', color: '#fff',
              background: `linear-gradient(145deg, var(--accent), var(--accent-600))`, boxShadow: 'var(--shadow-pop)' }}>
              <Icon name="plus" size={20} strokeWidth={2.4} />
            </button>
          </div>
        } />

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-base)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, padding: '4px 16px 8px' }}>
          {STORES.map(s => <StoreCard key={s.id} store={s} count={countFor(s.name)} frWeight={frWeight} />)}

          {/* add store */}
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%',
            padding: '16px', borderRadius: 20, cursor: 'pointer', color: 'var(--text-secondary)',
            background: 'transparent', border: '1.5px dashed var(--border-default)',
            fontFamily: "'DM Sans', sans-serif", fontSize: 14.5, fontWeight: 600 }}>
            <Icon name="plus" size={18} strokeWidth={2.2} />Laden hinzufügen
          </button>
        </div>

        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--text-muted)', textAlign: 'center',
          margin: '14px 36px 8px' }}>
          Tippe einen Laden an, um seine Regal-Reihenfolge zu sortieren — deine Liste folgt
          dann automatisch dem Weg durch den Markt.</p>
        <div style={{ height: 16 }} />
      </div>
    </React.Fragment>
  );
}

window.TE_screens = Object.assign(window.TE_screens || {}, { LadenScreen });
