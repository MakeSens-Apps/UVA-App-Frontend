/**
 * B03 — Amplify bootstrap configuration
 *
 * Bootstrap order (MUST be maintained):
 * 1. react-native-get-random-values  (imported in App.tsx before this module)
 * 2. react-native-url-polyfill/auto  (imported in App.tsx before this module)
 * 3. Amplify.configure(amplifyconfiguration) ← this file
 * 4. DataStore.configure({ syncExpressions }) ← this file
 * 5. DataStore.start() / Hub.listen ← called at app startup (SyncContext)
 *
 * References:
 *  - Original: src/main.ts (Amplify.configure) + src/app/app.component.ts (DataStore.configure)
 *  - Portability matrix §3.2 — "Amplify bootstrap (main.ts+app.component.ts)" → Major
 *  - R-04: without NetInfo the Hub never emits networkStatus → splash hangs
 */

import { Amplify } from 'aws-amplify';
import { DataStore, syncExpression } from '@aws-amplify/datastore';
import { AppUsageEvent, GamificationEvent } from '../models';
// amplifyconfiguration.json is gitignored (same rule as root) — present in mobile/
// require() is used because JSON imports may not be supported without resolveJsonModule
const amplifyconfiguration =
  require('../../../amplifyconfiguration.json') as Record<string, unknown>;

/**
 * Configure Amplify with the project configuration.
 * Must run before any generateClient() or DataStore call.
 * Ported from: src/main.ts:19 — Amplify.configure(config)
 */
export function configureAmplify(): void {
  Amplify.configure(amplifyconfiguration);
}

/**
 * Configure DataStore selective sync expressions.
 * MUST match the original exactly (portability matrix §3.2, R-04):
 *   - GamificationEvent: only sync records where isUnclean === true
 *   - AppUsageEvent: outbox-only (id.eq('') → never downloads from cloud)
 *
 * Ported from: src/app/app.component.ts:39-48
 * Adapter: AsyncStorage (default — per user decision, no SQLite adapter)
 */
export function configureDataStore(): void {
  DataStore.configure({
    syncExpressions: [
      syncExpression(GamificationEvent, () => {
        return (ge) => ge.isUnclean.eq(true);
      }),
      syncExpression(AppUsageEvent, () => {
        return (ae) => ae['id'].eq(''); // Never sync AppUsageEvent data from cloud
      }),
    ],
  });
}

/**
 * Full Amplify bootstrap — call once at App entry point.
 * Configures both Amplify and DataStore in the correct order.
 */
export function bootstrapAmplify(): void {
  configureAmplify();
  configureDataStore();
}
