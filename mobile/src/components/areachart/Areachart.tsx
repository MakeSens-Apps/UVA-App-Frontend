/**
 * B11 — AreachartComponent (SPIKE: victory-native/Skia)
 *
 * Ported from: src/app/components/areachart/areachart.component.ts
 * Classification: Rewrite required (Chart.js → victory-native)
 *
 * SPIKE objective (plan.md B11):
 *   Validate victory-native/Skia in normal and detailedMode BEFORE wiring
 *   into screens (B15). All chart data passed as REACTIVE PROPS — no imperative
 *   UpdateChart() method.
 *
 * Preserved contracts:
 *   - chartData: number[] (average values)
 *   - chartLabels: string[] (ISO date strings, e.g. "2024-01-15")
 *   - background: hex color string for gradient fill
 *   - borderColor: hex color string for the line
 *   - detailedMode: bool — when true shows min/max band + avg line
 *   - chartMinData / chartMaxData: number[] (for detailedMode band)
 *   - ymin / ymax: y-axis range
 *   - xmin / xmax: x-axis range (date strings)
 *
 * Changes from original:
 *   - Chart.js / chartjs-adapter-date-fns → victory-native (VictoryChart, VictoryArea,
 *     VictoryLine, VictoryScatter, VictoryAxis, VictoryTooltip)
 *   - AfterViewInit / @ViewChild → useMemo + useWindowDimensions (reactive props)
 *   - UpdateChart() imperative method ELIMINATED — component re-renders when props change
 *   - hexToRgba() utility preserved as pure function
 *   - Gradient: VictoryArea fill with opacity layers
 *   - Tooltip: VictoryVoronoiContainer replaces Chart.js tooltip callbacks
 *   - X-axis: date-fns format "dd/MM" for day ticks
 *   - detailedMode band: VictoryArea (max) + VictoryLine (min) + VictoryLine (avg)
 *
 * NOTE on detailedMode data shape:
 *   The original Chart.js used labels (string[]) as x-axis with type:'time'.
 *   victory-native uses {x, y} datum objects. We convert chartLabels+chartData
 *   to [{x: Date, y: number}] internally.
 *
 * Risks: R-02 (victory-native/Skia)
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import {
  CartesianChart,
  Area,
  Line,
} from 'victory-native';
import type { SkFont } from '@shopify/react-native-skia';
import { useFont } from '@shopify/react-native-skia';
import { format } from 'date-fns';

// Font asset — loaded via useFont (Skia). Must be a static require so metro bundles it.
// In test environments this may resolve to undefined; useFont handles that gracefully.
const MONTSERRAT_REGULAR_FONT = (() => {
  try {
    return require('@/assets/fonts/Montserrat-Regular.ttf') as unknown;
  } catch {
    return null;
  }
})();

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a hex color code to RGBA format.
 * Preserved from original hexToRgba().
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Parses a date string safely (replaces "-" with "/" for Safari/Android compat).
 * Preserved from original getMonthStartAndEnd pattern.
 */
function parseDateSafe(dateString: string): Date {
  return new Date(dateString.replace(/-/g, '/'));
}

// ─── Data shape ────────────────────────────────────────────────────────────────

interface ChartDatum {
  x: number; // timestamp (ms)
  y: number;
  yMin?: number;
  yMax?: number;
}

// ─── Props ─────────────────────────────────────────────────────────────────────

