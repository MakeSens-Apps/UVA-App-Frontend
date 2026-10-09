/**
 * #67 — Usage screen names for AppUsageEvent telemetry
 *
 * The Ionic app (V2.2.11, app.component.ts → getScreenNameFromUrl) recorded the
 * LAST segment of the URL as `screenName` (e.g. '/app/tabs/history' → 'history').
 * The RACIMO dashboard groups AppUsageEvent by that slug, so React Navigation
 * route names (PascalCase) are translated back to the Ionic slugs to keep the
 * historical series continuous.
 *
 * Deliberate differences with Ionic:
 *  - 'Otp' → 'otp' and 'ValidateCode' → 'validate-code'. In Ionic the last URL
 *    segment of '/otp/:type/:phone' was the phone number, so it could end up as
 *    the screen name. React Navigation passes it as a param; it is never recorded.
 *  - Routes without an Ionic URL (modals, sheets) use the kebab-case route name.
 *  - DevGate (QA-only screen) is never recorded.
 */

import type {
  AppStackParamList,
  AppTabsParamList,
  AuthStackParamList,
  HomeStackParamList,
  RootStackParamList,
} from '@/navigation/types';

/** Every route name of the app's navigators. */
type RouteName =
  | keyof RootStackParamList
  | keyof AppStackParamList
  | keyof AppTabsParamList
  | keyof HomeStackParamList
  | keyof AuthStackParamList;

/**
 * React Navigation route name → Ionic URL slug. Typed over RouteName so that a
 * misspelled or renamed route fails to compile instead of silently falling back
 * to kebab-case and breaking the series the dashboard reads.
 */
export const IONIC_SCREEN_SLUGS: Readonly<Partial<Record<RouteName, string>>> =
  {
    // App tabs (/app/tabs/*). 'Measurement' and 'Register' share the slug
    // 'register' exactly as in Ionic ('/app/tabs/register' and '/register').
    Home: 'home',
    MoonPhase: 'moon-phase',
    Measurement: 'register',
    Historical: 'history',
    // App pages outside the tab bar
    Profile: 'profile',
    PersonalInfo: 'personal-info',
    Achievement: 'achievement',
    Alerts: 'alerts',
    Configuration: 'configuration',
    MeasurementDetail: 'measurement-detail',
    RegisterMeasurement: 'register-measurement',
    RegisterSuccess: 'register-success',
    // Auth
    Login: 'login',
    Otp: 'otp',
    ValidateCode: 'validate-code',
    PreRegister: 'pre-register',
    Register: 'register',
    SetPhoneRegister: 'set-phone-register',
    ProjectVinculation: 'project-vinculation',
    ValidateProject: 'validate-project',
    ProjectVinculationDone: 'project-vinculation-done',
    RegisterProjectForm: 'register-project-form',
    RegisterCompleted: 'register-completed',
  };

/**
 * Routes that never produce an AppUsageEvent: the QA-only DevGate screen and the
 * navigator routes, which are containers and never the focused leaf screen once
 * their child navigator has mounted.
 */
export const UNTRACKED_ROUTES: ReadonlySet<string> = new Set<RouteName>([
  'DevGate',
  'Auth',
  'App',
  'AppTabs',
  'HomeStack',
]);

/** 'GuideMeasurement' → 'guide-measurement'. */
export function toKebabCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Returns the `screenName` to record for a React Navigation route, or null when
 * the route must not be recorded (unknown/empty name or an untracked route).
 */
export function toUsageScreenName(
  routeName: string | undefined | null,
): string | null {
  if (!routeName || UNTRACKED_ROUTES.has(routeName)) {
    return null;
  }
  return IONIC_SCREEN_SLUGS[routeName as RouteName] ?? toKebabCase(routeName);
}
