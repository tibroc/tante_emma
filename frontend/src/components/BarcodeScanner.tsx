// BarcodeScanner.tsx — full-screen camera overlay, ported from the Svelte
// component. Dynamically imports @zxing/browser (kept out of the main bundle),
// prefers the rear camera, and reports decoded text via onScan.
//
// TODO: The scanner redesign (result/edit/unknown sheets, reticle animation,
// torch toggle) was reverted because it drifted from the design-ref. When
// re-implementing, use createPortal(…, document.body) so the overlay escapes
// the AddBar's positioned/overflow ancestors and renders truly full-screen.
// Refer to design-ref/ and the revert commit for what the previous attempt did.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export function BarcodeScanner({
  onScan,
  onClose,
}: {
  onScan: (code: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let controls: { stop: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !videoRef.current) return;
        controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
          if (result) onScan(result.getText());
        });
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [onScan]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 300,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      role="dialog"
      aria-label={t('scanner.aria_label')}
    >
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        muted
        playsInline
      />
      <div
        style={{
          position: 'absolute',
          width: 250,
          height: 250,
          border: '3px solid var(--accent)',
          borderRadius: 16,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
        }}
      />
      <div
        style={{ position: 'absolute', bottom: 120, color: '#fff', fontSize: 15, fontWeight: 600 }}
      >
        {error ? t('scanner.camera_unavailable') : t('scanner.scanning')}
      </div>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 'calc(16px + env(safe-area-inset-top))',
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 14px',
          borderRadius: 12,
          border: 'none',
          background: 'rgba(255,255,255,0.16)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Icon name="x" size={18} />
        {t('scanner.cancel')}
      </button>
    </div>
  );
}
