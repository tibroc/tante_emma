<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/userStore';
	import { api } from '$lib/api';
	import { _ } from 'svelte-i18n';

	interface SearchResult {
		product_id: string;
		display_name: string;
		brand?: string;
		category?: { id: string; name_de: string; icon: string };
	}

	interface Product {
		id: string;
		name_de?: string;
		name_en?: string;
		brand?: string;
		barcode?: string;
		category_id?: string;
		preferred_store_ids?: string[];
	}

	interface Category {
		id: string;
		name_de: string;
		icon: string;
	}
	interface Store {
		id: string;
		name: string;
		icon: string;
		color: string;
	}

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let categories = $state<Category[]>([]);
	let stores = $state<Store[]>([]);
	let loading = $state(false);
	let dialogOpen = $state(false);
	let editTarget = $state<Product | null>(null);
	let saving = $state(false);
	let form = $state({ name_de: '', name_en: '', brand: '', barcode: '', category_id: '' });
	let selectedStores = $state<Set<string>>(new Set());
	let debounce: ReturnType<typeof setTimeout>;

	onMount(async () => {
		if ($user?.role !== 'admin') {
			goto('/lists');
			return;
		}
		try {
			[categories, stores] = await Promise.all([
				api.get<Category[]>('/api/categories'),
				api.get<Store[]>('/api/stores')
			]);
		} catch {
			/* graceful */
		}
	});

	function toggleStore(id: string) {
		const next = new Set(selectedStores);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedStores = next;
	}

	function handleQueryInput() {
		clearTimeout(debounce);
		debounce = setTimeout(search, 250);
	}

	async function search() {
		if (query.trim().length < 1) {
			results = [];
			return;
		}
		loading = true;
		try {
			results = await api.get<SearchResult[]>(
				`/api/products/search?q=${encodeURIComponent(query)}`
			);
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		editTarget = null;
		form = { name_de: '', name_en: '', brand: '', barcode: '', category_id: '' };
		selectedStores = new Set();
		dialogOpen = true;
	}

	async function openEdit(productId: string) {
		dialogOpen = true;
		editTarget = null;
		form = { name_de: '', name_en: '', brand: '', barcode: '', category_id: '' };
		selectedStores = new Set();
		try {
			const p = await api.get<Product>(`/api/products/${productId}`);
			editTarget = p;
			form = {
				name_de: p.name_de ?? '',
				name_en: p.name_en ?? '',
				brand: p.brand ?? '',
				barcode: p.barcode ?? '',
				category_id: p.category_id ?? ''
			};
			selectedStores = new Set(p.preferred_store_ids ?? []);
		} catch {
			dialogOpen = false;
		}
	}

	async function saveProduct() {
		if (!form.name_de.trim() && !form.name_en.trim()) return;
		saving = true;
		try {
			let productId: string;
			if (editTarget) {
				await api.put(`/api/products/${editTarget.id}`, form);
				productId = editTarget.id;
				// Refresh display name in results list
				results = results.map((r) =>
					r.product_id === editTarget!.id
						? { ...r, display_name: form.name_de || form.name_en, brand: form.brand }
						: r
				);
			} else {
				const created = await api.post<Product>('/api/products', form);
				productId = created.id;
			}
			// Persist preferred-store assignments (replaces the existing set).
			await api.put(`/api/products/${productId}/stores`, { store_ids: [...selectedStores] });
			if (!editTarget) await search();
			dialogOpen = false;
		} finally {
			saving = false;
		}
	}
</script>

<main class="page">
	<header class="page-header">
		<a href="/settings" class="back">‹</a>
		<h1>{$_('admin.products_title')}</h1>
		<button class="btn-primary" onclick={openCreate}>+</button>
	</header>

	<div class="search-wrap">
		<input
			type="search"
			bind:value={query}
			oninput={handleQueryInput}
			placeholder={$_('admin.product_search_ph')}
			aria-label={$_('admin.product_search_label')}
		/>
	</div>

	{#if loading}
		<p class="hint">{$_('list.loading')}</p>
	{:else}
		<ul class="product-list">
			{#each results as r (r.product_id)}
				<li class="product-row">
					<div class="product-info">
						<span class="product-name">{r.display_name}</span>
						{#if r.brand}<span class="product-brand">{r.brand}</span>{/if}
						{#if r.category}<span class="product-brand">{r.category.icon} {r.category.name_de}</span
							>{/if}
					</div>
					<button
						class="icon-btn"
						onclick={() => openEdit(r.product_id)}
						aria-label={$_('admin.product_edit')}>✎</button
					>
				</li>
			{/each}
		</ul>
	{/if}
</main>

{#if dialogOpen}
	<div class="backdrop" role="presentation" onclick={() => (dialogOpen = false)}></div>
	<div class="dialog" role="dialog" aria-modal="true">
		<h2>{editTarget ? $_('admin.product_edit') : $_('admin.product_create')}</h2>
		<label
			>{$_('admin.field_name_de')}<input
				type="text"
				bind:value={form.name_de}
				placeholder="z.B. Äpfel"
			/></label
		>
		<label
			>{$_('admin.field_name_en')}<input
				type="text"
				bind:value={form.name_en}
				placeholder="e.g. Apples"
			/></label
		>
		<label
			>{$_('admin.field_brand')}<input
				type="text"
				bind:value={form.brand}
				placeholder="optional"
			/></label
		>
		<label
			>{$_('admin.field_barcode')}<input
				type="text"
				bind:value={form.barcode}
				placeholder="EAN-13"
			/></label
		>
		{#if categories.length > 0}
			<label
				>{$_('admin.field_category')}
				<select bind:value={form.category_id}>
					<option value="">{$_('admin.no_category')}</option>
					{#each categories as c (c.id)}
						<option value={c.id}>{c.icon} {c.name_de}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if stores.length > 0}
			<div class="store-field">
				<span class="store-field-label">{$_('admin.field_preferred_stores')}</span>
				<div class="store-chips">
					{#each stores as s (s.id)}
						<button
							type="button"
							class="chip"
							class:active={selectedStores.has(s.id)}
							onclick={() => toggleStore(s.id)}
							aria-pressed={selectedStores.has(s.id)}
						>
							<span aria-hidden="true">{s.icon}</span>
							{s.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}
		<div class="dialog-actions">
			<button class="btn-ghost" onclick={() => (dialogOpen = false)}
				>{$_('stores.form.cancel')}</button
			>
			<button class="btn-primary" onclick={saveProduct} disabled={saving}>
				{saving ? '…' : $_('stores.form.save')}
			</button>
		</div>
	</div>
{/if}

<style>
	.page {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--space-4);
	}

	.page-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}
	.back {
		font-size: var(--text-2xl);
		color: var(--text-secondary);
		text-decoration: none;
	}
	.page-header h1 {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		margin: 0;
		flex: 1;
	}

	.search-wrap {
		margin-bottom: var(--space-3);
	}
	input[type='search'] {
		width: 100%;
		font-family: var(--font-body);
		font-size: var(--text-base);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--surface-overlay);
		color: var(--text-primary);
		outline: 2px solid transparent;
		transition: outline-color 150ms;
	}
	input[type='search']:focus {
		outline-color: var(--color-primary);
	}

	.product-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.product-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--surface-raised);
		border-radius: 10px;
		min-height: 52px;
	}
	.product-info {
		flex: 1;
		min-width: 0;
	}
	.product-name {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--text-primary);
	}
	.product-brand {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin-left: var(--space-2);
	}
	.icon-btn {
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: none;
		background: var(--surface-overlay);
		color: var(--text-secondary);
		cursor: pointer;
	}
	.hint {
		text-align: center;
		color: var(--text-muted);
		padding: var(--space-8);
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
		padding: var(--space-6) var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom));
		z-index: 201;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		max-width: 640px;
		margin: 0 auto;
	}
	.dialog h2 {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		margin: 0;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}
	label input,
	label select {
		font-family: var(--font-body);
		font-size: var(--text-base);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--surface-overlay);
		color: var(--text-primary);
		outline: 2px solid transparent;
		transition: outline-color 150ms;
	}
	label input:focus,
	label select:focus {
		outline-color: var(--color-primary);
	}
	.store-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.store-field-label {
		font-size: var(--text-sm);
		color: var(--text-secondary);
	}
	.store-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.chip {
		height: 36px;
		padding: 0 var(--space-3);
		border-radius: 20px;
		border: 1px solid transparent;
		background: var(--surface-overlay);
		color: var(--text-secondary);
		font-family: var(--font-body);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		transition:
			background 150ms,
			color 150ms,
			border-color 150ms;
	}
	.chip.active {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	.dialog-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: flex-end;
	}
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
	.btn-primary:disabled {
		opacity: 0.5;
	}
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
</style>
