<script lang="ts">
	import { api, ApiError } from '$lib/api';
	import BarcodeScanner from './BarcodeScanner.svelte';

	interface Suggestion {
		product_id: string;
		display_name: string;
		brand?: string;
		category?: { id: string; name_de: string; icon: string; color: string };
	}

	interface Props {
		listId: string;
		onAdd?: (name: string, productId?: string, categoryId?: string) => void;
	}
	let { listId, onAdd }: Props = $props();

	let query = $state('');
	let suggestions = $state<Suggestion[]>([]);
	let focused = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let selectedIndex = $state(-1);
	let showScanner = $state(false);
	let scanLoading = $state(false);

	function handleInput() {
		clearTimeout(debounceTimer);
		selectedIndex = -1;
		if (query.trim().length < 1) {
			suggestions = [];
			return;
		}
		debounceTimer = setTimeout(async () => {
			try {
				const results = await api.get<Suggestion[]>(
					`/api/products/search?q=${encodeURIComponent(query)}&list_id=${listId}`
				);
				suggestions = results;
			} catch {
				suggestions = [];
			}
		}, 150);
	}

	function selectSuggestion(s: Suggestion) {
		onAdd?.(s.display_name, s.product_id, s.category?.id);
		query = '';
		suggestions = [];
	}

	function handleAdd() {
		if (selectedIndex >= 0 && suggestions[selectedIndex]) {
			selectSuggestion(suggestions[selectedIndex]);
		} else if (query.trim()) {
			onAdd?.(query.trim());
			query = '';
			suggestions = [];
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!suggestions.length) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			handleAdd();
		} else if (e.key === 'Escape') {
			suggestions = [];
			selectedIndex = -1;
		}
	}

	const showDropdown = $derived(focused && (suggestions.length > 0 || query.trim().length > 0));

	async function handleScan(barcode: string) {
		showScanner = false;
		scanLoading = true;
		try {
			const p = await api.get<{
				id: string;
				name_de?: string;
				name_en?: string;
				brand?: string;
			}>(`/api/products/barcode/${encodeURIComponent(barcode)}`);
			const displayName = p.name_de ?? p.name_en ?? barcode;
			onAdd?.(displayName, p.id);
		} catch (e) {
			// 404 = unknown barcode → let the user type a name
			if (!(e instanceof ApiError && e.status === 404)) {
				console.error('barcode lookup:', e);
			}
			query = barcode;
		} finally {
			scanLoading = false;
		}
	}
</script>

<div class="add-bar-wrapper">
	<div class="add-bar" role="search">
		<span class="search-icon" aria-hidden="true">🔍</span>
		<input
			type="text"
			bind:value={query}
			placeholder="Hinzufügen…"
			aria-label="Artikel hinzufügen"
			aria-autocomplete="list"
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={() => (focused = true)}
			onblur={() => setTimeout(() => (focused = false), 150)}
		/>
		<button
			class="scan-btn"
			onclick={() => (showScanner = true)}
			aria-label="Barcode scannen"
			disabled={scanLoading}
		>{scanLoading ? '…' : '▦'}</button>
		<button
			class="add-btn"
			onclick={handleAdd}
			aria-label="Hinzufügen"
		>+</button>
	</div>

	{#if showScanner}
		<BarcodeScanner onScan={handleScan} onClose={() => (showScanner = false)} />
	{/if}

	{#if showDropdown}
		<ul class="suggestions" role="listbox" aria-label="Vorschläge">
			{#each suggestions as s, i (s.product_id)}
				<li
					role="option"
					aria-selected={selectedIndex === i}
					class:selected={selectedIndex === i}
					onmousedown={() => selectSuggestion(s)}
				>
					<span class="dot" style:background-color={s.category?.color ?? 'var(--border-subtle)'}></span>
					<span class="sug-name">{s.display_name}</span>
					{#if s.brand}<span class="sug-brand">{s.brand}</span>{/if}
					{#if s.category}<span class="sug-cat">{s.category.icon} {s.category.name_de}</span>{/if}
				</li>
			{/each}
			{#if query.trim()}
				<li
					role="option"
					aria-selected={false}
					class="create-row"
					onmousedown={() => { onAdd?.(query.trim()); query = ''; suggestions = []; }}
				>
					<span class="create-plus">+</span>
					<span>„{query.trim()}" hinzufügen</span>
				</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	.add-bar-wrapper {
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.add-bar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		height: 56px;
		padding: 0 var(--space-4);
		background: var(--surface-base);
		border-bottom: 1px solid var(--border-subtle);
		box-shadow: var(--shadow-sm);
	}

	.search-icon { font-size: 20px; flex-shrink: 0; }

	input {
		flex: 1;
		font-family: var(--font-body);
		font-size: var(--text-base); /* 16px prevents iOS zoom */
		background: var(--surface-overlay);
		border: none;
		border-radius: 12px;
		padding: var(--space-2) var(--space-3);
		outline: 2px solid transparent;
		transition: outline-color 150ms;
	}

	input:focus { outline-color: var(--color-primary); }

	.scan-btn {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		border: 1px solid var(--border-subtle);
		background: var(--surface-overlay);
		color: var(--text-secondary);
		font-size: 18px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.scan-btn:disabled { opacity: 0.5; }

	.add-btn {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: none;
		background: var(--color-primary);
		color: white;
		font-size: 20px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: transform 80ms;
	}

	.add-btn:active { transform: scale(0.9); }

	.suggestions {
		position: absolute;
		left: 0;
		right: 0;
		background: var(--surface-base);
		border: 1px solid var(--border-subtle);
		border-top: none;
		border-radius: 0 0 16px 16px;
		box-shadow: var(--shadow-lg);
		max-height: 320px;
		overflow-y: auto;
		list-style: none;
		margin: 0;
		padding: 0;
		z-index: 99;
	}

	.suggestions li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		height: 56px;
		padding: 0 var(--space-4);
		cursor: pointer;
		transition: background 80ms;
	}

	.suggestions li:hover,
	.suggestions li.selected { background: var(--surface-raised); }

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.sug-name { font-size: var(--text-base); color: var(--text-primary); flex: 1; }
	.sug-brand { font-size: var(--text-sm); color: var(--text-muted); }
	.sug-cat { font-size: var(--text-xs); color: var(--text-muted); margin-left: auto; }

	.create-row {
		height: 48px;
		color: var(--color-primary);
		font-style: italic;
		font-size: var(--text-sm);
	}

	.create-plus {
		font-size: 18px;
		font-style: normal;
		color: var(--color-primary);
	}
</style>
