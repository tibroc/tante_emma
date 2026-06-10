<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { ulid } from '$lib/ulid';
	import { user } from '$lib/stores/userStore';
	import { items, type ListItem } from '$lib/stores/listStore';
	import { subscribe, unsubscribe, onMessage, onReconnect } from '$lib/ws';
	import { enqueue, drainQueue, pendingCount } from '$lib/offline/eventQueue';
	import { syncStatus } from '$lib/stores/syncStore';
	import AddItemBar from '$lib/components/AddItemBar.svelte';
	import ListItemRow from '$lib/components/ListItem.svelte';
	import SortBar from '$lib/components/SortBar.svelte';

	interface Store { id: string; name: string; icon: string; color: string; }
	interface ShelfEntry { category_id: string; position: number; }

	const listId = $derived(page.params.id ?? '');

	let listName = $state('');
	let loading = $state(true);
	let toastMessage = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;

	// Sorting
	let sortMode = $state<'category' | 'store' | 'date' | 'alpha'>('category');
	let stores = $state<Store[]>([]);
	let selectedStoreId = $state<string | null>(null);
	let shelfOrder = $state<Map<string, number>>(new Map());

	// Group items: unchecked first, then checked.
	const unchecked = $derived(sortedItems($items.filter((i) => !i.checked)));
	const checked   = $derived(sortedItems($items.filter((i) => i.checked)));
	let showChecked = $state(false);

	onMount(async () => {
		await loadList();
		loading = false;
		subscribe(listId);
	});

	// Drain any pending offline events first so the server snapshot reflects
	// them, then fetch the authoritative list state.
	async function loadList() {
		console.log('[list] loadList start, listId=', listId, 'online=', navigator.onLine);
		try {
			const n = await drainQueue(listId);
			if (n > 0) syncStatus.set('online');
		} catch (e) {
			console.warn('[list] drainQueue failed (still offline?):', e);
		}

		// If events remain queued (drain failed), do NOT overwrite the local
		// store with the server snapshot — that would visually discard them.
		let remaining = 0;
		try {
			remaining = await pendingCount(listId);
		} catch (e) {
			console.warn('[list] pendingCount failed:', e);
		}

		try {
			const [data, storeList] = await Promise.all([
				api.get<{ list: { name: string }; items: ListItem[] }>(`/api/lists/${listId}`),
				api.get<Store[]>('/api/stores').catch(() => [] as Store[])
			]);
			listName = data.list.name;
			stores = storeList;
			if (remaining === 0) {
				items.set(data.items);
				console.log('[list] snapshot applied,', data.items.length, 'items');
			} else {
				console.warn('[list] keeping optimistic state,', remaining, 'events still queued');
			}
		} catch (e) {
			console.warn('[list] snapshot fetch failed (offline?):', e);
		}
	}

	async function handleSortModeChange(mode: typeof sortMode) {
		sortMode = mode;
		if (mode === 'store' && stores.length > 0 && !selectedStoreId) {
			selectedStoreId = stores[0].id;
			await loadShelfOrder(stores[0].id);
		}
	}

	async function handleStoreChange(storeId: string) {
		selectedStoreId = storeId;
		await loadShelfOrder(storeId);
	}

	async function loadShelfOrder(storeId: string) {
		try {
			const rows = await api.get<ShelfEntry[]>(`/api/stores/${storeId}/shelf-order`);
			shelfOrder = new Map(rows.map((r) => [r.category_id, r.position]));
		} catch {
			shelfOrder = new Map();
		}
	}

	function sortedItems(list: ListItem[]): ListItem[] {
		return [...list].sort((a, b) => {
			switch (sortMode) {
				case 'alpha':
					return (a.display_name ?? '').localeCompare(b.display_name ?? '', 'de');
				case 'date':
					return b.added_at - a.added_at;
				case 'store': {
					const posA = a.category_id ? (shelfOrder.get(a.category_id) ?? 999) : 999;
					const posB = b.category_id ? (shelfOrder.get(b.category_id) ?? 999) : 999;
					return posA - posB;
				}
				default:
					return a.sort_order - b.sort_order;
			}
		});
	}

	// On WS (re)connect, drain the offline queue and reload the snapshot.
	const unsubReconnect = onReconnect(() => loadList());

	// Handle real-time events from other users.
	const unsub = onMessage((msg) => {
		if (msg.type !== 'event') return;
		const ev = (msg as { type: 'event'; event: { type: string; payload: Record<string, unknown> } }).event;
		applyEvent(ev);
	});

	onDestroy(() => {
		unsubscribe(listId);
		unsub();
		unsubReconnect();
	});

	function applyEvent(ev: { type: string; payload: Record<string, unknown> }) {
		items.update((current) => {
			switch (ev.type) {
				case 'item.added': {
					const p = ev.payload as { item_id: string; name_override?: string; product_id?: string; category_id?: string; quantity?: number; unit?: string };
					const exists = current.find((i) => i.id === p.item_id);
					if (exists) return current;
					const newItem: ListItem = {
						id: p.item_id,
						list_id: listId,
						product_id: p.product_id,
						name_override: p.name_override,
						quantity: p.quantity,
						unit: p.unit,
						checked: false,
						added_by: '',
						added_at: Date.now(),
						sort_order: 0,
						category_id: p.category_id,
						display_name: p.name_override ?? ''
					};
					return [newItem, ...current];
				}
				case 'item.checked': {
					const p = ev.payload as { item_id: string };
					return current.map((i) => i.id === p.item_id ? { ...i, checked: true } : i);
				}
				case 'item.unchecked': {
					const p = ev.payload as { item_id: string };
					return current.map((i) => i.id === p.item_id ? { ...i, checked: false } : i);
				}
				case 'item.deleted': {
					const p = ev.payload as { item_id: string };
					return current.filter((i) => i.id !== p.item_id);
				}
				case 'list.cleared':
					return current.filter((i) => !i.checked);
				default:
					return current;
			}
		});
	}

	interface ServerEvent { type: string; payload: Record<string, unknown> }

	async function submitEvent(
		eventId: string,
		type: string,
		payload: Record<string, unknown>
	): Promise<ServerEvent[] | undefined> {
		const event = {
			id: eventId,
			type,
			list_id: listId,
			user_id: $user!.id,
			payload,
			client_ts: Date.now()
		};
		if ($syncStatus === 'offline' || !navigator.onLine) {
			console.log('[list] submitEvent offline-branch, enqueue', type);
			await enqueue(event);
			return undefined;
		}
		try {
			const res = await api.post<{ events: ServerEvent[] }>(`/api/lists/${listId}/events`, event);
			console.log('[list] submitEvent posted', type);
			return res.events;
		} catch (e) {
			console.warn('[list] submitEvent POST failed, enqueue', type, e);
			await enqueue(event);
			syncStatus.set('offline');
			return undefined;
		}
	}

	async function handleAdd(name: string, productId?: string, categoryId?: string) {
		if (!$user) return;
		const itemId = ulid();

		// Optimistic update — include product/category so store-sort works immediately.
		const optimistic: ListItem = {
			id: itemId,
			list_id: listId,
			product_id: productId,
			name_override: productId ? undefined : name,
			checked: false,
			added_by: $user.id,
			added_at: Date.now(),
			sort_order: 0,
			category_id: categoryId,
			display_name: name
		};
		items.update((ls) => [optimistic, ...ls]);

		const payload: Record<string, unknown> = { item_id: itemId };
		if (productId) {
			payload.product_id = productId;
		} else {
			payload.name_override = name;
		}
		if (categoryId) payload.category_id = categoryId;

		try {
			const serverEvents = await submitEvent(itemId, 'item.added', payload);
			// The server resolves a category for typed items; patch it onto the
			// optimistic row so store-sort works without waiting for a reload.
			const resolved = serverEvents?.find(
				(e) => e.type === 'item.added' && (e.payload as { item_id?: string }).item_id === itemId
			);
			const resolvedCat = resolved?.payload.category_id as string | undefined;
			if (resolvedCat) {
				items.update((ls) => ls.map((i) => (i.id === itemId ? { ...i, category_id: resolvedCat } : i)));
			}
		} catch {
			items.update((ls) => ls.filter((i) => i.id !== itemId));
			showToast('Konnte nicht synchronisiert werden');
		}
	}

	async function handleCheck(itemId: string, checked: boolean) {
		if (!$user) return;
		const type = checked ? 'item.checked' : 'item.unchecked';

		// Optimistic update.
		items.update((ls) => ls.map((i) => (i.id === itemId ? { ...i, checked } : i)));

		try {
			await submitEvent(ulid(), type, { item_id: itemId });
		} catch {
			items.update((ls) => ls.map((i) => (i.id === itemId ? { ...i, checked: !checked } : i)));
			showToast('Konnte nicht synchronisiert werden');
		}
	}

	async function handleDelete(itemId: string) {
		if (!$user) return;
		const snapshot = $items.find((i) => i.id === itemId);
		items.update((ls) => ls.filter((i) => i.id !== itemId));

		try {
			await submitEvent(ulid(), 'item.deleted', { item_id: itemId });
			showToast('Entfernt');
		} catch {
			if (snapshot) items.update((ls) => [...ls, snapshot]);
			showToast('Konnte nicht synchronisiert werden');
		}
	}

	async function clearChecked() {
		if (!$user || checked.length === 0) return;
		const snapshot = $items;
		items.update((ls) => ls.filter((i) => !i.checked));

		try {
			await submitEvent(ulid(), 'list.cleared', {});
		} catch {
			items.set(snapshot);
			showToast('Konnte nicht synchronisiert werden');
		}
	}

	function showToast(msg: string) {
		toastMessage = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMessage = ''), 4000);
	}
