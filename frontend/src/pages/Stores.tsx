// Stores.tsx — store-management screen: list/create/edit/delete stores,
// per-store shelf-order (drag to reorder categories), and an admin-only
// bulk tool to assign all products of a category to a store.
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, ApiError } from '../lib/api';
import { Icon } from '../components/Icon';
import type { Store, Category } from '../lib/types';
import { useUserStore } from '../stores/userStore';
import { useTranslation } from 'react-i18next';

// ── local types not in lib/types ──
interface ShelfRow {
  category_id: string;
  position: number;
  auto_learned: boolean;
  category_name: string;
  icon: string;
  color: string;
}

interface StoreForm {
  name: string;
  icon: string;
  color: string;
  address: string;
}

const EMPTY_FORM: StoreForm = { name: '', icon: '🛒', color: '#6366f1', address: '' };

// ── shared inline styles ──
const card: CSSProperties = {
  background: 'var(--surface-raised)',
  borderRadius: 16,
  border: '1px solid var(--border-subtle)',
  boxShadow: 'var(--shadow-sm)',
};

const primaryBtn: CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 12,
  padding: '12px 18px',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};

const ghostBtn: CSSProperties = {
  background: 'var(--surface-overlay)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  padding: '10px 14px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const iconBtn: CSSProperties = {
  width: 40,
  height: 40,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface-overlay)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
};

const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 13px',
  borderRadius: 12,
  border: '1px solid var(--border-default)',
  background: 'var(--surface-base)',
  color: 'var(--text-primary)',
  fontSize: 15,
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

