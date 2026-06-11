<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api';
	import { _ } from 'svelte-i18n';

	interface HistoryEntry {
		id: string;
		list_id: string;
		name_snapshot: string;
		store_name?: string;
		store_icon?: string;
		category_color?: string;
		category_icon?: string;
		checked_at: number;
	}

	let entries = $state<HistoryEntry[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');

	const filtered = $derived(
		search.trim()
			? entries.filter((e) =>
					e.name_snapshot.toLowerCase().includes(search.trim().toLowerCase())
			  )
			: entries
	);

	// Group entries by calendar date.
	const grouped = $derived(() => {
		const map = new Map<string, HistoryEntry[]>();
		for (const e of filtered) {
			const day = new Date(e.checked_at).toLocaleDateString('de-DE', {
				weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
			});
			if (!map.has(day)) map.set(day, []);
			map.get(day)!.push(e);
		}
		return [...map.entries()];
	});

	onMount(async () => {
		try {
			const data = await api.get<{ history: HistoryEntry[] }>('/api/history');
			entries = data.history;
		} catch {
			error = $_('history.load_error');
		} finally {
			loading = false;
		}
	});
</script>

<div class="page">
	<header class="page-header">
		<h1>{$_('history.title')}</h1>
	</header>

	<div class="search-wrap">
		<input
			type="search"
			bind:value={search}
			placeholder={$_('history.search_ph')}
			aria-label={$_('history.search_label')}
		/>
	</div>

	{#if loading}
		<p class="hint">{$_('list.loading')}</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if entries.length === 0}
		<div class="empty">
			<span class="empty-icon">📋</span>
			<p>{$_('history.empty')}</p>
		</div>
	{:else if filtered.length === 0}
		<p class="hint">{$_('history.no_results', { values: { q: search } })}</p>
	{:else}
		{#each grouped() as [day, items] (day)}
			<section class="day-group">
				<h2 class="day-heading">{day}</h2>
				<ul class="history-list">
					{#each items as e (e.id)}
						<li class="history-row">
							<span
								class="cat-dot"
								style:background-color={e.category_color ?? 'var(--border-default)'}
							></span>
							<span class="item-name">{e.name_snapshot}</span>
							{#if e.store_name}
								<span class="store-tag">{e.store_icon} {e.store_name}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{/if}
</div>

<style>
	.page {
		max-width: 640px;
		margin: 0 auto;
		padding-bottom: calc(80px + env(safe-area-inset-bottom));
	}

	.page-header {
		padding: var(--space-4) var(--space-4) 0;
	}

	.page-header h1 {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		margin: 0;
	}

	.search-wrap {
		padding: var(--space-3) var(--space-4);
	}

	input[type='search'] {
		width: 100%;
		font-family: var(--font-body);
		font-size: var(--text-base);
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border-subtle);
		border-radius: 12px;
		background: var(--surface-overlay);
		color: var(--text-primary);
		outline: 2px solid transparent;
		transition: outline-color 150ms;
	}

	input[type='search']:focus { outline-color: var(--color-primary); }

	.day-group { margin-bottom: var(--space-4); }

	.day-heading {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--text-muted);
		margin: 0;
		padding: var(--space-2) var(--space-4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: var(--surface-raised);
		border-top: 1px solid var(--border-subtle);
		border-bottom: 1px solid var(--border-subtle);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.history-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.history-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		min-height: 48px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.cat-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.item-name {
		flex: 1;
		font-size: var(--text-base);
		color: var(--text-primary);
	}

	.store-tag {
		font-size: var(--text-xs);
		color: var(--text-muted);
		white-space: nowrap;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-16) var(--space-4);
		text-align: center;
		color: var(--text-muted);
	}

	.empty-icon { font-size: 48px; }

	.hint, .error {
		text-align: center;
		padding: var(--space-8);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.error { color: var(--color-danger); }
</style>
