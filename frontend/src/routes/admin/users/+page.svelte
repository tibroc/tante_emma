<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/userStore';
	import { api } from '$lib/api';
	import { _ } from 'svelte-i18n';

	interface AdminUser {
		id: string;
		name: string;
		email: string;
		avatar_url?: string;
		role: 'admin' | 'member' | 'child';
		last_seen: number;
	}

	let users = $state<AdminUser[]>([]);
	let loading = $state(true);
	let saving = $state<string | null>(null);

	onMount(async () => {
		if ($user?.role !== 'admin') { goto('/lists'); return; }
		try {
			users = await api.get<AdminUser[]>('/api/users');
		} finally {
			loading = false;
		}
	});

	async function setRole(uid: string, role: string) {
		saving = uid;
		try {
			await api.put(`/api/users/${uid}/role`, { role });
			users = users.map((u) => u.id === uid ? { ...u, role: role as AdminUser['role'] } : u);
		} finally {
			saving = null;
		}
	}

	function lastSeen(ts: number): string {
		if (!ts) return '–';
		const d = new Date(ts);
		return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
	}
</script>

<main class="page">
	<header class="page-header">
		<a href="/settings" class="back">‹</a>
		<h1>{$_('admin.users_title')}</h1>
	</header>

	{#if loading}
		<p class="hint">Lade…</p>
	{:else}
		<ul class="user-list">
			{#each users as u (u.id)}
				<li class="user-row">
					<div class="avatar">{u.name[0]?.toUpperCase()}</div>
					<div class="user-info">
						<p class="user-name">{u.name}</p>
						<p class="user-email">{u.email}</p>
						<p class="user-seen">Zuletzt: {lastSeen(u.last_seen)}</p>
					</div>
					<select
						value={u.role}
						onchange={(e) => setRole(u.id, (e.target as HTMLSelectElement).value)}
						disabled={saving === u.id || u.id === $user?.id}
						aria-label="Rolle für {u.name}"
					>
						<option value="admin">{$_('admin.role_admin')}</option>
						<option value="member">{$_('admin.role_member')}</option>
						<option value="child">{$_('admin.role_child')}</option>
					</select>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.page {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--space-4);
	}

	.page-header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.back {
		font-size: var(--text-2xl);
		color: var(--text-secondary);
		text-decoration: none;
		line-height: 1;
	}

	.page-header h1 {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		margin: 0;
	}

	.user-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.user-row {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3);
		background: var(--surface-raised);
		border-radius: 12px;
		min-height: 64px;
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

	.user-info { flex: 1; min-width: 0; }

	.user-name {
		font-weight: 500;
		font-size: var(--text-sm);
		color: var(--text-primary);
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.user-email, .user-seen {
		font-size: var(--text-xs);
		color: var(--text-muted);
		margin: 0;
	}

	select {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--border-subtle);
		border-radius: 8px;
		background: var(--surface-overlay);
		color: var(--text-primary);
		flex-shrink: 0;
	}

	select:disabled { opacity: 0.5; }

	.hint { text-align: center; color: var(--text-muted); padding: var(--space-8); }
</style>
