/**
 * Device regression F-09 (MEDIA) — rich text rendered FLAT on Android
 * Evidence: docs/evidence/device-findings-2026-09-07.md
 *   frames docs/evidence/device-2026-09-07/{005-192141,009-192156}.png
 *   originals docs/evidence/measurement/{screen-03-guide-flow1-step1,
 *                                        screen-06-register-form-flow1-filled}.png
 *
 * On the Redmi Note 10S every rich-text fragment lost its bold and its colors
 * (the register subtitle, the "Temperatura máxima" card label, the ADJ-MAX/MIN.
 * highlights in the guide), while Expo Web and Jest rendered them correctly.
 * Pixel sampling of frame 009 showed the whole subtitle at #171717 — the
 * RichText baseColor — instead of the #525252 / #69AB3C carried by its inline
 * styles: no inline style survived on device.
 *
 * TWO independent native-only causes, both covered here:
 *
 *   1. react-native-render-html@6 declares its engine defaults through
 *      `TRenderEngineProvider.defaultProps`. React 19 (RN 0.85) only honours
 *      `defaultProps` in the legacy `React.createElement` path, which is what
 *      `lib/commonjs` (Jest, Expo Web) uses; Metro resolves the package through
 *      its `"react-native": "src/"` field and compiles the TSX with the
 *      automatic JSX runtime, which ignores `defaultProps`. On device
 *      `enableCSSInlineProcessing` therefore arrived as `undefined`, and TRE's
 *      `{...defaultStylesConfig, ...stylesConfig}` spread let that `undefined`
 *      override its own `true` — inline CSS processing was OFF.
 *
 *   2. The RACIMO config expresses emphasis exclusively as
 *      `style="font-weight: 700"`, never as `<b>`. React Native maps that to
 *      `fontWeight: '700'`, which does NOT bold a custom expo-font asset family
 *      on Android. The app-wide convention is to pick the static Montserrat
 *      family instead (theme.fontFamilyForWeight).
 *
 * FIXTURES below are the VERBATIM strings pulled from the device at
 * files/public/racimos/ANT025/measurementRegistration/measurementsRegistration.json
 */

// ─── Capture the props RichText hands to the render engine ───────────────────
// This is the only way to prove that the engine defaults are passed EXPLICITLY:
// under Jest the real RNRH would silently supply them through defaultProps.

/* eslint-disable @typescript-eslint/no-require-imports */

const capturedRenderHtmlProps: Record<string, unknown>[] = [];

jest.mock('react-native-render-html', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      capturedRenderHtmlProps.push(props);
      const source = props.source as { html: string };
      return React.createElement(Text, { testID: 'rnrh-source' }, source.html);
    },
  };
});

jest.mock('expo-font', () => ({ useFonts: jest.fn(() => [true, null]) }));

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

/* eslint-enable @typescript-eslint/no-require-imports */

/* eslint-disable import/first */
import React from 'react';
import { render } from '@testing-library/react-native';

import { ConfigContext } from '../state/ConfigContext';
import type { ConfigContextValue } from '../state/ConfigContext';
import { ThemeProvider } from '../theme/ThemeProvider';
import {
  RichText,
  RICH_TEXT_ENGINE_DEFAULTS,
  RICH_TEXT_SYSTEM_FONTS,
} from '../components/rich-text/RichText';
import {
  resolveFontDeclarationsInHtml,
  rewriteFontDeclarations,
  normalizeFontWeight,
} from '../components/rich-text/fontDeclarationResolver';
/* eslint-enable import/first */

// ─── REAL RACIMO fixtures (verbatim from measurementsRegistration.json) ──────

/** flows.flow1.text — the register-form subtitle. */
const REAL_FLOW1_TEXT =
  '<p style="font-size: 16px; line-height: 150%; font-weight: 400; color: var(--Gray-600, #525252);">' +
  'Registros de <span style="font-weight: 700"> temperatura </span> y ' +
  '<span style="font-weight: 700"> humedad </span> ' +
  '<span style="font-weight: 700; color: var(--Colors-Green-500, #69ab3c)">máxima</span></p>';

/** measurements.TEMPERATURA_MAX.name — the orange card label. */
const REAL_TEMPERATURA_MAX_NAME =
  '<span style="font-size: 16px; line-height: 150%; font-weight: 700; color: var(--Colors-Orange-500, #e58b24);">' +
  'Temperatura <span style="color: var(--Gray-600, #525252)"> máxima </span></span>';

