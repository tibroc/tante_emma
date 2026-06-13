<script lang="ts">
	// Ported 1:1 from the Claude Design `icons.jsx` line-icon set.
	// Consistent 24×24 grid, stroke-based, inherits currentColor.
	interface Props {
		name: string;
		size?: number;
		strokeWidth?: number;
	}
	let { name, size = 24, strokeWidth = 1.75 }: Props = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
>
	{#if name === 'produce'}
		<path d="M4 20C4 12 9 5 20 4 19 15 12 20 4 20Z" /><path d="M9 15c2.5-3.5 5-5.5 8-7" />
	{:else if name === 'bread'}
		<path
			d="M4 12.5C4 9.4 7.6 7 12 7s8 2.4 8 5.5c0 1.1-1 1.8-2 1.8v3.2a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 17.5v-3.2c-1 0-2-.7-2-1.8Z"
		/><path d="M10.5 10.5 9 13M14 10.5 12.5 13" />
	{:else if name === 'dairy'}
		<path d="M7.5 9 9.2 5h5.6L16.5 9v10a1.3 1.3 0 0 1-1.3 1.3H8.8A1.3 1.3 0 0 1 7.5 19Z" /><path
			d="M7.5 9h9M12 5v4"
		/>
	{:else if name === 'cheese'}
		<path d="M4 17.5 17.2 9.4a2.4 2.4 0 0 1 3.3.9c.3.5.5 1.1.5 1.7v4.6a1 1 0 0 1-1 1H4Z" /><circle
			cx="9"
			cy="15.4"
			r="1"
		/><circle cx="14" cy="14" r="1" />
	{:else if name === 'meat'}
		<path
			d="M13.5 4.2a5 5 0 0 0-6.8 7.1l-1.9 1.9a2.1 2.1 0 1 0 2.1 2.1l1.9-1.9a5 5 0 0 0 7.1-6.8"
		/><path d="m15.9 6.6 1.4-1.4M17.4 8.1l1.4-1.4" />
	{:else if name === 'sweets'}
		<circle cx="12" cy="12" r="3.1" /><path
			d="M9.2 10.6 4.5 8.2v7.6l4.7-2.4M14.8 10.6l4.7-2.4v7.6l-4.7-2.4"
		/>
	{:else if name === 'drinks'}
		<path
			d="M10 3.5h4v2.2l1.1 2.6a3 3 0 0 1 .4 1.5v8.9a1.3 1.3 0 0 1-1.3 1.3H9.8a1.3 1.3 0 0 1-1.3-1.3V9.8a3 3 0 0 1 .4-1.5L10 5.7Z"
		/><path d="M9 12.5h6" />
	{:else if name === 'pantry'}
		<ellipse cx="12" cy="6.4" rx="6" ry="2.2" /><path
			d="M6 6.4v11.2c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V6.4"
		/><path d="M6 12c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2" />
	{:else if name === 'cart'}
		<circle cx="9.5" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /><path
			d="M3 4h2l1.6 10.2a1.4 1.4 0 0 0 1.4 1.2h8.7a1.4 1.4 0 0 0 1.4-1.1L20 8H6.2"
		/>
	{:else if name === 'store'}
		<path
			d="M4 9.5 5.2 5h13.6L20 9.5M4 9.5h16M4 9.5v.6a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0v-.6"
		/><path d="M5.5 13v6.5a.8.8 0 0 0 .8.8h11.4a.8.8 0 0 0 .8-.8V13" /><path
			d="M9.5 20v-3.6a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8V20"
		/>
	{:else if name === 'clock'}
		<circle cx="12" cy="12" r="8.2" /><path d="M12 7.5V12l3 1.8" />
	{:else if name === 'gear'}
		<circle cx="12" cy="12" r="2.8" /><path
			d="M12 3.2v2M12 18.8v2M20.8 12h-2M5.2 12h-2M18.2 5.8l-1.4 1.4M7.2 16.8l-1.4 1.4M18.2 18.2l-1.4-1.4M7.2 7.2 5.8 5.8"
		/>
	{:else if name === 'search'}
		<circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" />
	{:else if name === 'camera'}
		<path
			d="M3.5 8.5A1.5 1.5 0 0 1 5 7h1.8l1-1.6a1 1 0 0 1 .85-.47h6.7a1 1 0 0 1 .85.47L17.2 7H19a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18Z"
		/><circle cx="12" cy="13" r="3.3" />
	{:else if name === 'plus'}
		<path d="M12 5.5v13M5.5 12h13" />
	{:else if name === 'check'}
		<path d="m5 12.5 4.5 4.5L19 7" />
	{:else if name === 'x'}
		<path d="m6 6 12 12M18 6 6 18" />
	{:else if name === 'trash'}
		<path
			d="M4.5 7h15M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.9 11.5a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L18.5 7"
		/>
	{:else if name === 'chevron-right'}
		<path d="m9 5 7 7-7 7" />
	{:else if name === 'chevron-down'}
		<path d="m5 9 7 7 7-7" />
	{:else if name === 'grid'}
		<rect x="4" y="4" width="7" height="7" rx="1.6" /><rect
			x="13"
			y="4"
			width="7"
			height="7"
			rx="1.6"
		/><rect x="4" y="13" width="7" height="7" rx="1.6" /><rect
			x="13"
			y="13"
			width="7"
			height="7"
			rx="1.6"
		/>
	{:else if name === 'rows'}
		<path d="M4 6.5h16M4 12h16M4 17.5h16" />
	{:else if name === 'card-rows'}
		<rect x="4" y="5" width="16" height="6" rx="2" /><rect
			x="4"
			y="13"
			width="16"
			height="6"
			rx="2"
		/>
	{:else if name === 'pencil'}
		<path d="M16.5 4.5 19.5 7.5 9 18l-3.8.8.8-3.8Z" /><path d="m14.5 6.5 3 3" />
	{:else if name === 'sliders'}
		<path d="M6 4v6M6 14v6M12 4v3M12 11v9M18 4v9M18 17v3" /><circle cx="6" cy="12" r="2" /><circle
			cx="12"
			cy="9"
			r="2"
		/><circle cx="18" cy="15" r="2" />
	{:else if name === 'sparkle'}
		<path d="M12 4c.5 3.5 1.5 4.5 5 5-3.5.5-4.5 1.5-5 5-.5-3.5-1.5-4.5-5-5 3.5-.5 4.5-1.5 5-5Z" />
	{:else if name === 'sun'}
		<circle cx="12" cy="12" r="4" /><path
			d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6"
		/>
	{:else if name === 'moon'}
		<path d="M20 13.5A8 8 0 1 1 10.5 4a6.2 6.2 0 0 0 9.5 9.5Z" />
	{:else if name === 'users'}
		<circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" /><path
			d="M16 5.6a3.2 3.2 0 0 1 0 5.8M17.5 19.5a5.5 5.5 0 0 0-3-4.9"
		/>
	{:else if name === 'box'}
		<path d="M12 3.2 20 7.5v9L12 20.8 4 16.5v-9Z" /><path d="m4 7.5 8 4.3 8-4.3M12 11.8v9" />
	{:else if name === 'logout'}
		<path d="M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14" /><path
			d="M17 8.5 21 12l-4 3.5M21 12H9.5"
		/>
	{:else if name === 'globe'}
		<circle cx="12" cy="12" r="8.2" /><path
			d="M3.8 12h16.4M12 3.8c2.3 2.2 3.5 5.1 3.5 8.2S14.3 18 12 20.2C9.7 18 8.5 15.1 8.5 12S9.7 6 12 3.8Z"
		/>
	{:else}
		<circle cx="12" cy="12" r="8" />
	{/if}
</svg>
