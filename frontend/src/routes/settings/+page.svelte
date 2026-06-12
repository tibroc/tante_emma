<script lang="ts">
	import { browser } from '$app/environment';
	import { locale, _ } from 'svelte-i18n';
	import { user } from '$lib/stores/userStore';
	import { theme as themeStore } from '$lib/stores/themeStore';
	import { api } from '$lib/api';
	import { goto } from '$app/navigation';

	const LOCALES = [
		{ code: 'de', label: 'Deutsch' },
		{ code: 'en', label: 'English' },
		{ code: 'pt-BR', label: 'Português (BR)' }
	];

	const darkMode = $derived($themeStore === 'dark');

	function toggleDark() {
		themeStore.set($themeStore === 'dark' ? 'light' : 'dark');
	}

	function setLocale(code: string) {
		locale.set(code);
		if (browser) localStorage.setItem('locale', code);
	}

	async function logout() {
		await api.post('/auth/logout', {});
		goto('/login', { replaceState: true });
	}
</script>

<main class="page">
	<header class="page-header">
		<h1>{$_('settings.title')}</h1>
	</header>

	{#if $user}
		<section class="profile-card">
			<div class="avatar">{$user.name[0]?.toUpperCase()}</div>
			<div class="profile-info">
				<p class="profile-name">{$user.name}</p>
				<p class="profile-email">{$user.email}</p>
				<span class="role-badge">{$user.role}</span>
			</div>
		</section>
	{/if}

	<section class="settings-section">
		<div class="setting-row">
			<span class="setting-label">{$_('settings.dark_mode')}</span>
			<button
				class="toggle"
				class:on={darkMode}
				onclick={toggleDark}
				role="switch"
				aria-checked={darkMode}
				aria-label={$_('settings.dark_mode')}
			>
				<span class="toggle-thumb"></span>
			</button>
		</div>

		<div class="setting-row">
			<span class="setting-label">{$_('settings.language')}</span>
			<div class="locale-pills">
				{#each LOCALES as l (l.code)}
					<button
						class="locale-pill"
						class:active={$locale === l.code}
						onclick={() => setLocale(l.code)}>{l.label}</button
					>
				{/each}
			</div>
		</div>
	</section>

	{#if $user?.role === 'admin'}
		<section class="settings-section">
			<a href="/admin/users" class="setting-link">👥 {$_('admin.users_title')}</a>
			<a href="/admin/products" class="setting-link">📦 {$_('admin.products_title')}</a>
		</section>
	{/if}

	<section class="settings-section">
		<button class="logout-btn" onclick={logout}>{$_('settings.logout')}</button>
	</section>
</main>

<style>
	.page {
		max-width: 480px;
		margin: 0 auto;
		padding: var(--space-4);
	}

	.page-header h1 {
		font-family: var(--font-display);
		font-size: var(--text-2xl);
		margin: var(--space-4) 0;
	}

	.profile-card {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-4);
		background: var(--surface-raised);
		border-radius: 16px;
		margin-bottom: var(--space-4);
	}

	.avatar {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--color-primary-light);
		color: var(--color-primary);
		font-size: var(--text-xl);
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.profile-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.profile-name {
		font-weight: 600;
		font-size: var(--text-base);
		color: var(--text-primary);
		margin: 0;
	}

	.profile-email {
		font-size: var(--text-sm);
		color: var(--text-muted);
		margin: 0;
	}

	.role-badge {
		display: inline-block;
		font-size: var(--text-xs);
		background: var(--surface-overlay);
		color: var(--text-secondary);
		padding: 2px var(--space-2);
		border-radius: 999px;
		margin-top: 4px;
	}

	.settings-section {
		background: var(--surface-raised);
		border-radius: 14px;
		padding: var(--space-2) var(--space-4);
		margin-bottom: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 52px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.setting-row:last-child {
		border-bottom: none;
	}

	.setting-label {
		font-size: var(--text-base);
		color: var(--text-primary);
	}

	/* Toggle switch */
	.toggle {
		width: 48px;
		height: 28px;
		border-radius: 14px;
		border: none;
		background: var(--border-default);
		padding: 3px;
		cursor: pointer;
		transition: background 200ms;
		display: flex;
		align-items: center;
	}

	.toggle.on {
		background: var(--color-primary);
	}

	.toggle-thumb {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: white;
		transition: transform 200ms;
		display: block;
	}

	.toggle.on .toggle-thumb {
		transform: translateX(20px);
	}

	.locale-pills {
		display: flex;
		gap: var(--space-1);
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.locale-pill {
		padding: var(--space-1) var(--space-2);
		border-radius: 8px;
		border: 1px solid var(--border-subtle);
		background: transparent;
		color: var(--text-secondary);
		font-size: var(--text-xs);
		font-family: var(--font-body);
		cursor: pointer;
		transition: background 100ms;
	}

	.locale-pill.active {
		background: var(--color-primary-light);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}

	.setting-link {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: 52px;
		font-size: var(--text-base);
		color: var(--text-primary);
		text-decoration: none;
		border-bottom: 1px solid var(--border-subtle);
	}

	.setting-link:last-child {
		border-bottom: none;
	}

	.logout-btn {
		width: 100%;
		min-height: 52px;
		border: none;
		background: transparent;
		color: var(--color-danger);
		font-size: var(--text-base);
		font-family: var(--font-body);
		cursor: pointer;
		text-align: left;
	}
</style>
