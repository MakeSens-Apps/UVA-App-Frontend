/**
 * B10 — ProgressBar
 *
 * Ported from: src/app/components/progress-bar/progress-bar.component.ts
 *
 * Replaces: IonProgressBar (Ionic web component with shadow DOM)
 *
 * Contract preserved:
 *   - currentProgress — current value
 *   - totalProgress   — total value (defaults to 1)
 *   - Text: "Progreso: {currentProgress} de {totalProgress}" (exact spec)
 *   - Bar fills proportionally: width = (currentProgress / totalProgress) * 100%
 *   - Color: green (uva_green-500 token)
 *
 * Visual parity fixes (home feature audit):
 *   - text color: --Colors-Gray-500 = #737373 (was semanticColors.text = #171717)
 *   - text fontSize: 14px (was 12px)
 *   - text fontFamily: Montserrat-Medium (weight 500, was Regular)
 *   - track backgroundColor: --Colors-Green-200 = #C8E6B0 (was gray[200] = #E5E5E5)
 *
 * Round 3 (paridad visual, verificado contra el original):
 *   - Fill color VERIFICADO: progress-bar.component.html línea 8 usa
 *     color="uva_green-500" y variables.scss define
 *     --ion-color-uva_green-500: #69AB3C (VERDE, no teal). El token correcto
 *     es theme.colors.green[500] — sin cambio de color.
 *   - .progress_container portado: fondo blanco, radius 14 (--3xl), padding 10,
 *     gap 8, align-items flex-start (texto a la izquierda, no centrado)
 *   - track height: 7px (ion-progress-bar { height: 7px }), min-width 2px
 *
 * Risks: R-06
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface ProgressBarProps {
  /** Current progress value. */
  currentProgress?: number;
  /** Total / max value. Defaults to 1. */
  totalProgress?: number;
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * ProgressBar
 *
 * Equivalent to `<app-progress-bar [currentProgress]="x" [totalProgress]="y">`.
 *
 * @example
 *   <ProgressBar currentProgress={3} totalProgress={7} />
 *   // Renders: "Progreso: 3 de 7" + filled bar
 */
export function ProgressBar({
  currentProgress = 0,
  totalProgress = 1,
}: ProgressBarProps): React.JSX.Element {
  const { theme } = useTheme();

  // Guard against division by zero (preserves original: default total=1)
  const safeTotalProgress = totalProgress > 0 ? totalProgress : 1;
  const ratio = Math.min(Math.max(currentProgress / safeTotalProgress, 0), 1);
  const fillPercent = `${(ratio * 100).toFixed(1)}%`;

  return (
    // Original: .progress_container { padding:10px; gap:8px; border-radius:14px;
    // background:#fff; align-items:flex-start }
    <View
      style={[styles.container, { backgroundColor: theme.colors.white }]}
      testID="progress-bar-container"
    >
      {/* Original: .progress_text { color: --Colors-Gray-500 = #737373; font-size: 14px; font-weight: 500 } */}
      <Text style={[styles.text, { color: theme.colors.gray[500] }]}>
        {`Progreso: ${currentProgress} de ${totalProgress}`}
      </Text>
      {/* Original: ion-progress-bar { background: --Colors-Green-200 = #C8E6B0 } */}
      <View
        style={[styles.track, { backgroundColor: theme.colors.green[200] }]}
        testID="progress-bar-track"
      >
        <View
          style={[
            styles.fill,
            {
              width: fillPercent as `${number}%`,
              backgroundColor: theme.colors.green[500],
            },
          ]}
          testID="progress-bar-fill"
        />
      </View>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    // Original: .progress_container — padding 10, gap 8, radius 14 (--3xl),
    // align-items flex-start, align-self stretch, background white
    width: '100%',
    padding: 10,
    gap: 8,
    borderRadius: 14,
    alignItems: 'flex-start',
  },
  text: {
    fontSize: 14, // original: font-size: 14px (progress-bar.component.scss .progress_text)
    fontFamily: 'Montserrat-Medium', // original: font-weight: 500
    lineHeight: 21, // original: line-height: 150%
  },
  track: {
    // Original: ion-progress-bar { height: 7px; min-width: 2px; border-radius: 4px }
    width: '100%',
    height: 7,
    minWidth: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default ProgressBar;
