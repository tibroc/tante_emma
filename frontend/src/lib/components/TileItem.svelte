<script lang="ts">
	import type { ListItem } from '$lib/stores/listStore';

	interface Props {
		item: ListItem;
		onCheck?: (id: string, checked: boolean) => void;
		onDelete?: (id: string) => void;
	}
	let { item, onCheck, onDelete }: Props = $props();

	const accent = $derived(item.category_color ?? 'var(--border-subtle)');
</script>

<div class="tile" class:checked={item.checked} style:--accent={accent}>
	<div class="tile-top">
		{#if item.category_icon}
			<span class="cat-icon">{item.category_icon}</span>
		{/if}
		<button
			class="delete-btn"
			onclick={(e) => { e.stopPropagation(); onDelete?.(item.id); }}
			aria-label="Artikel entfernen"
		>✕</button>
	</div>

	<button
		class="check-area"
		onclick={() => onCheck?.(item.id, !item.checked)}
		aria-label={item.checked ? 'Als unerledigt markieren' : 'Als erledigt markieren'}
		aria-pressed={item.checked}
	>
		<span class="name">{item.display_name}</span>
		{#if item.quantity}
			<span class="qty">{item.quantity}{item.unit ? ' ' + item.unit : ''}</span>
		{/if}
	</button>

	<div class="tile-check-indicator">
		{#if item.checked}<span class="checkmark">✓</span>{/if}
	</div>
</div>

<style>
	.tile {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 96px;
		padding: var(--space-2) var(--space-3) var(--space-3);
		background: var(--surface-raised);
		border: none;
		border-top: 3px solid var(--accent);
		border-radius: 14px;
		box-shadow: var(--shadow-sm);
		transition: opacity 150ms;
		overflow: hidden;
	}

	.tile.checked {
		opacity: 0.5;
	}

	.tile-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-1);
		min-height: 28px;
	}

	.cat-icon {
		font-size: 16px;
		line-height: 1;
	}

	.delete-btn {
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		color: var(--text-muted);
		font-size: 12px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		padding: 0;
		margin-left: auto;
		transition: background 100ms, color 100ms;
	}

	.delete-btn:hover {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		color: var(--color-danger);
	}

	.check-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-1);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		text-align: left;
		width: 100%;
	}

	.name {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.3;
	}

	.tile.checked .name {
		text-decoration: line-through;
		color: var(--text-muted);
	}

	.qty {
		font-size: var(--text-xs);
		color: var(--text-muted);
	}

	.tile-check-indicator {
		position: absolute;
		bottom: var(--space-2);
		right: var(--space-2);
	}

	.checkmark {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-accent);
		color: white;
		font-size: 11px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
