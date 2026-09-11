/**
 * authInitialRoute
 *
 * Resolves which screen the Auth stack must START on.
 *
 * RootNavigator mounts the Auth stack with
 * `initialParams={{ initialRoute: 'ProjectVinculation' }}` when the auth gate
 * resolves to 'validate-project' — the RN equivalent of the original
 * checkUserAuthentication() branch that did
 * `router.navigate(['/project-vinculation'])` (app.routes.ts:53).
 *
 * AuthStack used to hard-code `initialRouteName="Login"` and ignore that param,
 * so a user who had signed in but not yet linked a RACIMO landed on Login again
 * (device review 166-239, D3).
 *
 * Kept in its own module so it can be unit-tested without importing AuthStack,
 * which pulls in every auth screen (and therefore Amplify).
 */

import type { AuthStackParamList, RootStackParamList } from './types';

/** The screen the Auth stack starts on when nothing else is requested. */
export const DEFAULT_AUTH_ROUTE: keyof AuthStackParamList = 'Login';

/**
 * Reads the requested entry point from the Auth stack's route params.
 *
 * @param params - `route.params` of the Root 'Auth' screen (may be undefined).
 * @returns the requested route name, or 'Login'.
 */
export function resolveAuthInitialRoute(
  params: RootStackParamList['Auth'],
): keyof AuthStackParamList {
  const requested = (
    params as { initialRoute?: keyof AuthStackParamList } | undefined
  )?.initialRoute;
  return requested ?? DEFAULT_AUTH_ROUTE;
}

export default resolveAuthInitialRoute;
