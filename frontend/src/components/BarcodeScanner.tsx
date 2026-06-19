// BarcodeScanner.tsx — full-screen camera overlay with result + edit sheets.
// Phases: 'scan' → 'result' (known product) | 'unknown' (404) → optionally 'edit'
// The component owns the full scan→add flow; AddBar just toggles the open state.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { CatChip } from './primitives';
import { api, ApiError } from '../lib/api';
import { ulid } from '../lib/ulid';
import { resolveCategoryIcon } from '../lib/categories';
import { useUserStore } from '../stores/userStore';
import type { Category, ListItem, Product, Store } from '../lib/types';

// ── keyframe animations injected once ────────────────────────────────────────
const STYLES = `
@keyframes scanSweep {
  0%   { top: 10%; opacity: 0.6 }
  50%  { top: 82%; opacity: 1   }
  100% { top: 10%; opacity: 0.6 }
}
@keyframes checkPop {
  0%   { transform: scale(0.4); opacity: 0 }
  60%  { transform: scale(1.15) }
  100% { transform: scale(1);   opacity: 1 }
}
@keyframes sheetUp {
  from { transform: translateY(100%) }
  to   { transform: translateY(0)    }
}
@keyframes snackUp {
  from { transform: translateX(-50%) translateY(12px); opacity: 0 }
  to   { transform: translateX(-50%) translateY(0);    opacity: 1 }
}
@keyframes fadeIn {
  from { opacity: 0 }
  to   { opacity: 1 }
}
`;

function injectStyles() {
  if (document.getElementById('scanner-keyframes')) return;
  const el = document.createElement('style');
  el.id = 'scanner-keyframes';
  el.textContent = STYLES;
  document.head.appendChild(el);
}

// ── corner bracket ────────────────────────────────────────────────────────────
function Corner({ pos, locked }: { pos: 'tl' | 'tr' | 'bl' | 'br'; locked: boolean }) {
  const col = locked ? 'var(--emerald-500, #10b981)' : '#fff';
  const len = 26,
    thick = 3.5;
  const base: React.CSSProperties = {
    position: 'absolute',
    background: col,
    transition: 'background .2s',
    borderRadius: 2,
  };
  const v: React.CSSProperties = { ...base, width: thick, height: len };
  const h: React.CSSProperties = { ...base, width: len, height: thick };
  const i = -1;
  const map: Record<string, React.CSSProperties[]> = {
    tl: [
      { ...v, top: i, left: i },
      { ...h, top: i, left: i },
    ],
    tr: [
      { ...v, top: i, right: i },
      { ...h, top: i, right: i },
    ],
    bl: [
      { ...v, bottom: i, left: i },
      { ...h, bottom: i, left: i },
    ],
    br: [
      { ...v, bottom: i, right: i },
      { ...h, bottom: i, right: i },
    ],
  };
  return (
    <>
      {map[pos].map((s, idx) => (
        <div key={idx} style={s} />
      ))}
    </>
  );
}

// ── EAN code chip ─────────────────────────────────────────────────────────────
function CodeChip({ code }: { code: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '5px 11px',
        borderRadius: 9,
        background: 'var(--surface-overlay)',
        color: 'var(--text-secondary)',
      }}
    >
      <Icon name="barcode" size={15} style={{ color: 'var(--text-muted)' }} />
      <span
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 12.5,
          letterSpacing: '0.06em',
        }}
      >
        {code}
      </span>
    </div>
  );
}

// ── quantity stepper ──────────────────────────────────────────────────────────
function QtyStepper({
  count,
  setCount,
  unit,
}: {
  count: number;
  setCount: (fn: (c: number) => number) => void;
  unit?: string;
}) {
  const btn: React.CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 11,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-raised)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center',
    fontSize: 20,
    fontWeight: 600,
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={() => setCount((c) => Math.max(1, c - 1))} style={btn} aria-label="Weniger">
        −
      </button>
      <div style={{ minWidth: 56, textAlign: 'center' }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          {count}
        </div>
        {unit && (
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>× {unit}</div>
        )}
      </div>
      <button onClick={() => setCount((c) => c + 1)} style={btn} aria-label="Mehr">
        +
      </button>
    </div>
  );
}

