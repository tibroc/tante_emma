<script lang="ts">
	import { page } from '$app/state';

	const listId = $derived(page.params.id);
	// TODO: load list items, wire up AddItemBar, ListItem components
</script>

<main>
	<p>List {listId} — TODO</p>
</main>
