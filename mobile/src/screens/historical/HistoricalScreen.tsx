/**
 * B15 — HistoricalScreen (full implementation: calendar + chart + share)
 *
 * Ported from: src/app/pages/historical/historical.page.ts + .html
 * Classification: Rewrite (UI layer, preserving all logic)
 *
 * B15 additions over B13b:
 *   - Real chart data building: buildChartData() using calculateDetailedMeasurement /
 *     calculateMeasurement from B07 aggregations (mirrors original updateChart())
 *   - detailedMode support: line+mean graphs → detailedMode=true with min/max/avg data
 *   - calculateRangeOfMeasurement: ymin/ymax for chart axis range
 *   - Share report: expo-sharing text report (no EnvironmentalReportService — R-01)
 *     with showToast success/error feedback
 *   - Year view mini-calendar spacing fix: previously overlapping due to 33.33% width
 *     on small screens. Evidence: screen-10, screen-11. Fix: explicit width calc.
 *
 * Preserved logic (portability-matrix §4.4):
 *   - initializeCompletedTasks: Promise.all for 12 months
 *   - getCompletedTaskForMonth: UserProgressDSService.getCompletedTasksByMonthYear
 *   - initializeVariables: transformData + calculateOverallStats from B07 aggregations
 *   - changeModeData: toggles calendar ↔ chart, selects first variable
 *   - setCurrentMonth: navigates months with year rollover logic
 *   - isNextYearDisabled: currentYearIndex + 1 > realCurrentYear
 *   - monthsNames: Spanish month names (preserved from historical.model.ts)
 *
 * Changes from original:
 *   - ionViewWillEnter → useFocusEffect
 *   - ngOnInit → useEffect on mount + useFocusEffect
 *   - ChangeDetectorRef.detectChanges → setState (React)
 *   - @ViewChild(CalendarComponent) → Calendar component re-renders reactively
 *   - @ViewChild(AreachartComponent) → Areachart component via reactive props
 *   - IonContent → ScrollView
 *   - Share: image capture via react-native-view-shot (B15-cierre, R-01 resolved).
 *     Text report is the fallback if captureRef throws.
 *
 * Risks: R-32, R-12, R-15
 *
 * Round 3 (paridad visual):
 *   - Tabla de variables (Tem/Hum/Acu — avg/max/min) con los estilos exactos de
 *     historical.page.scss (.calendar_variables*) y formato Angular number:'1.0-1'
 *   - Config de medición cargada por la propia pantalla (ngOnInit parity):
 *     getConfigurationMeasurement() en vez de depender del estado del contexto
 *   - Sección .cards: fondo Gray-50 + borde Gray-200 (global.scss), sin sombra
 *   - Calendario envuelto en card blanco (.calendar_content)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import type { AppStackParamList } from '@/navigation/types';
import { Header } from '@/components/header/Header';
import { Calendar } from '@/components/calendar/Calendar';
import { TimeFrame } from '@/components/time-frame/TimeFrame';
import type { TimeFrameValue } from '@/components/time-frame/TimeFrame';
import { Areachart } from '@/components/areachart/Areachart';
import { showToast } from '@/components/ui/Toast';
import { AppIcon } from '@/components/icons/AppIcons';

import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

import { UserProgressDSService } from '@/data/datastore/user-progress-ds';
import type { CompletedTask } from '@/data/datastore/user-progress-ds';
import { MeasurementDSService } from '@/data/datastore/measurement-ds';
import {
  transformData,
  calculateOverallStats,
  calculateMeasurement,
  calculateDetailedMeasurement,
  sum,
  mean,
} from '@/domain/aggregations/historical-aggregations';
import type {
  HistoricalMeasurement,
  RawMeasurementData,
} from '@/domain/aggregations/historical-aggregations';

import type { Historical, MeasurementModel } from '@/data/models/configuration/measurements.model';
import type { UserProgress } from '@/data/models';
import type { CalendarDay } from '@/components/calendar/calendarLogic';
import { EnvironmentalReport } from '@/components/environmental-report/EnvironmentalReport';
import { EnvironmentalReportService } from '@/domain/report/environmental-report';
import type { ReportData } from '@/domain/report/environmental-report';
import {
  buildReportFileName,
  renameCaptureForShare,
} from '@/domain/report/report-file';

// ─── Grid helpers ─────────────────────────────────────────────────────────────

/**
 * Splits an array into chunks of `size` for rendering explicit row Views.
 * Avoids flexWrap+percentage width issues on RN web (atomic CSS bleed).
 * Used for the year view 3-column mini-calendar grid.
 */
function chunkIntoRows<T>(arr: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    rows.push(arr.slice(i, i + size));
  }
  return rows;
}

// ─── Month names (preserved from historical.model.ts) ─────────────────────────

const monthsNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Stat formatting (Angular `number:'1.0-1'` pipe equivalent) ───────────────

/**
 * Replicates Angular's `{{ value | number:'1.0-1' }}` (en-US locale):
 *   - max 1 decimal, no trailing zeros (24.3 → "24.3", 69 → "69")
 *   - thousands separators ("1,234")
 *   - nullish/NaN → '' (the original renders just the unit, e.g. "°C")
 * Evidence: docs/evidence/historical/screen-03 (Mayo: "24.3°C", "69%", "28°C")
 * and screen-01 (Junio vacío: "°C", "%", "0mm").
 */
function formatStat(value: number | undefined): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '';
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

// Original: historical.page.scss .calendar_variables { color: #545454 } (hardcoded
// in the SCSS — not a --Colors-* token, so kept as a local constant here).
const VARIABLES_TEXT_COLOR = '#545454';

// Device review 2026-09-10: delay before showing the mid-navigation content
// loader (see `monthLoading`). The DataStore reads behind a month change are
// local and usually resolve in a handful of ms, so showing the loader
// immediately would just flicker on the common case. If the load takes
// longer than this threshold we show the loader until the new data lands;
// if it resolves first, the loader never appears. A brief flicker under this
// threshold is an accepted trade-off (documented per user request) rather
// than adding a minimum-visible-time lock, which would make FAST months
// feel slower for no benefit.
const CONTENT_LOADER_DELAY_MS = 150;

