# SvelteKit feature flags with dif.sh

One SvelteKit 3 page (Svelte 5 runes, TypeScript) with one feature flag. The
flag is a markdown file, `dif/experiments/active/new-hero.md`. `dif build`
compiles it into `dif/generated/client.ts`, and `src/routes/+layout.server.ts`
picks a variant on the server with `difLoad()`, so the HTML arrives with the
right headline and nothing flickers. Copy the four files below into your own
app to get the same setup.

No environment variables are needed to run or build it.

## The pattern

### 1. Declare the flag: `dif/experiments/active/new-hero.md`

```yaml
---
id: new-hero
status: active
owner: team@example.com
surface: home
hypothesis: >
  A home headline that names the action will raise signup_clicked per visitor by 5% over 14 days.
variants:
  - id: "off"   # quoted: bare off/on are YAML booleans
    weight: 50
  - id: "on"
    weight: 50
metrics:
  primary: signup_clicked
created: 2026-10-07
---
```

`pnpm exec dif validate` checks the file: weights sum to 100, `owner` is an
email, `surface` matches `dif/surfaces/home.md`.

### 2. Generate the client before dev and build: `package.json`

```json
"scripts": {
  "predev": "dif build",
  "dev": "vite dev",
  "prebuild": "dif build",
  "build": "vite build"
}
```

`dif/generated/` is gitignored, so a fresh clone and every deploy must run
`dif build` before `vite build`. `prebuild` does that. If `dif build` finds an
error it exits 1 and `vite build` never starts.

`@dif.sh/cli` downloads the `dif` binary in a postinstall script, and pnpm
skips install scripts by default. `pnpm-workspace.yaml` allows it
(`onlyBuiltDependencies` for pnpm 10, `allowBuilds` for pnpm 11+). Without
that entry, `dif build` exits 127.

### 3. Assign on the server: `src/routes/+layout.server.ts`

```ts
import '../../dif/generated/client'; // registers new-hero with @dif.sh/sdk

import { difLoad } from '@dif.sh/svelte/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => ({
	dif: difLoad(event, { secure: event.url.protocol === 'https:' })
});
```

`difLoad()` reads the `dif_uid` cookie. When the cookie is missing it mints a
UUID and sets it for one year, so the visitor's first render is already
bucketed. It then hashes that id with the flag's salt into a bucket from 0 to
9999 and returns `{ difUid, assignments, attributes, overrides }` as page data.
The same id gets the same variant on every request and on every server.

`difLoad()` marks the cookie `Secure` unless you pass `secure`. Safari drops
`Secure` cookies on `http://localhost`, which would give you a new id on every
request, so this example follows the request protocol.

`difLoad()` always buckets on the `dif_uid` cookie. It has no option for your
own user id. To bucket signed-in users on their account id, call `assign()`
from `@dif.sh/sdk` in `load` instead.

### 4. Read the flag: `src/routes/+layout.svelte` and `src/routes/+page.svelte`

The root layout puts the server's decision into context and starts the SDK:

```svelte
<script lang="ts">
	import '../../dif/generated/client'; // the browser bundle has its own registry
	import { setContext } from 'svelte';
	import { initDif, DIF_CONTEXT_KEY } from '@dif.sh/svelte';
	import { events } from '../../dif/generated/events';

	let { data, children } = $props();

	setContext(DIF_CONTEXT_KEY, data.dif);
	initDif({ data: data.dif, events });
</script>

{@render children()}
```

The page reads the flag as a store:

```svelte
<script lang="ts">
	import { experiment, track } from '@dif.sh/svelte';

	const hero = experiment('new-hero', {
		off: () => ({ headline: 'Feature flags that live in your repo.', cta: 'Sign up' }),
		on: () => ({ headline: 'Flip a flag by editing one markdown file.', cta: 'Start with one file' })
	});
</script>

<h1 data-variant={$hero.variant}>{$hero.value.headline}</h1>
<button onclick={() => track('signup_clicked')}>{$hero.value.cta}</button>
```

`experiment()` returns the branch the server picked, during the server render
and again during hydration. In the browser, subscribing to `$hero` records one
exposure. `track('signup_clicked')` records the click.

Keep the `dif/generated/client` import in `+layout.svelte`. The page renders
the right variant without it, but the browser's registry is then empty and the
exposure is dropped with no warning.

## What to look at

Build it, start the preview server, and request the page with a fixed id:

```sh
pnpm build && pnpm preview
curl -s -H 'Cookie: dif_uid=u_1' http://localhost:4173/ | grep -o '<h1[^>]*>[^<]*</h1>'
# <h1 data-variant="on">Flip a flag by editing one markdown file.</h1>
curl -s -H 'Cookie: dif_uid=u_2' http://localhost:4173/ | grep -o '<h1[^>]*>[^<]*</h1>'
# <h1 data-variant="off">Feature flags that live in your repo.</h1>
```

