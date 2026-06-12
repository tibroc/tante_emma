<script lang="ts">
	import { untrack } from 'svelte';
	import { _ } from 'svelte-i18n';
	import type { ListItem } from '$lib/stores/listStore';

	interface Store {
		id: string;
		name: string;
		icon: string;
		color: string;
	}

	interface ItemPatch {
		quantity?: number | null;
		unit?: string;
		note?: string;
		store_id?: string; // '' clears the store
	}

	interface Props {
		item: ListItem;
		stores: Store[];
		isAdmin?: boolean;
		onUpdate?: (itemId: string, patch: ItemPatch) => void;
		onDelete?: (itemId: string) => void;
		onClose?: () => void;
	}
	let { item, stores, isAdmin = false, onUpdate, onDelete, onClose }: Props = $props();

	// Canonical unit codes; labels are localized (see units.* in the i18n bundles).
	const UNIT_CODES = ['pcs', 'g', 'kg', 'ml', 'l', 'pkg'];

	// Local editable copies — captured once at mount (the sheet is re-keyed per
	// item by the parent, so a fresh instance always sees the latest item).
	let quantity = $state<number | null>(untrack(() => item.quantity ?? null));
	let unit = $state<string>(untrack(() => item.unit ?? ''));
	let note = $state<string>(untrack(() => item.note ?? ''));

	// The effective selected store: an explicit item store_id wins, otherwise the
	// product's first preferred store is pre-selected (request part 2). A selection
	// is only persisted when the user actually taps a chip.
	let selectedStore = $state<string>(
		untrack(() => item.store_id ?? item.preferred_store_ids?.[0] ?? '')
	);

	const preferred = $derived(new Set(item.preferred_store_ids ?? []));

	let saveTimer: ReturnType<typeof setTimeout>;
	function scheduleSave() {
		clearTimeout(saveTimer);
		saveTimer = setTimeout(flush, 500);
	}
	function flush() {
		clearTimeout(saveTimer);
		onUpdate?.(item.id, {
			quantity: quantity === null || Number.isNaN(quantity) ? null : quantity,
			unit,
			note,
			store_id: selectedStore
		});
	}

	function pickStore(id: string) {
		selectedStore = id;
		flush(); // discrete choice → save immediately
	}
</script>

<div
	class="backdrop"
	role="presentation"
	onclick={() => {
		flush();
		onClose?.();
	}}
></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label={item.display_name}>
	<div class="handle" aria-hidden="true"></div>

	<div class="title-row">
		<h2 class="product-name">{item.display_name}</h2>
		{#if item.category_icon}
			<span
				class="cat-badge"
				style:background-color={item.category_color ?? 'var(--surface-overlay)'}
			>
				{item.category_icon}
			</span>
		{/if}
		<button
			class="close-btn"
			onclick={() => {
				flush();
				onClose?.();
			}}
			aria-label={$_('item_sheet.close')}>✕</button
		>
	</div>

	<hr />

	<div class="field">
		<span class="field-label">{$_('item_sheet.quantity')}</span>
		<div class="qty-row">
			<input
				type="number"
				min="0"
				step="any"
				inputmode="decimal"
				bind:value={quantity}
				oninput={scheduleSave}
				aria-label={$_('item_sheet.quantity')}
			/>
			<select bind:value={unit} onchange={flush} aria-label={$_('item_sheet.unit')}>
				<option value="">{$_('item_sheet.no_unit')}</option>
				{#each UNIT_CODES as code (code)}
					<option value={code}>{$_('units.' + code, { default: code })}</option>
				{/each}
			</select>
		</div>
	</div>

	<div class="field">
		<span class="field-label">{$_('item_sheet.store')}</span>
		<div class="store-chips">
			<button class="chip" class:active={selectedStore === ''} onclick={() => pickStore('')}
				>{$_('list.no_store')}</button
			>
			{#each stores as s (s.id)}
				<button class="chip" class:active={selectedStore === s.id} onclick={() => pickStore(s.id)}>
					<span aria-hidden="true">{s.icon}</span>
					{s.name}
					{#if preferred.has(s.id)}<span class="star" title={$_('item_sheet.preferred')}>★</span
						>{/if}
				</button>
			{/each}
		</div>
	</div>

	<div class="field">
		<span class="field-label">{$_('item_sheet.note')}</span>
		<input
			type="text"
			bind:value={note}
			oninput={scheduleSave}
			placeholder={$_('item_sheet.note_ph')}
			aria-label={$_('item_sheet.note')}
		/>
	</div>

	<hr />

	{#if isAdmin && item.product_id}
		<a class="edit-product" href="/admin/products">{$_('item_sheet.edit_product')}</a>
	{/if}
	<button class="delete-link" onclick={() => onDelete?.(item.id)}>{$_('item.delete')}</button>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0 0 0 / 0.4);
		backdrop-filter: blur(2px);
		z-index: 200;
	}

	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		max-width: 640px;
		margin: 0 auto;
		background: var(--surface-base);
		border-radius: 24px 24px 0 0;
		max-height: 80dvh;
		overflow-y: auto;
		padding: var(--space-3) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom));
		z-index: 201;
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.handle {
		width: 36px;
		height: 4px;
		background: var(--border-strong);
		border-radius: 2px;
		margin: var(--space-2) auto 0;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.product-name {
		font-family: var(--font-display);
		font-size: 22px;
		margin: 0;
		flex: 1;
		color: var(--text-primary);
	}

	.cat-badge {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 16px;
		flex-shrink: 0;
	}

	.close-btn {
		width: 32px;
		height: 32px;
		border: none;
		background: var(--surface-overlay);
		color: var(--text-secondary);
		border-radius: 8px;
		cursor: pointer;
		flex-shrink: 0;
	}

	hr {
		border: none;
		border-top: 1px solid var(--border-subtle);
		margin: 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.field-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-secondary);
	}

	.qty-row {
		display: flex;
		gap: var(--space-2);
	}

	.qty-row input {
		width: 100px;
	}

	.qty-row select {
		flex: 1;
	}

	input[type='number'],
	input[type='text'],
	select {
		font-family: var(--font-body);
		font-size: var(--text-base);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--surface-overlay);
		color: var(--text-primary);
		outline: 2px solid transparent;
		transition: outline-color 150ms;
	}

	input:focus,
	select:focus {
		outline-color: var(--color-primary);
	}

	.store-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.chip {
		height: 36px;
		padding: 0 var(--space-3);
		border-radius: 20px;
		border: 1px solid transparent;
		background: var(--surface-overlay);
		color: var(--text-secondary);
		font-family: var(--font-body);
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		transition:
			background 150ms,
			color 150ms,
			border-color 150ms;
	}

	.chip.active {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	.star {
		color: var(--color-warning);
		font-size: 12px;
	}

	.edit-product {
		font-size: var(--text-sm);
		color: var(--color-primary);
		text-decoration: none;
		padding: var(--space-2) 0;
	}

	.delete-link {
		align-self: flex-start;
		border: none;
		background: transparent;
		color: var(--color-danger);
		font-family: var(--font-body);
		font-size: var(--text-base);
		cursor: pointer;
		padding: var(--space-2) 0;
	}
</style>
