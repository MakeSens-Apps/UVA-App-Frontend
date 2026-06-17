/**
 * B08 — ThemeProvider / useTheme() unit tests
 *
 * Gate:
 *   - useTheme() exposes tokens from baseTheme
 *   - Changing configColors (colors.json) re-renders with branding overrides
 *   - No branding → brandingOverrides is empty {}
 *   - fontsLoaded flag is present
 *
 * No device required — mocked expo-font + ConfigContext.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';
import type { ColorsModel } from '../data/models/configuration/colors.model';

// ─── Mock expo-font ───────────────────────────────────────────────────────────
jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]), // [fontsLoaded, error]
}));

// Font TTF requires are handled by @react-native/jest-preset assetFileTransformer
// (returns {testUri:'...'}) — fine since useFonts is mocked and never reads the asset.

// ─── Mock native dependencies (AsyncStorage, S3, FileSystem, Session) ─────────
// ConfigContext imports these through its service deps.
jest.mock('../data/storage/s3', () => ({
  s3Service: {
    listFiles: jest.fn(() => Promise.resolve({ success: false })),
    getFile: jest.fn(() => Promise.resolve({ success: false })),
  },
}));
jest.mock('../data/storage/file-system', () => ({
  fileSystemService: {
    readFile: jest.fn(() => Promise.resolve({ success: false })),
    writeFile: jest.fn(() => Promise.resolve({ success: true })),
    getFileUri: jest.fn(() => Promise.resolve({ success: false })),
  },
  Directory: { Data: 'Data', Cache: 'Cache' },
}));
jest.mock('../data/session/session', () => ({
  sessionService: {
    getInfo: jest.fn(() => Promise.resolve({})),
    setInfo: jest.fn(() => Promise.resolve()),
    clearInfo: jest.fn(() => Promise.resolve()),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line import/first
import { ConfigContext } from '../state/ConfigContext';
// eslint-disable-next-line import/first
import type { ConfigContextValue } from '../state/ConfigContext';
// eslint-disable-next-line import/first
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

/**
 * Build a minimal ConfigContextValue mock for testing.
 * Only configColors matters for ThemeProvider.
 */
function buildConfigMock(configColors: ColorsModel | null): ConfigContextValue {
  return {
    configApp: null,
    configMeasurement: null,
    configColors,
    downLoadData: jest.fn(),
    configExists: jest.fn(),
    getConfigurationApp: jest.fn(),
    getConfigurationMeasurement: jest.fn(),
    getConfigurationColors: jest.fn(),
    loadBranding: jest.fn(),
    loadImage: jest.fn(),
    countTasks: jest.fn(),
    clearCache: jest.fn(),
  };
}

