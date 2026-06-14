// Login.tsx — branded screen that kicks off the OIDC flow via a full-page
// navigation to /auth/login (same-origin; proxied to the backend in dev).
import { useTranslation } from 'react-i18next';
import { Wordmark } from '../components/chrome';

export default function Login() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: 32,
        textAlign: 'center',
        background: 'linear-gradient(160deg, var(--accent-tint), var(--surface-base) 60%)',
      }}
    >
      <Wordmark />
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0, maxWidth: 280 }}>
        {t('login.tagline')}
      </p>
      <a
        href="/auth/login"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 200,
          height: 52,
          borderRadius: 16,
          background: 'linear-gradient(145deg, var(--accent), var(--accent-600))',
          color: '#fff',
          fontSize: 16,
          fontWeight: 600,
          textDecoration: 'none',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        {t('login.sign_in')}
      </a>
    </div>
  );
}
