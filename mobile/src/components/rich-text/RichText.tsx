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
 *   3. <RenderHtml>          — react-native-render-html renders the result
 *
 * Risks addressed: R-08 (HTML from S3/backend), R-34 (sanitization), R-05 (var tokens)
 *
 * Theme integration:
 *   useTheme() is called internally so callers don't need to pass theme props.
 *   Wrapping in ThemeProvider is required (B08 gate).
 */

import React, { useMemo } from 'react';
import { useWindowDimensions, StyleSheet, View } from 'react-native';
import RenderHtml, {
  type MixedStyleRecord,
  type RenderHTMLProps,
} from 'react-native-render-html';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { sanitizeRichHtml } from './sanitize';
import { resolveVarTokensInHtml } from './varTokenResolver';

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
    return resolveVarTokensInHtml(sanitized, theme.brandingOverrides);
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
      b: {
        fontFamily: fontFamilyForWeight('700'),
      },
      strong: {
        fontFamily: fontFamilyForWeight('700'),
      },
      i: {
        fontFamily: fontFamilyForWeight('400', true),
      },
      em: {
        fontFamily: fontFamilyForWeight('400', true),
      },
      h1: {
        fontFamily: fontFamilyForWeight('700'),
        fontSize: theme.typography.sizes.xl,
        marginBottom: theme.spacing.sm,
      },
      h2: {
        fontFamily: fontFamilyForWeight('700'),
        fontSize: theme.typography.sizes.lg,
        marginBottom: theme.spacing.sm,
      },
      h3: {
        fontFamily: fontFamilyForWeight('600'),
        fontSize: theme.typography.sizes.base,
        marginBottom: theme.spacing.sm,
      },
      h4: {
        fontFamily: fontFamilyForWeight('600'),
        fontSize: theme.typography.sizes.sm,
        marginBottom: theme.spacing.xs,
      },
      h5: {
        fontFamily: fontFamilyForWeight('500'),
        fontSize: theme.typography.sizes.sm,
      },
      h6: {
        fontFamily: fontFamilyForWeight('500'),
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
        contentWidth={contentWidth ?? windowWidth}
        source={{ html: processedHtml }}
        baseStyle={baseStyle}
        tagsStyles={mergedTagsStyles}
        // systemFonts is provided so RNRH knows our custom font families are valid
        systemFonts={[
          'Montserrat-Regular',
          'Montserrat-Medium',
          'Montserrat-SemiBold',
          'Montserrat-Bold',
          'Montserrat-Italic',
          'Montserrat-MediumItalic',
          'Montserrat-SemiBoldItalic',
          'Montserrat-BoldItalic',
        ]}
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
