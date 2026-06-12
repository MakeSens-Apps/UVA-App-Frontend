/**
 * B12 — Navigation param types (RootStackParamList)
 *
 * Derived from the full route tree in src/app/app.routes.ts and
 * src/app/pages/tabs/tabs.routes.ts.
 *
 * Decision (portability-matrix §3.1, R-15):
 *  - Angular Router uses string paths + optional state object (no type safety)
 *  - React Navigation v6: typed params per route (strict TS)
 *  - All params are serializable (no class instances — R-15)
 *
 * Consolidated duplicates (R-43):
 *  - 'home' (root) and 'app/tabs/home' → single HomeTabs entry
 *  - 'moon-phase' (root) and 'app/tabs/moon-phase' → MoonPhase inside HomeTabs stack
 *  - 'register-measurement' / 'register-measurement-new' → single RegisterMeasurement
 *
 * Excluded (R-43):
 *  - 'alerts/creation' (CreationPage — QA/huérfana, excluded per plan)
 */

import type { NavigatorScreenParams } from '@react-navigation/native';

// ─── Tab param list ───────────────────────────────────────────────────────────

/**
 * Screens inside the HomeTabs stack navigator.
 * moon-phase is hidden from the tab bar but accessible from the Home tab stack.
 */
export type HomeStackParamList = {
  Home: undefined;
  MoonPhase: undefined;
};

/**
 * Bottom tab navigator screens.
 * Each tab may have its own stack (e.g. HomeStack contains Home + MoonPhase).
 */
export type AppTabsParamList = {
  HomeStack: NavigatorScreenParams<HomeStackParamList>;
  Measurement: undefined;
  Historical: {
    /** Pre-selected calendar date (ISO string). Optional. */
    selectedDate?: string;
  };
  Profile: undefined;
};

// ─── App stack (authenticated) ────────────────────────────────────────────────

/**
 * App stack wraps AppTabs plus any full-screen modals accessible from the
 * authenticated area.
 */
export type AppStackParamList = {
  AppTabs: NavigatorScreenParams<AppTabsParamList>;
  /** Profile sub-screens */
  PersonalInfo: undefined;
  Achievement: undefined;
  Alerts: undefined;
  Configuration: undefined;
  SyncAction: undefined;
  /** Measurement sub-screens */
  GuideMeasurement: {
    /** Task ID to guide (optional for modal-entry) */
    taskId?: string;
  };
  RegisterMeasurement: {
    /** Task ID being registered */
    taskId: string;
    /** Display name of the measurement type */
    taskName?: string;
  };
  /** Historical sub-screens */
  MeasurementDetail: {
    /** Calendar/date entry point (ISO string) */
    calendar: string;
    /** Origin screen: 'historical' | 'home' */
    origin: 'historical' | 'home';
  };
  /** Modals (presented as full-screen overlay) */
  ModalAlert: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  };
};

// ─── Auth stack (unauthenticated) ─────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Otp: {
    /** 'login' | 'register' */
    type: 'login' | 'register';
    phone: string;
  };
  ValidateCode: {
    type: 'login' | 'register';
    phone: string;
  };
  PreRegister: undefined;
  Register: undefined;
  SetPhoneRegister: undefined;
  ProjectVinculation: undefined;
  ValidateProject: {
    racimoCode: string;
  };
  ProjectVinculationDone: {
    racimoCode: string;
    racimoName?: string;
  };
  RegisterProjectForm: {
    racimoCode: string;
  };
  RegisterCompleted: undefined;
  RegisterSuccess: undefined;
};

// ─── Root navigator ───────────────────────────────────────────────────────────

/**
 * Root navigator: switches between Auth and App stacks based on auth state.
 * This is the top-level param list consumed by NavigationContainer.
 */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};

// ─── Type declarations for navigation props ───────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
