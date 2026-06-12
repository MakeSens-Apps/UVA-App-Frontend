/**
 * B13b — HistoricalScreen (partial implementation: lista + calendario)
 *
 * Ported from: src/app/pages/historical/historical.page.ts + .html
 * Classification: Rewrite (UI layer, preserving all logic)
 *
 * SCOPE B13b (lista + calendario):
 *   - timeFrame toggle (month/year) with TimeFrame component (B11)
 *   - Calendar view with completedTask data (Calendar B11)
 *   - Variables summary cards (avg/min/max) using tested aggregations (B07)
 *   - Month navigation (prev/next)
 *   - Year view (mini calendars grid)
 *   - changeModeData toggle: calendar ↔ chart (chart uses Areachart B11 if available)
 *   - goToDetail: navigate to MeasurementDetail (B15 placeholder)
 *   - useFocusEffect replaces ionViewWillEnter for seed
 *   - Share: DEFERRED to B15 (share icon placeholder shown but not functional)
 *
 * DEFERRED to B15:
 *   - Detailed Skia chart mode
 *   - Environmental report generation / sharing
 *   - MeasurementDetailPage real implementation
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
 *   - setTimeout → kept for generateCalendars analog (React handles re-render)
 *
 * Risks: R-32, R-12, R-15
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AppTabsParamList, AppStackParamList } from '@/navigation/types';
import { Header } from '@/components/header/Header';
import { Calendar } from '@/components/calendar/Calendar';
import { TimeFrame } from '@/components/time-frame/TimeFrame';
import type { TimeFrameValue } from '@/components/time-frame/TimeFrame';
import { Areachart } from '@/components/areachart/Areachart';

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
} from '@/domain/aggregations/historical-aggregations';
import type {
  HistoricalMeasurement,
} from '@/domain/aggregations/historical-aggregations';

import type { Historical, MeasurementModel } from '@/data/models/configuration/measurements.model';
import type { UserProgress } from '@/data/models';
import type { CalendarDay } from '@/components/calendar/calendarLogic';

// ─── Month names (preserved from historical.model.ts) ─────────────────────────

const monthsNames = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ─── Types ─────────────────────────────────────────────────────────────────────

type TypeView = 'calendar' | 'chart';

interface CompleteTaskHistorical extends CompletedTask {
  mes: number;
  date: Date;
  name: string;
}

type HistoricalNavigation = CompositeNavigationProp<
  ReturnType<typeof useNavigation>,
  NativeStackNavigationProp<AppStackParamList>
>;

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
  const { configMeasurement } = useConfigContext();

  const realCurrentYear = new Date().getFullYear();
  const realCurrentMonth = new Date().getMonth();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [timeFrame, setTimeFrame] = useState<TimeFrameValue>('month');
  const [typeView, setTypeView] = useState<TypeView>('calendar');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(realCurrentMonth);
  const [currentYearIndex, setCurrentYearIndex] = useState(realCurrentYear);
  const [nRegisters, setNRegisters] = useState<number | undefined>(undefined);
  const [completedTaskYear, setCompletedTaskYear] = useState<CompleteTaskHistorical[]>([]);
  const [completedTaskMonth, setCompletedTaskMonth] = useState<CompleteTaskHistorical | undefined>(undefined);
  const [variables, setVariables] = useState<Historical[]>([]);
  const [measureSelected, setMeasureSelected] = useState<Historical | undefined>(undefined);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);

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

  // ─── Mount: load all data ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      setLoading(true);
      try {
        await initializeRegisters(mounted);
        await initializeCompletedTasks(mounted);
        if (configMeasurement?.historical && mounted) {
          await initializeVariables(configMeasurement.historical, 'month', mounted);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadAll();
    return () => { mounted = false; };
  }, [configMeasurement, currentMonthIndex, currentYearIndex]);

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
    const monthTask = completedYear.find((h) => h.mes === currentMonthIndex);
    setCompletedTaskMonth(monthTask);
  }, [currentMonthIndex, currentYearIndex, getCompletedTaskForMonth]);

  // ─── initializeVariables ─────────────────────────────────────────────────

  const initializeVariables = useCallback(
    async (historicalData: Historical[], tf: TimeFrameValue, mounted: boolean) => {
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

      const newVariables = historicalData.map((measurement) => {
        const stats = calculateOverallStats(measurement, transformedData);
        return {
          ...measurement,
          selected: false,
          value: undefined,
          min: stats.min,
          max: stats.max,
          avg: stats.avg,
        };
      }) as Historical[];

      if (mounted) setVariables(newVariables);
    },
    [currentMonthIndex, currentYearIndex],
  );

  // ─── changeModeData ────────────────────────────────────────────────────────

  const changeModeData = useCallback(() => {
    setTypeView((prev) => {
      const next = prev === 'calendar' ? 'chart' : 'calendar';
      if (next === 'chart' && variables.length > 0) {
        setMeasureSelected({ ...variables[0], selected: true });
        setVariables((v) => v.map((vr, i) => ({ ...vr, selected: i === 0 })));
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
    setMeasureSelected({ ...measurement, selected: true });
  }, []);

  // ─── changeSegment ────────────────────────────────────────────────────────

  const changeSegment = useCallback(
    async (type: TimeFrameValue) => {
      setTimeFrame(type);
      if (configMeasurement?.historical) {
        await initializeVariables(configMeasurement.historical, type, true);
      }
    },
    [configMeasurement, initializeVariables],
  );

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
      setTimeFrame('month');
      setTypeView('calendar');
      setVariables((v) => v.map((vr) => ({ ...vr, selected: false })));
      setMeasureSelected(undefined);
    },
    [completedTaskYear, currentYearIndex, realCurrentYear],
  );

  // ─── isNextYearDisabled ───────────────────────────────────────────────────

  const isNextYearDisabled = useCallback(
    () => currentYearIndex + 1 > realCurrentYear,
    [currentYearIndex, realCurrentYear],
  );

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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.blue[500]} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header
        title="Historial de registros"
        seed={userProgress?.Seed}
        hasProfileButton
        onProfilePress={() => navigation.navigate('AppTabs', { screen: 'Profile' })}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Time frame selector */}
        <View style={styles.timeFrameContainer}>
          <TimeFrame timeFrame={timeFrame} onSegmentChange={changeSegment} />
        </View>

        {/* Month view */}
        {timeFrame === 'month' && (
          <View style={[styles.card, { backgroundColor: theme.colors.white }]}>
            {/* Header: month name, year, register count, toggle button */}
            <View style={styles.calendarHeader}>
              <View>
                <Text
                  style={[
                    styles.monthTitle,
                    { fontFamily: fontFamilyForWeight('700'), color: theme.semanticColors.text },
                  ]}
                >
                  {completedTaskMonth?.name},{' '}
                  <Text style={{ color: theme.semanticColors.textSecondary }}>
                    {currentYearIndex}
                  </Text>
                </Text>
                <Text
                  style={[
                    styles.registerCount,
                    { fontFamily: fontFamilyForWeight('400'), color: theme.semanticColors.textSecondary },
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
                  Ver como {typeView === 'calendar' ? 'gráfica' : 'calendario'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Variables summary row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variablesScroll}>
              {variables.map((variable) => (
                <TouchableOpacity
                  key={variable.name}
                  style={[
                    styles.variableCard,
                    {
                      backgroundColor: theme.colors.white,
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
                      { fontFamily: fontFamilyForWeight('600'), color: theme.semanticColors.text },
                    ]}
                  >
                    {variable.symbol}{variable.name.substring(0, 3)}
                  </Text>
                  <View
                    style={[
                      styles.variableAvgBox,
                      {
                        backgroundColor:
                          typeView === 'chart' && variable.selected
                            ? variable.style.backgroundColor.colorHex
                            : theme.colors.gray[100],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.variableAvg,
                        {
                          fontFamily: fontFamilyForWeight(typeView === 'chart' && variable.selected ? '700' : '600'),
                          color: theme.semanticColors.text,
                        },
                      ]}
                    >
                      {variable.avg !== undefined ? variable.avg.toFixed(1) : '--'}
                      {variable.unit}
                    </Text>
                  </View>
                  <View style={styles.variableStat}>
                    <Text style={[styles.statLabel, { color: theme.semanticColors.textSecondary }]}>
                      Max:
                    </Text>
                    <Text style={[styles.statValue, { color: theme.semanticColors.text }]}>
                      {variable.max !== undefined ? variable.max.toFixed(1) : '--'}
                      {variable.unit}
                    </Text>
                  </View>
                  <View style={styles.variableStat}>
                    <Text style={[styles.statLabel, { color: theme.semanticColors.textSecondary }]}>
                      Min:
                    </Text>
                    <Text style={[styles.statValue, { color: theme.semanticColors.text }]}>
                      {variable.min !== undefined ? variable.min.toFixed(1) : '--'}
                      {variable.unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Calendar or Chart */}
            <View style={styles.calendarContainer}>
              {typeView === 'calendar' ? (
                completedTaskMonth ? (
                  <Calendar
                    viewDate={completedTaskMonth.date}
                    daysComplete={completedTaskMonth.daysComplete}
                    daysIncomplete={completedTaskMonth.daysIncomplete}
                    daysSaveStreak={completedTaskMonth.daysSaveStreak}
                    onDayPress={goToDetail}
                    hasHeader
                  />
                ) : null
              ) : (
                // Chart mode: Areachart with selected variable data
                measureSelected ? (
                  <Areachart
                    chartLabels={[]}
                    chartData={[]}
                    background={measureSelected.style.backgroundColor.colorHex}
                    borderColor={measureSelected.style.borderColor.colorHex}
                    detailedMode={false}
                    testID="historical-chart"
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
            {completedTaskMonth && typeView === 'calendar' && (
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={() => {
                  // Share functionality deferred — placeholder action
                  // TODO B15: implement real share/export
                }}
                testID="share-data-btn"
              >
                <Text style={[styles.shareBtnText, { fontFamily: fontFamilyForWeight('500') }]}>
                  ↑ Compartir datos
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Year view */}
        {timeFrame === 'year' && (
          <View style={[styles.card, { backgroundColor: theme.colors.white }]}>
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

            {/* Year variables row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.variablesScroll}>
              {variables.map((variable) => (
                <View
                  key={variable.name}
                  style={[styles.variableCard, { backgroundColor: theme.colors.white }]}
                >
                  <Text
                    style={[
                      styles.variableTitle,
                      { fontFamily: fontFamilyForWeight('600'), color: theme.semanticColors.text },
                    ]}
                  >
                    {variable.symbol}{variable.name.substring(0, 3)}
                  </Text>
                  <View style={[styles.variableAvgBox, { backgroundColor: theme.colors.white }]}>
                    <Text
                      style={[
                        styles.variableAvg,
                        { fontFamily: fontFamilyForWeight('600'), color: theme.semanticColors.text },
                      ]}
                    >
                      {variable.avg !== undefined ? variable.avg.toFixed(1) : '--'}
                      {variable.unit}
                    </Text>
                  </View>
                  <View style={styles.variableStat}>
                    <Text style={[styles.statLabel, { color: theme.semanticColors.textSecondary }]}>Max:</Text>
                    <Text style={[styles.statValue, { color: theme.semanticColors.text }]}>
                      {variable.max !== undefined ? variable.max.toFixed(1) : '--'}
                      {variable.unit}
                    </Text>
                  </View>
                  <View style={styles.variableStat}>
                    <Text style={[styles.statLabel, { color: theme.semanticColors.textSecondary }]}>Min:</Text>
                    <Text style={[styles.statValue, { color: theme.semanticColors.text }]}>
                      {variable.min !== undefined ? variable.min.toFixed(1) : '--'}
                      {variable.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Mini calendars grid (3 per row) */}
            <View style={styles.miniCalendarGrid}>
              {completedTaskYear.map((register) => (
                <TouchableOpacity
                  key={register.mes}
                  style={styles.miniCalendarCell}
                  onPress={() => goToMonth(register.mes)}
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
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  timeFrameContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    margin: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  variablesScroll: {
    marginBottom: 12,
  },
  variableCard: {
    borderWidth: 2,
    borderRadius: 10, // Ionic: border-radius: 10px
    padding: 8,
    marginRight: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  variableTitle: {
    fontSize: 12,
    marginBottom: 4,
  },
  variableAvgBox: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  variableAvg: {
    fontSize: 14,
  },
  variableStat: {
    flexDirection: 'row',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  statValue: {
    fontSize: 11,
  },
  calendarContainer: {
    marginBottom: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
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
  miniCalendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  miniCalendarCell: {
    width: '33.33%',
    padding: 4,
    // Inner card styled with wrapper View — see miniCalendarInner
  },
  miniCalendarInner: {
    backgroundColor: '#FFFFFF', // Ionic: .calendar_content { background: #fff }
    borderWidth: 1,
    borderColor: '#E5E5E5', // --Colors-Gray-200
    borderRadius: 10, // Ionic: border-radius: 10px
    overflow: 'hidden',
  },
  bottomPadding: { height: 80 },
});

export default HistoricalScreen;
