// src/routes/+layout.server.ts: runs on the server for every request.

// THE GENERATED-CLIENT IMPORT.
// `dif build` (run by "predev" / "prebuild" in package.json) compiles
// dif/experiments/active/*.md into dif/generated/client.ts. Importing it
// registers `new-hero` with @dif.sh/sdk. Without this line, difLoad() has
// nothing to assign.
import '../../dif/generated/client';

import { difLoad } from '@dif.sh/svelte/server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = (event) => ({
	// THE LIVE FLAG. difLoad reads the dif_uid cookie (or mints one on the
	// visitor's first request), assigns every registered flag, and returns
	// plain data. Same dif_uid, same bucket, same variant on every request.
	dif: difLoad(event, {
		// difLoad sets `Secure` on the cookie unless told otherwise. Safari drops
		// Secure cookies on http://localhost, so follow the request protocol.
		secure: event.url.protocol === 'https:'
	})
});
