<script lang="ts">
	import { _ } from 'svelte-i18n';
	import Icon from './Icon.svelte';
	import type { ListItem } from '$lib/stores/listStore';

	interface Props {
		item: ListItem;
		onCheck?: (id: string, checked: boolean) => void;
		// Kept for parent API compatibility; deletion happens via the detail sheet
		// (matches the Claude Design row, which has no inline delete button).
		onDelete?: (id: string) => void;
		onOpen?: (id: string) => void;
	}
	let { item, onCheck, onOpen }: Props = $props();

	const qtyLabel = $derived(
		item.quantity
			? `${item.quantity}${item.unit ? ' ' + $_('units.' + item.unit, { default: item.unit }) : ''}`
			: ''
	);
</script>

<div
	class="row"
	class:checked={item.checked}
	role="button"
	tabindex="0"
	onclick={() => onOpen?.(item.id)}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onOpen?.(item.id);
		}
	}}
>
	<button
		class="checkbox"
		class:on={item.checked}
		onclick={(e) => {
			e.stopPropagation();
			onCheck?.(item.id, !item.checked);
		}}
		aria-label={item.checked ? $_('item.uncheck') : $_('item.check')}
		aria-pressed={item.checked}
	>
		{#if item.checked}<Icon name="check" size={16} strokeWidth={3.2} />{/if}
	</button>

	<span class="cat-bar" style:background-color={item.category_color ?? 'var(--border-default)'}
	></span>

	<div class="name">
		<span class="name-text">{item.display_name}</span>
	</div>

	{#if qtyLabel}
		<div class="meta"><span class="badge-qty">{qtyLabel}</span></div>
	{/if}
</div>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 13px;
		padding: 12px 18px;
		min-height: 60px;
		cursor: pointer;
		background: var(--surface-base);
		transition: opacity 0.18s;
	}
	.row.checked {
		opacity: 0.6;
	}

	.checkbox {
		width: 26px;
		height: 26px;
		flex-shrink: 0;
		padding: 0;
		cursor: pointer;
		border-radius: 8px;
		border: 2px solid var(--border-default);
		background: transparent;
		display: grid;
		place-items: center;
		color: #fff;
		transition:
			background 0.18s,
			border-color 0.18s;
	}
	.checkbox.on {
		border-color: var(--emerald-500);
		background: var(--emerald-500);
		animation: checkPop 0.26s ease;
	}

	.cat-bar {
		width: 3.5px;
		height: 26px;
		border-radius: 2px;
		flex-shrink: 0;
	}
	.row.checked .cat-bar {
		opacity: 0.4;
	}

	.name {
		min-width: 0;
		flex: 1;
	}
	.name-text {
		display: block;
		font-size: 16px;
		font-weight: 500;
		color: var(--text-primary);
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.row.checked .name-text {
		color: var(--text-muted);
		text-decoration: line-through;
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}
	.badge-qty {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--surface-overlay);
		border-radius: 7px;
		padding: 3px 8px;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
</style>
