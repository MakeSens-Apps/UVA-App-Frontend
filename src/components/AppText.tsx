/**
 * B08 — AppText: Typed Text component replacing the `text_base` mixin.
 *
 * Ported from: src/theme/mixins.scss (`@mixin text_base`)
 *
 * Original mixin (used 59 times in SCSS):
 *   @mixin text_base($font-size: 16px, $font-weigh: 500) {
 *     font-size: $font-size;
 *     margin-top: 10px; margin-bottom: 10px;
 *     font-weight: $font-weigh;
 *     line-height: normal; font-style: normal;
 *   }
 *
 * Problem (R-16, portability-matrix §4):
 *   1. `fontWeight` over a variable font does NOT interpolate reliably on Android RN.
 *      Each weight is a SEPARATE expo-font family.
 *   2. The mixin EMBEDDED 10px top+bottom margins into the typography rule.
 *      This couples layout to text — in RN, margin belongs on the container, not Text.
 *
 * This component:
 *   - Selects the correct `fontFamily` by weight using fontFamilyForWeight().
 *   - Does NOT add any default margins (separation per R-16 & matrix).
 *   - Accepts optional `marginVertical` prop for the rare cases where the caller
 *     wants the original 10px spacing without touching surrounding layout.
 *   - Falls back gracefully if fonts are not yet loaded.
 *   - All props are typed; unknown props are forwarded to the RN Text.
 */

import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { fontFamilyForWeight, lineHeightFor, typography } from '@/theme/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

type FontWeight = '400' | '500' | '600' | '700';
type FontSize = keyof typeof typography.sizes;

export interface AppTextProps extends Omit<TextProps, 'style'> {
  /**
   * Font size token from the typography scale.
   * Defaults to 'base' (16px).
   */
  size?: FontSize | number;

  /**
   * Font weight token.
   * Resolved to a static Montserrat font family (R-16).
   * Defaults to '500' (Medium), preserving text_base default.
   */
  weight?: FontWeight;

  /**
   * Whether to use the italic variant.
   * Defaults to false.
   */
  italic?: boolean;

  /**
   * Text color. Defaults to undefined (inherits from parent or is unset).
   */
  color?: string;

  /**
   * Line-height ratio multiplier.
   * Use 1.2 for 'normal' (default), 1.5 for '150%'.
   */
  lineHeightRatio?: number;

  /**
   * Optional vertical margin (top AND bottom).
   * Only set this when migrating a site that relied on text_base's 10px margins.
   * Default: 0 (NO margin — margin belongs on containers, not text).
   */
  marginVertical?: number;

  /** Additional style overrides (applied last). */
  style?: TextStyle | TextStyle[];

  children?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * AppText
 *
 * Replacement for all `@include text_base(...)` invocations.
 *
 * @example Basic usage:
 *   <AppText>Hello world</AppText>
 *
 * @example With weight and size:
 *   <AppText size="lg" weight="600" color={theme.semanticColors.primary}>
 *     Card title
 *   </AppText>
 *
 * @example With legacy 10px margin (migration only):
 *   <AppText size="sm" weight="500" marginVertical={10}>
 *     Label
 *   </AppText>
 */
export function AppText({
  size = 'base',
  weight = '500',
  italic = false,
  color,
  lineHeightRatio = 1.2,
  marginVertical = 0,
  style,
  children,
  ...rest
}: AppTextProps): React.JSX.Element {
  const fontSize =
    typeof size === 'number'
      ? size
      : (typography.sizes[size as FontSize] ?? typography.sizes.base);

  const computedStyle: TextStyle = {
    fontFamily: fontFamilyForWeight(weight, italic),
    fontSize,
    lineHeight: lineHeightFor(fontSize, lineHeightRatio),
    ...(color !== undefined ? { color } : {}),
    ...(marginVertical > 0 ? { marginVertical } : {}),
  };

  const flatStyle: TextStyle[] = [
    computedStyle,
    ...(Array.isArray(style) ? style : style !== undefined ? [style] : []),
  ];

  return (
    <Text style={flatStyle} {...rest}>
      {children}
    </Text>
  );
}

export default AppText;