export default function StoresPage() {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const isAdmin = user?.role === 'admin';

  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<StoreForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // shelf-order state (per expanded store)
  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [shelf, setShelf] = useState<ShelfRow[]>([]);
  const [shelfLoading, setShelfLoading] = useState(false);

  // bulk-assign state
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkStore, setBulkStore] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadStores = useCallback(async () => {
    const data = await api.get<Store[]>('/api/stores');
    setStores(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await api.get<Store[]>('/api/stores');
        if (cancelled) return;
        setStores(data);
        if (isAdmin) {
          try {
            const cats = await api.get<Category[]>('/api/categories');
            if (!cancelled) setCategories(cats);
          } catch {
            if (!cancelled) setCategories([]);
          }
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // ── dialog helpers ──
  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(s: Store) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      icon: s.icon ?? '🛒',
      color: s.color ?? '#6366f1',
      address: s.address ?? '',
    });
    setDialogOpen(true);
  }

  async function saveStore() {
    if (!form.name.trim()) return;
    setSaving(true);
    const body = {
      name: form.name.trim(),
      icon: form.icon,
      color: form.color,
      address: form.address.trim(),
    };
    try {
      if (editingId) {
        await api.put<Store>(`/api/stores/${editingId}`, body);
      } else {
        await api.post<Store>('/api/stores', body);
      }
      await loadStores();
      setDialogOpen(false);
    } catch {
      alert(t('stores.save_error'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteStore(s: Store) {
    if (!window.confirm(t('stores.confirm_delete'))) return;
    try {
      await api.delete<void>(`/api/stores/${s.id}`);
      if (expandedStore === s.id) setExpandedStore(null);
      await loadStores();
    } catch {
      alert(t('stores.delete_error'));
    }
  }

  // ── shelf order ──
  async function toggleShelf(storeId: string) {
    if (expandedStore === storeId) {
      setExpandedStore(null);
      return;
    }
    setExpandedStore(storeId);
    setShelf([]);
    setShelfLoading(true);
    try {
      const rows = await api.get<ShelfRow[]>(`/api/stores/${storeId}/shelf-order`);
      setShelf(rows);
    } catch {
      setShelf([]);
    } finally {
      setShelfLoading(false);
    }
  }

  async function onShelfDragEnd(storeId: string, ev: DragEndEvent) {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const oldIndex = shelf.findIndex((r) => r.category_id === active.id);
    const newIndex = shelf.findIndex((r) => r.category_id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const previous = shelf;
    const reordered = arrayMove(shelf, oldIndex, newIndex);
    setShelf(reordered);
    const payload = reordered.map((row, idx) => ({
      category_id: row.category_id,
      position: idx + 1,
    }));
    try {
      await api.put<void>(`/api/stores/${storeId}/shelf-order`, payload);
    } catch {
      setShelf(previous); // revert so the UI doesn't diverge from the server
      alert(t('stores.shelf_error'));
    }
  }

  // ── bulk assign ──
  async function bulkAssign() {
    if (!bulkCategory || !bulkStore) return;
    setBulkBusy(true);
    setBulkMsg(null);
    try {
      const result = await api.put<{ assigned: number }>('/api/products/by-category/stores', {
        category_id: bulkCategory,
        store_id: bulkStore,
      });
      setBulkMsg(t('stores.bulk_done', { n: result.assigned }));
    } catch (e) {
      void (e instanceof ApiError);
      setBulkMsg(t('stores.bulk_error'));
    } finally {
      setBulkBusy(false);
    }
  }

  // ── render ──
  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
        {t('list.loading')}
      </div>
    );
  }

  return (
    <div
      style={{ background: 'var(--surface-base)', minHeight: '100%', padding: '16px 14px 96px' }}
    >
      {/* header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <h1
          className="ff-display"
          style={{ margin: 0, fontSize: 24, color: 'var(--text-primary)' }}
        >
          {t('stores.title')}
        </h1>
        <button
          type="button"
          style={{ ...primaryBtn, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={openCreate}
        >
          <Icon name="plus" size={18} strokeWidth={2.2} />
          {t('stores.add')}
        </button>
      </div>

      {error && (
        <div
          style={{
            ...card,
            background: 'var(--accent-light)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            padding: '12px 14px',
            marginBottom: 14,
            fontSize: 14,
          }}
        >
          {t('stores.load_error')}
        </div>
      )}

      {/* empty state */}
      {!error && stores.length === 0 && (
        <div
          style={{
            ...card,
            padding: '40px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ color: 'var(--text-muted)' }}>
            <Icon name="store" size={56} strokeWidth={1.4} />
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 15 }}>{t('stores.empty')}</div>
          <button type="button" style={primaryBtn} onClick={openCreate}>
            {t('stores.create_first')}
          </button>
        </div>
      )}

      {/* store list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stores.map((s) => {
          const expanded = expandedStore === s.id;
          return (
            <div key={s.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 15,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 24,
                    color: '#fff',
                    background: `linear-gradient(150deg, ${s.color || 'var(--accent)'}, color-mix(in oklab, ${s.color || '#6366f1'} 72%, black))`,
                    boxShadow: `0 6px 14px color-mix(in oklab, ${s.color || '#6366f1'} 36%, transparent)`,
                  }}
                >
                  {s.icon ? s.icon : <Icon name="store" size={26} strokeWidth={1.9} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.name}
                  </div>
                  {s.address && (
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {s.address}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  style={iconBtn}
                  aria-label={t('stores.form.edit')}
                  onClick={() => openEdit(s)}
                >
                  <Icon name="pencil" size={18} />
                </button>
                <button
                  type="button"
                  style={iconBtn}
                  aria-label="delete"
                  onClick={() => deleteStore(s)}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>

              <div style={{ padding: '0 14px 14px' }}>
                <button
                  type="button"
                  style={{ ...ghostBtn, width: '100%', justifyContent: 'space-between' }}
                  onClick={() => toggleShelf(s.id)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="sliders" size={16} />
                    {t('stores.shelf_order')}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      transition: 'transform 150ms',
                      transform: expanded ? 'rotate(180deg)' : 'none',
                    }}
                  >
                    <Icon name="chevron-down" size={18} />
                  </span>
                </button>

                {expanded && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                      {t('stores.shelf_hint')}
                    </div>
                    {shelfLoading ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '8px 0' }}>
                        {t('list.loading')}
                      </div>
                    ) : shelf.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: '8px 0' }}>
                        {t('stores.no_categories')}
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(ev) => onShelfDragEnd(s.id, ev)}
                      >
                        <SortableContext
                          items={shelf.map((r) => r.category_id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {shelf.map((row) => (
                              <ShelfItem
                                key={row.category_id}
                                row={row}
                                autoLabel={t('stores.auto')}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* admin bulk tool */}
      {isAdmin && stores.length > 0 && categories.length > 0 && (
        <div style={{ ...card, padding: 16, marginTop: 18 }}>
          <h2
            className="ff-display"
            style={{ margin: '0 0 4px', fontSize: 18, color: 'var(--text-primary)' }}
          >
            {t('stores.bulk_title')}
          </h2>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            {t('stores.bulk_hint')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select
              style={inputStyle}
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
            >
              <option value="">{t('stores.bulk_category')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_de}
                </option>
              ))}
            </select>
            <select
              style={inputStyle}
              value={bulkStore}
              onChange={(e) => setBulkStore(e.target.value)}
            >
              <option value="">{t('stores.bulk_store')}</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              style={{ ...primaryBtn, opacity: bulkBusy || !bulkCategory || !bulkStore ? 0.6 : 1 }}
              disabled={bulkBusy || !bulkCategory || !bulkStore}
              onClick={bulkAssign}
            >
              {t('stores.bulk_assign')}
            </button>
            {bulkMsg && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{bulkMsg}</div>
            )}
          </div>
        </div>
      )}

      {/* create/edit dialog */}
      {dialogOpen && (
        <div
          role="presentation"
          onClick={() => !saving && setDialogOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--surface-raised)',
              width: '100%',
              maxWidth: 480,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: 'var(--shadow-lg)',
              padding: 20,
              boxSizing: 'border-box',
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
              <h2
                className="ff-display"
                style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}
              >
                {editingId ? t('stores.form.edit') : t('stores.form.create')}
              </h2>
              <button
                type="button"
                style={iconBtn}
                aria-label={t('stores.form.cancel')}
                onClick={() => setDialogOpen(false)}
              >
                <Icon name="x" size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>{t('stores.form.name')}</label>
                <input
                  style={inputStyle}
                  value={form.name}
                  placeholder={t('stores.form.name_ph')}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t('stores.form.emoji')}</label>
                  <input
                    style={{ ...inputStyle, textAlign: 'center', fontSize: 22 }}
                    value={form.icon}
                    maxLength={2}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>{t('stores.form.color')}</label>
                  <input
                    type="color"
                    style={{ ...inputStyle, height: 46, padding: 4 }}
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>{t('stores.form.address')}</label>
                <input
                  style={inputStyle}
                  value={form.address}
                  placeholder={t('stores.form.address_ph')}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  style={{ ...ghostBtn, flex: 1, justifyContent: 'center' }}
                  disabled={saving}
                  onClick={() => setDialogOpen(false)}
                >
                  {t('stores.form.cancel')}
                </button>
                <button
                  type="button"
                  style={{ ...primaryBtn, flex: 1, opacity: saving || !form.name.trim() ? 0.6 : 1 }}
                  disabled={saving || !form.name.trim()}
                  onClick={saveStore}
                >
                  {t('stores.form.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── sortable shelf row ──
function ShelfItem({ row, autoLabel }: { row: ShelfRow; autoLabel: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.category_id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-overlay)',
    boxShadow: isDragging ? 'var(--shadow-md)' : 'none',
    opacity: isDragging ? 0.9 : 1,
    cursor: 'grab',
    touchAction: 'none',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <span
        style={{ width: 12, height: 12, borderRadius: '50%', background: row.color, flexShrink: 0 }}
      />
      <span style={{ fontSize: 18 }}>{row.icon}</span>
      <span style={{ flex: 1, fontSize: 15, color: 'var(--text-primary)' }}>
        {row.category_name}
      </span>
      {row.auto_learned && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: 'var(--accent-600)',
            background: 'var(--accent-light)',
            padding: '3px 8px',
            borderRadius: 999,
          }}
        >
          {autoLabel}
        </span>
      )}
    </div>
  );
}
