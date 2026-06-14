// Login.tsx — full-accent gradient splash that kicks off the OIDC flow via a
// full-page navigation to /auth/login (same-origin; proxied to the backend in
// dev). Matches design-ref/screenshots-ref/login.png: white branding on the
// accent gradient, white pill sign-in button pinned near the bottom.
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';

export default function Login() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding:
          'calc(24px + env(safe-area-inset-top)) 28px calc(28px + env(safe-area-inset-bottom))',
        textAlign: 'center',
        color: '#fff',
        background:
          'radial-gradient(120% 70% at 28% 0%, rgba(255,255,255,0.28), transparent 55%), linear-gradient(165deg, var(--accent), var(--accent-600))',
      }}
    >
      {/* centered brand */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 22,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(255,255,255,0.18)',
            border: '1.5px solid rgba(255,255,255,0.32)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Icon name="cart" size={36} strokeWidth={1.9} />
        </div>
        <div
          className="ff-display"
          style={{ fontSize: 36, lineHeight: 1, letterSpacing: '-0.01em' }}
        >
          <span style={{ fontStyle: 'italic', fontWeight: 500 }}>Tante</span>
          <span style={{ fontWeight: 700 }}>Emma</span>
        </div>
        <p
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.85)',
            margin: 0,
            maxWidth: 280,
          }}
        >
          {t('login.tagline')}
        </p>
      </div>

      {/* sign-in */}
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <a
          href="/auth/login"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            height: 54,
            borderRadius: 16,
            background: 'var(--surface-base)',
            color: 'var(--accent)',
            fontSize: 16,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
          }}
        >
          {t('login.sign_in')}
          <Icon name="chevron-right" size={18} strokeWidth={2.4} />
        </a>
        <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.8)' }}>
          {t('login.sso_hint')}
        </span>
      </div>
    </div>
  );
}
