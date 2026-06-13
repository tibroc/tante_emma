// screen-shell.jsx — shared chrome for non-Listen screens
const { Icon } = window;

// Compact theme toggle (used in every header)
function ThemeToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} aria-label="Theme" style={{
      width: 36, height: 36, borderRadius: 11, cursor: 'pointer', display: 'grid', placeItems: 'center',
      border: '1px solid var(--border-subtle)', background: 'var(--surface-base)', color: 'var(--text-secondary)',
    }}><Icon name={dark ? 'sun' : 'moon'} size={18} /></button>
  );
}

// Large-title header — Fraunces title, optional subtitle + trailing action
function LargeTitleHeader({ title, subtitle, frWeight = 600, trailing, headerBg }) {
  return (
    <div style={{ flexShrink: 0, paddingTop: 56, background: headerBg || 'var(--surface-base)',
      position: 'relative', zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '6px 18px 14px', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="ff-display" style={{ margin: 0, fontSize: 30, fontWeight: frWeight,
            letterSpacing: '-0.02em', color: 'var(--text-primary)', lineHeight: 1.05 }}>{title}</h1>
          {subtitle && <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-muted)',
            marginTop: 4 }}>{subtitle}</div>}
        </div>
        {trailing}
      </div>
    </div>
  );
}

// Inline search field (Verlauf)
function SearchField({ value, onChange, placeholder }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 46, margin: '0 16px 12px',
      background: 'var(--surface-overlay)', borderRadius: 14, padding: '0 14px',
      outline: focus ? '2px solid var(--accent)' : '2px solid transparent', transition: 'outline-color .15s' }}>
      <Icon name="search" size={18} style={{ color: focus ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
      <input value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          fontFamily: "'DM Sans', sans-serif", fontSize: 15.5, fontWeight: 500, color: 'var(--text-primary)' }} />
      {value && <button onClick={() => onChange('')} aria-label="Leeren" style={{ border: 'none',
        background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'grid',
        placeItems: 'center' }}><Icon name="x" size={17} /></button>}
    </div>
  );
}

window.TE_shell = { ThemeToggle, LargeTitleHeader, SearchField };
