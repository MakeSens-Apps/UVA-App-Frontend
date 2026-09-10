/**
 * Areachart — implementación única (nativo + web) con react-native-svg.
 *
 * Portado de: src/app/components/areachart/areachart.component.ts (Chart.js).
 *
 * POR QUÉ react-native-svg y no victory-native/Skia
 * -------------------------------------------------
 * La rama nativa anterior (`CartesianChart` de victory-native sobre
 * `@shopify/react-native-skia`) NUNCA llegó a pintar en Android:
 *
 *   1. `useFont(require('@/assets/fonts/Montserrat-Regular.ttf'))` apuntaba a
 *      `mobile/src/assets/fonts/` — carpeta que sólo contiene `.gitkeep`; las
 *      fuentes viven en `mobile/assets/fonts/`.  Metro trata los `require`
 *      dentro de try/catch como dependencias opcionales, así que el require
 *      fallaba en runtime, se tragaba el error y `useFont` devolvía `null`:
 *      sin fuente, `XAxis`/`YAxis` de victory-native no dibujan NINGUNA
 *      etiqueta (`fontSize = font?.getSize() ?? 0`).
 *   2. `CartesianChart` sólo pinta ejes, frame y children cuando
 *      `hasMeasuredLayoutSize === true` (ver
 *      `victory-native/src/cartesian/CartesianChart.tsx:878-966` y
 *      `shared/useChartCanvasSize.ts`): mientras el `onLayout` del `Canvas`
 *      de Skia no reporte tamaño, el contenedor reserva alto y queda VACÍO —
 *      exactamente el síntoma D-01 (sin curva, sin banda, sin barras, sin
 *      grid, sin eje Y, sin etiquetas).
 *   3. Todo el dibujo va dentro de un `Canvas` de Skia (GPU).  El mismo
 *      componente ya se había reportado en blanco sobre el emulador
 *      (SwiftShader) y sigue en blanco sobre device real.
 *
 * `react-native-svg` (15.15.4, ya dependencia del proyecto y usada por los
 * iconos) no necesita GPU-canvas ni fuentes Skia, funciona igual en Android y
 * en Expo Web, y es la implementación que SÍ se vio renderizando en
 * `docs/evidence/rn-web-mayo-chart-after-2026-06-16.png`.  Unificar las dos
 * plataformas en este archivo elimina la divergencia nativo/web.
 *
 * Paridad con el original (Chart.js):
 *   - Eje X `type:'time'`, `unit:'day'`, `displayFormats.day = 'dd/MM'`,
 *     etiquetas rotadas (Chart.js autorota hasta 50° cuando no caben).
 *   - Eje Y con `min`/`max` duros desde la configuración de la medición
 *     (Tem 16–38, Hum 40–100, Acu 0–210 en las capturas).
 *   - Grid horizontal y vertical (Chart.js dibuja ambos por defecto).
 *   - `tension: 0.5` → curva suavizada (spline cardinal de Chart.js).
 *   - Modo normal: `fill: true` con gradiente 0.8 → 0.2 y línea de 2px.
 *   - `detailedMode`: banda max/min con `hexToRgba(background, 0.6)` sólido
 *     (datasets `fill:'+1'` / `fill:false`) + línea de promedio encima.
 *   - `chartType === 'bar'`: barras sólidas con `borderColor` (el original no
 *     usa gradiente para barras — areachart.component.ts:157-158).
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a hex color code to RGBA format.
 * Preserved from original hexToRgba() (areachart.component.ts:371-376).
 *
 * @param {string} hex - Hexadecimal color code (e.g. `#FFFFFF`).
 * @param {number} alpha - Alpha value (0..1).
 * @returns {string} RGBA color string.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Format a timestamp as 'dd/MM' (original Chart.js displayFormats.day).
 *
 * @param {number} ts - Epoch milliseconds.
 * @returns {string} `dd/MM`.
 */
