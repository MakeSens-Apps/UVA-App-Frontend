/**
 * B09 — RichText component
 *
 * Shared component that replaces:
 *   - `[innerHTML]="... | safeHtml"` (Angular SafeHtmlPipe + DOMPurify + [innerHTML])
 *   - Direct HTML rendering in guides, flow.text, measurement.name/sortName,
 *     alert modal content, and explore-container titleHTML.
 *
 * Usage sites (portability-matrix §6):
 *   1. GuideMeasurementComponent  — guide.text (HTML when isHtmlText=true)
 *   2. RegisterMeasurementPage    — flow.text, item.name, getMessageError()
 *   3. MeasurementPage            — item.sortName
 *   4. ExploreContainerComponent  — titleHTML
 *   5. AlertComponent             — content (modal body)
 *   6. MeasurementDetailPage      — guide/measurement HTML fragments
 *
 * Pipeline (applied in order):
 *   1. sanitizeRichHtml()    — strip disallowed tags/attrs (replaces DOMPurify)
 *   2. resolveVarTokensInHtml() — replace var(--token) with concrete values
 *   3. resolveFontDeclarationsInHtml() — font-weight/style → Montserrat family
 *   4. <RenderHtml>          — react-native-render-html renders the result
 *
 * Risks addressed: R-08 (HTML from S3/backend), R-34 (sanitization), R-05 (var tokens)
 *
 * DEVICE BUG F-09 (rich text rendered flat on Android, fine on web/jest):
 *   react-native-render-html@6 declares its engine defaults through
 *   `TRenderEngineProvider.defaultProps`. React 19 (RN 0.85) only honours
 *   `defaultProps` in the legacy `React.createElement` path — the automatic JSX
 *   runtime ignores it. Metro resolves this package through its
 *   `"react-native": "src/"` field (TSX source, compiled with the automatic JSX
 *   runtime), while Jest and Expo Web resolve `main` (`lib/commonjs`, built with
 *   `React.createElement`). Result: on device `enableCSSInlineProcessing`
 *   arrived as `undefined`, and TRE's `{...defaultStylesConfig, ...stylesConfig}`
 *   spread let that `undefined` win over its own `true` default — so EVERY
 *   inline `style="…"` attribute was silently discarded (no bold, no colors,
 *   no font sizes), while `baseStyle`/`tagsStyles` kept working.
 *   Fix: RICH_TEXT_ENGINE_DEFAULTS passes those engine defaults explicitly, so
 *   the native, web and Jest render paths are identical.
 *
 * Theme integration:
 *   useTheme() is called internally so callers don't need to pass theme props.
 *   Wrapping in ThemeProvider is required (B08 gate).
 */

import React, { useMemo } from 'react';
import { Platform, useWindowDimensions, StyleSheet, View } from 'react-native';
import RenderHtml, {
  type MixedStyleRecord,
  type RenderHTMLProps,
} from 'react-native-render-html';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { sanitizeRichHtml } from './sanitize';
import { resolveVarTokensInHtml } from './varTokenResolver';
import { resolveFontDeclarationsInHtml } from './fontDeclarationResolver';

// ─── Engine defaults (see the F-09 note in the file header) ───────────────────

/**
 * Font families registered by expo-font (theme.ts FONT_ASSETS).
 *
 * `react-native-render-html` only keeps a CSS `font-family` when the name is in
 * this list, so every Montserrat static face must be declared here.
 *
 * Module-level constant on purpose: a fresh array on each render would rebuild
 * the whole transient render engine (it is a `useMemo` dependency inside RNRH).
 */
export const RICH_TEXT_SYSTEM_FONTS: string[] = [
  'Montserrat-Regular',
  'Montserrat-Medium',
  'Montserrat-SemiBold',
  'Montserrat-Bold',
  'Montserrat-Italic',
  'Montserrat-MediumItalic',
  'Montserrat-SemiBoldItalic',
  'Montserrat-BoldItalic',
];

/**
 * Transient-render-engine defaults that RNRH would normally supply through
 * `TRenderEngineProvider.defaultProps` — ignored by React 19 on the native
 * build. Passing them explicitly keeps native, web and Jest in sync.
 *
 * Values mirror `defaultTRenderEngineProviderProps` from
 * react-native-render-html@6.3.4 exactly.
 */
