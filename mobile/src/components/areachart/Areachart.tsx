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
import { View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import {
  CartesianChart,
  Area,
  AreaRange,
  Line,
  Bar,
} from 'victory-native';
import type { SkFont } from '@shopify/react-native-skia';
import { useFont } from '@shopify/react-native-skia';
import { format } from 'date-fns';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Polyline, Rect } from 'react-native-svg';

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
  /**
   * Chart type: 'line' (area+line, default) or 'bar'.
   * Mirrors original areachart.component.ts chartType Input.
   * Use 'bar' for accumulated/rainfall (Acu) measurements.
   */
  chartType?: 'line' | 'bar';
}

// ─── Web fallback component ────────────────────────────────────────────────────

// Padding constants (module-level to avoid useMemo dependency warnings)
const WEB_PAD_X = 8;
const WEB_PAD_Y = 8;

/**
 * AreachartWeb
 *
 * SVG-based area chart rendered via react-native-svg (web-compatible).
 * Mirrors the visual style of the Ionic original (Chart.js area chart):
 *   - Area fill with opacity, colored border line, no grid lines.
 * Used automatically when Platform.OS === 'web'.
 */
interface AreachartWebProps {
  chartDatum: ChartDatum[];
  background: string;
  borderColor: string;
  areaFillColor: string;
  height: number;
  width: number;
  detailedMode: boolean;
  yDomain: [number, number] | undefined;
  xDomain: [number, number] | undefined;
  chartType?: 'line' | 'bar';
}