export function formatDayMonth(ts: number): string {
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

/**
 * Parses a date string safely (replaces "-" with "/" for Safari/Android compat).
 * Preserved from the original getMonthStartAndEnd() pattern.
 *
 * @param {string} dateString - e.g. `2026-05-01`.
 * @returns {Date} Parsed date.
 */
export function parseDateSafe(dateString: string): Date {
  // Hermes (RN) only parses ISO-8601 / RFC-2822 strings: `new Date('2026/05/01')`
  // is NaN there although V8 (web) accepts it. Labels arrive as `yyyy-MM-dd`
  // (sorted `Object.keys` of the daily aggregation), so build the local date
  // from its parts — this is what made the chart render empty on device.
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(dateString);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const iso = new Date(dateString);
  if (!isNaN(iso.getTime())) return iso;
  return new Date(dateString.replace(/-/g, '/'));
}

/**
 * Compute "nice" Y-axis ticks that cover [dataMin, dataMax].
 * Mirrors Chart.js default linear scale behaviour: picks a step size
 * and generates 4-7 ticks.
 *
 * When hardMin/hardMax are provided (from ymin/ymax props), the domain is
 * clamped to those values — exactly as Chart.js does when you pass explicit
 * `scales.y.min` / `scales.y.max`.
 *
 * @param {number} dataMin - minimum data value (or ymin prop).
 * @param {number} dataMax - maximum data value (or ymax prop).
 * @param {number|undefined} hardMin - optional explicit lower bound (ymin prop).
 * @param {number|undefined} hardMax - optional explicit upper bound (ymax prop).
 * @returns {number[]} tick values (ascending), clamped to hard bounds when provided.
 */
export function niceYTicks(
  dataMin: number,
  dataMax: number,
  hardMin?: number,
  hardMax?: number,
): number[] {
  const domainMin = hardMin !== undefined ? hardMin : dataMin;
  const domainMax = hardMax !== undefined ? hardMax : dataMax;

  const range = domainMax - domainMin;
  if (!Number.isFinite(range) || range === 0) {
    const base = Math.round(Number.isFinite(domainMin) ? domainMin : 0);
    return [base - 4, base - 2, base, base + 2, base + 4];
  }

  const rawStep = range / 5;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const candidates = [1, 2, 2.5, 5, 10].map((c) => c * magnitude);
  const step =
    candidates.find((c) => c >= rawStep) ?? candidates[candidates.length - 1];

  const tickMin =
    hardMin !== undefined ? domainMin : Math.floor(domainMin / step) * step;
  const tickMax =
    hardMax !== undefined ? domainMax : Math.ceil(domainMax / step) * step;

  const ticks: number[] = [];
  if (hardMin !== undefined) {
    ticks.push(domainMin);
  }
  let t = Math.ceil(tickMin / step) * step;
  while (t < tickMax - step * 0.001) {
    const val = parseFloat(t.toFixed(10));
    if (
      ticks.length === 0 ||
      Math.abs(val - ticks[ticks.length - 1]) > step * 0.001
    ) {
      ticks.push(val);
    }
    t += step;
  }
  const lastVal = parseFloat((hardMax !== undefined ? domainMax : tickMax).toFixed(10));
  if (
    ticks.length === 0 ||
    Math.abs(lastVal - ticks[ticks.length - 1]) > step * 0.001
  ) {
    ticks.push(lastVal);
  }
  return ticks;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * X-axis ticks on whole-day boundaries, like Chart.js `time` scale with
 * `unit: 'day'`: it picks a day step so that at most ~11 labels are drawn.
 * For a full month (30 whole days between xmin and xmax) the step is 3 days,
 * producing 01/05, 04/05 … 31/05 — the exact tick set of the original
 * (docs/evidence/historical/screen-06).
 *
 * @param {number} xMin - domain start (epoch ms).
 * @param {number} xMax - domain end (epoch ms).
 * @param {number} maxTicks - maximum number of labels.
 * @returns {number[]} tick timestamps (ascending).
 */
export function xAxisDayTicks(xMin: number, xMax: number, maxTicks = 11): number[] {
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin) {
    return [xMin];
  }
  const totalDays = Math.floor((xMax - xMin) / DAY_MS);
  if (totalDays <= 0) {
    return [xMin, xMax];
  }
  const step = Math.max(1, Math.ceil(totalDays / (maxTicks - 1)));
  const ticks: number[] = [];
  for (let d = 0; d <= totalDays; d += step) {
    ticks.push(xMin + d * DAY_MS);
  }
  return ticks;
}

/**
 * Builds a smoothed SVG path through the given points using Chart.js'
 * cardinal spline (`tension`), so the curve matches the original chart.
 * Reference: Chart.js `splineCurve()` — control points are derived from the
 * neighbouring segment lengths weighted by `tension`.
 *
 * @param {Array<{x:number;y:number}>} pts - points in screen coordinates.
 * @param {number} tension - Chart.js tension (0 = straight lines, 0.5 = original).
 * @returns {string} SVG path commands starting with `M` (no leading/trailing Z).
 */
export function smoothPath(
  pts: { x: number; y: number }[],
  tension = 0.5,
): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (tension <= 0) {
    return `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`;
  }

  // Control points per Chart.js splineCurve()
  const cps: { cp1x: number; cp1y: number; cp2x: number; cp2y: number }[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];

    const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y) || 1e-6;
    const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1e-6;
    const d23 = Math.hypot(p3.x - p2.x, p3.y - p2.y) || 1e-6;

    const fb1 = (tension * d12) / (d01 + d12);
    const fa2 = (tension * d12) / (d12 + d23);

    cps.push({
      cp1x: p1.x + fb1 * (p2.x - p0.x),
      cp1y: p1.y + fb1 * (p2.y - p0.y),
      cp2x: p2.x - fa2 * (p3.x - p1.x),
      cp2y: p2.y - fa2 * (p3.y - p1.y),
    });
  }

  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < cps.length; i++) {
    const c = cps[i];
    const p = pts[i + 1];
    d += ` C ${c.cp1x.toFixed(2)} ${c.cp1y.toFixed(2)}, ${c.cp2x.toFixed(2)} ${c.cp2y.toFixed(2)}, ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d;
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

// ─── Internal data shape ───────────────────────────────────────────────────────

interface ChartDatum {
  x: number; // timestamp (ms)
  y: number;
  yMin?: number;
  yMax?: number;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

/** Left padding — space for Y-axis labels (e.g. "100") */
const PAD_LEFT = 32;
/** Right padding — small right margin */
const PAD_RIGHT = 10;
/** Top padding — small top margin */
const PAD_TOP = 8;
/** Bottom padding — space for the rotated X-axis labels */
const PAD_BOTTOM = 42;

/** Chart.js default grid line color */
const GRID_COLOR = '#E5E5E5';
/** Axis line color */
const AXIS_COLOR = '#D4D4D4';
/** Tick label color */
const TICK_LABEL_COLOR = '#666666';
/** Tick label font size */
const TICK_FONT_SIZE = 10;
/** X label rotation, degrees (Chart.js autoRotation, maxRotation 50) */
const X_LABEL_ROTATION = -45;
/**
 * Horizontal margins consumed by the parent card while the real width is not
 * measured yet (`.cards` margin-inline 10 + padding 10 on both sides).
 */
const CARD_HORIZONTAL_INSET = 40;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Areachart
 *
 * Area/bar chart rendered with react-native-svg on every platform.
 * Reactive to all props — no imperative update methods (the original
 * `UpdateChart()` is replaced by re-rendering with new props).
 *
 * @param {AreachartProps} props - chart data, colours, axis ranges and mode.
 * @returns {React.JSX.Element} The rendered chart.
 *
 * @example Normal mode:
 *   <Areachart chartData={[20, 22]} chartLabels={['2024-01-01','2024-01-02']} />
 *
 * @example Detailed mode (min/max band + avg line):
 *   <Areachart … chartMinData={[18,19]} chartMaxData={[24,25]} detailedMode />
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
  // Real available width (the chart lives inside the month card, which is
  // narrower than the window). Measured via onLayout; until then we fall back
  // to `window - card insets` so the very first frame already draws something.
  const [measuredWidth, setMeasuredWidth] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) {
      setMeasuredWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
    }
  }, []);

  const width =
    measuredWidth > 0
      ? measuredWidth
      : Math.max(120, windowWidth - CARD_HORIZONTAL_INSET);

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

  if (chartDatum.length === 0) {
    return (
      <View
        style={[styles.container, { height }]}
        onLayout={onLayout}
        testID="areachart-empty"
      />
    );
  }

  return (
    <AreachartSvg
      chartDatum={chartDatum}
      background={background}
      borderColor={borderColor}
      height={height}
      width={width}
      onLayout={onLayout}
      detailedMode={detailedMode}
      ymin={ymin}
      ymax={ymax}
      xmin={xmin}
      xmax={xmax}
      chartType={chartType}
    />
  );
}

// ─── SVG renderer ─────────────────────────────────────────────────────────────

interface AreachartSvgProps {
  chartDatum: ChartDatum[];
  background: string;
  borderColor: string;
  height: number;
  width: number;
  onLayout: (e: LayoutChangeEvent) => void;
  detailedMode: boolean;
  ymin?: number;
  ymax?: number;
  xmin?: string;
  xmax?: string;
  chartType?: 'line' | 'bar';
}

/**
 * Draws the axes, grid and series.
 *
 * @param {AreachartSvgProps} props - resolved geometry + data.
 * @returns {React.JSX.Element} SVG chart.
 */
function AreachartSvg({
  chartDatum,
  background,
  borderColor,
  height,
  width,
  onLayout,
  detailedMode,
  ymin,
  ymax,
  xmin,
  xmax,
  chartType = 'line',
}: AreachartSvgProps): React.JSX.Element {
  const plotW = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
  const plotH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);

  // ── Domains ────────────────────────────────────────────────────────────────
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

  const yTicks = useMemo(
    () => niceYTicks(rawYMin, rawYMax, ymin, ymax),
    [rawYMin, rawYMax, ymin, ymax],
  );

  const yDomainMin = yTicks[0];
  const yDomainMax = yTicks[yTicks.length - 1];
  const yRange = yDomainMax - yDomainMin || 1;
  const xRange = xDomainMax - xDomainMin || 1;

  const xTicks = useMemo(
    () => xAxisDayTicks(xDomainMin, xDomainMax),
    [xDomainMin, xDomainMax],
  );

  const mapX = (x: number) => PAD_LEFT + ((x - xDomainMin) / xRange) * plotW;
  const mapY = (y: number) => PAD_TOP + (1 - (y - yDomainMin) / yRange) * plotH;

  // ── Paths ─────────────────────────────────────────────────────────────────
  const { avgLinePath, avgAreaPath, bandPath } = useMemo(() => {
    const mX = (x: number) => PAD_LEFT + ((x - xDomainMin) / xRange) * plotW;
    const mY = (y: number) => PAD_TOP + (1 - (y - yDomainMin) / yRange) * plotH;

    const avgPts = chartDatum.map((d) => ({ x: mX(d.x), y: mY(d.y) }));
    const linePath = smoothPath(avgPts);
    const baseline = PAD_TOP + plotH;
    const areaPath =
      linePath === ''
        ? ''
        : `${linePath} L ${avgPts[avgPts.length - 1].x.toFixed(2)} ${baseline.toFixed(2)} L ${avgPts[0].x.toFixed(2)} ${baseline.toFixed(2)} Z`;

    // detailedMode band: max curve forward + min curve backwards (Chart.js
    // datasets[0] fill:'+1' over datasets[1]).
    let band = '';
    if (detailedMode && chartDatum.some((d) => d.yMax !== undefined)) {
      const maxPts = chartDatum.map((d) => ({
        x: mX(d.x),
        y: mY(d.yMax ?? d.y),
      }));
      const minPtsReversed = [...chartDatum]
        .reverse()
        .map((d) => ({ x: mX(d.x), y: mY(d.yMin ?? d.y) }));
      const maxPath = smoothPath(maxPts);
      const minPath = smoothPath(minPtsReversed);
      // Replace the leading `M` of the min path with a line-to so both curves
      // become a single closed shape.
      band = `${maxPath} L ${minPath.slice(2)} Z`;
    }

    return { avgLinePath: linePath, avgAreaPath: areaPath, bandPath: band };
  }, [chartDatum, plotW, plotH, xDomainMin, xRange, yDomainMin, yRange, detailedMode]);

  const baselineY = PAD_TOP + plotH;

  return (
    <View
      style={[styles.container, { height, width }]}
      onLayout={onLayout}
      testID="areachart"
    >
      <Svg width={width} height={height} style={styles.svg}>
        <Defs>
          {/* Chart.js createLinearGradient(0,0,0,300): 0.8 top → 0.2 bottom */}
          <SvgLinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={background} stopOpacity="0.8" />
            <Stop offset="1" stopColor={background} stopOpacity="0.2" />
          </SvgLinearGradient>
        </Defs>

        {/* Horizontal grid lines — one per Y tick */}
        {yTicks.map((tick) => {
          const y = mapY(tick);
          if (y < PAD_TOP - 1 || y > baselineY + 1) return null;
          return (
            <Line
              key={`grid-y-${tick}`}
              x1={PAD_LEFT}
              y1={y}
              x2={PAD_LEFT + plotW}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
          );
        })}

        {/* Vertical grid lines — one per X tick (Chart.js default) */}
        {xTicks.map((ts) => {
          const x = mapX(ts);
          return (
            <Line
              key={`grid-x-${ts}`}
              x1={x}
              y1={PAD_TOP}
              x2={x}
              y2={baselineY}
              stroke={GRID_COLOR}
              strokeWidth={1}
            />
          );
        })}

        {/* Axis baselines */}
        <Line
          x1={PAD_LEFT}
          y1={baselineY}
          x2={PAD_LEFT + plotW}
          y2={baselineY}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />
        <Line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={baselineY}
          stroke={AXIS_COLOR}
          strokeWidth={1}
        />

        {/* Y-axis labels */}
        {yTicks.map((tick) => {
          const y = mapY(tick);
          if (y < PAD_TOP - 2 || y > baselineY + 2) return null;
          return (
            <SvgText
              key={`ylabel-${tick}`}
              x={PAD_LEFT - 6}
              y={y + TICK_FONT_SIZE / 3}
              textAnchor="end"
              fontSize={TICK_FONT_SIZE}
              fill={TICK_LABEL_COLOR}
            >
              {Number.isInteger(tick) ? String(tick) : tick.toFixed(1)}
            </SvgText>
          );
        })}

        {/* X-axis ticks + rotated dd/MM labels */}
        {xTicks.map((ts) => {
          const x = mapX(ts);
          const labelY = baselineY + 6 + TICK_FONT_SIZE;
          return (
            <React.Fragment key={`xtick-${ts}`}>
              <Line
                x1={x}
                y1={baselineY}
                x2={x}
                y2={baselineY + 4}
                stroke={AXIS_COLOR}
                strokeWidth={1}
              />
              <SvgText
                x={x}
                y={labelY}
                textAnchor="end"
                fontSize={TICK_FONT_SIZE}
                fill={TICK_LABEL_COLOR}
                transform={`rotate(${X_LABEL_ROTATION}, ${x}, ${labelY})`}
              >
                {formatDayMonth(ts)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Series */}
        {chartType === 'bar' ? (
          // Original: `gradient = this.borderColor` for bar charts (no gradient).
          chartDatum.map((d) => {
            const cx = mapX(d.x);
            const barW = Math.max(2, plotW / (chartDatum.length * 1.5));
            const barTop = mapY(Math.max(d.y, yDomainMin));
            const barBottom = mapY(Math.max(yDomainMin, 0));
            const barH = Math.max(1, barBottom - barTop);
            return (
              <Rect
                key={`bar-${d.x}`}
                x={cx - barW / 2}
                y={barTop}
                width={barW}
                height={barH}
                fill={borderColor}
              />
            );
          })
        ) : detailedMode && bandPath ? (
          <>
            {/* Min-max band: solid hexToRgba(background, 0.6) like the original */}
            <Path d={bandPath} fill={hexToRgba(background, 0.6)} />
            {/* Average line on top */}
            <Path
              d={avgLinePath}
              fill="none"
              stroke={borderColor}
              strokeWidth={2}
            />
          </>
        ) : (
          <>
            <Path d={avgAreaPath} fill="url(#areaGrad)" />
            <Path
              d={avgLinePath}
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
    position: 'relative',
    width: '100%',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

export default Areachart;
