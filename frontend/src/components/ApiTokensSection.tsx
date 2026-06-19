// ApiTokensSection.tsx — the "API Access" section of the Settings screen.
// Self-contained: lists the current user's Personal Access Tokens, creates new
// ones (revealing the raw token exactly once), and revokes them. Follows the
// direct-fetch pattern used by the admin pages (AdminUsers) since token state is
// only ever shown here.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Icon } from './Icon';
import type { AccessToken, CreatedToken, TokenScope } from '../lib/types';

const DAY_MS = 86_400_000;

// Expiry presets offered in the create sheet. null = never expires.
const EXPIRY_OPTIONS: { key: string; days: number | null }[] = [
  { key: 'never', days: null },
  { key: 'd30', days: 30 },
  { key: 'd90', days: 90 },
  { key: 'y1', days: 365 },
];

function relativeTime(ms: number, lang: string): string {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const min = 60_000,
    hr = 3_600_000,
    day = DAY_MS,
    week = 604_800_000;
  if (abs < hr) return rtf.format(Math.round(diff / min), 'minute');
  if (abs < day) return rtf.format(Math.round(diff / hr), 'hour');
  if (abs < week) return rtf.format(Math.round(diff / day), 'day');
  return rtf.format(Math.round(diff / week), 'week');
}

function SectionLabel({ children }: { children: React.ReactNode }) {
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

function ScopeBadge({ scopes }: { scopes: TokenScope[] }) {
  const { t } = useTranslation();
  const write = scopes.includes('write');
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: write ? 'var(--accent)' : 'var(--text-secondary)',
        background: write ? 'var(--accent-light)' : 'var(--surface-overlay)',
        borderRadius: 6,
        padding: '2px 7px',
        whiteSpace: 'nowrap',
      }}
    >
      {write ? t('tokens.scope_write') : t('tokens.scope_read')}
    </span>
  );
}

