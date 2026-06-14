// PresenceAvatars.tsx — overlapping avatar stack of users currently on the list.
// Ported from the Svelte component; uses avatar_url when present, else initials
// with a deterministic hue from the user id.
import { useTranslation } from 'react-i18next';

interface PresenceUser {
  id: string;
  name: string;
  avatar_url?: string;
}

function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function PresenceAvatars({ users }: { users: PresenceUser[] }) {
  const { t } = useTranslation();
  if (!users.length) return null;
  return (
    <div style={{ display: 'flex' }}>
      {users.slice(0, 4).map((u, idx) => (
        <div
          key={u.id}
          title={t('presence.active', { name: u.name })}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: u.avatar_url ? undefined : `hsl(${hueFor(u.id)} 60% 55%)`,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
            border: '2px solid var(--surface-base)',
            marginLeft: idx ? -9 : 0,
            overflow: 'hidden',
          }}
        >
          {u.avatar_url ? (
            <img
              src={u.avatar_url}
              alt={u.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            u.name.slice(0, 2).toUpperCase()
          )}
        </div>
      ))}
    </div>
  );
}