// Placeholder shown by the Tem/Hum/Acu cards while `monthLoading` is true —
// replaces the (possibly stale, from the previous month) avg/max/min values.
const LOADING_STAT_PLACEHOLDER = '–';

// ─── Types ─────────────────────────────────────────────────────────────────────

type TypeView = 'calendar' | 'chart';

interface CompleteTaskHistorical extends CompletedTask {
  mes: number;
  date: Date;
  name: string;
}

interface ChartDataResult {
  chartLabels: string[];
  chartData: number[];
  chartMinData: number[];
  chartMaxData: number[];
  detailedMode: boolean;
  ymin: number | undefined;
  ymax: number | undefined;
  xmin: string;
  xmax: string;
}

// ─── Chart data builder ────────────────────────────────────────────────────────

/**
 * Builds chart data from measurement config + raw measurements.
 * Mirrors original updateChart() logic (historical.page.ts).
 * Uses B07 pure aggregation functions.
 */
function buildChartData(
  measureSelected: Historical,
  rawMeasurements: { data?: RawMeasurementData; ts: string }[],
  measuresConfig: MeasurementModel | null,
  year: number,
  monthIndex: number,
): ChartDataResult {
  const transformedData = transformData(rawMeasurements);
  const configGraph = measureSelected.graph;

  // x-axis range (ISO YYYY-MM-DD)
  const startOfMonth = new Date(year, monthIndex, 1, 0, 0, 0, 0)
    .toLocaleDateString('en-CA'); // YYYY-MM-DD
  const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
    .toLocaleDateString('en-CA');

  // y-axis range from measurement config
  let ymin: number | undefined;
  let ymax: number | undefined;
  if (measuresConfig) {
    for (const key of configGraph.measurementIds) {
      const mc = measuresConfig.measurements[key];
      if (!mc) continue;
      if (ymax === undefined || mc.range.max > ymax) ymax = mc.range.max;
      if (ymin === undefined || mc.range.min < ymin) ymin = mc.range.min;
    }
  }

  if (
    configGraph.type === 'line' &&
    configGraph.aggregationFunction === 'mean'
  ) {
    // Detailed mode: avg/min/max band
    const detailedMeasures = calculateDetailedMeasurement(
      transformedData,
      configGraph.measurementIds,
    );

    if (detailedMeasures && Object.keys(detailedMeasures).length > 0) {
      const labels = Object.keys(detailedMeasures).sort();
      const avgData = labels.map((d) => detailedMeasures[d]?.avg ?? 0);
      const minData = labels.map((d) => detailedMeasures[d]?.min ?? 0);
      const maxData = labels.map((d) => detailedMeasures[d]?.max ?? 0);
      return {
        chartLabels: labels,
        chartData: avgData,
        chartMinData: minData,
        chartMaxData: maxData,
        detailedMode: true,
        ymin,
        ymax,
        xmin: startOfMonth,
        xmax: endOfMonth,
      };
    }
    // No data: empty detailed mode
    return {
      chartLabels: [],
      chartData: [],
      chartMinData: [],
      chartMaxData: [],
      detailedMode: false,
      ymin,
      ymax,
      xmin: startOfMonth,
      xmax: endOfMonth,
    };
  } else {
    // Normal mode: sum or mean per day
    const measures = calculateMeasurement(
      transformedData,
      configGraph.measurementIds,
      configGraph.aggregationFunction === 'sum' ? 'sum' : 'mean',
    );

    const labels = Object.keys(measures).sort();
    const values = labels.map((d) => measures[d] ?? 0);
    return {
      chartLabels: labels,
      chartData: values,
      chartMinData: [],
      chartMaxData: [],
      detailedMode: false,
      ymin,
      ymax,
      xmin: startOfMonth,
      xmax: endOfMonth,
    };
  }
}

// ─── calculateValue (preserved from historical.page.ts:558-577) ───────────────

/**
 * Calculates the aggregate value for a measurement based on its aggregation function.
 * Mirrors original `calculateValue` private method (historical.page.ts:558-577).
 *
 * For 'sum': returns sum of first measurementId series.
 * For 'mean': returns mean of first and second measurementId series combined.
 * Otherwise: returns undefined.
 */
