// screen-einstellungen.jsx — Einstellungen (settings)
const { LargeTitleHeader } = window.TE_shell;

// iOS-style switch, accent-tinted
function Switch({ on, onToggle }) {
  return (
    <button onClick={onToggle} role="switch" aria-checked={on} style={{
      width: 50, height: 30, borderRadius: 20, border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0,
      background: on ? 'var(--accent)' : 'var(--border-default)', transition: 'background .2s',
      display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', alignItems: 'center',
    }}>
      <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'all .2s' }} />
    </button>
  );
}

function Group({ children }) {
  return <div style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)',
    borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>{children}</div>;
}

function Row({ icon, iconColor, label, right, onClick, last }) {
  return (
    <button onClick={onClick} style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', minHeight: 56,
      background: 'transparent', cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
      border: 'none', borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
    }}>
      {icon && (
        <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center',
          color: '#fff', background: iconColor }}><Icon name={icon} size={19} strokeWidth={2} /></div>
      )}
      <span style={{ flex: 1, fontSize: 15.5, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
      {right}
    </button>
  );
}

function EinstellungenScreen({ t, setTweak, onLogout }) {
  const [lang, setLang] = React.useState('Deutsch');
  const frWeight = FR_WEIGHT[t.typeWeight];
  const langs = ['Deutsch', 'English', 'Português'];
  const themeName = (THEME_BY_ACCENT[(t.accent || '').toLowerCase()] || {}).name || 'Eigene';
  return (
    <React.Fragment>
      <LargeTitleHeader title="Einstellungen" frWeight={frWeight} />

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-base)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 16px 8px' }}>

          {/* profile */}
          <Group>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px' }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', flexShrink: 0, display: 'grid',
                placeItems: 'center', color: '#fff', fontFamily: "'Fraunces', serif", fontSize: 24, fontWeight: 600,
                background: `linear-gradient(150deg, var(--accent), var(--accent-600))`,
                boxShadow: 'var(--shadow-pop)' }}>T</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="ff-display" style={{ fontSize: 19, fontWeight: 600, color: 'var(--text-primary)' }}>Timo</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                    color: 'var(--accent)', background: 'var(--accent-light)', borderRadius: 6, padding: '2px 7px' }}>Admin</span>
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>timo@uai.town</div>
              </div>
              <Icon name="chevron-right" size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
          </Group>

          {/* appearance */}
          <Group>
            <Row icon="moon" iconColor="#6366f1" label="Dunkles Design"
              right={<Switch on={t.dark} onToggle={() => setTweak('dark', !t.dark)} />} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'grid',
                  placeItems: 'center', color: '#fff', background: '#0ea5e9' }}>
                  <Icon name="globe" size={19} strokeWidth={2} /></div>
                <span style={{ flex: 1, fontSize: 15.5, fontWeight: 500, color: 'var(--text-primary)' }}>Sprache</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {langs.map(l => {
                  const on = lang === l;
                  return <button key={l} onClick={() => setLang(l)} style={{
                    flex: 1, fontSize: 13.5, fontWeight: 600, padding: '9px 4px', borderRadius: 11, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    border: `1px solid ${on ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    background: on ? 'var(--accent-light)' : 'var(--surface-raised)',
                    color: on ? 'var(--accent)' : 'var(--text-secondary)' }}>{l}</button>;
                })}
              </div>
            </div>
          </Group>

          {/* design / accent theme */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--text-muted)', padding: '0 6px 8px' }}>Design</div>
            <Group>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 500, color: 'var(--text-primary)' }}>Akzentfarbe</span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--accent)' }}>{themeName}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  {THEMES.map(th => {
                    const on = (t.accent || '').toLowerCase() === th.accent.toLowerCase();
                    return (
                      <button key={th.id} onClick={() => setTweak('accent', th.accent)} aria-label={th.name} style={{
                        width: 46, height: 46, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, padding: 3,
                        background: 'transparent', display: 'grid', placeItems: 'center',
                        border: `2.5px solid ${on ? th.accent : 'transparent'}`, transition: 'border-color .15s' }}>
                        <span style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'grid',
                          placeItems: 'center', color: '#fff',
                          background: `linear-gradient(150deg, ${th.accent}, ${th.accent600})`,
                          boxShadow: on ? `0 4px 12px color-mix(in oklab, ${th.accent} 45%, transparent)` : 'none' }}>
                          {on && <Icon name="check" size={19} strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Group>
          </div>

          {/* admin */}
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: 'var(--text-muted)', padding: '0 6px 8px' }}>Verwaltung</div>
            <Group>
              <Row icon="users" iconColor="#3b82f6" label="Benutzerverwaltung" onClick={() => {}}
                right={<Icon name="chevron-right" size={18} style={{ color: 'var(--text-muted)' }} />} />
              <Row icon="box" iconColor="#f59e0b" label="Produktverwaltung" onClick={() => {}} last
                right={<Icon name="chevron-right" size={18} style={{ color: 'var(--text-muted)' }} />} />
            </Group>
          </div>

          {/* logout */}
          <Group>
            <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 9, padding: '15px', minHeight: 54, cursor: 'pointer',
              background: 'transparent', border: 'none', color: '#ef4444', fontSize: 15.5, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif" }}>
              <Icon name="logout" size={19} strokeWidth={2} />Abmelden
            </button>
          </Group>

          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '4px 0 16px' }}>
            TanteEmma · Version 1.0
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}

window.TE_screens = Object.assign(window.TE_screens || {}, { EinstellungenScreen });
