/**
 * fix-device-profile-shell — Regressions from the 2026-09-07 device pass
 * (Redmi Note 10S, Android 13 / MIUI 14, edge-to-edge because targetSdk = 36).
 *
 * Reports: docs/evidence/device-2026-09-07/review-frames-021-090.md,
 *          review-frames-091-165.md, review-frames-166-239.md
 *
 * 1. [ALTA · F-14 / D1 / D-02] Header drawn under the status bar
 *    Perfil, Información personal, Logros and Notificaciones painted their OWN
 *    toolbar (a plain <View> with paddingVertical:16), so the back arrow and the
 *    bell sat at clock height. Only the shared <Header/> applies
 *    useSafeAreaInsets().top. Fix: those screens now use the shared Header.
 *
 * 2. [ALTA · D2 / D-18] Profile rendered inside the tab bar
 *    app.routes.ts:95 declares `/profile` at the ROOT level, not under
 *    `/app/tabs`, so the original pushes it as a full page with no tab bar
 *    (docs/evidence/profile/screen-01, screen-02). Fix: the route moved from
 *    AppTabs to AppStack.
 *
 * 3. [BAJA · D18] Phone-confirmation modal button labels — see
 *    fix-setup-auth-bugs.test.tsx (the June audit lowercased them; the original
 *    renders them capitalized via `ion-button { text-transform: capitalize }`).
 *
 * 4. [ALTA · D3] Auth stack entry point
 *    RootNavigator passes initialParams={{ initialRoute: 'ProjectVinculation' }}
 *    when the gate resolves to 'validate-project'; AuthStack used to ignore it.
 */

// ─── Mocks (jest hoists these above the imports) ──────────────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */

/** Status-bar / navigation-bar insets, swapped per test. */
const mockInsets = { top: 24, bottom: 48, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => mockInsets),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { baseTheme } = require('@/theme/theme');
  return {
    useTheme: () => ({ theme: baseTheme }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('@/assets/svg/icons/semilla.svg', () => 'SemillaIcon');
jest.mock('@/assets/svg/icons/user-circle.svg', () => 'UserCircleIcon');

/* eslint-enable @typescript-eslint/no-require-imports */

// ─── Imports ──────────────────────────────────────────────────────────────────

/* eslint-disable import/first */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { Header } from '../components/header/Header';
import { resolveAuthInitialRoute } from '../navigation/authInitialRoute';
import { ROUTES_TO_MINIMIZE } from '../native/minimize/routesToMinimize';
/* eslint-enable import/first */

/** header.component.scss has no vertical padding of its own; the RN port uses 8. */
const HEADER_PADDING_TOP = 8;

beforeEach(() => {
  mockInsets.top = 24;
  mockInsets.bottom = 48;
});

/** Flattens a possibly-nested style prop into one object. */
function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style ?? {}) as Record<string, unknown>;
}

// ─── 1. Header clears the status bar ──────────────────────────────────────────

describe('[fix] shared Header reserves the status-bar inset', () => {
  it('adds insets.top to the toolbar paddingTop', async () => {
    const { getByTestId } = await render(<Header title="Perfil" hasProfileButton={false} />);

    expect(flat(getByTestId('header').props.style).paddingTop).toBe(
      HEADER_PADDING_TOP + mockInsets.top,
    );
  });

  it('collapses to the bare padding when there is no inset', async () => {
    mockInsets.top = 0;

    const { getByTestId } = await render(<Header title="Perfil" hasProfileButton={false} />);

    expect(flat(getByTestId('header').props.style).paddingTop).toBe(HEADER_PADDING_TOP);
  });

  it('renders a trailing action (bell / settings) next to the title', async () => {
    const { getByTestId, getByText } = await render(
      <Header
        title="Perfil"
        hasBackButton
        hasProfileButton={false}
        rightAction={<Text testID="right-action">bell</Text>}
      />,
    );

    expect(getByTestId('header-back-btn')).toBeTruthy();
    expect(getByTestId('right-action')).toBeTruthy();
    expect(getByText('Perfil')).toBeTruthy();
  });

  it('keeps the user chip when hasProfileButton is true (rightAction is ignored)', async () => {
    const { queryByTestId } = await render(
      <Header title="Inicio" seed={3} rightAction={<Text testID="right-action">x</Text>} />,
    );

    expect(queryByTestId('header-profile-btn')).toBeTruthy();
    expect(queryByTestId('right-action')).toBeNull();
  });

  it('does NOT centre the title: space-between right-aligns it when there is a back button', async () => {
    // .header { justify-content: space-between } (header.component.scss:3-7):
    // back + title only ⇒ the title sits at the right edge, like
    // docs/evidence/profile/screen-04 / screen-09 / screen-14 (device D-18).
    const { getByTestId } = await render(
      <Header title="Información personal" hasBackButton hasProfileButton={false} />,
    );

    expect(flat(getByTestId('header-title').props.style).textAlign).toBeUndefined();
  });
});

// ─── 2. Profile is a pushed page, not a tab ───────────────────────────────────

describe('[fix] Profile lives in AppStack, outside the tab bar', () => {
  // Statically asserted: importing AppStack/AppTabs would pull in every screen
  // (and Amplify DataStore) just to read the route table. What matters here is
  // the registration itself, and that is a one-line regression to guard.
  const navDir = path.join(__dirname, '..', 'navigation');
  const appStackSrc = fs.readFileSync(path.join(navDir, 'AppStack.tsx'), 'utf8');
  const appTabsSrc = fs.readFileSync(path.join(navDir, 'AppTabs.tsx'), 'utf8');
  const typesSrc = fs.readFileSync(path.join(navDir, 'types.ts'), 'utf8');

  it('registers <Stack.Screen name="Profile"> in AppStack', () => {
    expect(appStackSrc).toMatch(/<Stack\.Screen\s+name="Profile"/);
  });

  it('does NOT register a Profile tab in AppTabs', () => {
    expect(appTabsSrc).not.toMatch(/name="Profile"/);
  });

  it('declares Profile in AppStackParamList and not in AppTabsParamList', () => {
    const tabsList = typesSrc.slice(
      typesSrc.indexOf('export type AppTabsParamList'),
      typesSrc.indexOf('export type AppStackParamList'),
    );
    const stackList = typesSrc.slice(
      typesSrc.indexOf('export type AppStackParamList'),
      typesSrc.indexOf('export type AuthStackParamList'),
    );

    expect(tabsList).not.toMatch(/^\s*Profile:/m);
    expect(stackList).toMatch(/^\s*Profile:/m);
  });

  it('never minimizes the app from Profile (it is not a root route in the original)', () => {
    // app-minimize.service.ts routesToMinimize: '/pre-register', '/register',
    // '/home', '/login', '/otp', '/app/tabs/register' — '/profile' is absent, so
    // back must pop the pushed page instead of minimizing.
    expect(ROUTES_TO_MINIMIZE.has('Profile')).toBe(false);
  });
});

// ─── 4. Auth stack entry point ────────────────────────────────────────────────

describe('[fix] AuthStack honours the initialRoute passed by RootNavigator', () => {
  it('starts on ProjectVinculation for destination "validate-project"', () => {
    expect(resolveAuthInitialRoute({ initialRoute: 'ProjectVinculation' })).toBe(
      'ProjectVinculation',
    );
  });

  it('falls back to Login when no initialRoute is given', () => {
    expect(resolveAuthInitialRoute(undefined)).toBe('Login');
    expect(resolveAuthInitialRoute({})).toBe('Login');
  });
});
