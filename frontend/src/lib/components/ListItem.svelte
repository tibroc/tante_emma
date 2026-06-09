<script lang="ts">
	import type { ListItem } from '$lib/stores/listStore';

	interface Props {
		item: ListItem;
		onCheck?: (id: string, checked: boolean) => void;
		onDelete?: (id: string) => void;
	}
	let { item, onCheck, onDelete }: Props = $props();
</script>

<!-- TODO: full ListItem with swipe-to-delete (Phase 1 step 10) -->
<div class="list-item" class:checked={item.checked}>
	<button
		class="checkbox"
		onclick={() => onCheck?.(item.id, !item.checked)}
		aria-label={item.checked ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
		aria-pressed={item.checked}
	>
		{#if item.checked}✓{/if}
	</button>
	<div
		class="category-line"
		style:background-color={item.category?.color ?? 'var(--border-subtle)'}
	></div>
	<span class="name">{item.display_name ?? item.name_override ?? ''}</span>
</div>

<style>
	.list-item {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		min-height: 56px;
		padding: 0 var(--space-4);
		background: var(--surface-base);
		border-bottom: 1px solid var(--border-subtle);
		transition: opacity 120ms;
	}

	.list-item.checked {
		opacity: 0.6;
	}

	.list-item.checked .name {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.checkbox {
		width: 24px;
		height: 24px;
		border: 2px solid var(--border-default);
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		color: white;
		font-size: 14px;
		transition: background 120ms, border-color 120ms;
	}

	.list-item.checked .checkbox {
		background: var(--color-accent);
		border-color: var(--color-accent);
	}

	.category-line {
		width: 3px;
		height: 24px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.name {
		font-size: var(--text-base);
		color: var(--text-primary);
		flex: 1;
	}
</style>
