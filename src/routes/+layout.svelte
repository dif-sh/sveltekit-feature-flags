<script lang="ts">
	// The browser bundle has its own copy of the SDK registry, so it needs the
	// generated client too. Without it the exposure for new-hero is never sent.
	import '../../dif/generated/client';
	import '../app.css';

	import { setContext } from 'svelte';
	import { initDif, DIF_CONTEXT_KEY } from '@dif.sh/svelte';
	import { events } from '../../dif/generated/events';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Hand the server's decision to every experiment() call below this layout.
	// Both calls read `data.dif` once, on purpose: a variant must not change
	// under a mounted component. Hence the two svelte-ignore comments.
	// svelte-ignore state_referenced_locally
	setContext(DIF_CONTEXT_KEY, data.dif);

	// Seeds the SDK with the same dif_uid the server used. In the browser it
	// also saves a `?_dif=` preview force to the `_dif` session cookie and
	// shows the preview badge.
	// svelte-ignore state_referenced_locally
	initDif({ data: data.dif, events });
</script>

<svelte:head>
	<title>SvelteKit feature flags with dif.sh</title>
	<meta
		name="description"
		content="One feature flag, defined in dif/experiments/active/new-hero.md and assigned on the server in src/routes/+layout.server.ts."
	/>
</svelte:head>

{@render children()}
