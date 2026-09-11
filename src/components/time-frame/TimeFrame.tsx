/**
 * B11 — TimeFrameComponent
 *
 * Ported from: src/app/pages/historical/time-frame/time-frame.component.ts + .html
 * Classification: Minor adaptation (S effort)
 *
 * Preserved contracts:
 *   - timeFrame prop: 'month' | 'year'
 *   - segmentChange callback (replaces EventEmitter<TimeFrame>)
 *   - Two buttons: "Mes" and "Año"
 *
 * Changes from original:
 *   - Angular @Component / @Input / @Output → React functional component
 *   - IonSegment → custom segmented control with TouchableOpacity
 *   - FormsModule ngModel → controlled component via props
 *
 * TimeFrame type re-exported here for convenience; also defined in the
 * historical model (same shape).
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Time frame selection: 'month' or 'year'. */
export type TimeFrameValue = 'month' | 'year';

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface TimeFrameProps {
  /** Currently selected time frame */
  timeFrame?: TimeFrameValue;
  /** Called when the segment changes */
  onSegmentChange?: (value: TimeFrameValue) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TimeFrame
 *
 * Segmented control to switch between monthly and yearly view.
 * Replaces IonSegment/IonSegmentButton from Ionic.
 *
 * @example
 *   <TimeFrame
 *     timeFrame={currentFrame}
 *     onSegmentChange={setCurrentFrame}
 *   />
 */
export function TimeFrame({
  timeFrame = 'month',
  onSegmentChange,
}: TimeFrameProps): React.JSX.Element {
  const { theme } = useTheme();

  const segments: { value: TimeFrameValue; label: string }[] = [
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#FFFFFF', // Ionic: var(--White) = #fff
          borderColor: '#10BCCA', // Ionic: var(--Colors-Blue-500)
        },
      ]}
      testID="time-frame"
    >
      {segments.map(({ value, label }) => {
        const isActive = timeFrame === value;
        return (
          <TouchableOpacity
            key={value}
            style={[
              styles.segment,
              isActive && {
                backgroundColor: '#1097AA', // Ionic: --background-checked: var(--Colors-Blue-600)
              },
            ]}
            onPress={() => onSegmentChange?.(value)}
            testID={`time-frame-${value}`}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  fontFamily: fontFamilyForWeight(isActive ? '600' : '400'),
                  color: isActive ? theme.colors.white : '#10BCCA', // inactive: --Colors-Blue-500
                },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 2, // Ionic: border: 2px solid var(--Colors-Blue-500)
    overflow: 'hidden',
    alignSelf: 'stretch', // full width like Ionic original
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    textTransform: 'capitalize',
  },
});

export default TimeFrame;
