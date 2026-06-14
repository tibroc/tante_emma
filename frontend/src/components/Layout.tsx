// Layout.tsx — authenticated shell: auth gate (GET /api/auth/me → userStore +
// start WS, redirect to /login on 401), bottom navigation, offline banner, and
// the PWA install prompt. Mirrors the Svelte +layout.svelte.
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../lib/api';
import { startWs } from '../lib/ws';
import { Icon, type IconName } from './Icon';
import { useUserStore } from '../stores/userStore';
import { useSyncStore } from '../stores/syncStore';
import type { User } from '../lib/types';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const TABS: { to: string; icon: IconName; key: string }[] = [
  { to: '/lists', icon: 'cart', key: 'nav.lists' },
  { to: '/stores', icon: 'store', key: 'nav.stores' },
  { to: '/history', icon: 'clock', key: 'nav.history' },
  { to: '/settings', icon: 'gear', key: 'nav.settings' },
];

export default function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useUserStore((s) => s.setUser);
  const syncStatus = useSyncStore((s) => s.status);
  const [authState, setAuthState] = useState<'checking' | 'ok' | 'fail'>('checking');
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<User>('/api/auth/me')
      .then((user) => {
        if (cancelled) return;
        setUser(user);
        startWs();
        setAuthState('ok');
        if (location.pathname === '/') navigate('/lists', { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate('/login', { replace: true });
        }
        setAuthState('fail');
      });
    return () => {
      cancelled = true;
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setInstallEvent(null);
  };

  if (authState === 'checking') {
    return (
      <div
        style={{
          height: '100%',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--text-muted)',
        }}
      >
        {t('list.loading')}
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
      }}
    >
      {syncStatus === 'offline' && (
        <div
          style={{
            flexShrink: 0,
            background: '#f59e0b',
            color: '#1a141c',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            padding: '6px 12px',
          }}
        >
          {t('status.offline')}
        </div>
      )}

      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Outlet />
      </main>

      {installEvent && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            background: 'var(--surface-raised)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-primary)' }}>
            {t('pwa.install_prompt')}
          </span>
          <button
            onClick={install}
            style={{
              border: 'none',
              background: 'var(--accent)',
              color: '#fff',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('pwa.install')}
          </button>
          <button
            onClick={() => setInstallEvent(null)}
            aria-label={t('pwa.dismiss')}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      )}

      <nav
        aria-label={t('nav.aria_label')}
        style={{
          flexShrink: 0,
          display: 'flex',
          padding: '8px 10px calc(8px + env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border-subtle)',
          background: 'var(--surface-base)',
        }}
      >
        {TABS.map((tab) => {
          const active = location.pathname.startsWith(tab.to);
          const label = tab.key === 'nav.settings' ? t(tab.key).slice(0, 5) : t(tab.key);
          return (
            <button
              key={tab.to}
              onClick={() => navigate(tab.to)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '4px 0',
                color: active ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 52,
                  height: 30,
                  borderRadius: 16,
                  background: active ? 'var(--accent-light)' : 'transparent',
                  transition: 'background .18s',
                }}
              >
                <Icon name={tab.icon} size={22} strokeWidth={active ? 2.1 : 1.8} />
              </div>
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
