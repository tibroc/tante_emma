// AdminProducts.tsx — admin-only product management page.
// Search the product catalog, create/edit products, and assign preferred stores.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Icon } from '../components/Icon';
import { CatChip } from '../components/primitives';
import { BackHeader } from '../components/Header';
import { resolveCategoryIcon } from '../lib/categories';
import { useUserStore } from '../stores/userStore';
import type { Category, Store, Suggestion, Product } from '../lib/types';

// Product in lib/types has no barcode / preferred stores; the detail endpoint does.
interface ProductDetail extends Product {
  barcode?: string;
  preferred_store_ids?: string[];
}

interface FormState {
  name_de: string;
  name_en: string;
  brand: string;
  barcode: string;
  category_id: string;
}

const EMPTY_FORM: FormState = {
  name_de: '',
  name_en: '',
  brand: '',
  barcode: '',
  category_id: '',
};

export default function AdminProductsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUserStore((s) => s.user);

  const [categories, setCategories] = useState<Category[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = user?.role === 'admin';

  // Bootstrap: load categories + stores (best-effort).
  useEffect(() => {
    if (!isAdmin) {
      navigate('/lists', { replace: true });
      return;
    }
    Promise.all([
      api.get<Category[]>('/api/categories').catch(() => [] as Category[]),
      api.get<Store[]>('/api/stores').catch(() => [] as Store[]),
    ]).then(([cats, sts]) => {
      setCategories(cats);
      setStores(sts);
    });
  }, [isAdmin, navigate]);

  // Clear any pending debounce on unmount.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Debounced product search.
  const runSearch = (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    api
      .get<Suggestion[]>(`/api/products/search?q=${encodeURIComponent(q)}`)
      .then((r) => setResults(r))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  };

  const onQueryChange = (q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 1) {
      setResults([]);
      setSearching(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(q), 250);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSelectedStores(new Set());
    setDialogOpen(true);
  };

  const openEdit = (productId: string) => {
    setEditingId(productId);
    setForm(EMPTY_FORM);
    setSelectedStores(new Set());
    setDialogOpen(true);
    api
      .get<ProductDetail>(`/api/products/${productId}`)
      .then((p) => {
        setForm({
          name_de: p.name_de ?? '',
          name_en: p.name_en ?? '',
          brand: p.brand ?? '',
          barcode: p.barcode ?? '',
          category_id: p.category_id ?? '',
        });
        setSelectedStores(new Set(p.preferred_store_ids ?? []));
      })
      .catch(() => setDialogOpen(false));
  };

  const toggleStore = (id: string) => {
    setSelectedStores((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSave = (form.name_de.trim().length > 0 || form.name_en.trim().length > 0) && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const body = {
      name_de: form.name_de,
      name_en: form.name_en,
      brand: form.brand,
      barcode: form.barcode,
      // Backend category_id is a FK; '' would violate it. Send null when unset.
      category_id: form.category_id || null,
    };
    try {
      let id = editingId;
      if (id) {
        await api.put(`/api/products/${id}`, body);
      } else {
        const created = await api.post<{ id: string }>('/api/products', body);
        id = created.id;
      }
      await api.put(`/api/products/${id}/stores`, { store_ids: [...selectedStores] });
      setDialogOpen(false);
      if (!editingId) runSearch(query);
    } catch {
      // keep dialog open so the user can retry
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;

  const editing = editingId !== null;

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
        title={t('admin.products_title')}
        backLabel={t('settings.title')}
        onBack={() => navigate('/settings')}
      />

      {/* Search + create row */}
      <div style={{ flexShrink: 0, padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              background: 'var(--surface-overlay)',
              borderRadius: 14,
              padding: '0 14px',
              height: 48,
            }}
          >
            <Icon name="search" size={18} style={{ color: 'var(--text-muted)' }} />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t('admin.product_search_ph')}
              aria-label={t('admin.product_search_label')}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: 16,
              }}
            />
          </div>
          <button
            onClick={openCreate}
            aria-label={t('admin.product_create')}
            title={t('admin.product_create')}
            style={{
              flexShrink: 0,
              width: 48,
              height: 48,
              borderRadius: 14,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(145deg, var(--accent), var(--accent-600))',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              boxShadow: 'var(--shadow-pop)',
            }}
          >
            <Icon name="plus" size={22} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 24px' }}>
        {searching && (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 14,
            }}
          >
            {t('list.loading')}
          </div>
        )}
        {!searching &&
          results.map((r) => (
            <div
              key={r.product_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 56,
                padding: '8px 12px',
                marginTop: 8,
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 14,
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <CatChip
                color={r.category?.color || '#9ca3af'}
                icon={resolveCategoryIcon(r.category?.icon)}
                size={36}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {r.display_name}
                </div>
                {(r.brand || r.category) && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {[r.brand, r.category?.name_de].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              <button
                onClick={() => openEdit(r.product_id)}
                aria-label={t('admin.product_edit')}
                title={t('admin.product_edit')}
                style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 11,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-base)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="pencil" size={18} />
              </button>
            </div>
          ))}
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div
          onClick={() => !saving && setDialogOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20, 12, 25, 0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{
              width: '100%',
              maxWidth: 520,
              maxHeight: '88%',
              overflowY: 'auto',
              background: 'var(--surface-base)',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              boxShadow: 'var(--shadow-lg)',
              padding: '20px 18px calc(20px + env(safe-area-inset-bottom))',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <h2 className="ff-display" style={{ margin: 0, fontSize: 21, fontWeight: 600 }}>
                {editing ? t('admin.product_edit') : t('admin.product_create')}
              </h2>
              <button
                onClick={() => !saving && setDialogOpen(false)}
                aria-label={t('stores.form.cancel')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <Field label={t('admin.field_name_de')}>
              <TextInput
                value={form.name_de}
                onChange={(v) => setForm((f) => ({ ...f, name_de: v }))}
                placeholder="z.B. Äpfel"
              />
            </Field>
            <Field label={t('admin.field_name_en')}>
              <TextInput
                value={form.name_en}
                onChange={(v) => setForm((f) => ({ ...f, name_en: v }))}
                placeholder="e.g. Apples"
              />
            </Field>
            <Field label={t('admin.field_brand')}>
              <TextInput
                value={form.brand}
                onChange={(v) => setForm((f) => ({ ...f, brand: v }))}
                placeholder="optional"
              />
            </Field>
            <Field label={t('admin.field_barcode')}>
              <TextInput
                value={form.barcode}
                onChange={(v) => setForm((f) => ({ ...f, barcode: v }))}
                placeholder="EAN-13"
              />
            </Field>

            <Field label={t('admin.field_category')}>
              <select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                style={{
                  width: '100%',
                  height: 48,
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                  fontSize: 16,
                  padding: '0 12px',
                }}
              >
                <option value="">{t('admin.no_category')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_de}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t('admin.field_preferred_stores')}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {stores.map((s) => {
                  const on = selectedStores.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStore(s.id)}
                      aria-pressed={on}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        minHeight: 38,
                        padding: '0 14px',
                        borderRadius: 999,
                        cursor: 'pointer',
                        fontSize: 14,
                        border: on ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                        background: on ? 'var(--accent-light)' : 'var(--surface-raised)',
                        color: on ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {on && <Icon name="check" size={15} />}
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button
                onClick={() => !saving && setDialogOpen(false)}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 14,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-secondary)',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                {t('stores.form.cancel')}
              </button>
              <button
                onClick={save}
                disabled={!canSave}
                style={{
                  flex: 1,
                  height: 50,
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(145deg, var(--accent), var(--accent-600))',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: canSave ? 'pointer' : 'not-allowed',
                  opacity: canSave ? 1 : 0.5,
                  boxShadow: canSave ? 'var(--shadow-pop)' : 'none',
                }}
              >
                {t('stores.form.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div
        style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}
      >
        {label}
      </div>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        height: 48,
        borderRadius: 12,
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-raised)',
        color: 'var(--text-primary)',
        fontSize: 16,
        padding: '0 12px',
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
}
