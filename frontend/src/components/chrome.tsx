// chrome.tsx — brand wordmark. (Presence/SortPills/CheckedFooter from the PoC
// were superseded by PresenceAvatars and the inline sort/footer in ListDetail.)
import { Icon } from './Icon';

export function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          flexShrink: 0,
          background: 'linear-gradient(150deg, var(--accent), var(--accent-600))',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        <Icon name="cart" size={19} strokeWidth={2} />
      </div>
      <div className="ff-display" style={{ fontSize: 22, lineHeight: 1, letterSpacing: '-0.01em' }}>
        <span style={{ fontStyle: 'italic', fontWeight: 500, color: 'var(--accent)' }}>Tante</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Emma</span>
      </div>
    </div>
  );
}
