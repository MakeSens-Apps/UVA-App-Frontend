/**
 * B10 — ion-toast look & feel for react-native-toast-message.
 *
 * Ported from: `ToastController.create({ message, duration, position, color })`
 * (`historical.page.ts:1027`, `configuration.page.ts`, …).
 *
 * Why a custom config (D-08):
 *   The library default (`BaseToast`) is a white rounded card with a coloured
 *   left border, black bold `text1` and side margins — nothing like an
 *   `ion-toast`, which is a SOLID full-width bar glued to the bottom edge with
 *   white, regular-weight, left-aligned text.
 *   Evidence: `docs/evidence/historical/screen-27-historical-compartir-loading.png`
 *   (sampled background #2DD55B = Ionic 8 `--ion-color-success`).
 *
 * The config is GLOBAL: the same bar is used by "Reporte compartido
 * exitosamente" (Historial) and "Notificaciones habilitadas correctamente"
 * (Configuración), exactly like a single ion-toast style in the original.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fontFamilyForWeight } from '@/theme/theme';

// ─── Ionic 8 palette for ion-toast colours ────────────────────────────────────

/** `--ion-color-success` (Ionic 8) — sampled from the original capture. */
const ION_SUCCESS = '#2DD55B';
/** `--ion-color-danger` (Ionic 8). */
const ION_DANGER = '#C5000F';
/** `--ion-color-warning` (Ionic 8). */
const ION_WARNING = '#FFC409';
/** Neutral / no `color` attribute — MD toast surface. */
const ION_NEUTRAL = '#2A2A2A';

/** `--ion-color-*-contrast` for the coloured bars. */
const CONTRAST_LIGHT = '#FFFFFF';
const CONTRAST_DARK = '#000000';

/**
 * IonToastBar
 *
 * Solid full-width bar with regular-weight text, mirroring `ion-toast` on MD.
 *
 * @param {object} props - bar colours plus the toast text lines.
 * @returns {React.JSX.Element} The rendered bar.
 */
function IonToastBar({
  background,
  color,
  text1,
  text2,
}: {
  background: string;
  color: string;
  text1?: string;
  text2?: string;
}): React.JSX.Element {
  return (
    <View style={[styles.bar, { backgroundColor: background }]} testID="ion-toast">
      <Text
        style={[styles.message, { color, fontFamily: fontFamilyForWeight('400') }]}
        numberOfLines={2}
      >
        {/* showToast() puts the message in text1; text2 is the optional detail
            line when a title was supplied. */}
        {text1}
      </Text>
      {text2 ? (
        <Text
          style={[styles.message, { color, fontFamily: fontFamilyForWeight('400') }]}
          numberOfLines={2}
        >
          {text2}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Global toast renderers keyed by type (`success` | `error` | `info`).
 * Pass to `<Toast config={toastConfig} />`.
 */
export const toastConfig: ToastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <IonToastBar
      background={ION_SUCCESS}
      color={CONTRAST_LIGHT}
      text1={text1}
      text2={text2}
    />
  ),
  error: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <IonToastBar
      background={ION_DANGER}
      color={CONTRAST_LIGHT}
      text1={text1}
      text2={text2}
    />
  ),
  warning: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <IonToastBar
      background={ION_WARNING}
      color={CONTRAST_DARK}
      text1={text1}
      text2={text2}
    />
  ),
  info: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <IonToastBar
      background={ION_NEUTRAL}
      color={CONTRAST_LIGHT}
      text1={text1}
      text2={text2}
    />
  ),
};

/**
 * ToastHost
 *
 * Renders the toast portal with the ion-toast config and a `bottomOffset` equal
 * to the bottom safe-area inset, so the bar sits flush with the bottom edge of
 * the content area instead of being clipped by the Android navigation bar
 * (D-08).  Must be mounted ONCE, inside `SafeAreaProvider`.
 *
 * @returns {React.JSX.Element} The toast portal.
 */
export function ToastHost(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  return <Toast config={toastConfig} bottomOffset={insets.bottom} />;
}

const styles = StyleSheet.create({
  bar: {
    // ion-toast (MD, position bottom): full-bleed bar, no side margins,
    // no elevation ring, no rounded corners at the screen edge.
    width: '100%',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  message: {
    // ion-toast message: 14px, regular weight, left aligned.
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
  },
});

export default toastConfig;
