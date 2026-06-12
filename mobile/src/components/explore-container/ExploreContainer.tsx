/**
 * B11 — ExploreContainerComponent
 *
 * Ported from: src/app/explore-container/explore-container.component.ts + .html
 * Classification: Rewrite required
 *
 * Used as layout wrapper for ~13 auth screens (pre-register, set-phone, etc.)
 * providing a consistent card layout with gradient background.
 *
 * Preserved contracts:
 *   - title prop (plain text)
 *   - titleHTML prop → rendered via RichText (replaces [innerHTML])
 *   - subTitle prop
 *   - message prop
 *   - BgBlue prop (background variant: blue or green)
 *   - Icon prop (custom icon URL)
 *   - children slot (replaces <ng-content>)
 *
 * Changes from original:
 *   - Angular @Component → React functional component
 *   - [innerHTML] → RichText (B09)
 *   - Linear gradient → expo-linear-gradient (R-23)
 *   - ion-img → Image / SVG
 *   - ion-thumbnail → default logo image
 *
 * Risks: R-08 (titleHTML HTML content), R-23 (gradient)
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { RichText } from '@/components/rich-text/RichText';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface ExploreContainerProps {
  /** Plain text title. If both title and titleHTML are provided, title takes priority. */
  title?: string;
  /** HTML title (rendered via RichText). Used when title is not provided. */
  titleHTML?: string;
  /** Subtitle below the title */
  subTitle?: string;
  /** Additional message text */
  message?: string;
  /**
   * Background gradient variant.
   * true → blue gradient; false (default) → green gradient
   */
  BgBlue?: boolean;
  /**
   * Custom icon URI (file:// path or remote URL).
   * If not provided, falls back to the app logo.
   */
  Icon?: string;
  /** Child content rendered inside the card (replaces <ng-content>) */
  children?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ExploreContainer
 *
 * Layout wrapper for auth screens with gradient background and card.
 * Wraps child content inside a styled card with optional title/subtitle/icon.
 *
 * @example
 *   <ExploreContainer
 *     title="Registro"
 *     subTitle="Crea tu cuenta"
 *     BgBlue={false}
 *   >
 *     <RegisterForm />
 *   </ExploreContainer>
 */
export function ExploreContainer({
  title,
  titleHTML,
  subTitle,
  message,
  BgBlue = false,
  Icon,
  children,
}: ExploreContainerProps): React.JSX.Element {
  const { theme } = useTheme();

  // Gradient colors: blue variant or green variant (matching original bg_blue/bg_green CSS classes)
  const gradientColors = BgBlue
    ? ([theme.colors.blue[700], theme.colors.blue[500]] as const)
    : ([theme.colors.green[700], theme.colors.green[500]] as const);

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.gradient}
      testID="explore-container"
    >
      <View style={styles.card}>
        {/* Icon or default logo */}
        {Icon ? (
          <Image
            source={{ uri: Icon }}
            style={styles.icon}
            resizeMode="contain"
          />
        ) : (
          <Image
            source={require('@/assets/png/icon-only.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}

        {/* Title (plain text or HTML) */}
        {title ? (
          <Text
            style={[
              styles.title,
              {
                fontFamily: fontFamilyForWeight('700'),
                color: theme.colors.white,
              },
            ]}
          >
            {title}
          </Text>
        ) : titleHTML ? (
          <RichText
            html={titleHTML}
            baseColor={theme.colors.white}
            containerStyle={styles.titleHtmlContainer}
          />
        ) : null}

        {/* Subtitle */}
        {subTitle ? (
          <Text
            style={[
              styles.subTitle,
              {
                fontFamily: fontFamilyForWeight('400'),
                color: theme.colors.white,
              },
            ]}
          >
            {subTitle}
          </Text>
        ) : null}

        {/* Message */}
        {message ? (
          <Text
            style={[
              styles.message,
              {
                fontFamily: fontFamilyForWeight('400'),
                color: theme.colors.white,
              },
            ]}
          >
            {message}
          </Text>
        ) : null}

        {/* Children slot */}
        {children}
      </View>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  icon: {
    width: 80,
    height: 80,
  },
  logo: {
    width: 64,
    height: 64,
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
  },
  titleHtmlContainer: {
    alignSelf: 'center',
  },
  subTitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default ExploreContainer;
