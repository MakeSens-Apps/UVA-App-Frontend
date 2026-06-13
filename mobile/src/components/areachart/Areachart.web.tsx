/**
 * B11 — AreachartComponent (WEB variant)
 *
 * This file is loaded by Metro ONLY on the web platform (`.web.tsx` extension
 * takes priority over `.tsx` when bundling for web).
 *
 * WHY a separate file:
 *   victory-native / @shopify/react-native-skia require CanvasKit (WebAssembly)
 *   which is not available during the Expo-web Metro bundle phase.  The main
 *   Areachart.tsx imports those packages at the module level (via CartesianChart,
 *   Area, Line, useFont), so just checking `Platform.OS === 'web'` at render
 *   time is NOT enough — the imports themselves crash the bundler / runtime on
 *   web before any render guard is reached.
 *
 *   This file imports ONLY react-native-svg (web-compatible) and renders the
 *   same visual as the Ionic Chart.js original: area fill + border line,
 *   Y-axis ticks/labels, X-axis date ticks/labels, horizontal grid lines.
 *
 * Native path (iOS / Android):
 *   Metro resolves `Areachart.tsx` — full victory-native + Skia implementation.
 *
 * Contract: IDENTICAL props interface as Areachart.tsx, IDENTICAL testIDs.
 *
 * Visual parity with Chart.js original (areachart.component.ts):
 *   - X axis: time scale, dd/MM format, evenly spaced ticks across full range
 *   - Y axis: nice ticks at ~5-unit intervals, labels on the left
 *   - Horizontal grid lines (Chart.js default: light gray #E5E5E5)
 *   - Area gradient fill: rgba(color, 0.8) top → rgba(color, 0.2) bottom
 *   - Border line: 2px, borderColor
 *   - No legend, no tooltip (static SVG)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Polyline,
  Line,
  Text as SvgText,
} from 'react-native-svg';

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
 * Format a timestamp as 'dd/MM' (original Chart.js displayFormats.day).
 */
