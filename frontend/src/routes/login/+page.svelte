<script lang="ts">
	import { PUBLIC_API_URL } from '$env/static/public';
	import { _ } from 'svelte-i18n';
	const API = PUBLIC_API_URL;
</script>

<main class="login-screen">
	<div class="logo">
		<span class="logo-tante">Tante</span><span class="logo-emma">Emma</span>
	</div>
	<p class="tagline">{$_('login.tagline')}</p>
	<a href="{API}/auth/login" class="btn-login">{$_('login.sign_in')}</a>
</main>

<style>
	.login-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100dvh;
		background: linear-gradient(135deg, var(--fuchsia-500), var(--fuchsia-700));
		gap: var(--space-4);
	}

	.logo {
		font-family: var(--font-display);
		font-size: var(--text-3xl);
		color: white;
	}

	.logo-tante {
		font-style: italic;
		font-weight: 400;
	}

	.logo-emma {
		font-weight: 700;
	}

	.tagline {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: rgba(255 255 255 / 0.7);
		margin: 0;
	}

	.btn-login {
		margin-top: var(--space-8);
		padding: var(--space-3) var(--space-8);
		background: white;
		color: var(--fuchsia-700);
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 600;
		border-radius: 999px;
		text-decoration: none;
		box-shadow: var(--shadow-lg);
		transition: transform 150ms, box-shadow 150ms;
	}

	.btn-login:active {
		transform: scale(0.96);
	}
</style>
