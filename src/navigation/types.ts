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
  /** DEV-only gate screen — only accessible in __DEV__ builds */
  DevGate: undefined;
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
};

// ─── App stack (authenticated) ────────────────────────────────────────────────

/**
 * App stack wraps AppTabs plus any full-screen modals accessible from the
 * authenticated area.
 */
export type AppStackParamList = {
  AppTabs: NavigatorScreenParams<AppTabsParamList>;
  /**
   * Profile — pushed page OUTSIDE the tab bar.
   * Original app.routes.ts declares `/profile` at the ROOT level (line 95), not
   * under `/app/tabs`, so the tab bar is not rendered on it
   * (docs/evidence/profile/screen-01, screen-02 — device D2 / D-18).
   */
  Profile: undefined;
  /** Profile sub-screens */
  PersonalInfo: undefined;
  Achievement: undefined;
  Alerts: undefined;
  Configuration: undefined;
  /** Measurement sub-screens */
  GuideMeasurement: {
    /** Task ID to guide (optional for modal-entry) */
    taskId?: string;
    /**
     * Specific guide key to open (for nextGuide chaining).
     * When provided, the screen opens this guide instead of the first guide for the task.
     * Mirrors original OpenGuide(_guide) param (register-measurement.page.ts:199).
     * FIX: nextGuide chaining — audit finding #4 ALTA.
     */
    guideKey?: string;
  };
  RegisterMeasurement: {
    /** Task ID being registered */
    taskId: string;
    /** Display name of the measurement type */
    taskName?: string;
    /**
     * Specific flow ID to load (for multi-flow chaining via goToComplete).
     * When provided, the screen loads this flow instead of tasks[taskId].flows[0].
     * Mirrors original queryParams.flowId (register-measurement.page.ts:136-144).
     * FIX: multi-flow loop bug — audit finding #1 CRÍTICA.
     */
    flowId?: string;
    /**
     * Whether to show the back button.
     * false when entering an intermediate flow (mirrors original backButtom:false param).
     */
    hasBackButton?: boolean;
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
  /**
   * `initialRoute` mirrors the original checkUserAuthentication() destinations:
   * 'validate-project' makes the Auth stack START on ProjectVinculation instead of
   * Login (app.routes.ts / RootNavigator), so there is no Login page underneath and
   * back does not walk into it.
   */
  Auth:
    | (NavigatorScreenParams<AuthStackParamList> & {
        initialRoute?: keyof AuthStackParamList;
      })
    | { initialRoute?: keyof AuthStackParamList }
    | undefined;
  App: NavigatorScreenParams<AppStackParamList>;
};

// ─── Type declarations for navigation props ───────────────────────────────────

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
