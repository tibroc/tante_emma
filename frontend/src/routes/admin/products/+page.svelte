<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/userStore';
	import { api } from '$lib/api';
	import { _ } from 'svelte-i18n';

	interface Product {
		id: string;
		name_de?: string;
		name_en?: string;
		brand?: string;
		barcode?: string;
		category_id?: string;
	}

	interface Category { id: string; name_de: string; icon: string; }

	let query = $state('');
	let products = $state<Product[]>([]);
	let categories = $state<Category[]>([]);
	let loading = $state(false);
	let dialogOpen = $state(false);
	let editTarget = $state<Product | null>(null);
	let saving = $state(false);
	let form = $state({ name_de: '', name_en: '', brand: '', barcode: '', category_id: '' });
	let debounce: ReturnType<typeof setTimeout>;

	onMount(async () => {
		if ($user?.role !== 'admin') { goto('/lists'); return; }
		try {
			const rows = await api.get<Category[]>('/api/categories');
			categories = rows;
		} catch { /* no categories endpoint yet, graceful */ }
	});

	function handleQueryInput() {
		clearTimeout(debounce);
		debounce = setTimeout(search, 250);
	}

	async function search() {
		if (query.trim().length < 1) { products = []; return; }
		loading = true;
		try {
			products = await api.get<Product[]>(`/api/products/search?q=${encodeURIComponent(query)}`);
		} finally {
			loading = false;
		}
	}

	function openCreate() {
		editTarget = null;
		form = { name_de: '', name_en: '', brand: '', barcode: '', category_id: '' };
		dialogOpen = true;
	}

	function openEdit(p: Product) {
		editTarget = p;
		form = {
			name_de: p.name_de ?? '',
			name_en: p.name_en ?? '',
			brand: p.brand ?? '',
			barcode: p.barcode ?? '',
			category_id: p.category_id ?? ''
		};
		dialogOpen = true;
	}

	async function saveProduct() {
		if (!form.name_de.trim() && !form.name_en.trim()) return;
		saving = true;
		try {
			if (editTarget) {
				await api.put(`/api/products/${editTarget.id}`, form);
				products = products.map((p) => p.id === editTarget!.id ? { ...p, ...form } : p);
			} else {
				const created = await api.post<Product>('/api/products', form);
				products = [created, ...products];
			}
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
			placeholder="Produkt suchen…"
			aria-label="Produkt suchen"
		/>
	</div>

	{#if loading}
		<p class="hint">Lade…</p>
	{:else}
		<ul class="product-list">
			{#each products as p (p.id)}
				<li class="product-row">
					<div class="product-info">
						<span class="product-name">{p.name_de ?? p.name_en}</span>
						{#if p.brand}<span class="product-brand">{p.brand}</span>{/if}
					</div>
					<button class="icon-btn" onclick={() => openEdit(p)} aria-label="Bearbeiten">✎</button>
				</li>
			{/each}
		</ul>
	{/if}
</main>

{#if dialogOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="backdrop" role="presentation" onclick={() => (dialogOpen = false)}></div>
	<div class="dialog" role="dialog" aria-modal="true">
		<h2>{editTarget ? 'Produkt bearbeiten' : 'Produkt anlegen'}</h2>
		<label>Name (DE)<input type="text" bind:value={form.name_de} placeholder="z.B. Äpfel" /></label>
		<label>Name (EN)<input type="text" bind:value={form.name_en} placeholder="e.g. Apples" /></label>
		<label>Marke<input type="text" bind:value={form.brand} placeholder="optional" /></label>
		<label>Barcode<input type="text" bind:value={form.barcode} placeholder="EAN-13" /></label>
		{#if categories.length > 0}
			<label>Kategorie
				<select bind:value={form.category_id}>
					<option value="">– keine –</option>
					{#each categories as c (c.id)}
						<option value={c.id}>{c.icon} {c.name_de}</option>
					{/each}
				</select>
			</label>
		{/if}
		<div class="dialog-actions">
			<button class="btn-ghost" onclick={() => (dialogOpen = false)}>Abbrechen</button>
			<button class="btn-primary" onclick={saveProduct} disabled={saving}>
				{saving ? '…' : 'Speichern'}
			</button>
		</div>
	</div>
{/if}

<style>
	.page { max-width: 600px; margin: 0 auto; padding: var(--space-4); }

	.page-header {
		display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4);
	}
	.back { font-size: var(--text-2xl); color: var(--text-secondary); text-decoration: none; }
	.page-header h1 { font-family: var(--font-display); font-size: var(--text-2xl); margin: 0; flex: 1; }

	.search-wrap { margin-bottom: var(--space-3); }
	input[type='search'] {
		width: 100%; font-family: var(--font-body); font-size: var(--text-base);
		padding: var(--space-2) var(--space-3); border: 1px solid var(--border-subtle);
		border-radius: 12px; background: var(--surface-overlay); color: var(--text-primary);
		outline: 2px solid transparent; transition: outline-color 150ms;
	}
	input[type='search']:focus { outline-color: var(--color-primary); }

	.product-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 2px; }
	.product-row {
		display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3);
		background: var(--surface-raised); border-radius: 10px; min-height: 52px;
	}
	.product-info { flex: 1; min-width: 0; }
	.product-name { font-size: var(--text-sm); font-weight: 500; color: var(--text-primary); }
	.product-brand { font-size: var(--text-xs); color: var(--text-muted); margin-left: var(--space-2); }
	.icon-btn {
		width: 36px; height: 36px; border-radius: 8px; border: none;
		background: var(--surface-overlay); color: var(--text-secondary); cursor: pointer;
	}
	.hint { text-align: center; color: var(--text-muted); padding: var(--space-8); }

	.backdrop { position: fixed; inset: 0; background: rgba(0 0 0 / 0.4); z-index: 200; }
	.dialog {
		position: fixed; bottom: 0; left: 0; right: 0; background: var(--surface-base);
		border-radius: 20px 20px 0 0; padding: var(--space-6) var(--space-4) calc(var(--space-6) + env(safe-area-inset-bottom));
		z-index: 201; display: flex; flex-direction: column; gap: var(--space-3);
		max-width: 640px; margin: 0 auto;
	}
	.dialog h2 { font-family: var(--font-display); font-size: var(--text-xl); margin: 0; }
	label { display: flex; flex-direction: column; gap: var(--space-1); font-size: var(--text-sm); color: var(--text-secondary); }
	label input, label select {
		font-family: var(--font-body); font-size: var(--text-base);
		padding: var(--space-2) var(--space-3); border: 1px solid var(--border-subtle);
		border-radius: 10px; background: var(--surface-overlay); color: var(--text-primary);
		outline: 2px solid transparent; transition: outline-color 150ms;
	}
	label input:focus, label select:focus { outline-color: var(--color-primary); }
	.dialog-actions { display: flex; gap: var(--space-3); justify-content: flex-end; }
	.btn-primary {
		height: 44px; padding: 0 var(--space-4); border-radius: 10px; border: none;
		background: var(--color-primary); color: white; font-family: var(--font-body);
		font-size: var(--text-base); font-weight: 500; cursor: pointer;
	}
	.btn-primary:disabled { opacity: 0.5; }
	.btn-ghost {
		height: 44px; padding: 0 var(--space-4); border-radius: 10px;
		border: 1px solid var(--border-subtle); background: transparent;
		color: var(--text-secondary); font-family: var(--font-body); font-size: var(--text-base); cursor: pointer;
	}
</style>
