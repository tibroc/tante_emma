// Layout.tsx — authenticated shell: auth gate (GET /api/auth/me → userStore +
// start WS, redirect to /login on 401), fixed header shell + fixed bottom nav,
// offline banner, and the PWA install prompt.
//
// Shell dimensions (constants used everywhere):
//   HEADER_H = 52px + env(safe-area-inset-top)
//   NAV_H    = 64px + env(safe-area-inset-bottom)
//
// Pages slot into the header via useSetHeader (left / title / right slots).
// Scrollable content sits between the two fixed bars.
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../lib/api';
import { startWs } from '../lib/ws';
import { Icon, type IconName } from './Icon';
import { useUserStore } from '../stores/userStore';
import { useSyncStore } from '../stores/syncStore';
import { useHeaderStore } from '../stores/headerStore';
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

// These CSS-variable-based values are the single source of truth for shell height.
// Any component that needs to know header/nav height should reference these.
export const HEADER_H = 'calc(52px + env(safe-area-inset-top))';
export const NAV_H = 'calc(64px + env(safe-area-inset-bottom))';

export default function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useUserStore((s) => s.setUser);
  const syncStatus = useSyncStore((s) => s.status);
  const headerLeft = useHeaderStore((s) => s.left);
  const headerTitle = useHeaderStore((s) => s.title);
  const headerRight = useHeaderStore((s) => s.right);
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

  // The shell uses two position:fixed bars (header + nav) and a content region
  // that fills the space between them. This is the most reliable approach on
  // mobile: fixed bars never participate in the scroll layout, so no amount of
  // body/rubber-band scroll can push them off screen.
  return (
    <>
      {/* ── Fixed top header shell ──────────────────────────────────────────── */}
      {/* Two-level structure: outer div reserves the safe-area-inset-top height
          so the status bar area stays clear; inner 52px row holds the actual
          header content. This ensures header slots never overlap the notch/island
          on iPhones, and alignItems:center applies only to the 52px visible row. */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: HEADER_H,
          background: 'var(--surface-base)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <div
          style={{
            height: 52,
            display: 'flex',
            alignItems: 'center',
            padding: '0 6px',
            gap: 4,
          }}
        >
          {/* left slot — back button or empty; min-width so title stays centred */}
          <div style={{ flexShrink: 0, minWidth: 60, display: 'flex', alignItems: 'center' }}>
            {headerLeft}
          </div>

          {/* title slot — centred, clips if too long */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {headerTitle}
          </div>

          {/* right slot — action buttons */}
          <div
            style={{
              flexShrink: 0,
              minWidth: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 4,
            }}
          >
            {headerRight}
          </div>
        </div>
        {/* end inner 52px row */}
      </div>

      {/* ── Offline banner (fixed, stacks immediately below the header) ─────── */}
      {syncStatus === 'offline' && (
        <div
          style={{
            position: 'fixed',
            top: HEADER_H,
            left: 0,
            right: 0,
            zIndex: 99,
            background: '#f59e0b',
            color: '#1a141c',
            textAlign: 'center',
            fontSize: 12,
            fontWeight: 600,
            padding: '5px 12px',
          }}
        >
          {t('status.offline')}
        </div>
      )}

      {/* ── Scrollable content area ──────────────────────────────────────────── */}
      {/* Use padding-top/bottom (not margin) so that position:sticky children  */}
      {/* inside pages work relative to this element's scroll viewport.          */}
      <main
        style={{
          position: 'fixed',
          top: HEADER_H,
          bottom: NAV_H,
          left: 0,
          right: 0,
          overflow: 'hidden',
          // Offline banner pushes page content down; the banner is 28px tall.
          // We compensate with a CSS var so pages themselves don't need to know.
        }}
      >
        <Outlet />
      </main>

      {/* ── PWA install prompt (above the nav bar) ───────────────────────────── */}
      {installEvent && (
        <div
          style={{
            position: 'fixed',
            bottom: NAV_H,
            left: 0,
            right: 0,
            zIndex: 99,
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

      {/* ── Fixed bottom navigation bar ─────────────────────────────────────── */}
      <nav
        aria-label={t('nav.aria_label')}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: NAV_H,
          display: 'flex',
          alignItems: 'flex-start',
          padding: '8px 10px env(safe-area-inset-bottom)',
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
    </>
  );
}
