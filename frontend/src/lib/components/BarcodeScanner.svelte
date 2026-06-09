<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		onScan?: (barcode: string) => void;
		onClose?: () => void;
	}
	let { onScan, onClose }: Props = $props();

	// TODO: wire up @zxing/browser BrowserMultiFormatReader (Phase 2 step 9)
	let videoEl: HTMLVideoElement | undefined = $state();

	onMount(() => {
		// stub
	});

	onDestroy(() => {
		// stop camera stream
	});
</script>

<div class="scanner-overlay" role="dialog" aria-modal="true" aria-label="Barcode scannen">
	<button class="cancel" onclick={onClose}>Abbrechen</button>
	<!-- svelte-ignore element_invalid_self_closing_tag -->
	<video bind:this={videoEl} autoplay playsinline></video>
	<div class="scan-window" aria-hidden="true"></div>
	<p class="hint">Barcode scannen…</p>
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
	}

	.hint {
		position: relative;
		color: white;
		margin-top: var(--space-4);
		font-size: var(--text-sm);
	}
</style>