function AreachartWeb({
  chartDatum,
  borderColor,
  areaFillColor,
  height,
  width,
  detailedMode,
  yDomain,
  xDomain,
  chartType = 'line',
}: AreachartWebProps): React.JSX.Element {
  const chartW = width - WEB_PAD_X * 2;
  const chartH = height - WEB_PAD_Y * 2;

  // Derive domains for scaling
  const xMin = xDomain ? xDomain[0] : Math.min(...chartDatum.map((d) => d.x));
  const xMax = xDomain ? xDomain[1] : Math.max(...chartDatum.map((d) => d.x));
  const allY = chartDatum.flatMap((d) =>
    detailedMode ? [d.y, d.yMin ?? d.y, d.yMax ?? d.y] : [d.y],
  );
  const yMin = yDomain ? yDomain[0] : Math.min(...allY);
  const yMax = yDomain ? yDomain[1] : Math.max(...allY);
  const yRange = yMax - yMin || 1;
  const xRange = xMax - xMin || 1;

  // Build SVG paths — all domain values captured as dependencies
  const { areaPath, linePoints } = useMemo(() => {
    if (chartDatum.length === 0) return { areaPath: '', linePoints: '' };

    const mapX = (x: number) => WEB_PAD_X + ((x - xMin) / xRange) * chartW;
    const mapY = (y: number) => WEB_PAD_Y + (1 - (y - yMin) / yRange) * chartH;

    const pts = chartDatum.map((d) => `${mapX(d.x).toFixed(1)},${mapY(d.y).toFixed(1)}`);
    const bR = `${mapX(chartDatum[chartDatum.length - 1].x).toFixed(1)},${(WEB_PAD_Y + chartH).toFixed(1)}`;
    const bL = `${mapX(chartDatum[0].x).toFixed(1)},${(WEB_PAD_Y + chartH).toFixed(1)}`;

    return {
      areaPath: `M ${pts.join(' L ')} L ${bR} L ${bL} Z`,
      linePoints: pts.join(' '),
    };
  }, [chartDatum, chartW, chartH, xMin, xRange, yMin, yRange]);

  // Helpers for bar mode (computed inline — same domain values as above)
  const mapXBar = (x: number) => WEB_PAD_X + ((x - xMin) / xRange) * chartW;
  const mapYBar = (y: number) => WEB_PAD_Y + (1 - (y - yMin) / yRange) * chartH;
  const barW = Math.max(2, chartW / (chartDatum.length * 1.5));
  const baselineY = WEB_PAD_Y + chartH;

  return (
    <View style={[styles.container, { height, width }]} testID="areachart">
      <Svg width={width} height={height}>
        {chartType === 'bar' ? (
          // Bar chart — mirrors original Chart.js chartType==='bar' with solid colour.
          // Original: gradient = this.borderColor (no gradient for bars).
          <>
            {chartDatum.map((d) => {
              const cx = mapXBar(d.x);
              const barTop = mapYBar(Math.max(d.y, 0));
              const barH = Math.max(1, baselineY - barTop);
              return (
                <Rect
                  key={`bar-${d.x}`}
                  x={cx - barW / 2}
                  y={barTop}
                  width={barW}
                  height={barH}
                  fill={borderColor}
                  opacity={0.85}
                />
              );
            })}
          </>
        ) : (
          <>
            <Defs>
              <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={areaFillColor} stopOpacity="0.8" />
                <Stop offset="1" stopColor={areaFillColor} stopOpacity="0.1" />
              </SvgLinearGradient>
            </Defs>
            {/* Area fill */}
            <Path d={areaPath} fill="url(#areaGrad)" />
            {/* Border line */}
            <Polyline
              points={linePoints}
              fill="none"
              stroke={borderColor}
              strokeWidth={2}
            />
          </>
        )}
      </Svg>
    </View>
  );
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
  chartType = 'line',
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

  // ── Web fallback: victory-native/Skia requires GPU canvas (unavailable on web).
  // Use react-native-svg to draw a simple area chart that mirrors the Ionic original.
  if (Platform.OS === 'web') {
    return (
      <AreachartWeb
        chartDatum={chartDatum}
        background={background}
        borderColor={borderColor}
        areaFillColor={areaFillColor}
        height={height}
        width={windowWidth}
        detailedMode={detailedMode}
        yDomain={yDomain}
        xDomain={xDomain}
        chartType={chartType}
      />
    );
  }

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
        {({ points: rawPoints, chartBounds }) => {
          // Cast to any to access dynamic yKeys ('y', 'yMin', 'yMax') that CartesianChart
          // infers conditionally based on the yKeys prop.  Same TS2339 suppression pattern
          // as the pre-existing code in this file — runtime keys are valid because
          // CartesianChart receives them via the yKeys prop.
          const pts = rawPoints as any;
          return (
          <>
            {chartType === 'bar' ? (
              // Bar chart mode — mirrors original Chart.js chartType==='bar'.
              // Original: gradient = this.borderColor (solid colour, no gradient for bars).
              // victory-native Bar renders one bar per datum centred on its x value.
              <Bar
                points={pts.y}
                chartBounds={chartBounds}
                color={borderColor}
                animate={{ type: 'timing', duration: 300 }}
              />
            ) : detailedMode && chartMinData.length > 0 && chartMaxData.length > 0 ? (
              <>
                {/* Min-max band (background): AreaRange fills between yMin and yMax.
                    This mirrors the Chart.js original:
                      datasets[0]: fill '+1', data=chartMaxData → fills from yMax to yMin
                      datasets[1]: fill false, data=chartMinData → bottom boundary
                    NOTE: verify visually on device — SwiftShader emulator may render blank. */}
                <AreaRange
                  upperPoints={pts.yMax ?? []}
                  lowerPoints={pts.yMin ?? []}
                  color={areaFillColor}
                  animate={{ type: 'timing', duration: 300 }}
                />
                {/* Average line (foreground) — rendered on top of the band */}
                <Line
                  points={pts.y}
                  color={borderColor}
                  strokeWidth={2}
                  animate={{ type: 'timing', duration: 300 }}
                />
              </>
            ) : (
              <>
                {/* Normal mode: area fill from the bottom of the chart up to the data line.
                    Matches Chart.js: fill:true, backgroundColor:gradient, borderColor:color.
                    NOTE: verify visually on device — victory-native Area uses a solid fill
                    (no top-to-bottom gradient); gradient requires a custom Skia paint. */}
                <Area
                  points={pts.y}
                  y0={chartBounds.bottom}
                  color={areaFillColor}
                  animate={{ type: 'timing', duration: 300 }}
                />
                {/* Border line on top of the area — matches Chart.js borderColor/borderWidth:2 */}
                <Line
                  points={pts.y}
                  color={borderColor}
                  strokeWidth={2}
                  animate={{ type: 'timing', duration: 300 }}
                />
              </>
            )}
          </>
          );
        }}
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
