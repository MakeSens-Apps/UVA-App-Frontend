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
    <View style={styles.container} testID="progress-bar-container">
      <Text style={[styles.text, { color: theme.semanticColors.text }]}>
        {`Progreso: ${currentProgress} de ${totalProgress}`}
      </Text>
      <View
        style={[
          styles.track,
          { backgroundColor: theme.colors.gray[200] },
        ]}
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
    width: '100%',
  },
  text: {
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    marginBottom: 4,
    textAlign: 'center',
  },
  track: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default ProgressBar;
