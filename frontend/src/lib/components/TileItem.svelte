<script lang="ts">
	import type { ListItem } from '$lib/stores/listStore';

	interface Props {
		item: ListItem;
		onCheck?: (id: string, checked: boolean) => void;
	}
	let { item, onCheck }: Props = $props();
</script>

<!-- TODO: full TileItem (Phase 3 step 1) -->
<button
	class="tile"
	class:checked={item.checked}
	onclick={() => onCheck?.(item.id, !item.checked)}
>
	<span class="name">{item.display_name}</span>
</button>

<style>
	.tile {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-height: 80px;
		padding: var(--space-3) 14px;
		background: var(--surface-raised);
		border: none;
		border-left: 4px solid var(--border-subtle);
		border-radius: 16px;
		box-shadow: var(--shadow-sm);
		cursor: pointer;
		text-align: left;
		transition: transform 80ms, opacity 120ms;
		width: 100%;
	}

	.tile:active { transform: scale(0.95); }

	.tile.checked {
		opacity: 0.5;
		background: var(--surface-overlay);
		border-left-color: var(--border-subtle);
	}

	.tile.checked .name {
		text-decoration: line-through;
	}

	.name {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-primary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
