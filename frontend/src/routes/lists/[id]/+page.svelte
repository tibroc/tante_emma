<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/state';
	import { api } from '$lib/api';
	import { ulid } from '$lib/ulid';
	import { user } from '$lib/stores/userStore';
	import { items, type ListItem } from '$lib/stores/listStore';
	import { subscribe, unsubscribe, onMessage } from '$lib/ws';
	import AddItemBar from '$lib/components/AddItemBar.svelte';
	import ListItemRow from '$lib/components/ListItem.svelte';

	const listId = $derived(page.params.id ?? '');

	let listName = $state('');
	let loading = $state(true);
	let toastMessage = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;

	// Group items: unchecked first, then checked.
	const unchecked = $derived($items.filter((i) => !i.checked));
	const checked   = $derived($items.filter((i) => i.checked));
	let showChecked = $state(false);

	onMount(async () => {
		try {
			const data = await api.get<{ list: { name: string }; items: ListItem[] }>(
				`/api/lists/${listId}`
			);
			listName = data.list.name;
			items.set(data.items);
		} finally {
			loading = false;
		}

		subscribe(listId);
	});

	// Handle real-time events from other users.
	const unsub = onMessage((msg) => {
		if (msg.type !== 'event') return;
		const ev = (msg as { type: 'event'; event: { type: string; payload: Record<string, unknown> } }).event;
		applyEvent(ev);
	});

	onDestroy(() => {
		unsubscribe(listId);
		unsub();
	});

	function applyEvent(ev: { type: string; payload: Record<string, unknown> }) {
		items.update((current) => {
			switch (ev.type) {
				case 'item.added': {
					const p = ev.payload as { item_id: string; name_override?: string; product_id?: string; quantity?: number; unit?: string };
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
						display_name: p.name_override
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

	async function handleAdd(name: string) {
		if (!$user) return;
		const itemId = ulid();
		const now = Date.now();

		// Optimistic update.
		const optimistic: ListItem = {
			id: itemId,
			list_id: listId,
			name_override: name,
			checked: false,
			added_by: $user.id,
			added_at: now,
			sort_order: 0,
			display_name: name
		};
		items.update((ls) => [optimistic, ...ls]);

		try {
			await api.post(`/api/lists/${listId}/events`, {
				id: itemId,
				type: 'item.added',
				list_id: listId,
				user_id: $user.id,
				payload: { item_id: itemId, name_override: name },
				client_ts: now
			});
		} catch {
			// Revert optimistic update.
			items.update((ls) => ls.filter((i) => i.id !== itemId));
			showToast('Konnte nicht synchronisiert werden');
		}
	}

	async function handleCheck(itemId: string, checked: boolean) {
		if (!$user) return;
		const now = Date.now();
		const type = checked ? 'item.checked' : 'item.unchecked';

		// Optimistic update.
		items.update((ls) => ls.map((i) => i.id === itemId ? { ...i, checked } : i));

		try {
			await api.post(`/api/lists/${listId}/events`, {
				id: ulid(),
				type,
				list_id: listId,
				user_id: $user.id,
				payload: { item_id: itemId },
				client_ts: now
			});
		} catch {
			// Revert.
			items.update((ls) => ls.map((i) => i.id === itemId ? { ...i, checked: !checked } : i));
			showToast('Konnte nicht synchronisiert werden');
		}
	}

	async function handleDelete(itemId: string) {
		if (!$user) return;
		const snapshot = $items.find((i) => i.id === itemId);
		items.update((ls) => ls.filter((i) => i.id !== itemId));

		try {
			await api.post(`/api/lists/${listId}/events`, {
				id: ulid(),
				type: 'item.deleted',
				list_id: listId,
				user_id: $user.id,
				payload: { item_id: itemId },
				client_ts: Date.now()
			});
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
			await api.post(`/api/lists/${listId}/events`, {
				id: ulid(),
				type: 'list.cleared',
				list_id: listId,
				user_id: $user.id,
				payload: {},
				client_ts: Date.now()
			});
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
