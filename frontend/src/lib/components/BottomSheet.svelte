<script lang="ts">
	interface Props {
		open?: boolean;
		onClose?: () => void;
		children?: import('svelte').Snippet;
	}
	let { open = false, onClose, children }: Props = $props();
</script>

<!-- TODO: full BottomSheet with swipe-down gesture (Phase 1) -->
{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="backdrop" role="presentation" onclick={onClose}></div>
	<div class="sheet" role="dialog" aria-modal="true">
		<div class="handle" aria-hidden="true"></div>
		{@render children?.()}
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0 0 0 / 0.4);
		backdrop-filter: blur(2px);
		z-index: 200;
	}

	.sheet {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--surface-base);
		border-radius: 24px 24px 0 0;
		max-height: 80dvh;
		overflow-y: auto;
		padding: var(--space-4);
		padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom));
		z-index: 201;
	}

	.handle {
		width: 36px;
		height: 4px;
		background: var(--border-strong);
		border-radius: 2px;
		margin: 0 auto var(--space-4);
	}
</style>