</script>

<div class="shopping-page">
	<AddItemBar {listId} onAdd={handleAdd} />

	{#if loading}
		<p class="hint">Lade…</p>
	{:else}
		<header class="list-header">
			<h1 class="list-title">{listName}</h1>
		</header>

		<SortBar mode={sortMode} onModeChange={handleSortModeChange} />

		{#if sortMode === 'store' && stores.length > 0}
			<div class="store-picker">
				<select
					value={selectedStoreId ?? stores[0]?.id}
					onchange={(e) => handleStoreChange((e.target as HTMLSelectElement).value)}
					aria-label="Laden auswählen"
				>
					{#each stores as s (s.id)}
						<option value={s.id}>{s.icon} {s.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		{#if unchecked.length === 0 && checked.length === 0}
			<div class="empty">
				<span class="empty-icon">🛒</span>
				<p class="empty-heading">Liste ist leer</p>
				<p class="empty-body">Tippe oben, um etwas hinzuzufügen.</p>
			</div>
		{:else}
			<ul class="item-list">
				{#each unchecked as item (item.id)}
					<li>
						<ListItemRow
							{item}
							onCheck={handleCheck}
							onDelete={handleDelete}
						/>
					</li>
				{/each}
			</ul>

			{#if checked.length > 0}
				<div class="checked-section">
					<div class="checked-toggle-row">
						<button
							class="checked-toggle"
							onclick={() => (showChecked = !showChecked)}
							aria-expanded={showChecked}
						>
							<span>✓ {checked.length} erledigt</span>
							<span class="chevron" class:rotated={showChecked}>›</span>
						</button>
						<button class="clear-btn" onclick={clearChecked}>Alle löschen</button>
					</div>

					{#if showChecked}
						<ul class="item-list">
							{#each checked as item (item.id)}
								<li>
									<ListItemRow
										{item}
										onCheck={handleCheck}
										onDelete={handleDelete}
									/>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/if}
		{/if}
	{/if}
</div>

{#if toastMessage}
	<div class="toast" role="status">{toastMessage}</div>
{/if}

<style>
	.shopping-page {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	.list-header {
		padding: var(--space-4) var(--space-4) var(--space-2);
	}

	.list-title {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		margin: 0;
		color: var(--text-primary);
	}

	.item-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.checked-section {
		border-top: 1px solid var(--border-subtle);
		background: var(--surface-raised);
	}

	.checked-toggle-row {
		display: flex;
		align-items: center;
		padding-right: var(--space-4);
	}

	.checked-toggle {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: transparent;
		border: none;
		cursor: pointer;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--text-muted);
		min-height: 48px;
	}

	.chevron {
		font-size: 18px;
		transition: transform 200ms;
		display: inline-block;
	}
	.chevron.rotated { transform: rotate(90deg); }

	.clear-btn {
		margin-left: auto;
		padding: var(--space-1) var(--space-3);
		border: 1px solid var(--color-danger);
		border-radius: 8px;
		background: transparent;
		color: var(--color-danger);
		font-size: var(--text-xs);
		cursor: pointer;
		font-family: var(--font-body);
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-16) var(--space-4);
		text-align: center;
	}

	.empty-icon { font-size: 48px; }

	.empty-heading {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		margin: 0;
		color: var(--text-secondary);
	}

	.empty-body {
		color: var(--text-muted);
		font-size: var(--text-sm);
		margin: 0;
	}

	.store-picker {
		padding: var(--space-2) var(--space-4);
		background: var(--surface-base);
		border-bottom: 1px solid var(--border-subtle);
	}

	.store-picker select {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--surface-overlay);
		color: var(--text-primary);
	}

	.hint { color: var(--text-muted); text-align: center; padding: var(--space-8); }

	.toast {
		position: fixed;
		bottom: calc(64px + var(--space-4) + env(safe-area-inset-bottom));
		left: 50%;
		transform: translateX(-50%);
		background: var(--surface-inverse);
		color: var(--text-inverse);
		padding: var(--space-2) var(--space-4);
		border-radius: 999px;
		font-size: var(--text-sm);
		z-index: 400;
		white-space: nowrap;
	}
</style>
