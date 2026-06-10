<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		onScan?: (barcode: string) => void;
		onClose?: () => void;
	}
	let { onScan, onClose }: Props = $props();

	let videoEl: HTMLVideoElement | undefined = $state();
	let error = $state('');

	// Dynamically import @zxing/browser to avoid SSR issues.
	let controls: { stop: () => void } | undefined;

	onMount(async () => {
		if (!browser) return;
		const { BrowserMultiFormatReader } = await import('@zxing/browser');
		const reader = new BrowserMultiFormatReader();

		try {
			const devices = await BrowserMultiFormatReader.listVideoInputDevices();
			// Prefer rear camera on mobile.
			const deviceId = devices.find((d) =>
				/back|rear|environment/i.test(d.label)
			)?.deviceId ?? devices[0]?.deviceId;

			if (!videoEl) return;
			controls = await reader.decodeFromVideoDevice(deviceId, videoEl, (result, err) => {
				if (result) {
					onScan?.(result.getText());
				} else if (err && !(err instanceof Error && err.name === 'NotFoundException')) {
					// NotFoundException fires on every frame with no barcode — expected
					console.warn('scanner:', err);
				}
			});
		} catch (e) {
			error = 'Kamera nicht verfügbar';
			console.error('barcode scanner init:', e);
		}
	});

	onDestroy(() => {
		controls?.stop();
	});
</script>

<div class="scanner-overlay" role="dialog" aria-modal="true" aria-label="Barcode scannen">
	<button class="cancel" onclick={onClose}>Abbrechen</button>
	<!-- svelte-ignore element_invalid_self_closing_tag -->
	<video bind:this={videoEl} autoplay playsinline muted></video>
	{#if error}
		<p class="error-msg">{error}</p>
	{:else}
		<div class="scan-window" aria-hidden="true"></div>
		<p class="hint">Barcode scannen…</p>
	{/if}
</div>

<style>
	.scanner-overlay {
		position: fixed;
		inset: 0;
		background: #000;
		z-index: 300;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.scan-window {
		position: relative;
		width: 250px;
		height: 250px;
		border-radius: 16px;
		border: 2px solid var(--color-primary);
		box-shadow: 0 0 0 9999px rgba(0 0 0 / 0.6);
	}

	.cancel {
		position: absolute;
		top: calc(var(--space-4) + env(safe-area-inset-top));
		left: var(--space-4);
		background: transparent;
		border: none;
		color: white;
		font-size: var(--text-base);
		cursor: pointer;
		z-index: 1;
		min-height: 48px;
		padding: 0 var(--space-2);
	}

	.hint {
		position: relative;
		color: white;
		margin-top: var(--space-4);
		font-size: var(--text-sm);
	}

	.error-msg {
		position: relative;
		color: #fca5a5;
		font-size: var(--text-sm);
		text-align: center;
		padding: var(--space-4);
	}
</style>