// shared button styles
const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: 15.5,
  fontWeight: 700,
  fontFamily: "'DM Sans', sans-serif",
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxShadow: 'var(--shadow-pop)',
};
const secondaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  borderRadius: 14,
  cursor: 'pointer',
  background: 'transparent',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-secondary)',
  fontSize: 14.5,
  fontWeight: 600,
  fontFamily: "'DM Sans', sans-serif",
};
const iconBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  background: 'rgba(255,255,255,0.14)',
  color: '#fff',
  backdropFilter: 'blur(6px)',
};

// ── section label (uppercase, with optional " · optional" suffix) ─────────────
const labelStyle: React.CSSProperties = {
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted)',
  marginBottom: 8,
};

function SectionLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <div style={labelStyle}>
      {children}
      {optional && (
        <span style={{ textTransform: 'none', fontWeight: 600, letterSpacing: 0 }}>
          {' '}
          · optional
        </span>
      )}
    </div>
  );
}

// ── label input ───────────────────────────────────────────────────────────────
function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  optional?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel optional={optional}>{label}</SectionLabel>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: 46,
          padding: '0 14px',
          borderRadius: 12,
          boxSizing: 'border-box',
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-raised)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15.5,
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />
    </div>
  );
}

// ── category picker ───────────────────────────────────────────────────────────
function CategoryPicker({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel>Kategorie</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {categories.map((cat) => {
          const on = selectedId === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 11,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                border: `1px solid ${on ? cat.color : 'var(--border-subtle)'}`,
                background: on
                  ? `color-mix(in oklab, ${cat.color} 14%, var(--surface-base))`
                  : 'var(--surface-raised)',
                color: on ? cat.color : 'var(--text-secondary)',
                transition: 'all .12s',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: 2, background: cat.color }} />
              {cat.name_de}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── preferred-store picker (admin only) ───────────────────────────────────────
// Multi-select chips with the store's colour dot. Mirrors CategoryPicker's look.
// Persists to the product's preferred-store set (admin-gated backend endpoint),
// so the section is only rendered when the caller passes `stores`.
function StorePicker({
  stores,
  selectedIds,
  onToggle,
}: {
  stores: Store[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <SectionLabel optional>Bevorzugter Laden</SectionLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {stores.map((s) => {
          const on = selectedIds.includes(s.id);
          const color = s.color || 'var(--text-muted)';
          return (
            <button
              key={s.id}
              onClick={() => onToggle(s.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 11,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                border: `1px solid ${on ? color : 'var(--border-subtle)'}`,
                background: on
                  ? `color-mix(in oklab, ${color} 14%, var(--surface-base))`
                  : 'var(--surface-raised)',
                color: on ? color : 'var(--text-secondary)',
                transition: 'all .12s',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              {s.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── result sheet: known product ───────────────────────────────────────────────
function ResultFound({
  product,
  barcode,
  categories,
  count,
  setCount,
  onAddMore,
  onAddClose,
  onEdit,
}: {
  product: Product & {
    display_name: string;
    category_color?: string;
    category_icon?: string;
    size?: string;
  };
  barcode: string;
  categories: Category[];
  count: number;
  setCount: (fn: (c: number) => number) => void;
  onAddMore: () => void;
  onAddClose: () => void;
  onEdit: () => void;
}) {
  const category = product.category_id
    ? categories.find((c) => c.id === product.category_id)
    : undefined;
  const catColor = product.category_color || category?.color || '#9ca3af';
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 14 }}>
        <CatChip
          color={catColor}
          icon={resolveCategoryIcon(product.category_icon || category?.icon)}
          size={48}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="ff-display"
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: 1.15,
            }}
          >
            {product.display_name}
          </div>
          {(product.brand || category) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 5,
              }}
            >
              {product.brand && (
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {product.brand}
                </span>
              )}
              {category && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: catColor }} />
                  <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {category.name_de}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 0 16px',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <CodeChip code={barcode} />
        <QtyStepper count={count} setCount={setCount} unit={product.size} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <button onClick={onAddMore} style={primaryBtn}>
          <Icon name="plus" size={19} strokeWidth={2.4} />
          Hinzufügen &amp; weiter scannen
        </button>
        <button onClick={onAddClose} style={secondaryBtn}>
          Hinzufügen &amp; schließen
        </button>
        <button
          onClick={onEdit}
          style={{
            ...secondaryBtn,
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: 13,
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Icon name="pencil" size={14} />
          Falsche Metadaten? Hier anpassen
        </button>
      </div>
    </>
  );
}

// ── edit sheet: correct known product's metadata ──────────────────────────────
function EditProduct({
  product,
  barcode,
  categories,
  stores,
  isAdmin,
  initialStoreIds,
  count,
  setCount,
  onSaveAndAdd,
  onBack,
}: {
  product: Product & { display_name: string; category_color?: string; category_icon?: string };
  barcode: string;
  categories: Category[];
  stores: Store[];
  isAdmin: boolean;
  initialStoreIds: string[];
  count: number;
  setCount: (fn: (c: number) => number) => void;
  onSaveAndAdd: (
    patch: {
      name_de: string;
      brand: string;
      category_id: string | null;
      store_ids: string[];
    },
    count: number,
  ) => Promise<void>;
  onBack: () => void;
}) {
  const [name, setName] = useState(product.name_de || product.display_name || '');
  const [brand, setBrand] = useState(product.brand || '');
  const [catId, setCatId] = useState<string | null>(product.category_id ?? null);
  const [storeIds, setStoreIds] = useState<string[]>(initialStoreIds);
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length > 0;
  const toggleStore = (id: string) =>
    setStoreIds((ids) => (ids.includes(id) ? ids.filter((s) => s !== id) : [...ids, id]));

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSaveAndAdd(
        { name_de: name.trim(), brand: brand.trim(), category_id: catId, store_ids: storeIds },
        count,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 15,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--accent-light)',
            color: 'var(--accent)',
          }}
        >
          <Icon name="pencil" size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="ff-display"
            style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}
          >
            Angaben anpassen
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            Daten aus der Produktdatenbank — hier korrigieren.
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <CodeChip code={barcode} />
      </div>

      <FieldInput
        label="Name"
        value={name}
        onChange={setName}
        placeholder="z. B. Haferflocken"
        autoFocus
      />
      <FieldInput
        label="Marke / Detail"
        value={brand}
        onChange={setBrand}
        placeholder="z. B. Bioland"
        optional
      />

      <CategoryPicker categories={categories} selectedId={catId} onSelect={setCatId} />

      {isAdmin && stores.length > 0 && (
        <StorePicker stores={stores} selectedIds={storeIds} onToggle={toggleStore} />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '4px 0 16px',
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Menge
        </span>
        <QtyStepper count={count} setCount={setCount} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <button
          onClick={handleSave}
          disabled={!valid || saving}
          style={{
            ...primaryBtn,
            opacity: valid && !saving ? 1 : 0.45,
            cursor: valid && !saving ? 'pointer' : 'default',
            boxShadow: valid && !saving ? 'var(--shadow-pop)' : 'none',
          }}
        >
          <Icon name="check" size={19} strokeWidth={2.6} />
          {saving ? 'Speichern…' : 'Speichern & hinzufügen'}
        </button>
        <button onClick={onBack} style={secondaryBtn}>
          Zurück
        </button>
      </div>
    </>
  );
}

// ── unknown sheet: product not in DB ─────────────────────────────────────────
function ResultUnknown({
  barcode,
  categories,
  stores,
  isAdmin,
  count,
  setCount,
  onCreateAndAdd,
  onRescan,
}: {
  barcode: string | null;
  categories: Category[];
  stores: Store[];
  isAdmin: boolean;
  count: number;
  setCount: (fn: (c: number) => number) => void;
  onCreateAndAdd: (
    data: { name_de: string; brand: string; category_id: string | null; store_ids: string[] },
    count: number,
  ) => Promise<void>;
  onRescan: () => void;
}) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [catId, setCatId] = useState<string | null>(null);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const valid = name.trim().length > 0;
  const toggleStore = (id: string) =>
    setStoreIds((ids) => (ids.includes(id) ? ids.filter((s) => s !== id) : [...ids, id]));

  const handleAdd = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onCreateAndAdd(
        { name_de: name.trim(), brand: brand.trim(), category_id: catId, store_ids: storeIds },
        count,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 15,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--surface-overlay)',
            color: 'var(--text-muted)',
          }}
        >
          <Icon name="barcode" size={26} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="ff-display"
            style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}
          >
            Unbekanntes Produkt
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            Nicht in der Datenbank – bitte benennen.
          </div>
        </div>
      </div>

      {barcode && (
        <div style={{ marginBottom: 14 }}>
          <CodeChip code={barcode} />
        </div>
      )}

      <FieldInput
        label="Name (DE)"
        value={name}
        onChange={setName}
        placeholder="z. B. Haferflocken"
        autoFocus
      />
      <FieldInput
        label="Marke / Detail"
        value={brand}
        onChange={setBrand}
        placeholder="z. B. Bioland"
        optional
      />

      <CategoryPicker categories={categories} selectedId={catId} onSelect={setCatId} />

      {isAdmin && stores.length > 0 && (
        <StorePicker stores={stores} selectedIds={storeIds} onToggle={toggleStore} />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '4px 0 16px',
        }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Menge
        </span>
        <QtyStepper count={count} setCount={setCount} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        <button
          onClick={handleAdd}
          disabled={!valid || saving}
          style={{
            ...primaryBtn,
            opacity: valid && !saving ? 1 : 0.45,
            cursor: valid && !saving ? 'pointer' : 'default',
            boxShadow: valid && !saving ? 'var(--shadow-pop)' : 'none',
          }}
        >
          <Icon name="plus" size={19} strokeWidth={2.4} />
          {saving ? 'Speichern…' : 'Produkt anlegen & hinzufügen'}
        </button>
        <button onClick={onRescan} style={secondaryBtn}>
          Erneut scannen
        </button>
      </div>
    </>
  );
}

// ── ScannedProduct: what we hold after a successful API lookup ────────────────
interface ScannedProduct extends Product {
  display_name: string;
  category_color?: string;
  category_icon?: string;
  size?: string;
}

// ── main component ────────────────────────────────────────────────────────────
export interface BarcodeScannerProps {
  listId: string;
  onAdd: (payload: Record<string, unknown>, optimistic: ListItem) => void;
  onClose: () => void;
}

function makeOptimistic(
  listId: string,
  productId: string | null,
  display_name: string,
  category_id: string | null,
  category_color: string | null,
  category_icon: string | null,
  quantity: number | null,
): ListItem {
  return {
    id: ulid(),
    list_id: listId,
    product_id: productId,
    name_override: null,
    quantity,
    unit: null,
    note: null,
    checked: false,
    checked_by: null,
    checked_at: null,
    added_by: '',
    added_at: Date.now(),
    sort_order: 0,
    store_id: null,
    category_id,
    category_color,
    category_icon,
    display_name,
    preferred_store_ids: null,
  };
}

export function BarcodeScanner({ listId, onAdd, onClose }: BarcodeScannerProps) {
  injectStyles();

  type Phase = 'scan' | 'result' | 'edit' | 'unknown';
  const [phase, setPhase] = useState<Phase>('scan');
  const [locked, setLocked] = useState(false);
  const [torch, setTorch] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [product, setProduct] = useState<ScannedProduct | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [editStoreIds, setEditStoreIds] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [cameraError, setCameraError] = useState(false);

  // Preferred stores live in the product DB and are admin-gated on the backend,
  // so the store picker is only offered to admins (matching AdminProducts).
  const isAdmin = useUserStore((s) => s.user?.role === 'admin');

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const scanOnce = useRef(false); // prevent double-fire

  // fetch categories + stores once for the pickers
  useEffect(() => {
    api
      .get<Category[]>('/api/categories')
      .then(setCategories)
      .catch(() => {});
    api
      .get<Store[]>('/api/stores')
      .then(setStores)
      .catch(() => {});
  }, []);

  // Defined above the camera effect because that effect's decode callback calls
  // it; the React Compiler lint rules check source order, not JS hoisting.
  async function handleScanResult(code: string) {
    setLocked(true);
    if (navigator.vibrate) navigator.vibrate([8, 40, 12]);
    setBarcode(code);
    setCount(1);

    try {
      const p = await api.get<Product>(`/api/products/barcode/${encodeURIComponent(code)}`);
      // enrich with display_name for the sheet
      const enriched: ScannedProduct = {
        ...p,
        display_name: p.name_de || p.name_en || p.name_pt || code,
      };
      setProduct(enriched);
      // short delay so the green check is visible before the sheet comes up
      setTimeout(() => setPhase('result'), 360);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setProduct(null);
        setTimeout(() => setPhase('unknown'), 360);
      } else {
        // on network error, let user retry
        setLocked(false);
        scanOnce.current = false;
      }
    }
  }

  // start camera when in scan phase
  useEffect(() => {
    if (phase !== 'scan') return;
    scanOnce.current = false;
    let cancelled = false;

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (!cancelled) setLocked(false);
        const reader = new BrowserMultiFormatReader();
        if (cancelled || !videoRef.current) return;

        // capture the stream track for torch control
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const [track] = stream.getVideoTracks();
        trackRef.current = track ?? null;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (result && !scanOnce.current && !cancelled) {
              scanOnce.current = true;
              handleScanResult(result.getText());
            }
          },
        );
      } catch {
        if (!cancelled) setCameraError(true);
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      trackRef.current?.stop();
      trackRef.current = null;
    };
  }, [phase]);

  const toggleTorch = async () => {
    if (!trackRef.current) return;
    const next = !torch;
    try {
      // ImageCapture torch is not universally typed; cast to any for the constraint
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (trackRef.current as any).applyConstraints({ advanced: [{ torch: next }] });
      setTorch(next);
    } catch {
      /* torch not supported on this device */
    }
  };

  const rescan = () => {
    setProduct(null);
    setBarcode(null);
    setCount(1);
    setEditStoreIds([]);
    setPhase('scan');
  };

  // Open the edit sheet. The barcode lookup doesn't carry preferred stores, so
  // (for admins) fetch them from the product detail endpoint to pre-select the
  // picker. Best-effort: a failure just leaves the picker empty.
  const openEdit = async () => {
    if (isAdmin && product?.id) {
      try {
        const full = await api.get<Product & { preferred_store_ids?: string[] }>(
          `/api/products/${product.id}`,
        );
        setEditStoreIds(full.preferred_store_ids ?? []);
      } catch {
        setEditStoreIds([]);
      }
    } else {
      setEditStoreIds([]);
    }
    setPhase('edit');
  };

  // Persist a product's preferred-store set (admin-only endpoint). Best-effort:
  // metadata/add already succeeded, so a store-save failure shouldn't block.
  const saveStores = async (productId: string, storeIds: string[]) => {
    if (!isAdmin) return;
    try {
      await api.put(`/api/products/${productId}/stores`, { store_ids: storeIds });
    } catch {
      /* non-fatal — the item is still added */
    }
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1700);
  };

  // add a known (found) product to the list
  const addFound = (keepOpen: boolean) => {
    if (!product || !barcode) return;
    const id = ulid();
    onAdd(
      { item_id: id, product_id: product.id },
      makeOptimistic(
        listId,
        product.id,
        product.display_name,
        product.category_id ?? null,
        product.category_color ?? null,
        product.category_icon ?? null,
        count > 1 ? count : null,
      ),
    );
    if (keepOpen) {
      flash(`„${product.display_name}" hinzugefügt`);
      rescan();
    } else onClose();
  };

  // patch an existing product then add it. PUT /api/products/:id returns 204
  // (no body), so build the optimistic item from the known id + patch values.
  const saveAndAdd = async (
    patch: { name_de: string; brand: string; category_id: string | null; store_ids: string[] },
    qty: number,
  ) => {
    if (!product || !barcode) return;
    await api.put(`/api/products/${product.id}`, {
      name_de: patch.name_de,
      name_en: product.name_en ?? '',
      name_pt: product.name_pt ?? '',
      brand: patch.brand,
      category_id: patch.category_id,
      barcode,
    });
    await saveStores(product.id, patch.store_ids);
    const cat = patch.category_id ? categories.find((c) => c.id === patch.category_id) : null;
    const id = ulid();
    onAdd(
      { item_id: id, product_id: product.id },
      makeOptimistic(
        listId,
        product.id,
        patch.name_de || barcode,
        cat?.id ?? null,
        cat?.color ?? null,
        resolveCategoryIcon(cat?.icon) ?? null,
        qty > 1 ? qty : null,
      ),
    );
    onClose();
  };

  // create a new product then add it
  const createAndAdd = async (
    data: { name_de: string; brand: string; category_id: string | null; store_ids: string[] },
    qty: number,
  ) => {
    const created = await api.post<Product>('/api/products', {
      name_de: data.name_de,
      name_en: '',
      name_pt: '',
      brand: data.brand,
      category_id: data.category_id,
      barcode: barcode ?? undefined,
    });
    await saveStores(created.id, data.store_ids);
    const cat = data.category_id ? categories.find((c) => c.id === data.category_id) : null;
    const id = ulid();
    onAdd(
      { item_id: id, product_id: created.id },
      makeOptimistic(
        listId,
        created.id,
        data.name_de,
        cat?.id ?? null,
        cat?.color ?? null,
        resolveCategoryIcon(cat?.icon) ?? null,
        qty > 1 ? qty : null,
      ),
    );
    onClose();
  };

  const sheetOpen = phase === 'result' || phase === 'edit' || phase === 'unknown';

  // Portal target: the `.app` root, NOT document.body. The overlay is
  // position:fixed, so it still escapes the AddBar's positioned/overflow-clipped
  // ancestors (sticky bar, scroll container, fixed <main>) and fills the
  // viewport. Portaling into `.app` keeps the design-token cascade intact —
  // the surface/text/border vars, `data-theme`, and the inline `--accent` all
  // live on `.app`. Rendering to document.body (outside `.app`) left every
  // var(--*) unresolved, so the bottom sheet rendered black-on-black.
  const portalTarget = document.querySelector('.app') ?? document.body;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        overflow: 'hidden',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        animation: 'fadeIn .2s ease',
      }}
      role="dialog"
      aria-label="Barcode scannen"
    >
      {/* camera scene */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: torch
            ? 'radial-gradient(120% 90% at 50% 38%, #3a3540 0%, #17141b 70%)'
            : 'radial-gradient(120% 90% at 50% 38%, #232029 0%, #0c0a0f 72%)',
          transition: 'background .25s',
        }}
      >
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          muted
          playsInline
        />
      </div>

      {/* reticle */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          paddingBottom: 40,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 280,
            height: 184,
            borderRadius: 22,
            boxShadow: `0 0 0 9999px rgba(8,6,11,${sheetOpen ? 0.78 : 0.6})`,
            transition: 'box-shadow .3s',
            transform: locked ? 'scale(0.97)' : 'scale(1)',
          }}
        >
          <Corner pos="tl" locked={locked} />
          <Corner pos="tr" locked={locked} />
          <Corner pos="bl" locked={locked} />
          <Corner pos="br" locked={locked} />
          {!locked && phase === 'scan' && (
            <div
              style={{
                position: 'absolute',
                left: 10,
                right: 10,
                height: 2,
                borderRadius: 2,
                background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                boxShadow: '0 0 12px 2px var(--accent)',
                animation: 'scanSweep 2s ease-in-out infinite',
              }}
            />
          )}
          {locked && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'var(--emerald-500, #10b981)',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  animation: 'checkPop .4s ease',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                }}
              >
                <Icon name="check" size={26} strokeWidth={3} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'calc(52px + env(safe-area-inset-top)) 16px 0',
        }}
      >
        <button onClick={onClose} aria-label="Schließen" style={iconBtn}>
          <Icon name="x" size={22} strokeWidth={2.2} />
        </button>
        <span
          style={{
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            textShadow: '0 1px 6px rgba(0,0,0,0.5)',
          }}
        >
          Barcode scannen
        </span>
        <button
          onClick={toggleTorch}
          aria-label="Blitz"
          aria-pressed={torch}
          style={{
            ...iconBtn,
            background: torch ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.14)',
            color: torch ? '#15121a' : '#fff',
          }}
        >
          <Icon name={torch ? 'zap' : 'zap-off'} size={21} />
        </button>
      </div>

      {/* scan-phase hint */}
      {phase === 'scan' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '0 24px calc(30px + env(safe-area-inset-bottom))',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <p
            style={{
              color: 'rgba(255,255,255,0.92)',
              fontSize: 14.5,
              fontWeight: 500,
              margin: 0,
              textShadow: '0 1px 6px rgba(0,0,0,0.6)',
              lineHeight: 1.4,
            }}
          >
            {cameraError ? 'Kamera nicht verfügbar' : <>Barcode in den Rahmen halten</>}
          </p>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 108,
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            padding: '10px 16px',
            borderRadius: 13,
            background: 'var(--emerald-500, #10b981)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 8px 22px rgba(0,0,0,0.35)',
            animation: 'snackUp .24s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <Icon name="check" size={17} strokeWidth={3} />
          {toast}
        </div>
      )}

      {/* bottom sheet */}
      {sheetOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'flex-end',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '100%',
              pointerEvents: 'auto',
              background: 'var(--surface-base)',
              borderRadius: '26px 26px 0 0',
              boxShadow: 'var(--shadow-lg)',
              padding: '12px 20px calc(22px + env(safe-area-inset-bottom))',
              animation: 'sheetUp .32s cubic-bezier(.2,.9,.3,1)',
              maxHeight: '82%',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                width: 38,
                height: 4,
                borderRadius: 4,
                background: 'var(--border-default)',
                margin: '0 auto 16px',
              }}
            />

            {phase === 'result' && product && barcode && (
              <ResultFound
                product={product}
                barcode={barcode}
                categories={categories}
                count={count}
                setCount={setCount}
                onAddMore={() => addFound(true)}
                onAddClose={() => addFound(false)}
                onEdit={openEdit}
              />
            )}
            {phase === 'edit' && product && barcode && (
              <EditProduct
                product={product}
                barcode={barcode}
                categories={categories}
                stores={stores}
                isAdmin={isAdmin}
                initialStoreIds={editStoreIds}
                count={count}
                setCount={setCount}
                onSaveAndAdd={saveAndAdd}
                onBack={() => setPhase('result')}
              />
            )}
            {phase === 'unknown' && (
              <ResultUnknown
                barcode={barcode}
                categories={categories}
                stores={stores}
                isAdmin={isAdmin}
                count={count}
                setCount={setCount}
                onCreateAndAdd={createAndAdd}
                onRescan={rescan}
              />
            )}
          </div>
        </div>
      )}
    </div>,
    portalTarget,
  );
}
