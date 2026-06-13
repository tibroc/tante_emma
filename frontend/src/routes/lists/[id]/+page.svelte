<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { ulid } from '$lib/ulid';
	import { user } from '$lib/stores/userStore';
	import { items, type ListItem } from '$lib/stores/listStore';
	import { subscribe, unsubscribe, onMessage, onReconnect, connHeaders } from '$lib/ws';
	import { enqueue, drainQueue, pendingCount } from '$lib/offline/eventQueue';
	import { applyEvent as reduceEvent } from '$lib/offline/applyEvent';
	import { syncStatus } from '$lib/stores/syncStore';
	import { browser, dev } from '$app/environment';
	import { _, locale } from 'svelte-i18n';
	import AddItemBar from '$lib/components/AddItemBar.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import ListItemRow from '$lib/components/ListItem.svelte';
	import TileItem from '$lib/components/TileItem.svelte';
	import SortBar from '$lib/components/SortBar.svelte';
	import ItemDetailSheet from '$lib/components/ItemDetailSheet.svelte';
	import PresenceAvatars from '$lib/components/PresenceAvatars.svelte';

	interface Store {
		id: string;
		name: string;
		icon: string;
		color: string;
	}
	interface ShelfEntry {
		category_id: string;
		position: number;
	}
	interface Member {
		id: string;
		name: string;
		avatar_url?: string;
	}
	interface Share {
		user_id: string;
		name: string;
		avatar_url?: string;
		permission: string;
	}

	const listId = $derived(page.params.id ?? '');

	let listName = $state('');
	let loading = $state(true);
	let toastMessage = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;

	// View mode — persisted in localStorage per list.
	// Use page.params.id directly (not the derived listId) to avoid the
	// "reference only captures initial value" Svelte warning.
	let viewMode = $state<'list' | 'tile'>(
		browser
			? ((localStorage.getItem(`view-mode-${page.params.id}`) as 'list' | 'tile') ?? 'list')
			: 'list'
	);

	function toggleViewMode() {
		viewMode = viewMode === 'list' ? 'tile' : 'list';
		if (browser) localStorage.setItem(`view-mode-${listId}`, viewMode);
	}

	// Sorting & store filter
	let sortMode = $state<'category' | 'date' | 'alpha'>('category');
	let stores = $state<Store[]>([]);
	let activeFilterStoreId = $state<string | null>(null); // active store-filter pill
	let shelfOrder = $state<Map<string, number>>(new Map());

	// Sentinel sort position for categories with no saved shelf order; must mirror
	// the backend's unsortedShelfPosition (handlers/stores.go) so both sides agree.
	const UNSORTED_SHELF_POSITION = 9999;

	// Active shopping store — used when clearing to trigger shelf-order learning.
	let activeStoreId = $state<string | null>(null);
	let sessionStart = $state<number>(Date.now());

	// Presence
	let activeUsers = $state<{ id: string; name: string; avatar_url?: string }[]>([]);
	let memberMap = $state<Map<string, { name: string; avatar_url?: string }>>(new Map());

	// Sharing
	let shareOpen = $state(false);
	let members = $state<Member[]>([]);
	let shares = $state<Share[]>([]);
	let shareLoading = $state(false);

	async function openShare() {
		shareOpen = true;
		shareLoading = true;
		try {
			[members, shares] = await Promise.all([
				api.get<Member[]>('/api/users/members'),
				api.get<Share[]>(`/api/lists/${listId}/share`)
			]);
		} finally {
			shareLoading = false;
		}
	}

	function isShared(userId: string) {
		return shares.some((s) => s.user_id === userId);
	}

	async function toggleShare(userId: string) {
		if (isShared(userId)) {
			await api.delete(`/api/lists/${listId}/share/${userId}`);
			shares = shares.filter((s) => s.user_id !== userId);
		} else {
			await api.post(`/api/lists/${listId}/share`, { user_id: userId, permission: 'write' });
			const m = members.find((m) => m.id === userId)!;
			shares = [...shares, { user_id: userId, name: m.name, permission: 'write' }];
		}
	}

	// An item belongs to a store if it has that store set explicitly, or the
	// product lists it as a preferred store.
	function itemMatchesStore(i: ListItem, storeId: string): boolean {
		return i.store_id === storeId || (i.preferred_store_ids?.includes(storeId) ?? false);
	}

	// Store-filter pills: only stores referenced by at least one item in the list.
	const storesWithItems = $derived(
		stores.filter((s) => $items.some((i) => itemMatchesStore(i, s.id)))
	);

	// Apply the active store filter (if any) before grouping/sorting.
	const visibleItems = $derived(
		activeFilterStoreId ? $items.filter((i) => itemMatchesStore(i, activeFilterStoreId!)) : $items
	);

	// Group items: unchecked first, then checked.
	const unchecked = $derived(sortedItems(visibleItems.filter((i) => !i.checked)));
	const checked = $derived(sortedItems(visibleItems.filter((i) => i.checked)));
	let showChecked = $state(false);

	// category_id → localized name, loaded once (see loadList). Used for the
	// category section headers when sorting by category.
	let categoryNames = $state<Record<string, string>>({});
	let collapsedCats = $state<Record<string, boolean>>({});

	interface ItemGroup {
		key: string;
		name: string | null; // null → render items with no header
		color: string | null;
		items: ListItem[];
	}

	// Group the unchecked items under category headers when in category sort with
	// no active store filter; otherwise a single headerless group (flat list).
	const groupedUnchecked = $derived.by<ItemGroup[]>(() => {
		if (sortMode !== 'category' || activeFilterStoreId) {
			return [{ key: 'all', name: null, color: null, items: unchecked }];
		}
		const groups: ItemGroup[] = [];
		const index = new Map<string, number>();
		for (const it of unchecked) {
			const key = it.category_id ?? 'none';
			let gi = index.get(key);
			if (gi === undefined) {
				gi = groups.length;
				index.set(key, gi);
				groups.push({
					key,
					name: it.category_id ? (categoryNames[it.category_id] ?? null) : null,
					color: it.category_color ?? null,
					items: []
				});
			}
			groups[gi].items.push(it);
		}
		return groups;
	});

	function toggleCat(key: string) {
		collapsedCats = { ...collapsedCats, [key]: !collapsedCats[key] };
	}

	// Item detail bottom sheet.
	let detailItemId = $state<string | null>(null);
	const detailItem = $derived($items.find((i) => i.id === detailItemId) ?? null);
	function openDetail(id: string) {
		detailItemId = id;
	}
	function closeDetail() {
		detailItemId = null;
	}

	onMount(async () => {
		await loadList();
		loading = false;
		subscribe(listId);
	});

	// Drain any pending offline events first so the server snapshot reflects
	// them, then fetch the authoritative list state.
	async function loadList() {
		if (dev) console.log('[list] loadList start, listId=', listId, 'online=', navigator.onLine);
		try {
			const n = await drainQueue(listId);
			if (n > 0) syncStatus.set('online');
		} catch (e) {
			if (dev) console.warn('[list] drainQueue failed (still offline?):', e);
		}

		// If events remain queued (drain failed), do NOT overwrite the local
		// store with the server snapshot — that would visually discard them.
		let remaining = 0;
		try {
			remaining = await pendingCount(listId);
		} catch (e) {
			if (dev) console.warn('[list] pendingCount failed:', e);
		}

		try {
			const [data, storeList, memberList, catList] = await Promise.all([
				api.get<{ list: { name: string }; items: ListItem[] }>(`/api/lists/${listId}`),
				api.get<Store[]>('/api/stores').catch(() => [] as Store[]),
				api
					.get<{ id: string; name: string; avatar_url?: string }[]>('/api/users/members')
					.catch(() => []),
				api
					.get<{ id: string; name_de: string; name_en: string }[]>('/api/categories')
					.catch(() => [] as { id: string; name_de: string; name_en: string }[])
			]);
			const useEn = ($locale ?? '').startsWith('en');
			categoryNames = Object.fromEntries(
				catList.map((c) => [c.id, (useEn ? c.name_en : c.name_de) || c.name_de || c.name_en])
			);
			memberMap = new Map(
				memberList.map((m) => [m.id, { name: m.name, avatar_url: m.avatar_url }])
			);
			listName = data.list.name;
			stores = storeList;
			if (remaining === 0) {
				items.set(data.items);
				if (dev) console.log('[list] snapshot applied,', data.items.length, 'items');
			} else {
				if (dev) console.warn('[list] keeping optimistic state,', remaining, 'events still queued');
			}
		} catch (e) {
			if (dev) console.warn('[list] snapshot fetch failed (offline?):', e);
		}
	}

	function handleSortModeChange(mode: typeof sortMode) {
		sortMode = mode;
	}

	// Selecting a store pill filters the list to that store and sorts by its shelf
	// order; deselecting (null) returns to the plain sort mode.
	async function handleStoreFilter(storeId: string | null) {
		activeFilterStoreId = storeId;
		if (storeId) await loadShelfOrder(storeId);
	}

	async function loadShelfOrder(storeId: string) {
		try {
			const rows = await api.get<ShelfEntry[]>(`/api/stores/${storeId}/shelf-order`);
			shelfOrder = new Map(rows.map((r) => [r.category_id, r.position]));
		} catch {
			shelfOrder = new Map();
		}
	}

	function shelfPos(i: ListItem): number {
		return i.category_id
			? (shelfOrder.get(i.category_id) ?? UNSORTED_SHELF_POSITION)
			: UNSORTED_SHELF_POSITION;
	}

	function sortedItems(list: ListItem[]): ListItem[] {
		// An active store filter implies shelf-order sorting for that store.
		if (activeFilterStoreId) {
			return [...list].sort((a, b) => shelfPos(a) - shelfPos(b));
		}
		return [...list].sort((a, b) => {
			switch (sortMode) {
				case 'alpha':
					return (a.display_name ?? '').localeCompare(b.display_name ?? '', 'de');
				case 'date':
					return b.added_at - a.added_at;
				default:
					return a.sort_order - b.sort_order;
			}
		});
	}

	// On WS (re)connect, drain the offline queue and reload the snapshot.
	const unsubReconnect = onReconnect(() => loadList());

	// Handle real-time events from other users.
	const unsub = onMessage((msg) => {
		if (msg.type === 'presence') {
			const p = msg as { type: 'presence'; user_id: string; list_id: string; active: boolean };
			if (p.list_id !== listId || p.user_id === $user?.id) return;
			if (p.active) {
				const info = memberMap.get(p.user_id);
				if (info && !activeUsers.find((u) => u.id === p.user_id)) {
					activeUsers = [...activeUsers, { id: p.user_id, ...info }];
				}
			} else {
				activeUsers = activeUsers.filter((u) => u.id !== p.user_id);
			}
			return;
		}
		if (msg.type !== 'event') return;
		const ev = (
			msg as {
				type: 'event';
				event: { type: string; list_id?: string; payload: Record<string, unknown> };
			}
		).event;
		applyEvent(ev);
	});

	onDestroy(() => {
		unsubscribe(listId);
		unsub();
		unsubReconnect();
	});

	// Thin wrapper over the shared reducer (see $lib/offline/applyEvent) so the
	// real-time and offline-sync paths apply events identically. Falls back to
	// the page's listId when the broadcast omits list_id.
	function applyEvent(ev: { type: string; list_id?: string; payload: Record<string, unknown> }) {
		items.update((current) => reduceEvent(current, { ...ev, list_id: ev.list_id ?? listId }));
	}

	interface ServerEvent {
		type: string;
		payload: Record<string, unknown>;
	}

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
			if (dev) console.log('[list] submitEvent offline-branch, enqueue', type);
			await enqueue(event);
			return undefined;
		}
		try {
			const res = await api.post<{ events: ServerEvent[] }>(
				`/api/lists/${listId}/events`,
				event,
				connHeaders()
			);
			if (dev) console.log('[list] submitEvent posted', type);
			return res.events;
		} catch (e) {
			if (dev) console.warn('[list] submitEvent POST failed, enqueue', type, e);
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
				items.update((ls) =>
					ls.map((i) => (i.id === itemId ? { ...i, category_id: resolvedCat } : i))
				);
			}
		} catch {
			items.update((ls) => ls.filter((i) => i.id !== itemId));
			showToast($_('errors.sync'));
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
			showToast($_('errors.sync'));
		}
	}

	async function handleDelete(itemId: string) {
		if (!$user) return;
		const snapshot = $items.find((i) => i.id === itemId);
		items.update((ls) => ls.filter((i) => i.id !== itemId));

		try {
			await submitEvent(ulid(), 'item.deleted', { item_id: itemId });
			showToast($_('item.removed'));
		} catch {
			if (snapshot) items.update((ls) => [...ls, snapshot]);
			showToast($_('errors.sync'));
		}
	}

	async function handleItemUpdate(
		itemId: string,
		patch: { quantity?: number | null; unit?: string; note?: string; store_id?: string }
	) {
		if (!$user) return;

		// Optimistic local update. store_id '' clears it; quantity null is treated
		// as "no change" (the event reducer/backend can't distinguish null from
		// absent, so we don't attempt to clear quantity).
		items.update((ls) =>
			ls.map((i) =>
				i.id === itemId
					? {
							...i,
							quantity: patch.quantity == null ? i.quantity : patch.quantity,
							unit: patch.unit ?? i.unit,
							note: patch.note ?? i.note,
							store_id: patch.store_id === '' ? undefined : (patch.store_id ?? i.store_id)
						}
					: i
			)
		);

		const payload: Record<string, unknown> = { item_id: itemId };
		if (patch.quantity != null) payload.quantity = patch.quantity;
		if (patch.unit !== undefined) payload.unit = patch.unit;
		if (patch.note !== undefined) payload.note = patch.note;
		if (patch.store_id !== undefined) payload.store_id = patch.store_id;

		try {
			await submitEvent(ulid(), 'item.updated', payload);
		} catch {
			showToast($_('errors.sync'));
		}
	}

	async function clearChecked() {
		if (!$user || checked.length === 0) return;
		const snapshot = $items;
		items.update((ls) => ls.filter((i) => !i.checked));

		const payload: Record<string, unknown> = {};
		if (activeStoreId) {
			payload.store_id = activeStoreId;
			payload.session_start = sessionStart;
		}

		try {
			await submitEvent(ulid(), 'list.cleared', payload);
			sessionStart = Date.now();
		} catch {
			items.set(snapshot);
			showToast($_('errors.sync'));
		}
	}

	function showToast(msg: string) {
		toastMessage = msg;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toastMessage = ''), 4000);
	}
