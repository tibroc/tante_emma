// screen-login.jsx — Anmelden (login / splash)
const { Icon } = window;

function LoginField({ icon, type, placeholder, value, onChange, trailing }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11, height: 52, padding: '0 14px',
      borderRadius: 14, background: 'rgba(255,255,255,0.16)',
      border: `1.5px solid ${focus ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)'}`,
      transition: 'border-color .15s, background .15s',
    }}>
      <Icon name={icon} size={19} style={{ color: 'rgba(255,255,255,0.85)', flexShrink: 0 }} />
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          fontFamily: "'DM Sans', sans-serif", fontSize: 15.5, fontWeight: 500, color: '#fff',
        }} />
      {trailing}
    </div>
  );
}

function LoginScreen({ t, onAuth }) {
  const frWeight = FR_WEIGHT[t.typeWeight];

  return (
    <div style={{
      position: 'relative', height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: `linear-gradient(160deg, var(--accent) 0%, var(--accent-600) 100%)`,
    }}>
      {/* soft light blooms */}
      <div style={{ position: 'absolute', top: '-18%', left: '-25%', width: '90%', height: '45%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.32), transparent 70%)', filter: 'blur(12px)' }} />
      <div style={{ position: 'absolute', bottom: '-10%', right: '-30%', width: '95%', height: '42%',
        background: 'radial-gradient(circle, rgba(0,0,0,0.18), transparent 70%)', filter: 'blur(12px)' }} />

      {/* hero / wordmark */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 84, height: 84, borderRadius: 26, display: 'grid', placeItems: 'center', marginBottom: 24,
          background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.35)',
          backdropFilter: 'blur(6px)', boxShadow: '0 14px 40px rgba(0,0,0,0.18)',
        }}>
          <Icon name="cart" size={44} strokeWidth={1.8} style={{ color: '#fff' }} />
        </div>
        <div className="ff-display" style={{ fontSize: 40, lineHeight: 1, letterSpacing: '-0.02em' }}>
          <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'rgba(255,255,255,0.92)' }}>Tante</span>
          <span style={{ fontWeight: 700, color: '#fff' }}>Emma</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.82)', marginTop: 11,
          letterSpacing: '0.01em' }}>Einkaufen. Gemeinsam. Einfach.</div>
      </div>

      {/* sign-in (single sign-on) */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 22px calc(40px + env(safe-area-inset-bottom))' }}>
        <button onClick={onAuth} style={{
          width: '100%', height: 56, borderRadius: 18, border: 'none', cursor: 'pointer',
          background: '#fff', color: 'var(--accent-600)', fontFamily: "'DM Sans', sans-serif",
          fontSize: 17, fontWeight: 700, letterSpacing: '0.01em', boxShadow: '0 12px 30px rgba(0,0,0,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, transition: 'transform .08s',
        }}
          onPointerDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
          onPointerUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onPointerLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
          Anmelden<Icon name="chevron-right" size={20} strokeWidth={2.4} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 }}>
          <Icon name="lock" size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)' }}>Sicher per Single Sign-On</span>
        </div>
      </div>
    </div>
  );
}

window.TE_screens = Object.assign(window.TE_screens || {}, { LoginScreen });
