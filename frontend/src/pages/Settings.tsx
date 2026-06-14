// Settings.tsx — route /settings. Design-ref grouped-card layout: profile,
// appearance (dark switch + language), Design (accent picker), Verwaltung
// (admin), logout, version.
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Icon, type IconName } from '../components/Icon';
import { LargeTitleHeader } from '../components/Header';
import { useTheme } from '../hooks/useTheme';
import { useUserStore } from '../stores/userStore';
import { LOCALES, setLocale } from '../lib/i18n';
import { THEMES, THEME_BY_ACCENT } from '../lib/themes';

function Group({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface-base)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {children}
    </div>
  );
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      style={{
        width: 50,
        height: 30,
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        padding: 2,
        flexShrink: 0,
        background: on ? 'var(--accent)' : 'var(--border-default)',
        transition: 'background .2s',
        display: 'flex',
        justifyContent: on ? 'flex-end' : 'flex-start',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  );
}

function Row({
  icon,
  iconColor,
  label,
  right,
  onClick,
  last,
}: {
  icon?: IconName;
  iconColor?: string;
  label: string;
  right?: ReactNode;
  onClick?: () => void;
  last?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '14px 16px',
        minHeight: 56,
        background: 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        border: 'none',
        borderBottom: last ? 'none' : '1px solid var(--border-subtle)',
      }}
    >
      {icon && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: iconColor,
          }}
        >
          <Icon name={icon} size={19} strokeWidth={2} />
        </div>
      )}
      <span style={{ flex: 1, fontSize: 15.5, fontWeight: 500, color: 'var(--text-primary)' }}>
        {label}
      </span>
      {right}
    </button>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        padding: '0 6px 8px',
      }}
    >
      {children}
    </div>
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { accent, setAccent, dark, toggleDark } = useTheme();
  const user = useUserStore((s) => s.user);
  const themeName = THEME_BY_ACCENT[accent.toLowerCase()]?.name ?? 'Custom';

  const logout = async () => {
    await api.post('/auth/logout', {}).catch(() => {});
    navigate('/login', { replace: true });
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
      }}
    >
      <LargeTitleHeader title={t('settings.title')} />
      <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 16px 24px' }}
        >
          {/* profile */}
          {user && (
            <Group>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontFamily: "'Fraunces', serif",
                    fontSize: 24,
                    fontWeight: 600,
                    background: 'linear-gradient(150deg, var(--accent), var(--accent-600))',
                    boxShadow: 'var(--shadow-pop)',
                  }}
                >
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      className="ff-display"
                      style={{ fontSize: 19, fontWeight: 600, color: 'var(--text-primary)' }}
                    >
                      {user.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'var(--accent)',
                        background: 'var(--accent-light)',
                        borderRadius: 6,
                        padding: '2px 7px',
                      }}
                    >
                      {t(`admin.role_${user.role}`)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 2 }}>
                    {user.email}
                  </div>
                </div>
                <Icon name="chevron-right" size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
            </Group>
          )}

          {/* appearance */}
          <Group>
            <Row
              icon="moon"
              iconColor="#6366f1"
              label={t('settings.dark_mode')}
              right={<Switch on={dark} onToggle={toggleDark} />}
            />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    background: '#0ea5e9',
                  }}
                >
                  <Icon name="globe" size={19} strokeWidth={2} />
                </div>
                <span
                  style={{ flex: 1, fontSize: 15.5, fontWeight: 500, color: 'var(--text-primary)' }}
                >
                  {t('settings.language')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LOCALES.map((l) => {
                  const on = i18n.language === l.code;
                  return (
                    <button
                      key={l.code}
                      onClick={() => setLocale(l.code)}
                      style={{
                        flex: 1,
                        fontSize: 13.5,
                        fontWeight: 600,
                        padding: '9px 4px',
                        borderRadius: 11,
                        cursor: 'pointer',
                        border: `1px solid ${on ? 'var(--accent)' : 'var(--border-subtle)'}`,
                        background: on ? 'var(--accent-light)' : 'var(--surface-raised)',
                        color: on ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Group>

          {/* design / accent */}
          <div>
            <SectionLabel>{t('settings.design')}</SectionLabel>
            <Group>
              <div style={{ padding: 16 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 15,
                  }}
                >
                  <span style={{ fontSize: 15.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {t('settings.accent')}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--accent)' }}>
                    {themeName}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  {THEMES.map((th) => {
                    const on = accent.toLowerCase() === th.accent.toLowerCase();
                    return (
                      <button
                        key={th.id}
                        onClick={() => setAccent(th.accent)}
                        aria-label={th.name}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: '50%',
                          cursor: 'pointer',
                          flexShrink: 0,
                          padding: 3,
                          background: 'transparent',
                          display: 'grid',
                          placeItems: 'center',
                          border: `2.5px solid ${on ? th.accent : 'transparent'}`,
                        }}
                      >
                        <span
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            color: '#fff',
                            background: `linear-gradient(150deg, ${th.accent}, ${th.accent600})`,
                            boxShadow: on
                              ? `0 4px 12px color-mix(in oklab, ${th.accent} 45%, transparent)`
                              : 'none',
                          }}
                        >
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
          {user?.role === 'admin' && (
            <div>
              <SectionLabel>{t('settings.management')}</SectionLabel>
              <Group>
                <Row
                  icon="users"
                  iconColor="#3b82f6"
                  label={t('admin.users_title')}
                  onClick={() => navigate('/admin/users')}
                  right={
                    <Icon name="chevron-right" size={18} style={{ color: 'var(--text-muted)' }} />
                  }
                />
                <Row
                  icon="box"
                  iconColor="#f59e0b"
                  label={t('admin.products_title')}
                  onClick={() => navigate('/admin/products')}
                  last
                  right={
                    <Icon name="chevron-right" size={18} style={{ color: 'var(--text-muted)' }} />
                  }
                />
              </Group>
            </div>
          )}

          {/* logout */}
          <Group>
            <button
              onClick={logout}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                padding: 15,
                minHeight: 54,
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: 15.5,
                fontWeight: 600,
              }}
            >
              <Icon name="logout" size={19} strokeWidth={2} />
              {t('settings.logout')}
            </button>
          </Group>

          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
              padding: '4px 0',
            }}
          >
            TanteEmma · {t('settings.version')} 1.0
          </div>
        </div>
      </div>
    </div>
  );
}
