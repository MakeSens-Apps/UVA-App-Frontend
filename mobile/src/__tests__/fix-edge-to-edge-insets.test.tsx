/**
 * fix-edge-to-edge-insets — Regression tests for the first real-device pass
 * (Redmi Note 10S, Android 13 / MIUI 14, 1080x2400 @440dpi, 3-button navigation).
 *
 * Both bugs only appear under Android edge-to-edge, which is forced on because
 * targetSdk=36 + RN 0.85. They were invisible in the Expo Web validation pass.
 *
 * 1. [ALTA] Tab bar under the Android navigation bar
 *    UvaTabBar is a CUSTOM `tabBar`, so @react-navigation/bottom-tabs does not
 *    apply the safe-area inset for it (it only does that for its default tab bar).
 *    With a hard-coded `height: 82` the labels ended up beneath the system buttons.
 *    Fix: height = 82 + insets.bottom, paddingBottom = 4 + insets.bottom.
 *
 * 2. [ALTA] Grey strip down the right edge of the auth screens
 *    The background <Svg width="100%" height="100%"> is absolutely positioned
 *    inside its parent, so its percentage size resolves against that parent's
 *    CONTENT box. The parent carried `padding: 18` (the 5vw of .container_explore),
 *    which left an ~18dp gutter the SVG never painted. Fix: the padding moved to an
 *    inner `content` wrapper so the background's parent has none.
 *    Home was unaffected because it has no background SVG; Splash was unaffected
 *    because its container has no padding.
 */

// ─── Mocks (must come before imports per jest hoisting) ───────────────────────
/* eslint-disable @typescript-eslint/no-require-imports */

/** Bottom inset, swapped per-test. 48dp = a 3-button Android navigation bar. */
const mockInsets = { top: 24, bottom: 48, left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => mockInsets),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(View, props, children),
  };
});

// The real ThemeProvider needs a ConfigProvider (and therefore Amplify). These
// tests are about layout, so back useTheme() with the real design tokens instead.
jest.mock('@/theme/ThemeProvider', () => {
  const { baseTheme } = require('@/theme/theme');
  return {
    useTheme: () => ({ theme: baseTheme }),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

/* eslint-enable @typescript-eslint/no-require-imports */

// ─── Imports ──────────────────────────────────────────────────────────────────

/* eslint-disable import/first */
import React from 'react';
import { View } from 'react-native';
import { render } from '@testing-library/react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { UvaTabBar } from '../navigation/UvaTabBar';
import { ExploreContainer } from '../components/explore-container/ExploreContainer';
import { ThemeProvider } from '../theme/ThemeProvider';
/* eslint-enable import/first */

/** ion-tab-bar height (global.scss:306) and its base paddingBottom. */
const TAB_BAR_HEIGHT = 82;
const TAB_BAR_PADDING_BOTTOM = 4;

beforeEach(() => {
  mockInsets.top = 24;
  mockInsets.bottom = 48;
});

function Wrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <ThemeProvider>{children}</ThemeProvider>;
}

/** Minimal BottomTabBarProps for the three visible tabs. */
function makeTabBarProps(): BottomTabBarProps {
  const routes = [
    { key: 'HomeStack-1', name: 'HomeStack' },
    { key: 'Measurement-1', name: 'Measurement' },
    { key: 'Historical-1', name: 'Historical' },
  ];
  const descriptors = Object.fromEntries(routes.map((r) => [r.key, { options: {} }]));
  return {
    state: { index: 0, routes },
    descriptors,
    navigation: { emit: () => ({ defaultPrevented: false }), navigate: () => {} },
    insets: mockInsets,
  } as unknown as BottomTabBarProps;
}

/** Flattens a possibly-nested style prop into one object. */
function flat(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style ?? {}) as Record<string, unknown>;
}

// ─── Bug 1: tab bar clears the system navigation bar ──────────────────────────

describe('[fix] tab bar reserves the Android navigation-bar inset', () => {
  it('adds insets.bottom to the tab bar height and paddingBottom', async () => {
    const { getByTestId } = await render(<UvaTabBar {...makeTabBarProps()} />, {
      wrapper: Wrapper,
    });

    const style = flat(getByTestId('tab-bar').props.style);

    // The inset is ADDED below the 82px bar, never subtracted from it, so the bar
    // keeps the visual height of the original Ionic tab bar.
    expect(style.height).toBe(TAB_BAR_HEIGHT + 48);
    expect(style.paddingBottom).toBe(TAB_BAR_PADDING_BOTTOM + 48);
  });

  it('keeps the original 78dp content box, so the pills do not move', async () => {
    const { getByTestId } = await render(<UvaTabBar {...makeTabBarProps()} />, {
      wrapper: Wrapper,
    });

    const style = flat(getByTestId('tab-bar').props.style);
    const contentBox = (style.height as number) - (style.paddingBottom as number);

    expect(contentBox).toBe(TAB_BAR_HEIGHT - TAB_BAR_PADDING_BOTTOM);
  });

  it('collapses to the plain 82px bar when there is no inset (gesture nav)', async () => {
    mockInsets.bottom = 0;

    const { getByTestId } = await render(<UvaTabBar {...makeTabBarProps()} />, {
      wrapper: Wrapper,
    });

    const style = flat(getByTestId('tab-bar').props.style);
    expect(style.height).toBe(TAB_BAR_HEIGHT);
    expect(style.paddingBottom).toBe(TAB_BAR_PADDING_BOTTOM);
  });
});

// ─── Bug 2: background SVG spans the full window width ────────────────────────

describe('[fix] auth background covers the full width', () => {
  function renderExplore() {
    return render(
      <ExploreContainer title="t">
        <View />
      </ExploreContainer>,
      { wrapper: Wrapper },
    );
  }

  it('root carries no padding, so the background SVG is full-bleed', async () => {
    const root = flat((await renderExplore()).getByTestId('explore-container').props.style);

    // Any padding here would shrink the absolutely-positioned background SVG,
    // whose width/height are '100%' of this view's CONTENT box.
    expect(root.padding).toBeUndefined();
    expect(root.paddingHorizontal).toBeUndefined();
    expect(root.paddingLeft).toBeUndefined();
    expect(root.paddingRight).toBeUndefined();
  });

  it('paints the SVG base teal behind the background so no grey can show', async () => {
    const root = flat((await renderExplore()).getByTestId('explore-container').props.style);

    // #4BC5BE is background.svg's own base fill.
    expect(root.backgroundColor).toBe('#4BC5BE');
  });

  it('still applies the 5vw (18dp) gutter one level in, on the content wrapper', async () => {
    const root = (await renderExplore()).getByTestId('explore-container');

    const padded = root.children.filter(
      (c) => typeof c !== 'string' && flat((c as { props?: { style?: unknown } }).props?.style).padding === 18,
    );

    expect(padded).toHaveLength(1);
  });
});