export const RICH_TEXT_ENGINE_DEFAULTS: Pick<
  RenderHTMLProps,
  | 'enableCSSInlineProcessing'
  | 'enableUserAgentStyles'
  | 'emSize'
  | 'ignoredDomTags'
  | 'ignoredStyles'
  | 'customHTMLElementModels'
  | 'idsStyles'
  | 'classesStyles'
  | 'htmlParserOptions'
  | 'fallbackFonts'
  | 'systemFonts'
> = {
  /** THE device fix: without this, every inline style is dropped on Android. */
  enableCSSInlineProcessing: true,
  enableUserAgentStyles: true,
  emSize: 14,
  ignoredDomTags: [],
  ignoredStyles: [],
  customHTMLElementModels: {},
  idsStyles: {},
  classesStyles: {},
  htmlParserOptions: { decodeEntities: true },
  fallbackFonts: {
    'sans-serif': Platform.select({ ios: 'system', default: 'sans-serif' }),
    monospace: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    serif: Platform.select({ ios: 'Times New Roman', default: 'serif' }),
  },
  systemFonts: RICH_TEXT_SYSTEM_FONTS,
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RichTextProps {
  /**
   * Raw HTML string from the backend (S3 guides, flow.text, sortName, etc.).
   * It is sanitized and var()-resolved before rendering.
   */
  html: string;

  /**
   * Base font size in dp. Defaults to theme.typography.sizes.base (16).
   */
  baseFontSize?: number;

  /**
   * Base text color. Defaults to theme.semanticColors.text.
   */
  baseColor?: string;

  /**
   * Optional additional tag styles merged with the defaults.
   * Useful for callers that need to override heading sizes, etc.
   */
  tagsStyles?: MixedStyleRecord;

  /**
   * Whether to allow the content to take up only the space it needs
   * (inline container) vs full width (block container).
   * Defaults to false (block / full width).
   */
  inline?: boolean;

  /**
   * Optional containerStyle forwarded to the wrapping View.
   */
  containerStyle?: object;

  /**
   * Additional props forwarded to <RenderHtml>.
   * The `source`, `contentWidth`, `tagsStyles`, and `baseStyle` props are
   * controlled internally and cannot be overridden here.
   */
  renderHtmlProps?: Omit<
    RenderHTMLProps,
    'source' | 'contentWidth' | 'tagsStyles' | 'baseStyle'
  >;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * RichText
 *
 * Renders sanitized HTML from the backend using react-native-render-html.
 * Replaces Angular's `[innerHTML]="value | safeHtml"` pattern.
 *
 * @example Guide text (HTML mode):
 *   <RichText html={guide.text} />
 *
 * @example Measurement sortName (may contain <b> or <span>):
 *   <RichText html={measurement.sortName} inline />
 *
 * @example Modal content with custom font size:
 *   <RichText html={alertContent} baseFontSize={14} />
 */
export function RichText({
  html,
  baseFontSize,
  baseColor,
  tagsStyles: extraTagsStyles,
  inline = false,
  containerStyle,
  renderHtmlProps,
}: RichTextProps): React.JSX.Element {
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // ─── Sanitize + resolve var() tokens ─────────────────────────────────────
  const processedHtml = useMemo(() => {
    const sanitized = sanitizeRichHtml(html);
    const varResolved = resolveVarTokensInHtml(sanitized, theme.brandingOverrides);
    // font-weight/font-style → Montserrat static family (Android has no
    // synthetic weights for custom asset fonts). See fontDeclarationResolver.ts.
    return resolveFontDeclarationsInHtml(varResolved);
  }, [html, theme.brandingOverrides]);

  // ─── Base styles (applied to the root text node) ─────────────────────────
  const resolvedFontSize = baseFontSize ?? theme.typography.sizes.base;
  const resolvedColor = baseColor ?? theme.semanticColors.text;

  const baseStyle = useMemo(
    () => ({
      fontFamily: fontFamilyForWeight('400'),
      fontSize: resolvedFontSize,
      color: resolvedColor,
    }),
    [resolvedFontSize, resolvedColor],
  );

  // ─── Tag-level styles (map HTML tags to RN equivalents) ──────────────────
  const defaultTagsStyles = useMemo<MixedStyleRecord>(
    () => ({
      // NOTE on `fontWeight: 'normal'` / `fontStyle: 'normal'` below:
      // the user-agent stylesheet gives these tags `fontWeight: 'bold'` /
      // `fontStyle: 'italic'`. Combined with a custom asset family, Android
      // resolves `<family>_bold`, fails, and falls back to the system typeface
      // (wrong font) or double-bolds. Weight/slant are carried by the family
      // name alone across the whole app — see theme.fontFamilyForWeight().
      b: {
        fontFamily: fontFamilyForWeight('700'),
        fontWeight: 'normal',
      },
      strong: {
        fontFamily: fontFamilyForWeight('700'),
        fontWeight: 'normal',
      },
      i: {
        fontFamily: fontFamilyForWeight('400', true),
        fontStyle: 'normal',
      },
      em: {
        fontFamily: fontFamilyForWeight('400', true),
        fontStyle: 'normal',
      },
      h1: {
        fontFamily: fontFamilyForWeight('700'),
        fontWeight: 'normal',
        fontSize: theme.typography.sizes.xl,
        marginBottom: theme.spacing.sm,
      },
      h2: {
        fontFamily: fontFamilyForWeight('700'),
        fontWeight: 'normal',
        fontSize: theme.typography.sizes.lg,
        marginBottom: theme.spacing.sm,
      },
      h3: {
        fontFamily: fontFamilyForWeight('600'),
        fontWeight: 'normal',
        fontSize: theme.typography.sizes.base,
        marginBottom: theme.spacing.sm,
      },
      h4: {
        fontFamily: fontFamilyForWeight('600'),
        fontWeight: 'normal',
        fontSize: theme.typography.sizes.sm,
        marginBottom: theme.spacing.xs,
      },
      h5: {
        fontFamily: fontFamilyForWeight('500'),
        fontWeight: 'normal',
        fontSize: theme.typography.sizes.sm,
      },
      h6: {
        fontFamily: fontFamilyForWeight('500'),
        fontWeight: 'normal',
        fontSize: theme.typography.sizes.xs,
      },
      p: {
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
      },
      a: {
        color: theme.semanticColors.primary,
        textDecorationLine: 'underline',
      },
      ul: {
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
      },
      ol: {
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
      },
      li: {
        marginBottom: theme.spacing.xs,
      },
      table: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.semanticColors.border,
      },
      td: {
        padding: theme.spacing.xs,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.semanticColors.border,
      },
      th: {
        padding: theme.spacing.xs,
        fontFamily: fontFamilyForWeight('700'),
        fontWeight: 'normal',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.semanticColors.border,
        backgroundColor: theme.colors.gray[100],
      },
      hr: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.semanticColors.border,
      },
    }),
    [theme],
  );

  const mergedTagsStyles = useMemo<MixedStyleRecord>(
    () => ({ ...defaultTagsStyles, ...extraTagsStyles }),
    [defaultTagsStyles, extraTagsStyles],
  );

  // ─── Content width ────────────────────────────────────────────────────────
  // react-native-render-html requires contentWidth to lay out block elements.
  // We use the window width; inline callers may want to pass a narrower value.
  const contentWidth = inline ? undefined : windowWidth;

  return (
    <View
      style={[
        inline ? styles.inlineContainer : styles.blockContainer,
        containerStyle as object | undefined,
      ]}
    >
      <RenderHtml
        // Engine defaults first: React 19 ignores RNRH's own `defaultProps` on
        // the native build (see the F-09 note in the file header).
        {...RICH_TEXT_ENGINE_DEFAULTS}
        contentWidth={contentWidth ?? windowWidth}
        source={{ html: processedHtml }}
        baseStyle={baseStyle}
        tagsStyles={mergedTagsStyles}
        {...(renderHtmlProps ?? {})}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  blockContainer: {
    width: '100%',
  },
  inlineContainer: {
    // Shrink to content — RNRH handles the sizing internally
    flexShrink: 1,
  },
});

export default RichText;

// ─── Re-exports (convenience) ─────────────────────────────────────────────────
export { sanitizeRichHtml, ALLOWED_TAGS, ALLOWED_ATTR } from './sanitize';
export { resolveVarTokensInHtml, resolveVarToken } from './varTokenResolver';
export {
  resolveFontDeclarationsInHtml,
  rewriteFontDeclarations,
  normalizeFontWeight,
} from './fontDeclarationResolver';
