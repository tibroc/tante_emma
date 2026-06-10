<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';

	interface Store {
		id: string;
		name: string;
		icon: string;
		color: string;
		address: string;
	}

	interface ShelfRow {
		category_id: string;
		position: number;
		auto_learned: boolean;
		category_name: string;
		icon: string;
		color: string;
	}

	let stores = $state<Store[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	// Edit / create dialog
	let dialogOpen = $state(false);
	let editTarget = $state<Store | null>(null);
	let form = $state({ name: '', icon: '🛒', color: '#6366f1', address: '' });
	let saving = $state(false);

	// Shelf order editor
	let shelfStoreId = $state<string | null>(null);
	let shelfRows = $state<ShelfRow[]>([]);
	let shelfLoading = $state(false);
	let dragIndex = $state<number | null>(null);

	onMount(loadStores);

	async function loadStores() {
		loading = true;
		try {
			stores = await api.get<Store[]>('/api/stores');
		} catch {
			errorMsg = 'Läden konnten nicht geladen werden';
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		editTarget = null;
		form = { name: '', icon: '🛒', color: '#6366f1', address: '' };
		dialogOpen = true;
	}

	function openEdit(s: Store) {
		editTarget = s;
		form = { name: s.name, icon: s.icon || '🛒', color: s.color || '#6366f1', address: s.address || '' };
		dialogOpen = true;
	}

	async function saveStore() {
		if (!form.name.trim()) return;
		saving = true;
		try {
			if (editTarget) {
				await api.put(`/api/stores/${editTarget.id}`, form);
				stores = stores.map((s) => (s.id === editTarget!.id ? { ...s, ...form } : s));
			} else {
				const created = await api.post<Store>('/api/stores', form);
				stores = [...stores, created];
			}
			dialogOpen = false;
		} catch {
			errorMsg = 'Speichern fehlgeschlagen';
		} finally {
			saving = false;
		}
	}

	async function deleteStore(id: string) {
		if (!confirm('Laden wirklich löschen?')) return;
		try {
			await api.delete(`/api/stores/${id}`);
			stores = stores.filter((s) => s.id !== id);
			if (shelfStoreId === id) shelfStoreId = null;
		} catch {
			errorMsg = 'Löschen fehlgeschlagen';
		}
	}

	async function toggleShelf(storeId: string) {
		if (shelfStoreId === storeId) { shelfStoreId = null; return; }
		shelfStoreId = storeId;
		shelfLoading = true;
		try {
			shelfRows = await api.get<ShelfRow[]>(`/api/stores/${storeId}/shelf-order`);
		} catch {
			shelfRows = [];
		} finally {
			shelfLoading = false;
		}
	}

	function dragStart(i: number) { dragIndex = i; }

	function dragOver(e: DragEvent, i: number) {
		e.preventDefault();
		if (dragIndex === null || dragIndex === i) return;
		const moved = shelfRows[dragIndex];
		const next = [...shelfRows];
		next.splice(dragIndex, 1);
		next.splice(i, 0, moved);
		shelfRows = next;
		dragIndex = i;
	}

	async function saveShelfOrder() {
		if (!shelfStoreId) return;
		const payload = shelfRows.map((r, idx) => ({ category_id: r.category_id, position: idx + 1 }));
		try {
			await api.put(`/api/stores/${shelfStoreId}/shelf-order`, payload);
		} catch {
			errorMsg = 'Regalreihenfolge konnte nicht gespeichert werden';
		}
	}
</script>

<div class="page">
	<header class="page-header">
		<h1>Läden</h1>
		<button class="btn-primary" onclick={openCreate}>+ Laden</button>
	</header>

	{#if errorMsg}
		<p class="error-banner">{errorMsg}</p>
	{/if}

	{#if loading}
		<p class="hint">Lade…</p>
	{:else if stores.length === 0}
		<div class="empty">
			<span class="empty-icon">🏪</span>
			<p>Noch keine Läden angelegt.</p>
			<button class="btn-primary" onclick={openCreate}>Ersten Laden anlegen</button>
		</div>
	{:else}
		<ul class="store-list">
			{#each stores as s (s.id)}
				<li class="store-row">
					<span class="store-icon" style:background-color={s.color || '#e5e7eb'}>{s.icon || '🛒'}</span>
					<div class="store-info">
						<span class="store-name">{s.name}</span>
						{#if s.address}<span class="store-addr">{s.address}</span>{/if}
					</div>
					<div class="store-actions">
						<button class="icon-btn" onclick={() => toggleShelf(s.id)} aria-label="Regalreihenfolge">
							{shelfStoreId === s.id ? '▲' : '☰'}
						</button>
						<button class="icon-btn" onclick={() => openEdit(s)} aria-label="Bearbeiten">✎</button>
						<button class="icon-btn danger" onclick={() => deleteStore(s.id)} aria-label="Löschen">✕</button>
					</div>
				</li>

				{#if shelfStoreId === s.id}
					<li class="shelf-panel">
						{#if shelfLoading}
							<p class="hint">Lade…</p>
						{:else if shelfRows.length === 0}
							<p class="hint">Keine Kategorien gespeichert. Kaufe Artikel ein, um die Reihenfolge automatisch zu lernen.</p>
						{:else}
							<p class="shelf-hint">Ziehen zum Sortieren – Reihenfolge = Ladengang-Abfolge.</p>
							<ul class="shelf-list">
								{#each shelfRows as row, i (row.category_id)}
									<li
										class="shelf-row"
										class:dragging={dragIndex === i}
										draggable="true"
										ondragstart={() => dragStart(i)}
										ondragover={(e) => dragOver(e, i)}
										ondragend={() => { dragIndex = null; saveShelfOrder(); }}
									>
										<span class="drag-handle" aria-hidden="true">⠿</span>
										<span class="cat-dot" style:background-color={row.color}></span>
										<span class="cat-icon">{row.icon}</span>
										<span class="cat-name">{row.category_name}</span>
										{#if row.auto_learned}
											<span class="auto-badge">auto</span>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</li>
				{/if}
			{/each}
		</ul>
	{/if}
</div>

{#if dialogOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="backdrop" role="presentation" onclick={() => (dialogOpen = false)}></div>
	<div class="dialog" role="dialog" aria-modal="true">
		<h2>{editTarget ? 'Laden bearbeiten' : 'Laden anlegen'}</h2>
		<label>
			Name
			<input type="text" bind:value={form.name} placeholder="z.B. Rewe Hauptstraße" />
		</label>
		<div class="row">
			<label>
				Emoji
				<input type="text" bind:value={form.icon} maxlength="2" class="emoji-input" />
			</label>
			<label>
				Farbe
				<input type="color" bind:value={form.color} class="color-input" />
			</label>
		</div>
		<label>
			Adresse (optional)
			<input type="text" bind:value={form.address} placeholder="Musterstraße 1" />
		</label>
		<div class="dialog-actions">
			<button class="btn-ghost" onclick={() => (dialogOpen = false)}>Abbrechen</button>
			<button class="btn-primary" onclick={saveStore} disabled={saving || !form.name.trim()}>
				{saving ? '…' : 'Speichern'}
			</button>
		</div>
	</div>
{/if}

<style>
	.page {
		padding: var(--space-4);
		max-width: 640px;
		margin: 0 auto;
	}

	.page-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-4);
	}

	.page-header h1 {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		margin: 0;
	}

	.store-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.store-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--surface-base);
		border-radius: 12px;
		min-height: 56px;
	}

	.store-icon {
		width: 40px;
		height: 40px;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 20px;
		flex-shrink: 0;
	}

	.store-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }

	.store-name {
		font-weight: 500;
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.store-addr {
		font-size: var(--text-xs);
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.store-actions { display: flex; gap: var(--space-1); flex-shrink: 0; }

	.icon-btn {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: none;
		background: var(--surface-overlay);
		color: var(--text-secondary);
		font-size: 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.icon-btn.danger:hover { color: var(--color-danger); }

	.shelf-panel {
		background: var(--surface-raised);
		border-radius: 12px;
		padding: var(--space-3);
		margin-top: 2px;
	}

	.shelf-hint { font-size: var(--text-xs); color: var(--text-muted); margin: 0 0 var(--space-2); }

	.shelf-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }

	.shelf-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		height: 44px;
		padding: 0 var(--space-2);
		background: var(--surface-base);
		border-radius: 8px;
		cursor: grab;
		user-select: none;
	}

	.shelf-row.dragging { opacity: 0.4; }

	.drag-handle { color: var(--text-muted); font-size: 18px; }
	.cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
	.cat-icon { font-size: 16px; }
	.cat-name { flex: 1; font-size: var(--text-sm); color: var(--text-primary); }

	.auto-badge {
		font-size: var(--text-xs);
		color: var(--text-muted);
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		padding: 0 4px;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0 0 0 / 0.4);
		z-index: 200;
	}

	.dialog {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--surface-base);
		border-radius: 20px 20px 0 0;
		padding: var(--space-6) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
		z-index: 201;
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		max-width: 640px;
		margin: 0 auto;
	}

	.dialog h2 { font-family: var(--font-display); font-size: var(--text-xl); margin: 0; }

	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}

	input[type='text'] {
		font-family: var(--font-body);
		font-size: var(--text-base);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--surface-overlay);
		outline: 2px solid transparent;
		transition: outline-color 150ms;
	}

	input[type='text']:focus { outline-color: var(--color-primary); }

	.emoji-input { width: 60px; text-align: center; }
	.color-input { width: 48px; height: 40px; border-radius: 8px; cursor: pointer; padding: 2px; }

	.row { display: flex; gap: var(--space-4); }

	.dialog-actions { display: flex; gap: var(--space-3); justify-content: flex-end; }

	.btn-primary {
		height: 44px;
		padding: 0 var(--space-4);
		border-radius: 10px;
		border: none;
		background: var(--color-primary);
		color: white;
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 500;
		cursor: pointer;
	}

	.btn-primary:disabled { opacity: 0.5; }

	.btn-ghost {
		height: 44px;
		padding: 0 var(--space-4);
		border-radius: 10px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		font-family: var(--font-body);
		font-size: var(--text-base);
		cursor: pointer;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-16) var(--space-4);
		text-align: center;
		color: var(--text-muted);
	}

	.empty-icon { font-size: 48px; }

	.hint { text-align: center; color: var(--text-muted); padding: var(--space-6); font-size: var(--text-sm); }

	.error-banner {
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
		color: var(--color-danger);
		border-radius: 10px;
		padding: var(--space-3);
		font-size: var(--text-sm);
		margin-bottom: var(--space-3);
	}
</style>