function calculateValue(
  measurement: Historical,
  values: HistoricalMeasurement,
): number | undefined {
  switch (measurement.aggregationFunction) {
    case 'sum':
      return measurement.measurementIds.length > 0
        ? sum(values[measurement.measurementIds[0]])
        : undefined;
    case 'mean':
      return measurement.measurementIds.length > 1
        ? mean(
            values[measurement.measurementIds[0]],
            values[measurement.measurementIds[1]],
          )
        : undefined;
    default:
      return undefined;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * HistoricalScreen
 *
 * Tab "Historial" — calendar/chart view of historical measurements.
 * Equivalent to HistoricalPage in Ionic (B13b scope: lista + calendario).
 */
export function HistoricalScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { getConfigurationMeasurement } = useConfigContext();

  const realCurrentYear = new Date().getFullYear();
  const realCurrentMonth = new Date().getMonth();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [timeFrame, setTimeFrame] = useState<TimeFrameValue>('month');
  const [typeView, setTypeView] = useState<TypeView>('calendar');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(realCurrentMonth);
  const [currentYearIndex, setCurrentYearIndex] = useState(realCurrentYear);
  const [nRegisters, setNRegisters] = useState<number | undefined>(undefined);
  const [completedTaskYear, setCompletedTaskYear] = useState<CompleteTaskHistorical[]>([]);
  const [variables, setVariables] = useState<Historical[]>([]);
  const [measuresConfig, setMeasuresConfig] = useState<MeasurementModel | null>(null);
  const [measureSelected, setMeasureSelected] = useState<Historical | undefined>(undefined);
  // Stable identity of the selected variable, used by the month-load effect so
  // it does not re-run when only the object reference changes.
  const measureSelectedName = measureSelected?.name;
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  // Device review 2026-09-10: navigating months with the arrows (or via the
  // Mes/Año segment, or tapping a month from Año) briefly kept SHOWING the
  // previous month's chart + Tem/Hum/Acu card values while the new month's
  // data was still being fetched (initializeVariables/updateChartData are
  // async). `monthLoading` gates that stale content so the content area
  // shows a loader / placeholders instead, without unmounting the header or
  // the Mes/Año segment and without touching `typeView`/`measureSelected`.
  const [monthLoading, setMonthLoading] = useState(false);

  // B15-cierre: off-screen report for view-shot capture
  const reportViewRef = useRef<View>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Chart data state (built by buildChartData when measureSelected changes)
  const [chartState, setChartState] = useState<ChartDataResult>({
    chartLabels: [],
    chartData: [],
    chartMinData: [],
    chartMaxData: [],
    detailedMode: false,
    ymin: undefined,
    ymax: undefined,
    xmin: '',
    xmax: '',
  });

  // ─── useFocusEffect: reload seed on focus ──────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadSeed = async () => {
        const progress = await UserProgressDSService.getLastUserProgressPure();
        if (mounted && progress) setUserProgress(progress);
      };
      void loadSeed();
      return () => { mounted = false; };
    }, []),
  );

  // ─── initializeRegisters ──────────────────────────────────────────────────

  const initializeRegisters = useCallback(async (mounted: boolean) => {
    const count = await UserProgressDSService.getCountTasksByMonthYear(
      currentYearIndex,
      currentMonthIndex + 1,
    );
    if (mounted) setNRegisters(count);
  }, [currentMonthIndex, currentYearIndex]);

  // ─── getCompletedTaskForMonth (declared before initializeCompletedTasks) ──

  const getCompletedTaskForMonth = useCallback(
    async (year: number, month: number): Promise<CompleteTaskHistorical> => {
      const completedTask = await UserProgressDSService.getCompletedTasksByMonthYear(year, month, 3);
      return {
        mes: month - 1,
        date: new Date(year, month - 1, 1),
        name: monthsNames[month - 1],
        daysComplete: completedTask.daysComplete,
        daysIncomplete: completedTask.daysIncomplete,
        daysSaveStreak: completedTask.daysSaveStreak,
      };
    },
    [],
  );

  // ─── initializeCompletedTasks ─────────────────────────────────────────────

  const initializeCompletedTasks = useCallback(async (mounted: boolean) => {
    const tasksPromises = Array.from({ length: 12 }, (_, month) =>
      getCompletedTaskForMonth(currentYearIndex, month + 1),
    );
    const completedYear = await Promise.all(tasksPromises);
    if (!mounted) return;

    setCompletedTaskYear(completedYear);
  }, [currentYearIndex, getCompletedTaskForMonth]);

  // Original: `this.completedTaskMonth = this.completedTaskYear?.find(...)`
  // (historical.page.ts:217-219) — a pure lookup in memory, so navigating
  // months repaints the calendar immediately without hitting the DataStore.
  const completedTaskMonth = React.useMemo(
    () => completedTaskYear.find((h) => h.mes === currentMonthIndex),
    [completedTaskYear, currentMonthIndex],
  );

  // ─── initializeVariables ─────────────────────────────────────────────────

  const initializeVariables = useCallback(
    async (
      historicalData: Historical[],
      tf: TimeFrameValue,
      mounted: boolean,
    ): Promise<Historical[]> => {
      let measurementValues: any[];

      if (tf === 'year') {
        const startDate = new Date(currentYearIndex, 0, 1);
        const endDate = new Date(currentYearIndex, 11, 31, 23, 59, 59);
        measurementValues = await MeasurementDSService.getMeasurementsByDateRange(
          startDate,
          endDate,
        );
      } else {
        measurementValues = await MeasurementDSService.getMeasurementsByMont(
          currentYearIndex,
          currentMonthIndex,
        );
      }

      const transformedData = transformData(measurementValues);

      // Fix (a): preserve existing `selected` flag so the highlighted variable does
      // not reset when the user navigates months in chart mode.
      // Fix (c): compute `value` with calculateValue (sum/mean) instead of hardcoding
      // `undefined`. Mirrors original historical.page.ts:543-544.
      const newVariables = historicalData.map((measurement) => {
        const stats = calculateOverallStats(measurement, transformedData);
        return {
          ...measurement,
          // `selected` is merged below via functional setVariables to read live state
          selected: false,
          // Original: value: this.calculateValue(measurement, transformedData)
          value: calculateValue(measurement, transformedData),
          min: stats.min,
          max: stats.max,
          avg: stats.avg,
        };
      }) as Historical[];

      if (mounted) {
        // Apply `selected` preservation: use functional setVariables to read the
        // current state snapshot, then merge `selected` from existing variables.
        // Original: existingVariable?.selected ?? false (historical.page.ts:543).
        setVariables((prevVariables) =>
          newVariables.map((newVar) => {
            const existingVar = prevVariables.find((v) => v.name === newVar.name);
            return { ...newVar, selected: existingVar?.selected ?? false };
          }) as Historical[],
        );
      }
      return newVariables;
    },
    [currentMonthIndex, currentYearIndex],
  );

  // ─── updateChartData: rebuilds chart state when measureSelected changes ──────

  const updateChartData = useCallback(
    async (measurement: Historical) => {
      try {
        // `transformData` normalizes `Measurement.data` (object or AWSJSON
        // string) itself, so the chart and the Tem/Hum/Acu cards consume the
        // EXACT same input shape — see parseMeasurementData in B07.
        const rawMeasurements = await MeasurementDSService.getMeasurementsByMont(
          currentYearIndex,
          currentMonthIndex,
        );
        const chartData = buildChartData(
          measurement,
          rawMeasurements,
          measuresConfig,
          currentYearIndex,
          currentMonthIndex,
        );
        setChartState(chartData);
      } catch (err) {
        console.error('[HistoricalScreen] updateChartData error:', err);
      }
    },
    [currentMonthIndex, currentYearIndex, measuresConfig],
  );

  // ─── Mount / year change: the expensive 12-month load ─────────────────────
  //
  // D-40: the previous single effect re-ran `initializeCompletedTasks` (12
  // parallel DataStore queries) on EVERY month change and blanked the whole
  // screen meanwhile.  The original only does that on mount (`ngOnInit`) and
  // when the YEAR changes (`updateDataForYear`, historical.page.ts:325-333);
  // `setCurrentMonth` reuses the already-loaded `completedTaskYear` (`:216-219`),
  // which is why switching months is instant there.
  useEffect(() => {
    let mounted = true;
    const loadYear = async () => {
      setLoading(true);
      try {
        await initializeCompletedTasks(mounted);
        // Preserved (historical.page.ts ngOnInit): the page loads the measurement
        // config itself via ConfigurationAppService.getConfigurationMeasurement()
        // (cached by ConfigContext) — it does NOT depend on another screen having
        // loaded it first.
        const config = await getConfigurationMeasurement();
        if (mounted) setMeasuresConfig(config);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadYear();
    return () => { mounted = false; };
  }, [getConfigurationMeasurement, currentYearIndex, initializeCompletedTasks]);

  // ─── Month change: registers + variables + chart (original setCurrentMonth) ─
  //
  // Original historical.page.ts:222-236: initializeRegisters → initializeVariables
  // → and, only when `typeView === 'chart'`, updateChart() for the new month.
  // D-12: doing the chart refresh here is what lets the graph survive month
  // navigation instead of falling back to the calendar.
  useEffect(() => {
    let mounted = true;
    // Device review 2026-09-10: delay showing `monthLoading` by
    // CONTENT_LOADER_DELAY_MS so a fast (typical) local read never flickers
    // the loader — see the constant's comment above.
    let showLoaderTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      showLoaderTimer = null;
      if (mounted) setMonthLoading(true);
    }, CONTENT_LOADER_DELAY_MS);
    const clearShowLoaderTimer = () => {
      if (showLoaderTimer) {
        clearTimeout(showLoaderTimer);
        showLoaderTimer = null;
      }
    };
    const loadMonth = async () => {
      try {
        await initializeRegisters(mounted);
        const config = measuresConfig ?? (await getConfigurationMeasurement());
        if (!config?.historical || !mounted) return;

        // Fix (b): pass current timeFrame instead of hardcoded 'month' so that
        // year-view variables are built with the full-year dataset.
        // Original: initializeVariables reads this.timeFrame (historical.page.ts:512).
        const freshVariables = await initializeVariables(
          config.historical,
          timeFrame,
          mounted,
        );

        if (!mounted || typeView !== 'chart' || freshVariables.length === 0) return;
        // Original: `this.measureSelected.selected = true; updateChart(...)`, or
        // `changeColorChart(this.variables[0])` when nothing is selected yet.
        const selected =
          freshVariables.find((v) => v.name === measureSelectedName) ??
          freshVariables[0];
        setVariables((v) =>
          v.map((vr) => ({ ...vr, selected: vr.name === selected.name })),
        );
        setMeasureSelected({ ...selected, selected: true });
        await updateChartData(selected);
      } finally {
        // Always clears — regardless of which of the early returns above
        // was hit — so `monthLoading` never gets stuck true.
        clearShowLoaderTimer();
        if (mounted) setMonthLoading(false);
      }
    };
    void loadMonth();
    return () => {
      mounted = false;
      clearShowLoaderTimer();
    };
  }, [
    currentMonthIndex,
    currentYearIndex,
    measuresConfig,
    timeFrame,
    typeView,
    measureSelectedName,
    getConfigurationMeasurement,
    initializeRegisters,
    initializeVariables,
    updateChartData,
  ]);

  // ─── changeModeData ────────────────────────────────────────────────────────

  const changeModeData = useCallback(() => {
    setTypeView((prev) => {
      const next = prev === 'calendar' ? 'chart' : 'calendar';
      if (next === 'chart' && variables.length > 0) {
        const firstVar = { ...variables[0], selected: true };
        setMeasureSelected(firstVar);
        setVariables((v) => v.map((vr, i) => ({ ...vr, selected: i === 0 })));
        // The month-load effect (keyed on typeView) builds the chart data.
      } else {
        setVariables((v) => v.map((vr) => ({ ...vr, selected: false })));
        setMeasureSelected(undefined);
      }
      return next;
    });
  }, [variables]);

  // ─── changeColorChart ─────────────────────────────────────────────────────

  const changeColorChart = useCallback((measurement: Historical) => {
    setTypeView('chart');
    setVariables((v) =>
      v.map((vr) => ({ ...vr, selected: vr.name === measurement.name })),
    );
    const selected = { ...measurement, selected: true };
    setMeasureSelected(selected);
    void updateChartData(selected);
  }, [updateChartData]);

  // ─── changeSegment ────────────────────────────────────────────────────────

  // Original changeSegment (historical.page.ts:159-176) re-runs
  // initializeVariables for the new timeFrame; here the month-load effect is
  // keyed on `timeFrame`, so setting it is enough and avoids a duplicate query.
  const changeSegment = useCallback((type: TimeFrameValue) => {
    setTimeFrame(type);
  }, []);

  // ─── setCurrentMonth ──────────────────────────────────────────────────────

  const goToMonth = useCallback(
    (index: number) => {
      let newIndex = index;
      let newYear = currentYearIndex;

      if (newIndex < 0) {
        newIndex = 11;
        newYear = currentYearIndex - 1;
      } else if (newIndex > 11) {
        if (currentYearIndex >= realCurrentYear) return; // future
        newIndex = 0;
        newYear = currentYearIndex + 1;
      }

      const month = completedTaskYear.find((h) => h.mes === newIndex && h.date.getFullYear() === newYear);
      if (!month && newIndex !== newYear) {
        // allow anyway
      }

      setCurrentMonthIndex(newIndex);
      setCurrentYearIndex(newYear);

      // Desviación del original a petición del usuario (2026-09-10): el
      // original (historical.page.ts:207-236) SIEMPRE fuerza
      // `typeView='calendar'` y limpia `selected` al venir de la vista Año.
      // El usuario pidió que, si venía en modo gráfica con una variable
      // seleccionada, el mes destino se abra también en modo gráfica con esa
      // misma variable. Para eso basta con NO resetear `typeView` ni
      // `measureSelected` aquí: el month-load effect de abajo ya reconstruye
      // la gráfica cuando `typeView === 'chart'` — buscando la variable por
      // nombre (`measureSelectedName`) y cayendo a `freshVariables[0]` si no
      // había ninguna seleccionada —, igual que hace con la navegación por
      // flechas dentro del mes (preservado desde el commit 24545a5). Si el
      // usuario estaba en calendario, `typeView` sigue en 'calendar' y el
      // comportamiento no cambia.
      setTimeFrame('month');
    },
    [completedTaskYear, currentYearIndex, realCurrentYear],
  );

  // ─── isNextYearDisabled ───────────────────────────────────────────────────

  const isNextYearDisabled = useCallback(
    () => currentYearIndex + 1 > realCurrentYear,
    [currentYearIndex, realCurrentYear],
  );

  // ─── shareMonthlyReport ────────────────────────────────────────────────────
  // B15-cierre: Shares a PNG image of the environmental report.
  // Strategy:
  //   1. Generate ReportData via EnvironmentalReportService.generateReportData()
  //   2. Set reportData state → triggers render of off-screen EnvironmentalReport
  //   3. Wait one frame for React to paint the off-screen view
  //   4. captureRef() → PNG file URI (tmpdir)
  //   5. expo-sharing.shareAsync(uri) → native share sheet with image attached
  //   6. Fallback to text report if captureRef throws (e.g. during Jest / headless)
  //
  // The off-screen view is rendered below the viewport (position absolute, top 10000)
  // with collapsable={false} so Android does not skip layout.

  const shareMonthlyReport = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    const monthStr = `${monthsNames[currentMonthIndex]} ${currentYearIndex}`;

    try {
      // ── Step 1: generate report data ──────────────────────────────────────
      let data: ReportData;
      try {
        data = await EnvironmentalReportService.generateReportData(
          currentYearIndex,
          currentMonthIndex,
        );
      } catch (dataErr) {
        console.warn('[HistoricalScreen] generateReportData failed, falling back to text:', dataErr);
        // Fall through to text sharing
        throw dataErr;
      }

      // ── Step 2: mount off-screen report ──────────────────────────────────
      setReportData(data);

      // ── Step 3: wait two frames for React layout ──────────────────────────
      await new Promise<void>((resolve) => {
        // Two rAF cycles: first to schedule paint, second to confirm layout
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });

      // ── Step 4: capture to PNG ────────────────────────────────────────────
      let imageUri: string | null = null;
      try {
        if (reportViewRef.current) {
          imageUri = await captureRef(reportViewRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
            // pixelRatio 3 → 340 * 3 = 1020px effective width (close to 816 original)
            // but we keep it at 2 to stay within Android memory limits
          });
        }
      } catch (captureErr) {
        console.warn('[HistoricalScreen] captureRef failed, falling back to text:', captureErr);
      }

      // ── Step 4b: give the file a readable name (D-19) ─────────────────────
      // captureRef writes `ReactNative-snapshot-image<hash>.png` into the temp
      // dir and the share sheet shows that raw name.  The original shares
      // `reporte-<mes>-<año>.png` (share.service.ts names the blob), so copy
      // the capture to the cache dir under that name before sharing.
      if (imageUri) {
        imageUri = await renameCaptureForShare(
          imageUri,
          buildReportFileName(currentMonthIndex, currentYearIndex),
        );
      }

      // ── Step 5: share ─────────────────────────────────────────────────────
      if (imageUri && (await Sharing.isAvailableAsync())) {
        // Image share via expo-sharing (native share sheet with PNG attachment)
        await Sharing.shareAsync(imageUri, {
          mimeType: 'image/png',
          dialogTitle: `Reporte de Datos Ambientales - ${monthStr}`,
          UTI: 'public.png',
        });
      } else {
        // Fallback: text report (original B15 behavior)
        let reportText = `\u{1F4CA} Reporte de Datos Ambientales - ${monthStr}\n\n`;

        if (variables.length > 0) {
          reportText += '\u{1F4C8} Resumen del mes:\n';
          for (const variable of variables) {
            if (variable.avg !== undefined) {
              reportText += `• ${variable.name}: ${variable.avg.toFixed(1)}${variable.unit}`;
              if (variable.min !== undefined && variable.max !== undefined) {
                reportText += ` (Min: ${variable.min.toFixed(1)}, Max: ${variable.max.toFixed(1)})`;
              }
              reportText += '\n';
            }
          }
        } else {
          reportText += '\u{1F4C8} No hay datos disponibles para este mes\n';
        }

        if (nRegisters) {
          reportText += `\n\u{1F4DD} Total de registros: ${nRegisters}`;
        }
        reportText += '\n\n\u{1F331} Generado con App UVA';

        const { Share } = require('react-native');
        await Share.share({
          title: `Reporte de Datos Ambientales - ${monthStr}`,
          message: reportText,
        });
      }

      showToast({ message: 'Reporte compartido exitosamente', type: 'success', duration: 2000 });
    } catch (error) {
      // Pure text fallback (reached if generateReportData itself failed)
      try {
        const { Share } = require('react-native');
        const fallbackText = `Reporte de Datos Ambientales - ${monthStr}\nGenerado con App UVA`;
        await Share.share({ title: `Reporte - ${monthStr}`, message: fallbackText });
        showToast({ message: 'Reporte compartido exitosamente', type: 'success', duration: 2000 });
      } catch {
        console.error('[HistoricalScreen] shareMonthlyReport error:', error);
        showToast({ message: 'Error al compartir el reporte. Intenta de nuevo.', type: 'error', duration: 3000 });
      }
    } finally {
      setSharing(false);
      // Unmount the off-screen view once sharing is done
      setReportData(null);
    }
  }, [sharing, variables, nRegisters, currentMonthIndex, currentYearIndex]);

  // ─── goToDetail ───────────────────────────────────────────────────────────

  const goToDetail = useCallback(
    (day: CalendarDay | null) => {
      if (!day || day.state === 'future' || !day.date) return;
      navigation.navigate('MeasurementDetail', {
        calendar: day.date.toISOString(),
        origin: 'historical',
      });
    },
    [navigation],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  // D-40/D-12: the original NEVER unmounts the shell while loading — the header
  // and the Mes/Año segment stay on screen and only the content area is
  // refreshed (Ionic renders the page, then ngOnInit fills it in).  Returning a
  // bare full-screen spinner produced a white screen with a white status bar
  // for ~8-10 s on entry and on every month change.
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.gray[100] }]}>
      <Header
        title="Historial de registros"
        seed={userProgress?.Seed}
        hasProfileButton
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Time frame selector */}
        <View style={styles.timeFrameContainer}>
          <TimeFrame timeFrame={timeFrame} onSegmentChange={changeSegment} />
        </View>

        {/* Month view */}
        {loading && (
          <View style={styles.contentLoader} testID="historical-loading">
            <ActivityIndicator color={theme.colors.blue[500]} size="large" />
          </View>
        )}

        {!loading && timeFrame === 'month' && (
          <View style={[styles.card, { backgroundColor: theme.colors.gray[50], borderColor: theme.colors.gray[200] }]}>
            {/* Header: month name, year, register count, toggle button */}
            <View style={styles.calendarHeader}>
              <View>
                {/* Original: .calendar_header_titles--h2 — 16px/700 Blue-900;
                    the year <span> keeps the color but drops to weight 500 */}
                <Text
                  style={[
                    styles.monthTitle,
                    { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[900] },
                  ]}
                >
                  {completedTaskMonth?.name},{' '}
                  <Text style={{ fontFamily: fontFamilyForWeight('500') }}>
                    {currentYearIndex}
                  </Text>
                </Text>
                {/* Original: .calendar_header_titles--p — 14px/500 Gray-500 */}
                <Text
                  style={[
                    styles.registerCount,
                    { fontFamily: fontFamilyForWeight('500'), color: theme.colors.gray[500] },
                  ]}
                >
                  {nRegisters ?? 0} Registros
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleBtn, { borderColor: theme.colors.blue[500] }]}
                onPress={changeModeData}
                testID="toggle-view-btn"
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    { fontFamily: fontFamilyForWeight('400'), color: theme.colors.blue[500] },
                  ]}
                >
                  {/* Original: historical.page.html swap-horizontal-outline icon after text */}
                  Ver como {typeView === 'calendar' ? 'gráfica' : 'calendario'} ⇄
                </Text>
              </TouchableOpacity>
            </View>

            {/* Variables summary table (Tem / Hum / Acu — avg, max, min).
                Original: historical.page.html .calendar_variables_container —
                3 white cards (radius 10, padding 10, gap 10) on the gray-50
                section; values formatted with `number:'1.0-1'`. */}
            <View style={[styles.variablesRow, monthLoading && styles.variablesRowLoading]}>
              {variables.map((variable) => (
                <TouchableOpacity
                  key={variable.name}
                  style={[
                    styles.variableCard,
                    {
                      backgroundColor: theme.colors.white,
                      // Original ngStyle: border-color = variable borderColor only
                      // when typeView==='chart' && selected; white otherwise.
                      borderColor:
                        typeView === 'chart' && variable.selected
                          ? variable.style.borderColor.colorHex
                          : theme.colors.white,
                    },
                  ]}
                  onPress={() => changeColorChart(variable)}
                  testID={`variable-card-${variable.name}`}
                >
                  <Text
                    style={[
                      styles.variableTitle,
                      { fontFamily: fontFamilyForWeight('600') },
                    ]}
                  >
                    {/* D-20: the emoji is rendered by the system emoji font,
                        whose advance width is wider than the web one, so it
                        showed a gap the original does not have
                        ("🌡 Tem" vs "🌡Tem"). A negative letterSpacing on the
                        symbol only compensates that advance. */}
                    <Text style={styles.variableSymbol}>{variable.symbol}</Text>
                    {variable.name.substring(0, 3)}
                  </Text>
                  <View
                    style={[
                      styles.variableAvgBox,
                      {
                        // Original ngStyle: stat-box background = variable
                        // backgroundColor when chart+selected; white otherwise.
                        backgroundColor:
                          typeView === 'chart' && variable.selected
                            ? variable.style.backgroundColor.colorHex
                            : theme.colors.white,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.variableAvg,
                        {
                          fontFamily: fontFamilyForWeight(typeView === 'chart' && variable.selected ? '700' : '600'),
                        },
                      ]}
                      testID={`variable-avg-${variable.name}`}
                    >
                      {/* Device review 2026-09-10: while the new month's stats
                          are loading, show a placeholder instead of the
                          PREVIOUS month's (stale) avg/max/min. */}
                      {monthLoading ? LOADING_STAT_PLACEHOLDER : `${formatStat(variable.avg)}${variable.unit}`}
                    </Text>
                  </View>
                  <View style={styles.variableStat}>
                    <Text style={[styles.statLabel, { fontFamily: fontFamilyForWeight('500') }]}>
                      Max:
                    </Text>
                    <Text
                      style={[styles.statValue, { fontFamily: fontFamilyForWeight('500') }]}
                      testID={`variable-max-${variable.name}`}
                    >
                      {monthLoading ? LOADING_STAT_PLACEHOLDER : `${formatStat(variable.max)}${variable.unit}`}
                    </Text>
                  </View>
                  <View style={styles.variableStat}>
                    <Text style={[styles.statLabel, { fontFamily: fontFamilyForWeight('500') }]}>
                      Min:
                    </Text>
                    <Text
                      style={[styles.statValue, { fontFamily: fontFamilyForWeight('500') }]}
                      testID={`variable-min-${variable.name}`}
                    >
                      {monthLoading ? LOADING_STAT_PLACEHOLDER : `${formatStat(variable.min)}${variable.unit}`}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Calendar or Chart — while `monthLoading`, show the content
                loader instead (same ActivityIndicator/style as the
                full-page loader above), regardless of typeView. This never
                resets typeView/measureSelected: it only swaps what's
                rendered until the new month's data lands. */}
            <View style={styles.calendarContainer}>
              {monthLoading ? (
                <View style={styles.contentLoader} testID="historical-month-loading">
                  <ActivityIndicator color={theme.colors.blue[500]} size="large" />
                </View>
              ) : typeView === 'calendar' ? (
                completedTaskMonth ? (
                  // Original: calendar.component.scss .calendar_content —
                  // white card (radius 10, border 1px Gray-200) on the gray-50 section
                  <View style={[styles.calendarContent, { backgroundColor: theme.colors.white, borderColor: theme.colors.gray[200] }]}>
                    <Calendar
                      viewDate={completedTaskMonth.date}
                      daysComplete={completedTaskMonth.daysComplete}
                      daysIncomplete={completedTaskMonth.daysIncomplete}
                      daysSaveStreak={completedTaskMonth.daysSaveStreak}
                      onDayPress={goToDetail}
                      hasHeader
                    />
                  </View>
                ) : null
              ) : (
                // Chart mode: Areachart with real chart data from buildChartData
                // NOTE (B15 gate): Skia chart renders BLANK on SwiftShader emulator.
                // This is a known GPU deuda — see integrator notes.
                measureSelected ? (
                  <Areachart
                    chartLabels={chartState.chartLabels}
                    chartData={chartState.chartData}
                    chartMinData={chartState.chartMinData}
                    chartMaxData={chartState.chartMaxData}
                    background={measureSelected.style.backgroundColor.colorHex}
                    borderColor={measureSelected.style.borderColor.colorHex}
                    detailedMode={chartState.detailedMode}
                    ymin={chartState.ymin}
                    ymax={chartState.ymax}
                    xmin={chartState.xmin}
                    xmax={chartState.xmax}
                    height={220}
                    chartType={
                      // Original: measureSelected.graph.type controls Chart.js chartType.
                      // areachart.component.ts:158 — if (this.chartType === 'bar') gradient = borderColor.
                      // Lluvia/Acu uses graph.type='bar'; Tem/Hum use graph.type='line'.
                      (measureSelected.graph?.type as 'line' | 'bar' | undefined) === 'bar'
                        ? 'bar'
                        : 'line'
                    }
                  />
                ) : null
              )}
            </View>

            {/* Month navigation footer */}
            {completedTaskMonth && (
              <View style={styles.monthNav}>
                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={() => goToMonth(completedTaskMonth.mes - 1)}
                  testID="month-nav-prev"
                >
                  <Text
                    style={[
                      styles.monthNavText,
                      { fontFamily: fontFamilyForWeight('500') },
                    ]}
                  >
                    ← {monthsNames[completedTaskMonth.mes - 1] ?? monthsNames[11]}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.monthNavBtn,
                    (completedTaskMonth.mes === 11 && isNextYearDisabled()) && styles.monthNavBtnDisabled,
                  ]}
                  onPress={() => goToMonth(completedTaskMonth.mes + 1)}
                  disabled={completedTaskMonth.mes === 11 && isNextYearDisabled()}
                  testID="month-nav-next"
                >
                  <Text
                    style={[
                      styles.monthNavText,
                      (completedTaskMonth.mes === 11 && isNextYearDisabled()) && styles.monthNavTextDisabled,
                    ]}
                  >
                    {monthsNames[completedTaskMonth.mes + 1] ?? monthsNames[0]} →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Share button — full-width teal at bottom of month card */}
            {completedTaskMonth && (
              <TouchableOpacity
                style={[styles.shareBtn, sharing && styles.shareBtnDisabled]}
                onPress={() => void shareMonthlyReport()}
                disabled={sharing}
                testID="share-data-btn"
              >
                {/* Original: <ion-icon slot="start" name="share-outline"> —
                    the ionicons upload tray, not a thin ↗ arrow (D-17). */}
                {!sharing && (
                  <AppIcon
                    name="share-outline"
                    width={18}
                    height={18}
                    style={styles.shareBtnIcon}
                  />
                )}
                <Text style={[styles.shareBtnText, { fontFamily: fontFamilyForWeight('500') }]}>
                  {sharing ? 'Generando...' : 'Compartir datos'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Year view */}
        {!loading && timeFrame === 'year' && (
          <View style={[styles.card, { backgroundColor: theme.colors.gray[50], borderColor: theme.colors.gray[200] }]}>
            {/* Year navigation */}
            <View style={styles.yearNav}>
              <TouchableOpacity
                onPress={() => setCurrentYearIndex((y) => y - 1)}
                style={styles.yearNavBtn}
              >
                <Text
                  style={[styles.yearNavText, { color: theme.colors.blue[600] }]}
                >
                  ← {currentYearIndex - 1}
                </Text>
              </TouchableOpacity>
              <Text
                style={[
                  styles.currentYear,
                  { fontFamily: fontFamilyForWeight('700'), color: theme.semanticColors.text },
                ]}
              >
                {currentYearIndex}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentYearIndex((y) => y + 1)}
                style={styles.yearNavBtn}
                disabled={isNextYearDisabled()}
              >
                <Text
                  style={[
                    styles.yearNavText,
                    { color: isNextYearDisabled() ? theme.colors.gray[400] : theme.colors.blue[600] },
                  ]}
                >
                  {currentYearIndex + 1} →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Year variables table (same cards; all backgrounds white in year view) */}
            <View style={styles.variablesRow}>
              {variables.map((variable) => (
                <View
                  key={variable.name}
                  style={[
                    styles.variableCard,
                    { backgroundColor: theme.colors.white, borderColor: theme.colors.white },
                  ]}
                >
                  <Text
                    style={[
                      styles.variableTitle,
                      { fontFamily: fontFamilyForWeight('600') },
                    ]}
                  >
                    {/* D-20: the emoji is rendered by the system emoji font,
                        whose advance width is wider than the web one, so it
                        showed a gap the original does not have
                        ("🌡 Tem" vs "🌡Tem"). A negative letterSpacing on the
                        symbol only compensates that advance. */}
                    <Text style={styles.variableSymbol}>{variable.symbol}</Text>
                    {variable.name.substring(0, 3)}
                  </Text>
                  <View style={[styles.variableAvgBox, { backgroundColor: theme.colors.white }]}>
                    <Text
                      style={[
                        styles.variableAvg,
                        { fontFamily: fontFamilyForWeight('600') },
                      ]}
                    >
                      {formatStat(variable.avg)}
                      {variable.unit}
                    </Text>
                  </View>
                  <View style={styles.variableStat}>
                    <Text style={[styles.statLabel, { fontFamily: fontFamilyForWeight('500') }]}>Max:</Text>
                    <Text style={[styles.statValue, { fontFamily: fontFamilyForWeight('500') }]}>
                      {formatStat(variable.max)}
                      {variable.unit}
                    </Text>
                  </View>
                  <View style={styles.variableStat}>
                    <Text style={[styles.statLabel, { fontFamily: fontFamilyForWeight('500') }]}>Min:</Text>
                    <Text style={[styles.statValue, { fontFamily: fontFamilyForWeight('500') }]}>
                      {formatStat(variable.min)}
                      {variable.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Mini calendars grid — 3 per row, 4 rows (12 months).
                Original: ion-grid fixed → ion-col size="4" → 3 equal columns.
                Using explicit row Views instead of flexWrap+percentage to avoid
                RN-web atomic CSS bleed that causes percentage widths to resolve
                against the wrong ancestor (screen width vs column width).     */}
            {chunkIntoRows(completedTaskYear, 3).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.miniCalendarRow}>
                {row.map((register) => (
                  <TouchableOpacity
                    key={register.mes}
                    style={styles.miniCalendarCell}
                    onPress={() => goToMonth(register.mes)}
                    testID={`month-cell-${register.mes}`}
                  >
                    <View style={styles.miniCalendarInner}>
                      <Calendar
                        isMini
                        hasTitle
                        title={register.name}
                        viewDate={register.date}
                        daysComplete={register.daysComplete}
                        daysIncomplete={register.daysIncomplete}
                        daysSaveStreak={register.daysSaveStreak}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* B15-cierre: off-screen EnvironmentalReport for view-shot capture.
          Rendered below the visible viewport (top: 10000) so it does not
          appear to the user. collapsable={false} ensures Android performs layout.
          Only mounted when reportData is non-null (during share flow). */}
      {reportData !== null && (
        <View
          ref={reportViewRef}
          collapsable={false}
          style={styles.offScreenReport}
          testID="offscreen-report"
        >
          <EnvironmentalReport reportData={reportData} />
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Loader shown INSIDE the content area (header + segment stay mounted).
  contentLoader: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  timeFrameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    // Original: global.scss .cards — radius 10, border 1px Gray-200,
    // background Gray-50, margin-inline 10, padding 10 (padding-top 0).
    // No shadow in the original.
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    paddingTop: 0,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  monthTitle: {
    fontSize: 16, // Ionic: @include text-base(16px, 700)
  },
  registerCount: {
    fontSize: 14, // Ionic: @include text-base(14px, 500)
    marginTop: 2,
  },
  toggleBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  toggleBtnText: {
    fontSize: 13,
  },
  variablesRow: {
    // Original: .calendar_variables_container — row, gap 10px, margin-bottom 10px
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  // Device review 2026-09-10: dims the Tem/Hum/Acu cards while the new
  // month's stats are loading (values are replaced by LOADING_STAT_PLACEHOLDER).
  variablesRowLoading: {
    opacity: 0.5,
  },
  variableCard: {
    // Original: .calendar_variables — padding 10, gap 6, radius 10,
    // border 2px (white unless chart+selected), flex 1 (3 equal columns)
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    gap: 6,
    alignItems: 'flex-start',
  },
  // D-20: cancels the extra advance width of the system emoji font so the
  // symbol sits flush against the label, as in the original.
  variableSymbol: {
    letterSpacing: -2,
  },
  variableTitle: {
    // Original: .calendar_variables--title — 16px/600, #545454, centered, width 100%
    fontSize: 16,
    color: VARIABLES_TEXT_COLOR,
    textAlign: 'center',
    width: '100%',
  },
  variableAvgBox: {
    // Original: .calendar_variables--stat-box — padding 0 4px, radius 4, width 100%
    borderRadius: 4,
    paddingHorizontal: 4,
    width: '100%',
  },
  variableAvg: {
    // Original: .calendar_variables--stat-text — 14px/600, #545454, centered
    fontSize: 14,
    color: VARIABLES_TEXT_COLOR,
    textAlign: 'center',
  },
  variableStat: {
    // Original: .calendar_variables--stat-line — row, space-between, width 100%
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  statLabel: {
    // Original: .calendar_variables--stat-label — 12px/500, #545454
    fontSize: 12,
    color: VARIABLES_TEXT_COLOR,
  },
  statValue: {
    // Original: .calendar_variables--stat-value — 12px/500, #545454
    fontSize: 12,
    color: VARIABLES_TEXT_COLOR,
  },
  calendarContainer: {
    // Original: .meditions_container — margin-bottom 10px
    marginBottom: 10,
  },
  calendarContent: {
    // Original: calendar.component.scss .calendar_content + .calendar (padding 8px)
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    marginBottom: 8,
  },
  monthNavBtn: {
    backgroundColor: '#14788A', // --Colors-Blue-700: solid teal pill button
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monthNavBtnDisabled: {
    backgroundColor: '#9CA3AF', // gray when disabled
  },
  monthNavText: {
    fontSize: 14,
    color: '#FFFFFF', // white text on teal background
  },
  monthNavTextDisabled: {
    color: '#FFFFFF',
  },
  shareBtn: {
    backgroundColor: '#14788A', // --Colors-Blue-700
    borderRadius: 8,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  shareBtnIcon: {
    marginRight: 8, // ion-button icon slot="start" spacing
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  shareBtnDisabled: {
    backgroundColor: '#9CA3AF', // gray when disabled
  },
  yearNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  yearNavBtn: { padding: 8 },
  yearNavText: { fontSize: 14 },
  currentYear: { fontSize: 20 },
  // Row-based 3-column grid for mini-calendars (replaces flexWrap+percentage).
  // Original: ion-grid fixed → ion-col size="4" (3 equal columns).
  // Each row is an explicit flex row; each cell is flex:1 for equal sizing.
  miniCalendarRow: {
    flexDirection: 'row',
    marginBottom: 6, // spacing between rows (original ion-col has some padding)
  },
  miniCalendarCell: {
    // flex:1 in a 3-cell row = 1/3 each — avoids RN-web percentage width bleed.
    flex: 1,
    padding: 3,
  },
  miniCalendarInner: {
    backgroundColor: '#FFFFFF', // Ionic: .calendar_content { background: #fff }
    borderWidth: 1,
    borderColor: '#E5E5E5', // --Colors-Gray-200
    borderRadius: 10, // Ionic: border-radius: 10px
    overflow: 'hidden',
    padding: 4,
  },
  bottomPadding: { height: 80 },
  // B15-cierre: off-screen capture container
  offScreenReport: {
    position: 'absolute',
    top: 10000,   // Far below viewport — not visible to user
    left: 0,
    // Do NOT set opacity: 0 or display: none — Android skips layout for invisible views.
    // Instead, position far below the screen.
    backgroundColor: '#FFFFFF',
  },
});

export default HistoricalScreen;