/** guides.guide1.text — the ADJ-MAX/MIN. steps. */
const REAL_GUIDE1_TEXT =
  '<div><ol style="font-size: 16px; line-height: 150%; color: var(--Colors-Gray-700, #404040);margin: 0;">' +
  '<li>Oprima el botón ' +
  '<span style="color: var(--Colors-Blue-600, #1097aa); font-weight: 700">ADJ-MAX/MIN.</span>' +
  '</li></ol></div>';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildConfigMock(): ConfigContextValue {
  return {
    configApp: null,
    configMeasurement: null,
    configColors: null,
    downLoadData: jest.fn(),
    configExists: jest.fn(),
    getConfigurationApp: jest.fn(),
    getConfigurationMeasurement: jest.fn(),
    getConfigurationColors: jest.fn(),
    loadBranding: jest.fn(),
    loadImage: jest.fn(),
    countTasks: jest.fn(),
    clearCache: jest.fn(),
  } as unknown as ConfigContextValue;
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConfigContext.Provider value={buildConfigMock()}>
      <ThemeProvider>{children}</ThemeProvider>
    </ConfigContext.Provider>
  );
}

/** Renders `html` through RichText and returns the props given to the engine. */
async function renderAndCapture(html: string): Promise<Record<string, unknown>> {
  capturedRenderHtmlProps.length = 0;
  await render(
    <Wrapper>
      <RichText html={html} baseFontSize={15} />
    </Wrapper>,
  );
  const last = capturedRenderHtmlProps[capturedRenderHtmlProps.length - 1];
  expect(last).toBeDefined();
  return last;
}

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     Cause 1 — engine defaults must be passed explicitly (React 19)
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('F-09 cause 1 — RNRH engine defaults are not inherited from defaultProps', () => {
  it('declares enableCSSInlineProcessing so inline styles survive on native', () => {
    // Without this, TRE receives `undefined` and its own `true` default is
    // overwritten by the spread — every style="..." attribute is dropped.
    expect(RICH_TEXT_ENGINE_DEFAULTS.enableCSSInlineProcessing).toBe(true);
  });

  it('mirrors the rest of RNRH defaultTRenderEngineProviderProps', () => {
    expect(RICH_TEXT_ENGINE_DEFAULTS.enableUserAgentStyles).toBe(true);
    expect(RICH_TEXT_ENGINE_DEFAULTS.emSize).toBe(14);
    expect(RICH_TEXT_ENGINE_DEFAULTS.htmlParserOptions).toEqual({ decodeEntities: true });
    expect(RICH_TEXT_ENGINE_DEFAULTS.ignoredDomTags).toEqual([]);
    expect(RICH_TEXT_ENGINE_DEFAULTS.ignoredStyles).toEqual([]);
  });

  it('registers every Montserrat static face as a system font', () => {
    // RNRH drops any CSS font-family that is not in this list.
    expect(RICH_TEXT_SYSTEM_FONTS).toEqual(
      expect.arrayContaining([
        'Montserrat-Regular',
        'Montserrat-Medium',
        'Montserrat-SemiBold',
        'Montserrat-Bold',
        'Montserrat-Italic',
        'Montserrat-MediumItalic',
        'Montserrat-SemiBoldItalic',
        'Montserrat-BoldItalic',
      ]),
    );
  });

  it('passes those defaults to <RenderHtml> on every render', async () => {
    const props = await renderAndCapture(REAL_FLOW1_TEXT);

    expect(props.enableCSSInlineProcessing).toBe(true);
    expect(props.enableUserAgentStyles).toBe(true);
    expect(props.emSize).toBe(14);
    expect(props.systemFonts).toContain('Montserrat-Bold');
    expect(props.htmlParserOptions).toEqual({ decodeEntities: true });
  });

  it('reuses the same systemFonts reference across renders (engine is memoized on it)', async () => {
    const first = await renderAndCapture(REAL_FLOW1_TEXT);
    const second = await renderAndCapture(REAL_FLOW1_TEXT);
    expect(first.systemFonts).toBe(second.systemFonts);
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     Cause 2 — font-weight → Montserrat family (Android has no synthetic bold)
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('normalizeFontWeight', () => {
  it('maps numeric CSS weights to the bundled static faces', () => {
    expect(normalizeFontWeight('400')).toBe('400');
    expect(normalizeFontWeight('500')).toBe('500');
    expect(normalizeFontWeight('600')).toBe('600');
    expect(normalizeFontWeight('700')).toBe('700');
    expect(normalizeFontWeight('800')).toBe('700');
    expect(normalizeFontWeight('300')).toBe('400');
  });

  it('maps CSS keywords', () => {
    expect(normalizeFontWeight('normal')).toBe('400');
    expect(normalizeFontWeight('bold')).toBe('700');
    expect(normalizeFontWeight('bolder')).toBe('700');
    expect(normalizeFontWeight('lighter')).toBe('400');
  });

  it('returns null for non-weight values', () => {
    expect(normalizeFontWeight('')).toBeNull();
    expect(normalizeFontWeight('inherit')).toBeNull();
  });
});

describe('rewriteFontDeclarations', () => {
  it('replaces font-weight with the matching Montserrat family', () => {
    expect(rewriteFontDeclarations('font-weight: 700')).toBe('font-family: Montserrat-Bold');
    expect(rewriteFontDeclarations('font-weight: 600')).toBe('font-family: Montserrat-SemiBold');
    expect(rewriteFontDeclarations('font-weight: 500')).toBe('font-family: Montserrat-Medium');
    expect(rewriteFontDeclarations('font-weight: 400')).toBe('font-family: Montserrat-Regular');
  });

  it('combines font-weight and font-style into a single italic face', () => {
    expect(rewriteFontDeclarations('font-weight: 700; font-style: italic')).toBe(
      'font-family: Montserrat-BoldItalic',
    );
    expect(rewriteFontDeclarations('font-style: italic')).toBe(
      'font-family: Montserrat-Italic',
    );
  });

  it('keeps every other declaration untouched', () => {
    expect(
      rewriteFontDeclarations('font-size: 16px; line-height: 150%; font-weight: 700; color: #e58b24'),
    ).toBe('font-size: 16px; line-height: 150%; color: #e58b24; font-family: Montserrat-Bold');
  });

  it('returns null (no rewrite) when there is nothing to map', () => {
    expect(rewriteFontDeclarations('color: #525252')).toBeNull();
    // An authored font-family wins — never override explicit intent.
    expect(rewriteFontDeclarations('font-family: Menlo; font-weight: 700')).toBeNull();
  });
});

describe('resolveFontDeclarationsInHtml — real RACIMO fragments', () => {
  it('bolds the register subtitle spans through the family name', () => {
    const out = resolveFontDeclarationsInHtml(REAL_FLOW1_TEXT);
    expect(out).toContain('font-family: Montserrat-Bold');
    expect(out).toContain('font-family: Montserrat-Regular');
    // fontWeight must be gone: it is a no-op (or worse) on Android asset fonts.
    expect(out).not.toContain('font-weight');
    // Colors and sizes must survive verbatim.
    expect(out).toContain('color: var(--Colors-Green-500, #69ab3c)');
    expect(out).toContain('font-size: 16px');
  });

  it('bolds the "Temperatura máxima" card label', () => {
    const out = resolveFontDeclarationsInHtml(REAL_TEMPERATURA_MAX_NAME);
    expect(out).toContain('font-family: Montserrat-Bold');
    expect(out).not.toContain('font-weight');
    expect(out).toContain('color: var(--Colors-Orange-500, #e58b24)');
  });

  it('bolds the ADJ-MAX/MIN. highlights of the guide', () => {
    const out = resolveFontDeclarationsInHtml(REAL_GUIDE1_TEXT);
    expect(out).toContain('font-family: Montserrat-Bold');
    expect(out).not.toContain('font-weight');
    expect(out).toContain('color: var(--Colors-Blue-600, #1097aa)');
  });

  it('is a no-op for HTML without inline font declarations', () => {
    const html = '<p>Sin estilos</p>';
    expect(resolveFontDeclarationsInHtml(html)).toBe(html);
    expect(resolveFontDeclarationsInHtml('')).toBe('');
  });
});

// ─── ════════════════════════════════════════════════════════════════════════ ─
//     End to end — what RichText finally hands to the engine
// ─── ════════════════════════════════════════════════════════════════════════ ─

describe('F-09 end to end — the HTML given to the engine carries family + color', () => {
  it('register subtitle: bold family + resolved green', async () => {
    const props = await renderAndCapture(REAL_FLOW1_TEXT);
    const html = (props.source as { html: string }).html;

    expect(html).toContain('font-family: Montserrat-Bold');
    expect(html).not.toContain('font-weight');
    // var(--Colors-Green-500, #69ab3c) → resolved through the theme palette.
    expect(html).toContain('#69AB3C');
    expect(html).not.toContain('var(--');
  });

  it('card label: bold family + resolved orange', async () => {
    const props = await renderAndCapture(REAL_TEMPERATURA_MAX_NAME);
    const html = (props.source as { html: string }).html;

    expect(html).toContain('font-family: Montserrat-Bold');
    expect(html).toContain('#E58B24');
    expect(html).not.toContain('var(--');
  });

  it('guide steps: bold family + resolved blue, list markup preserved', async () => {
    const props = await renderAndCapture(REAL_GUIDE1_TEXT);
    const html = (props.source as { html: string }).html;

    expect(html).toContain('<ol');
    expect(html).toContain('<li>');
    expect(html).toContain('font-family: Montserrat-Bold');
    expect(html).toContain('#1097AA');
    expect(html).not.toContain('var(--');
  });
});
