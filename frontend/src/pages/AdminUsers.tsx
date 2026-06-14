// AdminUsers.tsx — admin-only user management: list users, change roles.
// Mirrors the Phase 3 "Admin: user management UI" task. Admin-gated on mount.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useUserStore } from '../stores/userStore';
import { BackHeader } from '../components/Header';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'member' | 'child';
  last_seen?: number; // omitted by the backend when the user was never seen
}

function formatLastSeen(ts: number | undefined, locale: string): string {
  if (!ts) return '–'; // undefined or 0
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(new Date(ts));
}

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/lists', { replace: true });
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<AdminUser[]>('/api/users')
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  async function changeRole(u: AdminUser, newRole: AdminUser['role']) {
    const previousRole = u.role;
    setSaving(u.id);
    // Optimistic patch.
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    try {
      await api.put(`/api/users/${u.id}/role`, { role: newRole });
    } catch {
      // Revert on failure.
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: previousRole } : x)));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface-base)',
        color: 'var(--text-primary)',
      }}
    >
      <BackHeader
        title={t('admin.users_title')}
        backLabel={t('settings.title')}
        onBack={() => navigate('/settings')}
      />

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '24px 4px' }}>{t('list.loading')}</p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {users.map((u) => {
              const initial = (u.name.charAt(0) || '?').toUpperCase();
              const disabled = saving === u.id || u.id === user?.id;
              return (
                <li
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 20,
                    padding: '14px 16px',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: '0 0 auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: 'linear-gradient(150deg, var(--accent), var(--accent-600))',
                      color: '#fff',
                      fontSize: 20,
                      fontWeight: 600,
                      overflow: 'hidden',
                    }}
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      initial
                    )}
                  </span>

                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 16,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.name}
                    </div>
                    <div
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.email}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                      {t('admin.last_seen', { date: formatLastSeen(u.last_seen, i18n.language) })}
                    </div>
                  </div>

                  <select
                    aria-label={t('admin.role_for', { name: u.name })}
                    value={u.role}
                    disabled={disabled}
                    onChange={(e) => changeRole(u, e.target.value as AdminUser['role'])}
                    style={{
                      flex: '0 0 auto',
                      appearance: 'none',
                      background: 'var(--surface-overlay)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 12,
                      padding: '8px 12px',
                      fontSize: 14,
                      fontFamily: 'inherit',
                      cursor: disabled ? 'default' : 'pointer',
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    <option value="admin">{t('admin.role_admin')}</option>
                    <option value="member">{t('admin.role_member')}</option>
                    <option value="child">{t('admin.role_child')}</option>
                  </select>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
