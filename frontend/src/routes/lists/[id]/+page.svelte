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
	import AddItemBar from '$lib/components/AddItemBar.svelte';
	import ListItemRow from '$lib/components/ListItem.svelte';
	import TileItem from '$lib/components/TileItem.svelte';
	import SortBar from '$lib/components/SortBar.svelte';
	import PresenceAvatars from '$lib/components/PresenceAvatars.svelte';

	interface Store { id: string; name: string; icon: string; color: string; }
	interface ShelfEntry { category_id: string; position: number; }
	interface Member { id: string; name: string; avatar_url?: string; }
	interface Share { user_id: string; name: string; avatar_url?: string; permission: string; }

	const listId = $derived(page.params.id ?? '');

	let listName = $state('');
	let loading = $state(true);
	let toastMessage = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;

	// View mode — persisted in localStorage per list.
	// Use page.params.id directly (not the derived listId) to avoid the
	// "reference only captures initial value" Svelte warning.
	let viewMode = $state<'list' | 'tile'>(
		browser ? ((localStorage.getItem(`view-mode-${page.params.id}`) as 'list' | 'tile') ?? 'list') : 'list'
	);

	function toggleViewMode() {
		viewMode = viewMode === 'list' ? 'tile' : 'list';
		if (browser) localStorage.setItem(`view-mode-${listId}`, viewMode);
	}

	// Sorting
	let sortMode = $state<'category' | 'store' | 'date' | 'alpha'>('category');
	let stores = $state<Store[]>([]);
	let selectedStoreId = $state<string | null>(null);
	let shelfOrder = $state<Map<string, number>>(new Map());

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
			const [data, storeList, memberList] = await Promise.all([
				api.get<{ list: { name: string }; items: ListItem[] }>(`/api/lists/${listId}`),
				api.get<Store[]>('/api/stores').catch(() => [] as Store[]),
				api.get<{ id: string; name: string; avatar_url?: string }[]>('/api/users/members').catch(() => [])
			]);
			memberMap = new Map(memberList.map((m) => [m.id, { name: m.name, avatar_url: m.avatar_url }]));
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
		const ev = (msg as { type: 'event'; event: { type: string; list_id?: string; payload: Record<string, unknown> } }).event;
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
			if (dev) console.log('[list] submitEvent offline-branch, enqueue', type);
			await enqueue(event);
			return undefined;
		}
		try {
			const res = await api.post<{ events: ServerEvent[] }>(`/api/lists/${listId}/events`, event, connHeaders());
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
			{#if activeUsers.length > 0}
				<PresenceAvatars users={activeUsers} />
			{/if}
			{#if $user?.role !== 'child'}
				<button class="header-btn" onclick={openShare} aria-label="Liste teilen">⎘</button>
			{/if}
			<button
				class="header-btn"
				onclick={toggleViewMode}
				aria-label={viewMode === 'list' ? 'Kachelansicht' : 'Listenansicht'}
			>{viewMode === 'list' ? '⊞' : '☰'}</button>
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

		{#if stores.length > 0}
			<div class="active-store-bar">
				<span class="active-store-label">Einkauf bei:</span>
				<select
					value={activeStoreId ?? ''}
					onchange={(e) => {
						activeStoreId = (e.target as HTMLSelectElement).value || null;
						sessionStart = Date.now();
					}}
					aria-label="Aktiver Laden für diesen Einkauf"
				>
					<option value="">– kein Laden –</option>
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
			{#if viewMode === 'tile'}
				<div class="tile-grid">
					{#each unchecked as item (item.id)}
						<TileItem {item} onCheck={handleCheck} onDelete={handleDelete} />
					{/each}
				</div>
			{:else}
				<ul class="item-list">
					{#each unchecked as item (item.id)}
						<li>
							<ListItemRow {item} onCheck={handleCheck} onDelete={handleDelete} />
						</li>
					{/each}
				</ul>
			{/if}

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
						{#if $user?.role !== 'child'}
							<button class="clear-btn" onclick={clearChecked}>Alle löschen</button>
						{/if}
					</div>

					{#if showChecked}
						{#if viewMode === 'tile'}
							<div class="tile-grid tile-grid--checked">
								{#each checked as item (item.id)}
									<TileItem {item} onCheck={handleCheck} onDelete={handleDelete} />
								{/each}
							</div>
						{:else}
							<ul class="item-list">
								{#each checked as item (item.id)}
									<li>
										<ListItemRow {item} onCheck={handleCheck} onDelete={handleDelete} />
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

{#if shareOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="backdrop" role="presentation" onclick={() => (shareOpen = false)}></div>
	<div class="share-sheet" role="dialog" aria-modal="true" aria-label="Liste teilen">
		<div class="sheet-handle"></div>
		<h2 class="sheet-title">Liste teilen</h2>
		{#if shareLoading}
			<p class="hint">Lade…</p>
		{:else}
			<ul class="member-list">
				{#each members.filter(m => m.id !== $user?.id) as m (m.id)}
					<li class="member-row">
						<div class="avatar">{m.name[0]?.toUpperCase()}</div>
						<span class="member-name">{m.name}</span>
						<button
							class="share-toggle"
							class:shared={isShared(m.id)}
							onclick={() => toggleShare(m.id)}
							aria-pressed={isShared(m.id)}
						>
							{isShared(m.id) ? '✓ Geteilt' : 'Teilen'}
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

	.list-header {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-4) var(--space-4) var(--space-2);
	}

	.list-title {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		margin: 0;
		color: var(--text-primary);
		flex: 1;
	}

	.header-btn {
		width: 40px;
		height: 40px;
		border: 1px solid var(--border-subtle);
		border-radius: 10px;
		background: var(--surface-overlay);
		color: var(--text-secondary);
		font-size: 20px;
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
		transition: background 120ms, color 120ms, border-color 120ms;
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
		.tile-grid { grid-template-columns: repeat(3, 1fr); }
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

	.active-store-bar {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		background: var(--surface-raised);
		border-bottom: 1px solid var(--border-subtle);
	}

	.active-store-label {
		font-size: var(--text-xs);
		color: var(--text-muted);
		white-space: nowrap;
	}

	.active-store-bar select {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--surface-overlay);
		color: var(--text-primary);
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
