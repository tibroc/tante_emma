<script lang="ts">
	type SortMode = 'category' | 'store' | 'date' | 'alpha';

	interface Props {
		mode?: SortMode;
		onModeChange?: (mode: SortMode) => void;
	}
	let { mode = 'category', onModeChange }: Props = $props();

	const pills: { id: SortMode; label: string }[] = [
		{ id: 'category', label: 'Kategorie' },
		{ id: 'store',    label: 'Laden' },
		{ id: 'date',     label: 'Datum' },
		{ id: 'alpha',    label: 'A–Z' }
	];
</script>

<nav class="sort-bar" aria-label="Sortierung">
	{#each pills as pill (pill.id)}
		<button
			class="pill"
			class:active={mode === pill.id}
			onclick={() => onModeChange?.(pill.id)}
		>
			{pill.label}
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