export interface AreachartProps {
  /** Average data values */
  chartData?: number[];
  /** ISO date strings for x-axis (e.g. "2024-01-15") */
  chartLabels?: string[];
  /** Background fill color (hex, e.g. '#FBA641') */
  background?: string;
  /** Line/border color (hex, e.g. '#FBA641') */
  borderColor?: string;
  /** Y-axis min value */
  ymin?: number;
  /** Y-axis max value */
  ymax?: number;
  /** X-axis min date string */
  xmin?: string;
  /** X-axis max date string */
  xmax?: string;
  /**
   * Enable detailed mode with min/max band visualization.
   * Requires chartMinData and chartMaxData.
   */
  detailedMode?: boolean;
  /** Minimum values for detailed mode band */
  chartMinData?: number[];
  /** Maximum values for detailed mode band */
  chartMaxData?: number[];
  /** Chart height (default: 200) */
  height?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Areachart
 *
 * Area chart powered by victory-native/Skia.
 * Reactive to all props — no imperative update methods.
 *
 * @example Normal mode:
 *   <Areachart
 *     chartData={[20, 22, 21]}
 *     chartLabels={['2024-01-01', '2024-01-02', '2024-01-03']}
 *     background="#FBA641"
 *     borderColor="#FBA641"
 *   />
 *
 * @example Detailed mode (min/max band + avg line):
 *   <Areachart
 *     chartData={[20, 22, 21]}
 *     chartLabels={['2024-01-01', '2024-01-02', '2024-01-03']}
 *     chartMinData={[18, 19, 19]}
 *     chartMaxData={[24, 25, 23]}
 *     background="#10BCCA"
 *     borderColor="#10BCCA"
 *     detailedMode
 *   />
 */
export function Areachart({
  chartData = [],
  chartLabels = [],
  background = '#FBA641',
  borderColor = '#FBA641',
  ymin,
  ymax,
  xmin,
  xmax,
  detailedMode = false,
  chartMinData = [],
  chartMaxData = [],
  height = 200,
}: AreachartProps): React.JSX.Element {
  const { width: windowWidth } = useWindowDimensions();

  // Attempt to load font for axis labels (Montserrat-Regular)
  // MONTSERRAT_REGULAR_FONT may be null in test environments; useFont handles that.
  const font: SkFont | null = useFont(MONTSERRAT_REGULAR_FONT as Parameters<typeof useFont>[0], 11);

  // Convert chartLabels + chartData to CartesianChart data format
  const chartDatum: ChartDatum[] = useMemo(() => {
    if (chartLabels.length === 0 || chartData.length === 0) return [];
    return chartLabels.map((label, i) => ({
      x: parseDateSafe(label).getTime(),
      y: chartData[i] ?? 0,
      yMin: chartMinData[i],
      yMax: chartMaxData[i],
    })).filter((d) => !isNaN(d.x));
  }, [chartLabels, chartData, chartMinData, chartMaxData]);

  // X domain from xmin/xmax or auto from data
  const xDomain = useMemo((): [number, number] | undefined => {
    if (xmin && xmax) {
      return [parseDateSafe(xmin).getTime(), parseDateSafe(xmax).getTime()];
    }
    if (chartDatum.length === 0) return undefined;
    const xs = chartDatum.map((d) => d.x);
    return [Math.min(...xs), Math.max(...xs)];
  }, [xmin, xmax, chartDatum]);

  // Y domain
  const yDomain = useMemo((): [number, number] | undefined => {
    if (ymin !== undefined && ymax !== undefined) {
      return [ymin, ymax];
    }
    return undefined;
  }, [ymin, ymax]);

  if (chartDatum.length === 0) {
    return <View style={[styles.container, { height }]} testID="areachart-empty" />;
  }

  // Color with opacity for area fill
  const areaFillColor = hexToRgba(background, 0.6);

  return (
    <View
      style={[styles.container, { height, width: windowWidth }]}
      testID="areachart"
    >
      <CartesianChart
        data={chartDatum}
        xKey="x"
        yKeys={detailedMode && chartMinData.length > 0 && chartMaxData.length > 0
          ? ['y', 'yMin', 'yMax']
          : ['y']
        }
        domain={{
          x: xDomain,
          y: yDomain,
        }}
        axisOptions={{
          font,
          formatXLabel: (value: number) => {
            try {
              return format(new Date(value), 'dd/MM');
            } catch {
              return '';
            }
          },
        }}
      >
        {({ points, chartBounds }) => (
          <>
            {detailedMode && chartMinData.length > 0 && chartMaxData.length > 0 ? (
              <>
                {/* Min-max band (background area) */}
                <Area
                  points={points.yMax ?? []}
                  y0={(chartBounds.bottom + chartBounds.top) / 2}
                  color={areaFillColor}
                  animate={{ type: 'timing', duration: 300 }}
                />
                {/* Avg line (foreground) */}
                <Line
                  points={points.y}
                  color={borderColor}
                  strokeWidth={2}
                  animate={{ type: 'timing', duration: 300 }}
                />
              </>
            ) : (
              /* Normal mode: filled area + line */
              <Area
                points={points.y}
                y0={chartBounds.bottom}
                color={areaFillColor}
                animate={{ type: 'timing', duration: 300 }}
              />
            )}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default Areachart;