function formatDayMonth(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Compute "nice" Y-axis ticks that cover [dataMin, dataMax].
 * Mirrors Chart.js default linear scale behaviour: picks a step size
 * and generates 4-7 ticks.
 *
 * @param dataMin - minimum data value (or ymin prop)
 * @param dataMax - maximum data value (or ymax prop)
 * @returns array of tick values (ascending)
 */
function niceYTicks(dataMin: number, dataMax: number): number[] {
  const range = dataMax - dataMin;
  if (range === 0) {
    // Degenerate: single value — return ±2 around it
    const base = Math.round(dataMin);
    return [base - 4, base - 2, base, base + 2, base + 4];
  }

  // Find a "nice" step: target ~5-6 ticks
  const rawStep = range / 5;
  // Round step to nearest: 1, 2, 5, 10, 20, 25, 50 …
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const candidates = [1, 2, 2.5, 5, 10].map((c) => c * magnitude);
  const step = candidates.find((c) => c >= rawStep) ?? candidates[candidates.length - 1];

  const tickMin = Math.floor(dataMin / step) * step;
  const tickMax = Math.ceil(dataMax / step) * step;

  const ticks: number[] = [];
  let t = tickMin;
  while (t <= tickMax + step * 0.001) {
    ticks.push(parseFloat(t.toFixed(10)));
    t += step;
  }
  return ticks;
}

/**
 * Pick ~5-7 evenly distributed X-axis date ticks from the domain.
 * First and last tick are always the xDomainMin and xDomainMax.
 */
function xAxisTicks(xMin: number, xMax: number, targetCount = 6): number[] {
  if (xMin === xMax) return [xMin];
  const step = (xMax - xMin) / (targetCount - 1);
  const ticks: number[] = [];
  for (let i = 0; i < targetCount; i++) {
    ticks.push(Math.round(xMin + i * step));
  }
  return ticks;
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

// ─── Internal data shape ───────────────────────────────────────────────────────

interface ChartDatum {
  x: number; // timestamp (ms)
  y: number;
  yMin?: number;
  yMax?: number;
}

// ─── Layout constants ─────────────────────────────────────────────────────────
// Mirror Chart.js default padding: space for Y-axis labels on left,
// X-axis labels below, and a small top/right margin.

/** Left padding — space for Y-axis labels (e.g. "38") */
const PAD_LEFT = 36;
/** Right padding — small right margin */
const PAD_RIGHT = 8;
/** Top padding — small top margin */
const PAD_TOP = 8;
/** Bottom padding — space for X-axis labels */
const PAD_BOTTOM = 28;

/** Chart.js default grid line color */
const GRID_COLOR = '#E5E5E5';
/** Axis line color */
const AXIS_COLOR = '#D4D4D4';
/** Tick label color — gray-600 (#525252) */
const TICK_LABEL_COLOR = '#525252';
/** Tick label font size */
const TICK_FONT_SIZE = 10;

/**
 * Parses a date string safely (replaces "-" with "/" for Safari/Android compat).
 */
function parseDateSafe(dateString: string): Date {
  return new Date(dateString.replace(/-/g, '/'));
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Areachart — Web-only SVG implementation.
 *
 * Renders an area chart using react-native-svg (web-compatible).
 * Mirrors the visual style of the Ionic original (Chart.js area chart):
 *   - Y-axis ticks and labels (left side)
 *   - X-axis date ticks and labels (bottom)
 *   - Horizontal grid lines (Chart.js default style)
 *   - Gradient fill area with opacity (0.8 top → 0.2 bottom)
 *   - Colored border line (2px)
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

  // Convert chartLabels + chartData to internal format
  const chartDatum: ChartDatum[] = useMemo(() => {
    if (chartLabels.length === 0 || chartData.length === 0) return [];
    return chartLabels
      .map((label, i) => ({
        x: parseDateSafe(label).getTime(),
        y: chartData[i] ?? 0,
        yMin: chartMinData[i],
        yMax: chartMaxData[i],
      }))
      .filter((d) => !isNaN(d.x));
  }, [chartLabels, chartData, chartMinData, chartMaxData]);

  // Empty state
  if (chartDatum.length === 0) {
    return <View style={[styles.container, { height }]} testID="areachart-empty" />;
  }

  const areaFillColor = background;

  return (
    <AreachartSvg
      chartDatum={chartDatum}
      borderColor={borderColor}
      areaFillColor={areaFillColor}
      height={height}
      width={windowWidth}
      detailedMode={detailedMode}
      ymin={ymin}
      ymax={ymax}
      xmin={xmin}
      xmax={xmax}
    />
  );
}

// ─── SVG renderer ─────────────────────────────────────────────────────────────

interface AreachartSvgProps {
  chartDatum: ChartDatum[];
  borderColor: string;
  areaFillColor: string;
  height: number;
  width: number;
  detailedMode: boolean;
  ymin?: number;
  ymax?: number;
  xmin?: string;
  xmax?: string;
}

function AreachartSvg({
  chartDatum,
  borderColor,
  areaFillColor,
  height,
  width,
  detailedMode,
  ymin,
  ymax,
  xmin,
  xmax,
}: AreachartSvgProps): React.JSX.Element {
  // Plot area dimensions (inside the axis padding)
  const plotW = width - PAD_LEFT - PAD_RIGHT;
  const plotH = height - PAD_TOP - PAD_BOTTOM;

  // Derive domains for scaling
  const xDomainMin = xmin
    ? parseDateSafe(xmin).getTime()
    : Math.min(...chartDatum.map((d) => d.x));
  const xDomainMax = xmax
    ? parseDateSafe(xmax).getTime()
    : Math.max(...chartDatum.map((d) => d.x));

  const allY = chartDatum.flatMap((d) =>
    detailedMode ? [d.y, d.yMin ?? d.y, d.yMax ?? d.y] : [d.y],
  );
  const rawYMin = ymin !== undefined ? ymin : Math.min(...allY);
  const rawYMax = ymax !== undefined ? ymax : Math.max(...allY);

  // Compute nice Y ticks (same domain as Chart.js linear scale)
  const yTicks = useMemo(
    () => niceYTicks(rawYMin, rawYMax),
    [rawYMin, rawYMax],
  );

  // Use nice tick bounds as the actual Y domain (Chart.js behaviour)
  const yDomainMin = yTicks[0];
  const yDomainMax = yTicks[yTicks.length - 1];

  const yRange = yDomainMax - yDomainMin || 1;
  const xRange = xDomainMax - xDomainMin || 1;

  // X-axis ticks — ~10 evenly spaced date labels (Chart.js time scale default
  // shows ~10 ticks for a 31-day month; cap at data length to avoid duplicates)
  const xTicks = useMemo(
    () => xAxisTicks(xDomainMin, xDomainMax, Math.min(10, chartDatum.length)),
    [xDomainMin, xDomainMax, chartDatum.length],
  );

  // Coordinate mapping helpers (used in both the path useMemo and JSX render)
  // Derived from domain/range values — inline to keep dependency arrays clean.
  const mapX = (x: number) => PAD_LEFT + ((x - xDomainMin) / xRange) * plotW;
  const mapY = (y: number) => PAD_TOP + (1 - (y - yDomainMin) / yRange) * plotH;

  // Build SVG paths
  const { avgAreaPath, avgLinePoints, maxAreaPath } = useMemo(() => {
    // Local versions of mapX/mapY that capture the same derived values
    // so the useMemo dependency array stays stable.
    const mX = (x: number) => PAD_LEFT + ((x - xDomainMin) / xRange) * plotW;
    const mY = (y: number) => PAD_TOP + (1 - (y - yDomainMin) / yRange) * plotH;

    if (chartDatum.length === 0) {
      return { avgAreaPath: '', avgLinePoints: '', maxAreaPath: '' };
    }

    const avgPts = chartDatum.map(
      (d) => `${mX(d.x).toFixed(1)},${mY(d.y).toFixed(1)}`,
    );
    const bottomRight = `${mX(chartDatum[chartDatum.length - 1].x).toFixed(1)},${(PAD_TOP + plotH).toFixed(1)}`;
    const bottomLeft = `${mX(chartDatum[0].x).toFixed(1)},${(PAD_TOP + plotH).toFixed(1)}`;

    const areaPath = `M ${avgPts.join(' L ')} L ${bottomRight} L ${bottomLeft} Z`;
    const linePoints = avgPts.join(' ');

    // Detailed mode: max area band (uses yMax if available, fallback to y)
    let maxPath = '';
    if (detailedMode && chartDatum.some((d) => d.yMax !== undefined)) {
      const maxPts = chartDatum.map((d) => {
        const yVal = d.yMax ?? d.y;
        return `${mX(d.x).toFixed(1)},${mY(yVal).toFixed(1)}`;
      });
      const minPts = [...chartDatum]
        .reverse()
        .map((d) => {
          const yVal = d.yMin ?? d.y;
          return `${mX(d.x).toFixed(1)},${mY(yVal).toFixed(1)}`;
        });
      maxPath = `M ${maxPts.join(' L ')} L ${minPts.join(' L ')} Z`;
    }

    return { avgAreaPath: areaPath, avgLinePoints: linePoints, maxAreaPath: maxPath };
  }, [chartDatum, plotW, plotH, xDomainMin, xRange, yDomainMin, yRange, detailedMode]);

  return (
    <View style={[styles.container, { height, width }]} testID="areachart">
      {/* Y-axis labels — rendered as RN Text outside SVG for crisp font */}
      {yTicks.map((tick) => {
        const y = mapY(tick);
        // Only render if within visible plot area
        if (y < PAD_TOP - 2 || y > PAD_TOP + plotH + 2) return null;
        return (
          <Text
            key={`ytick-${tick}`}
            style={[
              styles.yLabel,
              { top: y - TICK_FONT_SIZE / 2, color: TICK_LABEL_COLOR },
            ]}
            numberOfLines={1}
          >
            {Number.isInteger(tick) ? tick : tick.toFixed(1)}
          </Text>
        );
      })}

      <Svg width={width} height={height} style={styles.svg}>
        <Defs>
          {/* Area gradient: 0.8 top → 0.2 bottom (matches Ionic createLinearGradient 0.8→0.2) */}
          <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={areaFillColor} stopOpacity="0.8" />
            <Stop offset="1" stopColor={areaFillColor} stopOpacity="0.2" />
          </SvgLinearGradient>
          {detailedMode && (
            <SvgLinearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={areaFillColor} stopOpacity="0.6" />
              <Stop offset="1" stopColor={areaFillColor} stopOpacity="0.2" />
            </SvgLinearGradient>
          )}
        </Defs>

        {/* Horizontal grid lines — one per Y tick (Chart.js default) */}
        {yTicks.map((tick) => {
          const y = mapY(tick);
          if (y < PAD_TOP - 1 || y > PAD_TOP + plotH + 1) return null;
          return (
            <Line
              key={`grid-${tick}`}
              x1={PAD_LEFT}
              y1={y}
              x2={PAD_LEFT + plotW}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
          );
        })}

        {/* X-axis baseline */}
        <Line
          x1={PAD_LEFT}
          y1={PAD_TOP + plotH}
          x2={PAD_LEFT + plotW}
          y2={PAD_TOP + plotH}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />

        {/* Y-axis baseline */}
        <Line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={PAD_TOP + plotH}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />

        {/* X-axis tick marks and labels (SVG Text for reliable cross-platform rendering).
            First tick: textAnchor="start" to prevent left-clip (label starts at tick x).
            Last tick:  textAnchor="end"   to prevent right-clip (label ends at tick x).
            Middle ticks: textAnchor="middle" (Chart.js default behaviour). */}
        {xTicks.map((ts, tickIdx) => {
          const x = mapX(ts);
          const anchor =
            tickIdx === 0
              ? 'start'
              : tickIdx === xTicks.length - 1
                ? 'end'
                : 'middle';
          return (
            <React.Fragment key={`xtick-${ts}`}>
              <Line
                x1={x}
                y1={PAD_TOP + plotH}
                x2={x}
                y2={PAD_TOP + plotH + 4}
                stroke={AXIS_COLOR}
                strokeWidth={1}
              />
              <SvgText
                x={x}
                y={PAD_TOP + plotH + 4 + TICK_FONT_SIZE + 2}
                textAnchor={anchor}
                fontSize={TICK_FONT_SIZE}
                fill={TICK_LABEL_COLOR}
                fontFamily="Montserrat-Regular"
              >
                {formatDayMonth(ts)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Chart area and line */}
        {detailedMode && maxAreaPath ? (
          <>
            {/* Min-max band */}
            <Path d={maxAreaPath} fill="url(#bandGrad)" />
            {/* Avg line */}
            <Polyline
              points={avgLinePoints}
              fill="none"
              stroke={borderColor}
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            {/* Normal mode: area fill + border line */}
            <Path d={avgAreaPath} fill="url(#areaGrad)" />
            <Polyline
              points={avgLinePoints}
              fill="none"
              stroke={borderColor}
              strokeWidth={2}
            />
          </>
        )}
      </Svg>

      {/* X-axis date labels are rendered inside the SVG as SvgText elements
          for reliable cross-platform display (React Native Web positioning
          issues with absolutely-placed RN Text in zero-size parent Views). */}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Y-axis label — positioned absolutely to the left of PAD_LEFT
  // (RN Text works here because it is a direct child of the container View,
  //  which has explicit width and height, so absolute positioning is well-defined)
  yLabel: {
    position: 'absolute',
    left: 0,
    width: PAD_LEFT - 4,
    textAlign: 'right',
    fontSize: TICK_FONT_SIZE,
    lineHeight: TICK_FONT_SIZE + 2,
    fontFamily: 'Montserrat-Regular',
  },
  // NOTE: X-axis labels are rendered as SvgText inside the SVG element
  // (not as RN Text in a View) to avoid React Native Web zero-width
  // parent container issues with absolutely positioned children.
});

export default Areachart;
