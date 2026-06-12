<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { lists, type List } from '$lib/stores/listStore';
	import { api } from '$lib/api';
	import { user } from '$lib/stores/userStore';
	import { _ } from 'svelte-i18n';

	let loading = $state(true);
	let creating = $state(false);
	let newName = $state('');

	onMount(async () => {
		try {
			const data = await api.get<List[]>('/api/lists');
			lists.set(data);
		} finally {
			loading = false;
		}
	});

	async function createList() {
		if (!newName.trim()) return;
		creating = true;
		try {
			const list = await api.post<List>('/api/lists', {
				name: newName.trim(),
				type: 'group'
			});
			lists.update((ls) => [list, ...ls]);
			newName = '';
			goto(`/lists/${list.id}`);
		} finally {
			creating = false;
		}
	}
</script>

<main class="lists-page">
	<header class="page-header">
		<h1>{$_('lists.title')}</h1>
	</header>

	{#if $user?.role !== 'child'}
		<form
			class="create-form"
			onsubmit={(e) => {
				e.preventDefault();
				createList();
			}}
		>
			<input
				type="text"
				bind:value={newName}
				placeholder={$_('lists.new_name_ph')}
				aria-label={$_('lists.new_name_label')}
			/>
			<button
				type="submit"
				disabled={creating || !newName.trim()}
				aria-label={$_('lists.create_label')}
			>
				+
			</button>
		</form>
	{/if}

	{#if loading}
		<p class="hint">{$_('list.loading')}</p>
	{:else if $lists.length === 0}
		<div class="empty">
			<span class="empty-icon">📋</span>
			<p class="empty-heading">{$_('lists.empty')}</p>
		</div>
	{:else}
		<ul class="list-cards">
			{#each $lists as list (list.id)}
				<li>
					<a href="/lists/{list.id}" class="list-card">
						<span class="list-icon">{list.icon || '🛒'}</span>
						<span class="list-name">{list.name}</span>
						{#if list.owner_id !== $user?.id}
							<span class="shared-badge">{$_('lists.shared_badge')}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.lists-page {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--space-4);
	}

	.page-header h1 {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		margin: var(--space-4) 0;
		color: var(--text-primary);
	}

	.create-form {
		display: flex;
		gap: var(--space-2);
		margin-bottom: var(--space-6);
	}

	.create-form input {
		flex: 1;
		font-family: var(--font-body);
		font-size: var(--text-base);
		padding: var(--space-2) var(--space-3);
		background: var(--surface-overlay);
		border: none;
		border-radius: 12px;
		outline: 2px solid transparent;
		transition: outline-color 150ms;
	}

	.create-form input:focus {
		outline-color: var(--color-primary);
	}

	.create-form button {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: none;
		background: var(--color-primary);
		color: white;
		font-size: 24px;
		cursor: pointer;
		flex-shrink: 0;
		transition: transform 80ms;
	}

	.create-form button:active {
		transform: scale(0.9);
	}
	.create-form button:disabled {
		opacity: 0.4;
	}

	.list-cards {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.list-card {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		background: var(--surface-raised);
		border-radius: 16px;
		text-decoration: none;
		color: var(--text-primary);
		box-shadow: var(--shadow-sm);
		transition: box-shadow 150ms;
		min-height: 56px;
	}

	.list-card:active {
		box-shadow: none;
	}

	.list-icon {
		font-size: 24px;
	}

	.list-name {
		flex: 1;
		font-size: var(--text-base);
		font-weight: 500;
	}

	.shared-badge {
		font-size: var(--text-xs);
		background: var(--color-primary-light);
		color: var(--color-primary);
		padding: 2px var(--space-2);
		border-radius: 999px;
	}

	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-16) 0;
	}

	.empty-icon {
		font-size: 48px;
	}

	.empty-heading {
		font-family: var(--font-display);
		font-size: var(--text-xl);
		color: var(--text-secondary);
	}

	.hint {
		color: var(--text-muted);
		text-align: center;
		padding: var(--space-8);
	}
</style>
