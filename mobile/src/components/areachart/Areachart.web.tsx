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
 *   same visual as the Ionic Chart.js original: area fill + border line.
 *
 * Native path (iOS / Android):
 *   Metro resolves `Areachart.tsx` — full victory-native + Skia implementation.
 *
 * Contract: IDENTICAL props interface as Areachart.tsx, IDENTICAL testIDs.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Polyline,
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

// ─── Constants ─────────────────────────────────────────────────────────────────

const PAD_X = 8;
const PAD_Y = 8;

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
 *   - Gradient fill area with opacity
 *   - Colored border line
 *   - No grid lines (matches original minimal style)
 *
 * In detailedMode: renders max-area band + avg line (simplified from Ionic original).
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
  const chartW = width - PAD_X * 2;
  const chartH = height - PAD_Y * 2;

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
  const yDomainMin = ymin !== undefined ? ymin : Math.min(...allY);
  const yDomainMax = ymax !== undefined ? ymax : Math.max(...allY);

  const yRange = yDomainMax - yDomainMin || 1;
  const xRange = xDomainMax - xDomainMin || 1;

  // Build SVG paths
  const { avgAreaPath, avgLinePoints, maxAreaPath } = useMemo(() => {
    if (chartDatum.length === 0) {
      return { avgAreaPath: '', avgLinePoints: '', maxAreaPath: '' };
    }

    const mapX = (x: number) => PAD_X + ((x - xDomainMin) / xRange) * chartW;
    const mapY = (y: number) => PAD_Y + (1 - (y - yDomainMin) / yRange) * chartH;

    const avgPts = chartDatum.map(
      (d) => `${mapX(d.x).toFixed(1)},${mapY(d.y).toFixed(1)}`,
    );
    const bottomRight = `${mapX(chartDatum[chartDatum.length - 1].x).toFixed(1)},${(PAD_Y + chartH).toFixed(1)}`;
    const bottomLeft = `${mapX(chartDatum[0].x).toFixed(1)},${(PAD_Y + chartH).toFixed(1)}`;

    const areaPath = `M ${avgPts.join(' L ')} L ${bottomRight} L ${bottomLeft} Z`;
    const linePoints = avgPts.join(' ');

    // Detailed mode: max area band (uses yMax if available, fallback to y)
    let maxPath = '';
    if (detailedMode && chartDatum.some((d) => d.yMax !== undefined)) {
      const maxPts = chartDatum.map((d) => {
        const yVal = d.yMax ?? d.y;
        return `${mapX(d.x).toFixed(1)},${mapY(yVal).toFixed(1)}`;
      });
      const minPts = [...chartDatum]
        .reverse()
        .map((d) => {
          const yVal = d.yMin ?? d.y;
          return `${mapX(d.x).toFixed(1)},${mapY(yVal).toFixed(1)}`;
        });
      maxPath = `M ${maxPts.join(' L ')} L ${minPts.join(' L ')} Z`;
    }

    return { avgAreaPath: areaPath, avgLinePoints: linePoints, maxAreaPath: maxPath };
  }, [chartDatum, chartW, chartH, xDomainMin, xRange, yDomainMin, yRange, detailedMode]);

  return (
    <View style={[styles.container, { height, width }]} testID="areachart">
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={areaFillColor} stopOpacity="0.8" />
            <Stop offset="1" stopColor={areaFillColor} stopOpacity="0.1" />
          </SvgLinearGradient>
          {detailedMode && (
            <SvgLinearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={areaFillColor} stopOpacity="0.6" />
              <Stop offset="1" stopColor={areaFillColor} stopOpacity="0.2" />
            </SvgLinearGradient>
          )}
        </Defs>

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
