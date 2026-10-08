# Surface: home

The only page in this example, served from `src/routes/+page.svelte` at `/`.
Every visitor lands here. The hero headline and its CTA button are the testable
area; the "How this works" list below them is fixed copy.

## Known landmines

- Assignment runs on the server in `src/routes/+layout.server.ts`. `difLoad`
  fills `locale` and `device_type` from the `Accept-Language` and `User-Agent`
  request headers, not from the resolvers in `dif/audiences/`. An audience on
  either attribute is decided from those headers.
- `experiment()` reads its variant once, when the component is created. A
  `?_dif=` preview link needs a full page load (`data-sveltekit-reload`) to
  change what is on screen.

## Learnings

(One line per concluded test, appended automatically by `dif conclude`.)
