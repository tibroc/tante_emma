<script lang="ts">
	interface Props {
		listId: string;
		onAdd?: (name: string) => void;
	}
	let { listId, onAdd }: Props = $props();

	let query = $state('');

	function handleAdd() {
		if (!query.trim()) return;
		onAdd?.(query.trim());
		query = '';
	}
</script>

<!-- TODO: full AddItemBar implementation (Phase 1 step 9) -->
<div class="add-bar" role="search">
	<input
		type="text"
		bind:value={query}
		placeholder="Hinzufügen…"
		aria-label="Artikel hinzufügen"
		onkeydown={(e) => e.key === 'Enter' && handleAdd()}
	/>
	<button
		class="add-btn"
		onclick={handleAdd}
		aria-label="Hinzufügen"
		disabled={!query.trim()}
	>+</button>
</div>

<style>
	.add-bar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		height: 56px;
		padding: 0 var(--space-4);
		background: var(--surface-base);
		border-bottom: 1px solid var(--border-subtle);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	input {
		flex: 1;
		font-family: var(--font-body);
		font-size: var(--text-base);
		background: var(--surface-overlay);
		border: none;
		border-radius: 12px;
		padding: var(--space-2) var(--space-3);
		outline: 2px solid transparent;
		transition: outline-color 150ms;
	}

	input:focus {
		outline-color: var(--color-primary);
	}

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
		transition: transform 80ms;
		flex-shrink: 0;
	}

	.add-btn:active { transform: scale(0.9); }
	.add-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