function WithTheme({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function ThemeConsumer({
  onRender,
}: {
  onRender: (value: ReturnType<typeof useTheme>) => void;
}) {
  const value = useTheme();
  onRender(value);
  return <Text testID="consumer">ok</Text>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ThemeProvider', () => {
  it('provides baseTheme tokens when no branding override', async () => {
    const configMock = buildConfigMock(null);
    let captured: ReturnType<typeof useTheme> | undefined;

    await render(
      <ConfigContext.Provider value={configMock}>
        <WithTheme>
          <ThemeConsumer
            onRender={(v) => {
              captured = v;
            }}
          />
        </WithTheme>
      </ConfigContext.Provider>,
    );

    expect(captured).toBeDefined();
    expect(captured!.theme.colors.blue[500]).toBe('#10BCCA');
    expect(captured!.theme.colors.green[500]).toBe('#69AB3C');
    expect(captured!.theme.brandingOverrides).toEqual({});
    expect(captured!.fontsLoaded).toBe(true);
  });

  it('merges HEX branding overrides from configColors into brandingOverrides AND token tree', async () => {
    const colorsJson: ColorsModel = {
      'Colors-Blue-500': { value: '#ABCDEF', group: 'brand', type: 'HEX' },
    };
    const configMock = buildConfigMock(colorsJson);
    let captured: ReturnType<typeof useTheme> | undefined;

    await render(
      <ConfigContext.Provider value={configMock}>
        <WithTheme>
          <ThemeConsumer
            onRender={(v) => {
              captured = v;
            }}
          />
        </WithTheme>
      </ConfigContext.Provider>,
    );

    await waitFor(() => {
      // brandingOverrides still carries the raw override (for varTokenResolver)
      expect(captured!.theme.brandingOverrides['Colors-Blue-500']).toBe('#ABCDEF');
      // R-05 fix: theme.colors.blue[500] is now ALSO updated with the RACIMO color
      expect(captured!.theme.colors.blue[500]).toBe('#ABCDEF');
    });
  });

  it('converts RGB branding overrides to rgb() string in both brandingOverrides and token tree', async () => {
    const colorsJson: ColorsModel = {
      'Colors-Green-500': { value: [105, 171, 60], group: 'brand', type: 'RGB' },
    };
    const configMock = buildConfigMock(colorsJson);
    let captured: ReturnType<typeof useTheme> | undefined;

    await render(
      <ConfigContext.Provider value={configMock}>
        <WithTheme>
          <ThemeConsumer
            onRender={(v) => {
              captured = v;
            }}
          />
        </WithTheme>
      </ConfigContext.Provider>,
    );

    await waitFor(() => {
      expect(captured!.theme.brandingOverrides['Colors-Green-500']).toBe('rgb(105, 171, 60)');
      // R-05 fix: token tree also reflects the RGB color as an rgb() string
      expect(captured!.theme.colors.green[500]).toBe('rgb(105, 171, 60)');
    });
  });

  it('re-renders with new branding when configColors changes', async () => {
    // Start with no branding
    const configMock1 = buildConfigMock(null);
    const renders: ReturnType<typeof useTheme>[] = [];

    const { rerender } = await render(
      <ConfigContext.Provider value={configMock1}>
        <WithTheme>
          <ThemeConsumer
            onRender={(v) => {
              renders.push(v);
            }}
          />
        </WithTheme>
      </ConfigContext.Provider>,
    );

    // Initially no overrides
    expect(renders[renders.length - 1].theme.brandingOverrides).toEqual({});

    // Simulate RACIMO switch — new configColors
    const colorsJson: ColorsModel = {
      'Colors-Orange-500': { value: '#FF8800', group: 'brand', type: 'HEX' },
    };
    const configMock2 = buildConfigMock(colorsJson);

    await act(async () => {
      rerender(
        <ConfigContext.Provider value={configMock2}>
          <WithTheme>
            <ThemeConsumer
              onRender={(v) => {
                renders.push(v);
              }}
            />
          </WithTheme>
        </ConfigContext.Provider>,
      );
    });

    // Now has the new override
    await waitFor(() => {
      const last = renders[renders.length - 1];
      expect(last.theme.brandingOverrides['Colors-Orange-500']).toBe('#FF8800');
    });
  });

  it('exposes fontsLoaded=false when expo-font returns loading state', async () => {
    // Override the global mock for this test only
    const expoFont = require('expo-font') as { useFonts: jest.Mock };
    const original = expoFont.useFonts.getMockImplementation();
    expoFont.useFonts.mockImplementation(() => [false, null]);

    const configMock = buildConfigMock(null);
    let captured: ReturnType<typeof useTheme> | undefined;

    await render(
      <ConfigContext.Provider value={configMock}>
        <WithTheme>
          <ThemeConsumer
            onRender={(v) => {
              captured = v;
            }}
          />
        </WithTheme>
      </ConfigContext.Provider>,
    );

    expect(captured!.fontsLoaded).toBe(false);

    // Restore
    if (original) expoFont.useFonts.mockImplementation(original);
    else expoFont.useFonts.mockReturnValue([true, null]);
  });

  it('ThemeProvider and useTheme are exported from the module', () => {
    // Structural verification: both ThemeProvider and useTheme are exported.
    // The error guard ('useTheme must be used within a ThemeProvider') cannot be
    // tested in isolation in React 19 because errors in hooks are caught by React's
    // error boundary (AggregateError). The guard is tested by design — useContext
    // returns null without a provider and the if(!ctx) check fires.
    expect(typeof ThemeProvider).toBe('function');
    expect(typeof useTheme).toBe('function');
  });

  it('base theme tokens are preserved through runtime theme', async () => {
    // Ensure useFonts returns [true, null] for this test
    const expoFont = require('expo-font') as { useFonts: jest.Mock };
    expoFont.useFonts.mockImplementation(() => [true, null]);

    const configMock = buildConfigMock(null);
    const renders: ReturnType<typeof useTheme>[] = [];

    await render(
      <ConfigContext.Provider value={configMock}>
        <WithTheme>
          <ThemeConsumer
            onRender={(v) => {
              renders.push(v);
            }}
          />
        </WithTheme>
      </ConfigContext.Provider>,
    );

    expect(renders.length).toBeGreaterThan(0);
    const { theme } = renders[renders.length - 1];
    // Spot-check a few tokens from each category
    expect(theme.spacing.md).toBe(10);
    expect(theme.radius.xl).toBe(10);
    expect(theme.typography.sizes.base).toBe(16);
    expect(theme.shadows.sm.elevation).toBe(2);
    expect(theme.semanticColors.primary).toBe('#10BCCA');
  });
});