The headline is in the HTML the server sent. Repeat either request and the
variant does not change. The CLI computes the same answer without the app:

```console
$ pnpm exec dif qa --user u_1
trace u_1:
  • new-hero → on (bucket 7627)
```

## Break the build with a clash

Add a second active experiment on the same surface. Save this as
`dif/experiments/active/hero-cta-color.md`:

```yaml
---
id: hero-cta-color
status: active
owner: team@example.com
surface: home
hypothesis: >
  A darker CTA button will raise signup_clicked per visitor by 3% over 14 days.
variants:
  - id: control
    weight: 50
  - id: dark
    weight: 50
metrics:
  primary: signup_clicked
created: 2026-10-08
---
```

```console
$ pnpm build
error E007 dif/experiments/active/hero-cta-color.md:1:1: experiments `hero-cta-color` and `new-hero` both target surface `home` without a shared exclusion_group, and their audiences are not provably disjoint
  help: Add the same `exclusion_group:` value to both, narrow one of the audiences so they're provably disjoint, or change one of their `surface:` fields.

✗ build refused: 1 error(s)
  fix the above and re-run, or run `dif validate` to recheck.
```

`pnpm build` exits 1 and `dif/generated/client.ts` is left as it was. Add the
same `exclusion_group:` value to both files, or delete the new file, and the
build passes again.

## Ramp the flag

Change the weights in `dif/experiments/active/new-hero.md` to 10/90:

```yaml
variants:
  - id: "off"
    weight: 10
  - id: "on"
    weight: 90
```

Run `pnpm exec dif validate`, commit, and deploy. `prebuild` regenerates the
client. Buckets are assigned in declared order, so `off` now owns 0-999 and `on`
owns 1000-9999: visitors already on `on` stay there, and only `off` visitors in
buckets 1000-4999 switch. There is no dashboard switch. A ramp is an edit, a
merge, and a deploy.

To finish, run `pnpm exec dif conclude new-hero --decision "<outcome>"` and
delete the `experiment('new-hero', ...)` call in the same commit. A concluded
flag is no longer registered, so `experiment()` would render its first branch,
`off`.

## Preview a variant

Add `_dif=<flag>=<variant>` to the URL:

- `http://localhost:5173/?_dif=new-hero%3Don` forces `on` (`?_dif=new-hero=on` also works)
- `?_dif=new-hero%3Don,other-flag%3Dvariant_a` forces several flags
- `?_dif=off` clears every force

`pnpm exec dif qa --user <id> --force new-hero=on` prints a link with the same
`?_dif=` query. It points at `http://localhost:3000` unless you pass
`--preview-url http://localhost:5173`.
`difLoad()` applies the force during the server render and saves it to a `_dif`
session cookie. In the browser, `initDif()` removes the param from the address
bar and shows a badge with a clear button. Forced renders never record an
exposure.

`experiment()` reads its variant once, when the component is created. The three
preview links in `src/routes/+page.svelte` carry `data-sveltekit-reload` so
they load the page again instead of navigating on the client.

## Run locally

Requires Node 22.17+ (the floor set by `@sveltejs/kit` 3) and pnpm.

```sh
pnpm install
pnpm dev          # predev runs dif build, then vite dev on http://localhost:5173
pnpm check        # dif build, svelte-kit sync, svelte-check
pnpm build        # prebuild runs dif build, then vite build
pnpm preview      # serves the build on http://localhost:4173
```

`dif init` set `events.mode: cloud` in `dif/config.yaml` with no key, so
exposures and `signup_clicked` are dropped and the SDK logs one console
warning. To send them to dif.sh Cloud, run
`pnpm exec dif connect --key dif_pk_...` and rebuild.

The app uses `@sveltejs/adapter-auto`. To deploy somewhere it does not detect,
swap the adapter in `vite.config.ts`.

## Files for coding agents

`dif init` wrote `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/dif.mdc`,
`.github/copilot-instructions.md`, and `.claude/skills/`. They tell an agent
how to add, validate, and conclude a flag in this repo. `dif build` also writes
`dif/context.json`, a summary of active flags for agents to read at session
start.

## Links

- Docs: https://www.dif.sh/docs/
- SDK reference, Svelte adapter: https://www.dif.sh/docs/sdk/#svelte
- CLI and SDK source: https://github.com/dif-sh/dif
- The same example in Next.js: https://github.com/dif-sh/nextjs-feature-flags

MIT licensed. See `LICENSE`.
