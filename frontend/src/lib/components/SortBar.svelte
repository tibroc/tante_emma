<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Icon from './Icon.svelte';

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
		viewMode?: 'list' | 'tile';
		onViewChange?: () => void;
	}
	let {
		mode = 'category',
		onModeChange,
		stores = [],
		activeStoreId = null,
		onStoreFilter,
		viewMode = 'list',
		onViewChange
	}: Props = $props();

	const sortPills: { id: SortMode; label: string; icon?: string }[] = $derived([
		{ id: 'category', label: $_('sort.category'), icon: 'rows' },
		{ id: 'date', label: $_('sort.date'), icon: 'clock' },
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

<nav class="sort-bar scroll" aria-label={$_('sort.aria_label')}>
	<div class="pills-scroll">
		{#each sortPills as pill (pill.id)}
			<button
				class="pill"
				class:active={activeStoreId === null && mode === pill.id}
				onclick={() => pickSort(pill.id)}
			>
				{#if pill.icon}<Icon name={pill.icon} size={15} strokeWidth={2} />{/if}
				{pill.label}
			</button>
		{/each}

		{#each stores as s (s.id)}
			<button
				class="pill store-pill"
				class:active={activeStoreId === s.id}
				onclick={() => toggleStore(s.id)}
			>
				<span aria-hidden="true">{s.icon}</span>
				{s.name}
			</button>
		{/each}
	</div>

	{#if onViewChange}
		<button
			class="view-btn"
			onclick={onViewChange}
			aria-label={viewMode === 'list' ? $_('list.tile_view') : $_('list.list_view')}
		>
			<Icon name={viewMode === 'tile' ? 'rows' : 'grid'} size={18} strokeWidth={2} />
		</button>
	{/if}
</nav>

<style>
	.sort-bar {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 16px 12px;
	}

	.pills-scroll {
		display: flex;
		gap: 8px;
		flex: 1;
		overflow-x: auto;
		align-items: center;
	}
	.pills-scroll::-webkit-scrollbar {
		display: none;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 32px;
		padding: 0 13px;
		border-radius: 20px;
		white-space: nowrap;
		cursor: pointer;
		flex-shrink: 0;
		border: 1px solid var(--border-subtle);
		background: var(--surface-base);
		color: var(--text-secondary);
		font-family: var(--font-body);
		font-size: 13.5px;
		font-weight: 600;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}

	.pill.active {
		border-color: var(--accent);
		background: var(--accent-light);
		color: var(--accent);
	}

	.view-btn {
		width: 36px;
		height: 32px;
		border-radius: 10px;
		flex-shrink: 0;
		cursor: pointer;
		border: 1px solid var(--border-subtle);
		background: var(--surface-base);
		color: var(--text-secondary);
		display: grid;
		place-items: center;
	}
</style>
