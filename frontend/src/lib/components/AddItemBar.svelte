<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { api, ApiError } from '$lib/api';
	import Icon from './Icon.svelte';
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
				category_id?: string;
			}>(`/api/products/barcode/${encodeURIComponent(barcode)}`);
			const displayName = p.name_de ?? p.name_en ?? barcode;
			onAdd?.(displayName, p.id, p.category_id);
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
	<div class="add-bar" class:focused role="search">
		<span class="search-icon" aria-hidden="true"><Icon name="search" size={19} /></span>
		<input
			type="text"
			bind:value={query}
			placeholder={$_('add_item.placeholder')}
			aria-label={$_('add_item.aria_input')}
			aria-autocomplete="list"
			oninput={handleInput}
			onkeydown={handleKeydown}
			onfocus={() => (focused = true)}
			onblur={() => setTimeout(() => (focused = false), 150)}
		/>
		<button
			class="scan-btn"
			onclick={() => (showScanner = true)}
			aria-label={$_('add_item.aria_scan')}
			disabled={scanLoading}
		>
			{#if scanLoading}…{:else}<Icon name="camera" size={21} />{/if}
		</button>
		<button class="add-btn" onclick={handleAdd} aria-label={$_('add_item.aria_add')}>
			<Icon name="plus" size={20} strokeWidth={2.4} />
		</button>
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
					{#if s.category}
						<span
							class="cat-chip"
							style="color:{s.category.color}; background:color-mix(in oklab, {s.category
								.color} 15%, var(--surface-base))">{s.category.icon}</span
						>
					{:else}
						<span class="dot" style:background-color="var(--border-subtle)"></span>
					{/if}
					<span class="sug-main">
						<span class="sug-name"
							>{s.display_name}{#if s.brand}<span class="sug-brand"> · {s.brand}</span>{/if}</span
						>
						{#if s.category}<span class="sug-cat">{s.category.name_de}</span>{/if}
					</span>
				</li>
			{/each}
			{#if query.trim()}
				<li
					role="option"
					aria-selected={false}
					class="create-row"
					onmousedown={() => {
						onAdd?.(query.trim());
						query = '';
						suggestions = [];
					}}
				>
					<span class="create-plus"><Icon name="plus" size={18} strokeWidth={2.4} /></span>
					<span>„{query.trim()}" hinzufügen</span>
				</li>
			{/if}
		</ul>
	{/if}
</div>

<style>
	.add-bar-wrapper {
		position: relative;
		padding: 0 16px 12px;
	}

	.add-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 50px;
		padding: 0 8px 0 14px;
		background: var(--surface-overlay);
		border-radius: 15px;
		color: var(--text-muted);
		outline: 2px solid transparent;
		transition: outline-color 0.15s;
	}
	.add-bar.focused {
		outline-color: var(--accent);
		box-shadow: var(--shadow-md);
		color: var(--accent);
	}

	.search-icon {
		flex-shrink: 0;
		display: grid;
		place-items: center;
	}

	input {
		flex: 1;
		min-width: 0;
		border: none;
		outline: none;
		background: transparent;
		font-family: var(--font-body);
		font-size: 16px; /* prevents iOS zoom */
		font-weight: 500;
		color: var(--text-primary);
	}

	.scan-btn {
		width: 34px;
		height: 34px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}
	.scan-btn:disabled {
		opacity: 0.5;
	}

	.add-btn {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		border: none;
		flex-shrink: 0;
		background: linear-gradient(145deg, var(--accent), var(--accent-600));
		color: #fff;
		cursor: pointer;
		display: grid;
		place-items: center;
		box-shadow: var(--shadow-pop);
		transition: transform 0.08s;
	}
	.add-btn:active {
		transform: scale(0.9);
	}

	.suggestions {
		position: absolute;
		left: 16px;
		right: 16px;
		top: 54px;
		background: var(--surface-base);
		border: 1px solid var(--border-subtle);
		border-radius: 16px;
		box-shadow: var(--shadow-lg);
		max-height: 320px;
		overflow-y: auto;
		list-style: none;
		margin: 0;
		padding: 0;
		z-index: 99;
		animation: suggIn 0.16s ease;
	}

	.suggestions li {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 10px 14px;
		cursor: pointer;
		border-bottom: 1px solid var(--border-subtle);
		transition: background 80ms;
	}
	.suggestions li:last-child {
		border-bottom: none;
	}
	.suggestions li:hover,
	.suggestions li.selected {
		background: var(--surface-raised);
	}

	.cat-chip {
		width: 30px;
		height: 30px;
		border-radius: 10px;
		flex-shrink: 0;
		display: grid;
		place-items: center;
		font-size: 16px;
	}
	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.sug-main {
		display: flex;
		flex-direction: column;
		min-width: 0;
		flex: 1;
	}
	.sug-name {
		font-size: 15px;
		font-weight: 500;
		color: var(--text-primary);
	}
	.sug-brand {
		color: var(--text-muted);
		font-weight: 400;
	}
	.sug-cat {
		font-size: 11.5px;
		color: var(--text-muted);
	}

	.create-row {
		background: var(--accent-tint);
	}
	.create-plus {
		width: 30px;
		height: 30px;
		border-radius: 9px;
		display: grid;
		place-items: center;
		background: var(--accent);
		color: #fff;
		flex-shrink: 0;
	}
	.create-row span:last-child {
		font-size: 14.5px;
		color: var(--accent);
		font-weight: 600;
		white-space: nowrap;
	}
</style>
