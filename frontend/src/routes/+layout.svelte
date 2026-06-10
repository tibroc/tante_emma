<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { user } from '$lib/stores/userStore';
	import { syncStatus } from '$lib/stores/syncStore';
	import { api } from '$lib/api';
	import { startWs } from '$lib/ws';
	import { register, init, locale, _ } from 'svelte-i18n';

	// Register locale bundles (lazy-loaded).
	register('de',    () => import('$lib/i18n/de.json'));
	register('en',    () => import('$lib/i18n/en.json'));
	register('pt-BR', () => import('$lib/i18n/pt-BR.json'));

	const savedLocale = browser ? (localStorage.getItem('locale') ?? 'de') : 'de';
	init({ fallbackLocale: 'de', initialLocale: savedLocale });

	// Apply saved theme immediately so there's no flash of wrong theme.
	if (browser) {
		const theme = localStorage.getItem('theme') ?? 'light';
		document.documentElement.setAttribute('data-theme', theme);
	}

	let { children } = $props();

	// PWA install prompt
	let installPrompt = $state<Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> } | null>(null);
	let showInstallBanner = $state(false);

	if (browser) {
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			installPrompt = e as typeof installPrompt;
			showInstallBanner = true;
		});
	}

	async function installApp() {
		if (!installPrompt) return;
		await installPrompt.prompt();
		const { outcome } = await installPrompt.userChoice;
		if (outcome === 'accepted') showInstallBanner = false;
		installPrompt = null;
	}

	const navItems = $derived([
		{ href: '/lists',    icon: '🛒', label: $_('nav.lists')   },
		{ href: '/stores',   icon: '🏪', label: $_('nav.stores')  },
		{ href: '/history',  icon: '🕐', label: $_('nav.history') },
		{ href: '/settings', icon: '⚙️', label: $_('nav.settings').slice(0, 5) },
	]);

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
		⚡ Offline
	</div>
{/if}

{#if showInstallBanner}
	<div class="install-banner">
		<span>TanteEmma als App installieren</span>
		<button onclick={installApp}>Installieren</button>
		<button class="dismiss" onclick={() => (showInstallBanner = false)} aria-label="Schließen">✕</button>
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
	.install-banner {
		position: fixed;
		bottom: calc(64px + env(safe-area-inset-bottom) + var(--space-3));
		left: var(--space-3);
		right: var(--space-3);
		background: var(--surface-inverse);
		color: var(--text-inverse);
		border-radius: 14px;
		padding: var(--space-3) var(--space-4);
		display: flex;
		align-items: center;
		gap: var(--space-3);
		z-index: 300;
		box-shadow: var(--shadow-xl);
		font-size: var(--text-sm);
	}

	.install-banner span { flex: 1; }

	.install-banner button {
		background: white;
		color: #111;
		border: none;
		border-radius: 8px;
		padding: var(--space-1) var(--space-3);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.install-banner .dismiss {
		background: transparent;
		color: rgba(255,255,255,0.7);
		padding: var(--space-1);
		min-width: 28px;
	}

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
