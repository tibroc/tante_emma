<script lang="ts">
	import { _ } from 'svelte-i18n';

	type SortMode = 'category' | 'date' | 'alpha';

	interface Store {
		id: string;
		name: string;
		icon: string;
		color: string;
	}

	interface Props {
		mode?: SortMode;
		onModeChange?: (mode: SortMode) => void;
		// Stores that have at least one item in the current list (parent-computed).
		stores?: Store[];
		activeStoreId?: string | null;
		onStoreFilter?: (storeId: string | null) => void;
	}
	let {
		mode = 'category',
		onModeChange,
		stores = [],
		activeStoreId = null,
		onStoreFilter
	}: Props = $props();

	const sortPills: { id: SortMode; label: string }[] = $derived([
		{ id: 'category', label: $_('sort.category') },
		{ id: 'date', label: $_('sort.date') },
		{ id: 'alpha', label: $_('sort.alpha') }
	]);

	function pickSort(id: SortMode) {
		onStoreFilter?.(null); // a sort choice clears any active store filter
		onModeChange?.(id);
	}

	function toggleStore(id: string) {
		onStoreFilter?.(activeStoreId === id ? null : id);
	}
</script>

<nav class="sort-bar" aria-label={$_('sort.aria_label')}>
	{#each sortPills as pill (pill.id)}
		<button
			class="pill"
			class:active={activeStoreId === null && mode === pill.id}
			onclick={() => pickSort(pill.id)}
		>
			{pill.label}
		</button>
	{/each}

	{#each stores as s (s.id)}
		<button
			class="pill store-pill"
			class:active={activeStoreId === s.id}
			onclick={() => toggleStore(s.id)}
		>
			<span aria-hidden="true">{s.icon}</span> {s.name}
		</button>
	{/each}
</nav>

<style>
	.sort-bar {
		display: flex;
		gap: var(--space-2);
		padding: 0 var(--space-4);
		height: 44px;
		align-items: center;
		overflow-x: auto;
		scrollbar-width: none;
		background: var(--surface-base);
		border-bottom: 1px solid var(--border-subtle);
	}

	.sort-bar::-webkit-scrollbar { display: none; }

	.pill {
		height: 32px;
		padding: 0 var(--space-3);
		border-radius: 20px;
		border: 1px solid transparent;
		background: var(--surface-overlay);
		color: var(--text-secondary);
		font-family: var(--font-body);
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		flex-shrink: 0;
		transition: background 150ms, color 150ms, border-color 150ms;
	}

	.pill.active {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
</style>