</script>

<div class="shopping-page">
	<!-- Sticky header: wordmark + title + search + sort — always visible -->
	<div class="sticky-top">
		<div class="top-bar">
			<div class="wordmark" aria-label="TanteEmma">
				<div class="wordmark-icon" aria-hidden="true">
					<Icon name="cart" size={19} strokeWidth={2} />
				</div>
				<div class="wordmark-text" aria-hidden="true">
					<span class="wordmark-tante">Tante</span><span class="wordmark-emma">Emma</span>
				</div>
			</div>
			<div class="top-actions">
				{#if activeUsers.length > 0}
					<PresenceAvatars users={activeUsers} />
				{/if}
				{#if $user?.role !== 'child'}
					<button class="header-btn" onclick={openShare} aria-label={$_('list.share')}>⎘</button>
				{/if}
			</div>
		</div>

		<div class="title-row">
			<h1 class="list-title">{listName || '…'}</h1>
			<span class="list-count">{$_('list.item_count', { values: { n: unchecked.length } })}</span>
		</div>

		<AddItemBar {listId} onAdd={handleAdd} />

		<SortBar
			mode={sortMode}
			onModeChange={handleSortModeChange}
			stores={storesWithItems}
			activeStoreId={activeFilterStoreId}
			onStoreFilter={handleStoreFilter}
			{viewMode}
			onViewChange={toggleViewMode}
		/>
	</div>

	{#if loading}
		<p class="hint">{$_('list.loading')}</p>
	{:else}
		{#if unchecked.length === 0 && checked.length === 0}
			<div class="empty">
				<span class="empty-icon">🛒</span>
				<p class="empty-heading">{$_('list.empty_heading')}</p>
				<p class="empty-body">{$_('list.empty_body')}</p>
			</div>
		{:else}
			{#if viewMode === 'tile'}
				<div class="tile-grid">
					{#each unchecked as item (item.id)}
						<TileItem {item} onCheck={handleCheck} onDelete={handleDelete} onOpen={openDetail} />
					{/each}
				</div>
			{:else}
				{#each groupedUnchecked as group (group.key)}
					{#if group.name}
						<button class="cat-header" onclick={() => toggleCat(group.key)}>
							<span
								class="cat-dot"
								style:background-color={group.color ?? 'var(--border-default)'}
							></span>
							<span class="cat-name">{group.name}</span>
							<span class="cat-count">{group.items.length}</span>
							<span class="cat-spacer"></span>
							<span class="cat-chev" class:collapsed={collapsedCats[group.key]}>
								<Icon name="chevron-down" size={17} />
							</span>
						</button>
					{/if}
					{#if !collapsedCats[group.key]}
						<ul class="item-list">
							{#each group.items as item (item.id)}
								<li>
									<ListItemRow
										{item}
										onCheck={handleCheck}
										onDelete={handleDelete}
										onOpen={openDetail}
									/>
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
			{/if}

			{#if checked.length > 0}
				<div class="checked-section">
					<div class="checked-toggle-row">
						<button
							class="checked-toggle"
							onclick={() => (showChecked = !showChecked)}
							aria-expanded={showChecked}
						>
							<span class="check-circle" aria-hidden="true"><Icon name="check" size={13} strokeWidth={3} /></span><span class="checked-label">{$_('list.checked_count', { values: { n: checked.length } })}</span>
							<span class="chev-wrap" class:open={showChecked} aria-hidden="true"><Icon name="chevron-down" size={16} /></span>
						</button>
						{#if $user?.role !== 'child'}
							<button class="clear-btn" onclick={clearChecked}>{$_('list.clear_checked')}</button>
						{/if}
					</div>

					{#if showChecked}
						{#if viewMode === 'tile'}
							<div class="tile-grid tile-grid--checked">
								{#each checked as item (item.id)}
									<TileItem
										{item}
										onCheck={handleCheck}
										onDelete={handleDelete}
										onOpen={openDetail}
									/>
								{/each}
							</div>
						{:else}
							<ul class="item-list">
								{#each checked as item (item.id)}
									<li>
										<ListItemRow
											{item}
											onCheck={handleCheck}
											onDelete={handleDelete}
											onOpen={openDetail}
										/>
									</li>
								{/each}
							</ul>
						{/if}
					{/if}
				</div>
			{/if}
		{/if}
	{/if}
</div>

{#if toastMessage}
	<div class="toast" role="status">{toastMessage}</div>
{/if}

{#if detailItem}
	{#key detailItemId}
		<ItemDetailSheet
			item={detailItem}
			{stores}
			isAdmin={$user?.role === 'admin'}
			onUpdate={handleItemUpdate}
			onDelete={(id) => {
				closeDetail();
				handleDelete(id);
			}}
			onClose={closeDetail}
		/>
	{/key}
{/if}

{#if shareOpen}
	<div class="backdrop" role="presentation" onclick={() => (shareOpen = false)}></div>
	<div
		class="share-sheet"
		role="dialog"
		aria-modal="true"
		aria-label={$_('share_sheet.aria_label')}
	>
		<div class="sheet-handle"></div>
		<h2 class="sheet-title">{$_('share_sheet.title')}</h2>
		{#if shareLoading}
			<p class="hint">{$_('list.loading')}</p>
		{:else}
			<ul class="member-list">
				{#each members.filter((m) => m.id !== $user?.id) as m (m.id)}
					<li class="member-row">
						<div class="avatar">{m.name[0]?.toUpperCase()}</div>
						<span class="member-name">{m.name}</span>
						<button
							class="share-toggle"
							class:shared={isShared(m.id)}
							onclick={() => toggleShare(m.id)}
							aria-pressed={isShared(m.id)}
						>
							{isShared(m.id) ? $_('share_sheet.shared') : $_('share_sheet.share')}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.shopping-page {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
	}

	/* ── Sticky header ─────────────────────────────────────────── */
	.sticky-top {
		position: sticky;
		top: 0;
		z-index: 100;
		background: linear-gradient(
			180deg,
			color-mix(in oklab, var(--accent) 16%, var(--surface-base)) 0%,
			var(--surface-base) 82%
		);
		padding-top: max(12px, env(safe-area-inset-top));
	}

	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 4px 18px 14px;
	}

	.wordmark {
		display: flex;
		align-items: center;
		gap: 9px;
	}

	.wordmark-icon {
		width: 34px;
		height: 34px;
		border-radius: 11px;
		flex-shrink: 0;
		background: linear-gradient(150deg, var(--accent), var(--accent-600));
		display: grid;
		place-items: center;
		color: #fff;
		box-shadow: var(--shadow-pop);
	}

	.wordmark-text {
		font-family: var(--font-display);
		font-size: 22px;
		line-height: 1;
		letter-spacing: -0.01em;
	}

	.wordmark-tante {
		font-style: italic;
		font-weight: 500;
		color: var(--accent);
	}

	.wordmark-emma {
		font-weight: 700;
		color: var(--text-primary);
	}

	.top-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.title-row {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 0 18px 14px;
	}

	.list-title {
		font-family: var(--font-display);
		font-size: 30px;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.05;
		margin: 0;
		color: var(--text-primary);
		flex: 0 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.list-count {
		flex-shrink: 0;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-muted);
	}

	.header-btn {
		width: 36px;
		height: 36px;
		border: 1px solid var(--border-subtle);
		border-radius: 11px;
		background: var(--surface-base);
		color: var(--text-secondary);
		font-size: 18px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0 0 0 / 0.4);
		z-index: 200;
	}

	.share-sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--surface-base);
		border-radius: 20px 20px 0 0;
		padding: var(--space-2) var(--space-4) calc(var(--space-8) + env(safe-area-inset-bottom));
		z-index: 201;
		max-width: 640px;
		margin: 0 auto;
		max-height: 70dvh;
		overflow-y: auto;
	}

	.sheet-handle {
		width: 36px;
		height: 4px;
		border-radius: 2px;
		background: var(--border-default);
		margin: var(--space-2) auto var(--space-4);
	}

	.sheet-title {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		margin: 0 0 var(--space-4);
	}

	.member-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.member-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) 0;
		min-height: 56px;
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-weight: 600;
		font-size: var(--text-base);
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.member-name {
		flex: 1;
		font-size: var(--text-base);
		color: var(--text-primary);
	}

	.share-toggle {
		height: 36px;
		padding: 0 var(--space-3);
		border-radius: 8px;
		border: 1px solid var(--border-default);
		background: transparent;
		color: var(--text-secondary);
		font-size: var(--text-sm);
		font-family: var(--font-body);
		cursor: pointer;
		transition:
			background 120ms,
			color 120ms,
			border-color 120ms;
	}

	.share-toggle.shared {
		background: var(--color-accent-light);
		color: var(--color-accent);
		border-color: var(--color-accent);
	}

	.tile-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
	}

	.tile-grid--checked {
		padding-top: var(--space-2);
	}

	@media (min-width: 480px) {
		.tile-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.item-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.cat-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 14px 18px 7px;
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.cat-dot {
		width: 7px;
		height: 7px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.cat-name {
		font-size: 12px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.cat-count {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		flex-shrink: 0;
		background: var(--surface-overlay);
		border-radius: 20px;
		padding: 1px 8px;
		font-variant-numeric: tabular-nums;
	}

	.cat-spacer {
		flex: 1;
	}

	.cat-chev {
		display: grid;
		place-items: center;
		color: var(--text-muted);
		transition: transform 200ms;
	}

	.cat-chev.collapsed {
		transform: rotate(-90deg);
	}

	.checked-section {
		border-top: 1px solid var(--border-subtle);
		background: var(--surface-raised);
	}

	.checked-toggle-row {
		display: flex;
		align-items: center;
		padding: 12px 18px;
	}

	.checked-toggle {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		font-family: var(--font-body);
		font-size: 14px;
		font-weight: 600;
		color: var(--text-secondary);
		min-height: 44px;
	}

	.check-circle {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--emerald-500);
		color: #fff;
		font-size: 12px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
	}

	.checked-label {
		font-size: 14px;
		font-weight: 600;
	}

	.chev-wrap {
		color: var(--text-muted);
		display: grid;
		place-items: center;
		flex-shrink: 0;
		transform: rotate(-90deg);
		transition: transform 200ms;
	}
	.chev-wrap.open {
		transform: none;
	}

	.clear-btn {
		border: none;
		background: transparent;
		color: #ef4444;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		font-family: var(--font-body);
		padding: 0 var(--space-4);
		flex-shrink: 0;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-16) var(--space-4);
		text-align: center;
	}

	.empty-icon {
		font-size: 48px;
	}

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


	.hint {
		color: var(--text-muted);
		text-align: center;
		padding: var(--space-8);
	}

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