export function ApiTokensSection() {
  const { t, i18n } = useTranslation();
  const [list, setList] = useState<AccessToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false); // create sheet open
  const [created, setCreated] = useState<CreatedToken | null>(null); // reveal sheet
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<AccessToken[]>('/api/tokens')
      .then((d) => {
        if (!cancelled) setList(d);
      })
      .catch(() => {
        if (!cancelled) setList([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreated = (tok: CreatedToken) => {
    // Strip raw_token from the persisted list entry; keep it only in the reveal sheet.
    const { raw_token: _raw, ...meta } = tok;
    void _raw;
    setList((prev) => [meta, ...prev]);
    setCreating(false);
    setCreated(tok);
  };

  const revoke = async (id: string) => {
    setBusyId(id);
    const prev = list;
    setList((l) => l.filter((x) => x.id !== id)); // optimistic
    try {
      await api.delete(`/api/tokens/${id}`);
    } catch {
      setList(prev); // revert
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <SectionLabel>{t('tokens.section')}</SectionLabel>
      <div
        style={{
          background: 'var(--surface-base)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 18,
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {loading ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 14 }}>
            {t('list.loading')}
          </div>
        ) : list.length === 0 ? (
          <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: 14 }}>
            {t('tokens.empty')}
          </div>
        ) : (
          list.map((tok, i) => (
            <div
              key={tok.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: i === list.length - 1 ? 'none' : '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tok.name}
                  </span>
                  <ScopeBadge scopes={tok.scopes} />
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--text-muted)',
                    marginTop: 2,
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  }}
                >
                  {tok.token_prefix}…
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {tok.last_used_at
                    ? t('tokens.last_used', { time: relativeTime(tok.last_used_at, i18n.language) })
                    : t('tokens.never_used')}
                  {tok.expires_at && (
                    <>
                      {' · '}
                      {t('tokens.expires', { time: relativeTime(tok.expires_at, i18n.language) })}
                    </>
                  )}
                </div>
              </div>
              <button
                aria-label={t('tokens.revoke')}
                onClick={() => revoke(tok.id)}
                disabled={busyId === tok.id}
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#ef4444',
                  cursor: busyId === tok.id ? 'default' : 'pointer',
                  opacity: busyId === tok.id ? 0.5 : 1,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => setCreating(true)}
        style={{
          marginTop: 10,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '13px',
          borderRadius: 14,
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-base)',
          color: 'var(--accent)',
          fontSize: 14.5,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Icon name="plus" size={18} strokeWidth={2.4} />
        {t('tokens.create')}
      </button>

      {creating && <CreateSheet onCreated={handleCreated} onClose={() => setCreating(false)} />}
      {created && <RevealSheet token={created} onClose={() => setCreated(null)} />}
    </div>
  );
}

// ── shared sheet chrome ──────────────────────────────────────────────────────
const sheetOverlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 300,
  display: 'flex',
  alignItems: 'flex-end',
  background: 'rgba(20,10,24,0.42)',
  backdropFilter: 'blur(2px)',
  animation: 'fadeIn .2s ease',
};
const sheetPanel: CSSProperties = {
  width: '100%',
  background: 'var(--surface-base)',
  borderRadius: '26px 26px 0 0',
  padding: '12px 20px calc(22px + env(safe-area-inset-bottom))',
  boxShadow: 'var(--shadow-lg)',
  animation: 'sheetUp .3s cubic-bezier(.2,.9,.3,1)',
  maxHeight: '88%',
  overflowY: 'auto',
};
const grabHandle: CSSProperties = {
  width: 38,
  height: 4,
  borderRadius: 4,
  background: 'var(--border-default)',
  margin: '0 auto 18px',
};
const fieldLabel: CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 8,
};

// ── create sheet ─────────────────────────────────────────────────────────────
function CreateSheet({
  onCreated,
  onClose,
}: {
  onCreated: (tok: CreatedToken) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [scope, setScope] = useState<'read' | 'write'>('read');
  const [expiryKey, setExpiryKey] = useState<string>('never');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(false);
    const opt = EXPIRY_OPTIONS.find((o) => o.key === expiryKey);
    const expires_at = opt?.days != null ? Date.now() + opt.days * DAY_MS : null;
    const scopes: TokenScope[] = scope === 'write' ? ['read', 'write'] : ['read'];
    try {
      const tok = await api.post<CreatedToken>('/api/tokens', {
        name: trimmed,
        scopes,
        expires_at,
      });
      onCreated(tok);
    } catch {
      setError(true);
      setSaving(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: '100%',
    height: 48,
    padding: '0 14px',
    borderRadius: 12,
    boxSizing: 'border-box',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-raised)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 16,
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const radioRow = (value: 'read' | 'write', label: string, desc: string) => {
    const on = scope === value;
    return (
      <button
        onClick={() => setScope(value)}
        style={{
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          borderRadius: 12,
          cursor: 'pointer',
          border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border-subtle)'}`,
          background: on ? 'var(--accent-light)' : 'var(--surface-raised)',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            flexShrink: 0,
            border: `2px solid ${on ? 'var(--accent)' : 'var(--border-default)'}`,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {on && (
            <span
              style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }}
            />
          )}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {label}
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)' }}>
            {desc}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div onClick={onClose} style={sheetOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={sheetPanel}>
        <div style={grabHandle} />
        <div
          className="ff-display"
          style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18 }}
        >
          {t('tokens.create_title')}
        </div>

        <div style={fieldLabel}>{t('tokens.name_label')}</div>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('tokens.name_ph')}
          maxLength={100}
          style={{ ...inputStyle, marginBottom: 18 }}
        />

        <div style={fieldLabel}>{t('tokens.scope_label')}</div>
        {radioRow('read', t('tokens.scope_read'), t('tokens.scope_read_desc'))}
        {radioRow('write', t('tokens.scope_write'), t('tokens.scope_write_desc'))}

        <div style={{ ...fieldLabel, marginTop: 10 }}>{t('tokens.expiry_label')}</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {EXPIRY_OPTIONS.map((o) => {
            const on = expiryKey === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setExpiryKey(o.key)}
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
                {t(`tokens.expiry_${o.key}`)}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: 13.5, marginBottom: 12 }}>
            {t('tokens.create_error')}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!name.trim() || saving}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 14,
            border: 'none',
            cursor: !name.trim() || saving ? 'default' : 'pointer',
            background: 'var(--accent)',
            color: '#fff',
            fontSize: 15.5,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            opacity: !name.trim() || saving ? 0.5 : 1,
            boxShadow: !name.trim() || saving ? 'none' : 'var(--shadow-pop)',
          }}
        >
          {saving ? t('tokens.creating') : t('tokens.create')}
        </button>
      </div>
    </div>
  );
}

// ── reveal sheet ─────────────────────────────────────────────────────────────
function RevealSheet({ token, onClose }: { token: CreatedToken; onClose: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token.raw_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can still select manually */
    }
  };

  return (
    <div onClick={onClose} style={sheetOverlay}>
      <div onClick={(e) => e.stopPropagation()} style={sheetPanel}>
        <div style={grabHandle} />
        <div
          className="ff-display"
          style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}
        >
          {t('tokens.created_title')}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '11px 13px',
            borderRadius: 12,
            background: 'color-mix(in oklab, #f59e0b 14%, var(--surface-base))',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 16,
            lineHeight: 1.45,
          }}
        >
          <span style={{ flexShrink: 0, color: '#f59e0b', marginTop: 1 }}>
            <Icon name="sparkle" size={16} />
          </span>
          {t('tokens.warning')}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-overlay)',
            marginBottom: 16,
          }}
        >
          <code
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 13,
              color: 'var(--text-primary)',
              wordBreak: 'break-all',
            }}
          >
            {token.raw_token}
          </code>
          <button
            onClick={copy}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: copied ? 'var(--emerald-500, #10b981)' : 'var(--accent)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Icon name="check" size={15} strokeWidth={3} />
            {copied ? t('tokens.copied') : t('tokens.copy')}
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            height: 50,
            borderRadius: 14,
            border: '1px solid var(--border-subtle)',
            cursor: 'pointer',
            background: 'var(--surface-base)',
            color: 'var(--text-primary)',
            fontSize: 15.5,
            fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {t('tokens.done')}
        </button>
      </div>
    </div>
  );
}
