<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/userStore';
	import { syncStatus } from '$lib/stores/syncStore';
	import { api } from '$lib/api';
	import { startWs } from '$lib/ws';

	let { children } = $props();

	const navItems = [
		{ href: '/lists',    icon: '🛒', label: 'Listen' },
		{ href: '/stores',   icon: '🏪', label: 'Läden' },
		{ href: '/history',  icon: '🕐', label: 'Verlauf' },
		{ href: '/settings', icon: '⚙️', label: 'Einst.' },
	];

	const isAuthPage = $derived(page.url.pathname === '/login');

	onMount(async () => {
		if (isAuthPage) return;
		try {
			const u = await api.get<typeof $user>('/api/auth/me');
			user.set(u);
			startWs();
			if (page.url.pathname === '/') goto('/lists', { replaceState: true });
		} catch {
			goto('/login', { replaceState: true });
		}
	});
</script>

{#if $syncStatus === 'offline'}
	<div class="offline-banner" role="status">
		⚡ Offline — Änderungen werden synchronisiert sobald du wieder online bist
	</div>
{/if}

{@render children()}

{#if !isAuthPage}
	<nav class="bottom-nav safe-bottom" aria-label="Hauptnavigation">
		{#each navItems as item}
			{@const active = page.url.pathname.startsWith(item.href)}
			<a href={item.href} class="nav-tab" class:active aria-current={active ? 'page' : undefined}>
				<span class="nav-icon" aria-hidden="true">{item.icon}</span>
				<span class="nav-label">{item.label}</span>
			</a>
		{/each}
	</nav>
{/if}

<style>
	.offline-banner {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 36px;
		background: var(--color-warning);
		color: #1c1917;
		font-size: var(--text-xs);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 500;
	}

	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 64px;
		display: flex;
		background: var(--surface-base);
		border-top: 1px solid var(--border-subtle);
		backdrop-filter: blur(8px);
		z-index: 100;
	}

	.nav-tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2px;
		text-decoration: none;
		color: var(--text-muted);
		font-size: var(--text-xs);
		padding: var(--space-1);
		border-radius: 8px;
		margin: var(--space-1);
		transition: background 100ms, color 100ms;
		min-height: 48px;
	}

	.nav-tab.active {
		color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.nav-tab:active {
		transform: scale(0.92);
	}

	.nav-icon {
		font-size: 20px;
		line-height: 1;
	}

	.nav-label {
		font-weight: 500;
	}

	/* Leave room for bottom nav on content pages */
	:global(main) {
		padding-bottom: calc(64px + env(safe-area-inset-bottom));
	}
</style>
