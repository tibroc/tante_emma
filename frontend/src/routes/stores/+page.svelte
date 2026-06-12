<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { _ } from 'svelte-i18n';
	import { user } from '$lib/stores/userStore';

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

	interface Category { id: string; name_de: string; icon: string; }

	let stores = $state<Store[]>([]);
	let loading = $state(true);
	let errorMsg = $state('');

	// Bulk "assign category → store" tool (admin only).
	let categories = $state<Category[]>([]);
	let bulkCategory = $state('');
	let bulkStore = $state('');
	let bulkBusy = $state(false);
	let bulkMessage = $state('');

	async function assignByCategory() {
		if (!bulkCategory || !bulkStore) return;
		bulkBusy = true;
		bulkMessage = '';
		try {
			const res = await api.put<{ assigned: number }>('/api/products/by-category/stores', {
				category_id: bulkCategory,
				store_id: bulkStore
			});
			bulkMessage = $_('stores.bulk_done', { values: { n: res.assigned } });
		} catch {
			bulkMessage = $_('stores.bulk_error');
		} finally {
			bulkBusy = false;
		}
	}

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
			if ($user?.role === 'admin') {
				categories = await api.get<Category[]>('/api/categories').catch(() => [] as Category[]);
			}
		} catch {
			errorMsg = $_('stores.load_error');
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
			errorMsg = $_('stores.save_error');
		} finally {
			saving = false;
		}
	}

	async function deleteStore(id: string) {
		if (!confirm($_('stores.confirm_delete'))) return;
		try {
			await api.delete(`/api/stores/${id}`);
			stores = stores.filter((s) => s.id !== id);
			if (shelfStoreId === id) shelfStoreId = null;
		} catch {
			errorMsg = $_('stores.delete_error');
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
			errorMsg = $_('stores.shelf_error');
		}
	}
</script>

<div class="page">
	<header class="page-header">
		<h1>{$_('stores.title')}</h1>
		<button class="btn-primary" onclick={openCreate}>{$_('stores.add')}</button>
	</header>

	{#if errorMsg}
		<p class="error-banner">{errorMsg}</p>
	{/if}

	{#if loading}
		<p class="hint">{$_('list.loading')}</p>
	{:else if stores.length === 0}
		<div class="empty">
			<span class="empty-icon">🏪</span>
			<p>{$_('stores.empty')}</p>
			<button class="btn-primary" onclick={openCreate}>{$_('stores.create_first')}</button>
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
						<button class="icon-btn" onclick={() => toggleShelf(s.id)} aria-label={$_('stores.shelf_order')}>
							{shelfStoreId === s.id ? '▲' : '☰'}
						</button>
						<button class="icon-btn" onclick={() => openEdit(s)} aria-label={$_('stores.edit')}>✎</button>
						<button class="icon-btn danger" onclick={() => deleteStore(s.id)} aria-label={$_('stores.delete')}>✕</button>
					</div>
				</li>

				{#if shelfStoreId === s.id}
					<li class="shelf-panel">
						{#if shelfLoading}
							<p class="hint">{$_('list.loading')}</p>
						{:else if shelfRows.length === 0}
							<p class="hint">{$_('stores.no_categories')}</p>
						{:else}
							<p class="shelf-hint">{$_('stores.shelf_hint')}</p>
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

	{#if $user?.role === 'admin' && stores.length > 0 && categories.length > 0}
		<section class="bulk-tool">
			<h2 class="bulk-title">{$_('stores.bulk_title')}</h2>
			<p class="bulk-hint">{$_('stores.bulk_hint')}</p>
			<div class="bulk-row">
				<select bind:value={bulkCategory} aria-label={$_('stores.bulk_category')}>
					<option value="">{$_('stores.bulk_category')}</option>
					{#each categories as c (c.id)}
						<option value={c.id}>{c.icon} {c.name_de}</option>
					{/each}
				</select>
				<span class="bulk-arrow" aria-hidden="true">→</span>
				<select bind:value={bulkStore} aria-label={$_('stores.bulk_store')}>
					<option value="">{$_('stores.bulk_store')}</option>
					{#each stores as s (s.id)}
						<option value={s.id}>{s.icon} {s.name}</option>
					{/each}
				</select>
				<button
					class="btn-primary"
					onclick={assignByCategory}
					disabled={bulkBusy || !bulkCategory || !bulkStore}
				>{bulkBusy ? '…' : $_('stores.bulk_assign')}</button>
			</div>
			{#if bulkMessage}<p class="bulk-message">{bulkMessage}</p>{/if}
		</section>
	{/if}
</div>

{#if dialogOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="backdrop" role="presentation" onclick={() => (dialogOpen = false)}></div>
	<div class="dialog" role="dialog" aria-modal="true">
		<h2>{editTarget ? $_('stores.form.edit') : $_('stores.form.create')}</h2>
		<label>
			{$_('stores.form.name')}
			<input type="text" bind:value={form.name} placeholder={$_('stores.form.name_ph')} />
		</label>
		<div class="row">
			<label>
				{$_('stores.form.emoji')}
				<input type="text" bind:value={form.icon} maxlength="2" class="emoji-input" />
			</label>
			<label>
				{$_('stores.form.color')}
				<input type="color" bind:value={form.color} class="color-input" />
			</label>
		</div>
		<label>
			{$_('stores.form.address')}
			<input type="text" bind:value={form.address} placeholder={$_('stores.form.address_ph')} />
		</label>
		<div class="dialog-actions">
			<button class="btn-ghost" onclick={() => (dialogOpen = false)}>{$_('stores.form.cancel')}</button>
			<button class="btn-primary" onclick={saveStore} disabled={saving || !form.name.trim()}>
				{saving ? '…' : $_('stores.form.save')}
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

	.bulk-tool {
		margin-top: var(--space-6);
		padding: var(--space-4);
		background: var(--surface-raised);
		border-radius: 12px;
	}

	.bulk-title {
		font-family: var(--font-display);
		font-size: var(--text-lg);
		margin: 0 0 var(--space-1);
	}

	.bulk-hint {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0 0 var(--space-3);
	}

	.bulk-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.bulk-row select {
		flex: 1;
		min-width: 120px;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--surface-overlay);
		color: var(--text-primary);
	}

	.bulk-arrow { color: var(--text-muted); }

	.bulk-message {
		font-size: var(--text-sm);
		color: var(--text-secondary);
		margin: var(--space-3) 0 0;
	}
</style>
