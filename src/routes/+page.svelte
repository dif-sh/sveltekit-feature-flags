<script lang="ts">
	// src/routes/+page.svelte: rendered on the server first. experiment() reads
	// the variant that +layout.server.ts already picked, so the HTML arrives
	// with the right headline and the page never flickers between variants.
	import { experiment, track } from '@dif.sh/svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The first branch (`off`) is the fallback for an id that is not registered.
	const hero = experiment('new-hero', {
		off: () => ({ headline: 'Feature flags that live in your repo.', cta: 'Sign up' }),
		on: () => ({ headline: 'Flip a flag by editing one markdown file.', cta: 'Start with one file' })
	});

	const assignment = $derived(data.dif.assignments['new-hero']);
	const forced = $derived('new-hero' in data.dif.overrides);
</script>

<main>
	<h1 data-variant={$hero.variant}>{$hero.value.headline}</h1>

	<!-- Subscribing to $hero in the browser sends one exposure. The click is the metric. -->
	<button type="button" class="cta" onclick={() => track('signup_clicked')}>
		{$hero.value.cta}
	</button>

	<p class="assignment">
		new-hero = {$hero.variant}
		{#if forced}
			(forced by preview link)
		{:else if assignment?.bucket != null}
			(bucket {assignment.bucket} of 0-9999)
		{/if}
		<br />
		<!-- experiment() reads its variant once, so these links do a full page load. -->
		<a href="/?_dif=new-hero=on" data-sveltekit-reload>force on</a> ·
		<a href="/?_dif=new-hero=off" data-sveltekit-reload>force off</a> ·
		<a href="/?_dif=off" data-sveltekit-reload>clear</a>
	</p>

	<h2>How this works</h2>
	<ol>
		<li>
			<code>dif/experiments/active/new-hero.md</code> declares the flag: variants
			<code>off</code> and <code>on</code>, weight 50 each.
		</li>
		<li>
			<code>package.json</code> runs <code>dif build</code> in <code>predev</code> and
			<code>prebuild</code>, which writes <code>dif/generated/client.ts</code>.
		</li>
		<li>
			<code>src/routes/+layout.server.ts</code> imports the generated client and calls
			<code>difLoad(event)</code>, which gives each visitor a <code>dif_uid</code> cookie and
			picks the variant on the server.
		</li>
		<li>
			<code>src/routes/+page.svelte</code> reads it with
			<code>experiment("new-hero", …)</code>.
		</li>
	</ol>
</main>
