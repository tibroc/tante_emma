<script lang="ts">
	interface ActiveUser {
		id: string;
		name: string;
		avatar_url?: string;
	}

	interface Props {
		users?: ActiveUser[];
	}
	let { users = [] }: Props = $props();

	function initials(name: string): string {
		return name
			.split(' ')
			.map((w) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
	}

	function colorFromId(id: string): string {
		let hash = 0;
		for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
		const hue = Math.abs(hash) % 360;
		return `hsl(${hue} 60% 50%)`;
	}
</script>

<!-- TODO: wire up presence events from WebSocket (Phase 3 step 5) -->
<div class="avatars" aria-label="Aktive Nutzer">
	{#each users as u (u.id)}
		<div
			class="avatar"
			style:background-color={u.avatar_url ? undefined : colorFromId(u.id)}
			title="{u.name} ist gerade aktiv"
		>
			{#if u.avatar_url}
				<img src={u.avatar_url} alt={u.name} />
			{:else}
				{initials(u.name)}
			{/if}
		</div>
	{/each}
</div>

<style>
	.avatars {
		display: flex;
		flex-direction: row-reverse;
	}

	.avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid var(--surface-base);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		font-weight: 600;
		color: white;
		margin-left: -8px;
		overflow: hidden;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
