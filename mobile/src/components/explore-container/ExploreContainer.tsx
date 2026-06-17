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
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { RichText } from '@/components/rich-text/RichText';
// Original background.svg — soft teal (#4BC5BE base + blurred #10BCCA blob + 0.2 overlay,
// blur 25px). global.scss %bg / .container_explore (bg_green / bg_blue). NOT a hard gradient.
import BackgroundSvg from '@/assets/svg/background.svg';
// Circular badge logo (logo_badge.svg): the 70x70 white-gradient circle (0.8→0.6) + teal
// feather+chart icon from the original logo.svg, with its full-bleed background rects removed
// (those are meant for the teal splash; on the card they'd render as a square box).
// Matches the badge in docs/evidence/auth-login/screen-01-login-vacio.png.
import LogoSvg from '@/assets/svg/logo_badge.svg';

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

  return (
    <View style={styles.root} testID="explore-container">
      {/* Background — original %bg uses background.svg (soft teal), NOT a hard gradient.
          global.scss:59-93 .container_explore.bg_green / .bg_blue. */}
      <BackgroundSvg
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={styles.background as StyleProp<ViewStyle>}
      />
      {/* bg_blue variant overlays a translucent white wash (global.scss:87-92) */}
      {BgBlue ? <View style={styles.blueWash} /> : null}

      {/* Frosted card — .card-content_gradient: rgba(255,255,255,0.3)→rgba(255,255,255,0.8),
          border-radius:20px (global.scss:100-106). Semi-transparent so the teal shows through. */}
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.card}
        >
          {/* Icon or default circular badge logo (global.scss:195-203 thumbnail 70px) */}
          {Icon ? (
            <Image
              source={{ uri: Icon }}
              style={styles.icon}
              resizeMode="contain"
            />
          ) : (
            <LogoSvg width={70} height={70} />
          )}

          {/* Title (plain text or HTML) — h1: 20px/600, blue[800] (global.scss:118-122) */}
          {title ? (
            <Text
              style={[
                styles.title,
                {
                  fontFamily: fontFamilyForWeight('600'),
                  color: theme.colors.blue[800],
                },
              ]}
            >
              {title}
            </Text>
          ) : titleHTML ? (
            <RichText
              html={titleHTML}
              baseColor={theme.colors.blue[800]}
              containerStyle={styles.titleHtmlContainer}
            />
          ) : null}

          {/* Subtitle — .subtitle: 16px/700, gray[700] (global.scss:124-136) */}
          {subTitle ? (
            <Text
              style={[
                styles.subTitle,
                {
                  fontFamily: fontFamilyForWeight('700'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              {subTitle}
            </Text>
          ) : null}

          {/* Message — .message: 16px/500, gray[700] (global.scss:124-132) */}
          {message ? (
            <Text
              style={[
                styles.message,
                {
                  fontFamily: fontFamilyForWeight('500'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              {message}
            </Text>
          ) : null}

          {/* Children slot */}
          {children}
        </LinearGradient>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // .container_explore padding:5vw (~18px on a 360px-wide device) — global.scss:77
    padding: 18,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blueWash: {
    // bg_blue ::before background: rgba(255,255,255,0.60) — global.scss:90
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  card: {
    // .card-content_gradient: border-radius:20px (global.scss:102). Semi-transparent frosted.
    borderRadius: 20,
    // .card @include align(20px) → padding + gap of 20px
    padding: 20,
    width: '100%',
    alignItems: 'center',
    gap: 20,
    overflow: 'hidden',
  },
  icon: {
    // .icon height:70px (global.scss:201-203)
    width: 70,
    height: 70,
  },
  title: {
    // h1: 20px/600 (global.scss:118-119)
    fontSize: 20,
    textAlign: 'center',
  },
  titleHtmlContainer: {
    alignSelf: 'center',
  },
  subTitle: {
    // .subtitle: 16px, line-height 150% (global.scss:124-136)
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  message: {
    // .message: 16px, line-height 150% (global.scss:124-132)
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ExploreContainer;
