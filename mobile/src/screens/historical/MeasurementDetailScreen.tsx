/**
 * B15 — MeasurementDetailScreen (full implementation)
 *
 * Ported from: src/app/pages/historical/measurement-detail/measurement-detail.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic (portability-matrix §4.4):
 *   - isYesterday from date-fns
 *   - dateFormatted: date-fns format("EEEE d 'de' MMMM, yyyy") with es locale
 *     (NOT Intl/toLocaleDateString — Hermes' partial Intl truncated the year)
 *   - showAlert_incomplete: seed < 5; alert shown when isYesterday (original has
 *     no day-state condition on the danger alert)
 *   - showAlert_complete_seed: shown after recoverStreak (original sets it
 *     unconditionally after awaiting recoverStreak; errors only logged)
 *   - Tasks loaded from ConfigContext; measurements from DataStore
 *   - groupRemainingLazyMeasurements: groups measurements by taskId (exported
 *     for unit tests)
 *   - recoverStreak via GamificationService (cost: 5 seeds)
 *   - Header: hasBackButton=true, hasProfileButton=false (original passes
 *     [hasProfileButton]="false"); back → navigation.goBack()
 *   - ConfirmModal colorBtn 'uva_blue-600' (original openModal componentProps)
 *
 * Visual parity (measurement-detail.page.scss + global.scss .measurement/.alert):
 *   - Background: --Colors-Blue-50
 *   - .header: padding 10, column, gap 10, centered; .date: Blue-900 16/700 lh150%
 *   - .measurement: padding 10; .title: 16/700 Blue-800 lh150%
 *   - .measurement_complete: bg Green-100, border 1 Green-200, radius 16,
 *     padding 10, gap 10, margin-bottom 10
 *   - .measurement_incomplete: same box, bg White
 *   - .measurement_result: bg Gray-50, radius 16, padding 10, gap 10
 *   - .measurement_result_title: row, gap 10, Gray-700 14/500 lh150%, ion-checkbox 18px
 *   - .measurement_result_value_content: row wrap, gap 10px 35px, width 300
 *   - .measurement_result_value: column, height 48; value: Blue-800 18/600,
 *     align-self start; label: sortName HTML (own colors), base 14 Gray-700
 *   - global .alert: column centered, padding 10/16, gap 20, radius 14, margin 10;
 *     .danger: bg Orange-100, border Orange-400, text Gray-700;
 *     .info: bg Blue-100, border Blue-300, text Blue-800;
 *     .highlight: Gray-700 20/600 + semilla icon
 *   - .bth_recover: ion-button block uva_orange-500, margin-inline 10 + fire icon
 *
 * Reference: docs/evidence/historical/screen-12 to screen-25
 *
 * Risks: R-32, R-12, R-15
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { format, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/navigation/types';
import { Header } from '@/components/header/Header';
import { Day } from '@/components/ui/Day';
import { RichText } from '@/components/rich-text/RichText';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

import { UserProgressDSService } from '@/data/datastore/user-progress-ds';
import { MeasurementDSService } from '@/data/datastore/measurement-ds';
import { GamificationService } from '@/domain/gamification/gamification';

import SemillaIcon from '@/assets/svg/icons/semilla.svg';
import FireIcon from '@/assets/svg/icons/fire.svg';

import type { Task, Measurement } from '@/data/models/configuration/measurements.model';
import type { DayState } from '@/components/ui/Day';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AppStackParamList, 'MeasurementDetail'>;

interface MeasurementWithValue extends Measurement {
  id: string;
  value: number;
}

interface TaskCompleted extends Task {
  id: string;
  measurements: MeasurementWithValue[];
}

// ─── Modal content (preserved from original modalContent) ─────────────────────
// Original: uses HTML with inline style — converted to string for RichText.

const MODAL_CONTENT = `
  <h2 style="color:#164551;text-align:center"> Recupera tu racha pagando: </h2>
  <p style="text-align:center;font-size:20px;font-weight:600"> <span>5</span> semillas</p>
  <p style="text-align:center"> ¿Quieres pagar 5 semillas para recuperar tu racha?</p>
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Lazy DataStore measurement row shape consumed by the grouping helper.
 * Mirrors the fields used from the original LazyMeasurement model.
 */
export interface LazyMeasurementRow {
  data?: string | Record<string, number> | null;
  task?: string | null;
}

/**
 * Groups remaining measurements by their associated tasks.
 * Preserved from original groupRemainingLazyMeasurements
 * (measurement-detail.page.ts). Exported for unit tests (value mapping).
 */
export function groupRemainingLazyMeasurements(
  tasksCompleted: TaskCompleted[],
  dataMeasurementCompleted: LazyMeasurementRow[],
): Record<string, { id: string; value: number }[]> {
  const existingMeasurementIds = tasksCompleted.flatMap((task) =>
    task.measurements.map((m) => m.id),
  );

  const remainingMeasurements = dataMeasurementCompleted.filter((lazy) => {
    if (!lazy.data) return false;
    const parsedData =
      typeof lazy.data === 'string'
        ? (JSON.parse(lazy.data) as Record<string, string | number> | null)
        : lazy.data;
    if (!parsedData) return false;
    const measurementIds = Object.keys(parsedData);
    return measurementIds.some((id) => !existingMeasurementIds.includes(id));
  });

  return remainingMeasurements.reduce(
    (acc, lazy) => {
      const taskId = lazy.task ?? 'unknown';
      if (!acc[taskId]) acc[taskId] = [];
      const parsedData =
        typeof lazy.data === 'string'
          ? (JSON.parse(lazy.data) as Record<string, string | number> | null)
          : lazy.data;
      if (!parsedData) return acc;
      const entries = Object.entries(parsedData).map(([key, value]) => ({
        id: key,
        value: parseFloat(String(value)),
      }));
      acc[taskId].push(...entries);
      return acc;
    },
    {} as Record<string, { id: string; value: number }[]>,
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MeasurementDetailScreen
 *
 * Displays details of measurements for a selected day.
 * Shows completed/incomplete tasks, streak alerts, and recovery option.
 *
 * Params:
 *   - calendar: ISO string of the selected day
 *   - origin: 'historical' | 'home'
 */
export function MeasurementDetailScreen({ route }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { getConfigurationMeasurement, countTasks } = useConfigContext();

  // ─── Route params ──────────────────────────────────────────────────────────
  const { calendar: calendarParam } = route.params;
  const selectedDate = useMemo(() => new Date(calendarParam), [calendarParam]);
  const dayOfMonth = selectedDate.getDate();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [showAlertIncomplete, setShowAlertIncomplete] = useState(true);
  const [showAlertCompleteSeed, setShowAlertCompleteSeed] = useState(false);
  const [isYest, setIsYest] = useState(false);
  const [dayState, setDayState] = useState<DayState>('normal');
  const [hasTaskComplete, setHasTaskComplete] = useState(false);
  const [tasksCompleted, setTasksCompleted] = useState<TaskCompleted[]>([]);
  const [tasksIncomplete, setTasksIncomplete] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // ─── Date format ───────────────────────────────────────────────────────────
  // Original: format(new Date(date), "EEEE d 'de' MMMM, yyyy") with
  // setDefaultOptions({ locale: es }) → e.g. "sábado 2 de mayo, 2026".
  const dateFormatted = useMemo(
    () => format(selectedDate, "EEEE d 'de' MMMM, yyyy", { locale: es }),
    [selectedDate],
  );

  // ─── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      setLoading(true);
      try {
        // Load user progress (R-28: pure read)
        const progress = await UserProgressDSService.getLastUserProgressPure();
        if (mounted && progress) {
          // Original: showAlert_incomplete = userProgress.Seed < 5 (when Seed set)
          setShowAlertIncomplete((progress.Seed ?? 0) < 5);
        }

        // Determine if yesterday
        if (mounted) {
          setIsYest(isYesterday(selectedDate));
        }

        // Load measurements for this day
        await loadTasksAndMeasurements(selectedDate, mounted);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadAll();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarParam]);

  const loadTasksAndMeasurements = useCallback(
    async (date: Date, mounted: boolean) => {
      try {
        const dataMeasurementCompleted = await MeasurementDSService.getMeasurementsByDay(
          date.getFullYear(),
          date.getMonth() + 1,
          date.getDate(),
        );

        const configMeasurement = await getConfigurationMeasurement();
        if (!configMeasurement || !mounted) return;

        // Build tasks list from config
        const keysTask = Object.keys(configMeasurement.tasks);
        const allTasks: Task[] = keysTask.map((key) => ({
          ...configMeasurement.tasks[key],
          id: key,
        }));

        if (!dataMeasurementCompleted.length) {
          if (mounted) {
            setHasTaskComplete(false);
            setTasksCompleted([]);
            setTasksIncomplete(allTasks);
            setDayState('normal');
          }
          return;
        }

        if (mounted) setHasTaskComplete(true);

        // Group measurements by task
        const groupLazy = groupRemainingLazyMeasurements(
          [],
          dataMeasurementCompleted as LazyMeasurementRow[],
        );
        const keysGrouped = Object.keys(groupLazy);

        const completed: TaskCompleted[] = [];
        for (const taskId of keysGrouped) {
          const task = allTasks.find((t) => t.id === taskId);
          if (!task) continue;

          const dataTask: TaskCompleted = { ...task, id: taskId, measurements: [] };
          for (const { id, value } of groupLazy[taskId]) {
            const measurementData = configMeasurement.measurements[id];
            if (measurementData) {
              dataTask.measurements.push({ ...measurementData, id, value });
            }
          }
          completed.push(dataTask);
        }

        // Remaining incomplete tasks
        const completedIds = new Set(completed.map((t) => t.id));
        const incomplete = allTasks.filter((t) => !completedIds.has(t.id ?? ''));

        // Determine day state: if all tasks complete → 'complete', else 'incomplete'
        const totalTasks = countTasks(configMeasurement);
        const newState: DayState = completed.length >= totalTasks ? 'complete' : 'incomplete';

        if (mounted) {
          setTasksCompleted(completed);
          setTasksIncomplete(incomplete);
          setDayState(newState);
        }
      } catch (err) {
        console.error('[MeasurementDetail] Error loading tasks:', err);
      }
    },
    [getConfigurationMeasurement, countTasks],
  );

  // ─── Recover streak ────────────────────────────────────────────────────────
  // Original onDidDismiss('OK'): await recoverStreak() → state 'complete' +
  // showAlert_complete_seed (errors only logged by the promise .catch).

  const handleRecoverStreak = useCallback(async () => {
    setModalVisible(false);
    try {
      await GamificationService.recoverStreak();
      setDayState('complete');
      setShowAlertCompleteSeed(true);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.blue[50] }]}>
      <Header
        title="Historial de registros"
        hasBackButton
        hasProfileButton={false}
        onBackPress={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.blue[500]} size="large" />
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header section: Day circle + formatted date */}
          <View style={styles.headerSection}>
            <View style={styles.dayWrapper}>
              <Day day={dayOfMonth} state={dayState} />
            </View>
            <Text
              style={[
                styles.dateText,
                {
                  fontFamily: fontFamilyForWeight('700'),
                  // Original: .date { color: var(--Colors-Blue-900) }
                  color: theme.colors.blue[900],
                },
              ]}
            >
              {dateFormatted}
            </Text>
          </View>

          {/* .measurement wrapper (global.scss: padding 10) */}
          <View style={styles.measurementWrapper}>
            {/* Completed tasks — .measurement_complete (green container) */}
            {hasTaskComplete && tasksCompleted.length > 0 && (
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: theme.colors.green[100],
                    borderColor: theme.colors.green[200],
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[800] },
                  ]}
                >
                  Registros completados
                </Text>

                {tasksCompleted.map((task, idx) => (
                  <View
                    key={`${task.id}-${idx}`}
                    style={[styles.taskCard, { backgroundColor: theme.colors.gray[50] }]}
                  >
                    <View style={styles.taskHeader}>
                      {/* Original: ion-checkbox checked color=uva_blue-500 disabled */}
                      <View
                        style={[
                          styles.checkbox,
                          styles.checkboxChecked,
                          { backgroundColor: theme.colors.blue[500] },
                        ]}
                      >
                        <Text style={styles.checkmark}>✓</Text>
                      </View>
                      <Text
                        style={[
                          styles.taskName,
                          { fontFamily: fontFamilyForWeight('500'), color: theme.colors.gray[700] },
                        ]}
                      >
                        {task.name}
                      </Text>
                    </View>

                    {/* .measurement_result_value_content: 2-col grid (gap 10x35, width 300) */}
                    <View style={styles.valueContent}>
                      {task.measurements.map((item, mIdx) => (
                        <View key={`${item.id}-${mIdx}`} style={styles.valueCol}>
                          {/* Original: [innerHTML]="item.sortName | safeHtml" */}
                          <RichText
                            html={item.sortName ?? ''}
                            inline
                            baseFontSize={14}
                            baseColor={theme.colors.gray[700]}
                          />
                          <Text
                            style={[
                              styles.valueText,
                              { fontFamily: fontFamilyForWeight('600'), color: theme.colors.blue[800] },
                            ]}
                          >
                            {item.value}
                            {item.unit}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Incomplete tasks — .measurement_incomplete (white container) */}
            {tasksIncomplete.length > 0 && (
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.white }]}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[800] },
                  ]}
                >
                  Registros sin completar
                </Text>

                {tasksIncomplete.map((task, idx) => (
                  <View
                    key={`inc-${task.id ?? idx}`}
                    style={[styles.taskCard, { backgroundColor: theme.colors.gray[50] }]}
                  >
                    <View style={styles.taskHeader}>
                      {/* Original: ion-checkbox disabled (unchecked) */}
                      <View style={[styles.checkbox, { borderColor: theme.colors.gray[400] }]} />
                      <Text
                        style={[
                          styles.taskName,
                          { fontFamily: fontFamilyForWeight('500'), color: theme.colors.gray[700] },
                        ]}
                      >
                        {task.name}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Alert: insufficient seeds — original: showAlert_incomplete && isYesterday */}
          {showAlertIncomplete && isYest && (
            <View
              style={[
                styles.alert,
                {
                  backgroundColor: theme.colors.orange[100],
                  borderColor: theme.colors.orange[400],
                },
              ]}
            >
              <Text
                style={[
                  styles.alertText,
                  { fontFamily: fontFamilyForWeight('500'), color: theme.colors.gray[700] },
                ]}
              >
                {'No tienes suficientes semillas para recuperar tu racha😒, necesitas: '}
                <Text
                  style={[
                    styles.alertHighlight,
                    {
                      // Original: .alert .highlight { color: var(--Gray-700); 20px/600 }
                      fontFamily: fontFamilyForWeight('600'),
                      color: theme.colors.gray[700],
                    },
                  ]}
                >
                  5
                </Text>
                <SemillaIcon width={18} height={24} />
              </Text>
            </View>
          )}

          {/* Alert: day completed with seeds — global .alert.info */}
          {showAlertCompleteSeed && (
            <View
              style={[
                styles.alert,
                {
                  backgroundColor: theme.colors.blue[100],
                  borderColor: theme.colors.blue[300],
                },
              ]}
            >
              <Text
                style={[
                  styles.alertText,
                  { fontFamily: fontFamilyForWeight('500'), color: theme.colors.blue[800] },
                ]}
              >
                Día completado con semillas
              </Text>
            </View>
          )}

          {/* Button: Recover streak — only when incomplete + yesterday + seeds >= 5 */}
          {dayState === 'incomplete' && isYest && !showAlertIncomplete && (
            <TouchableOpacity
              style={[styles.recoverBtn, { backgroundColor: theme.colors.orange[500] }]}
              onPress={() => setModalVisible(true)}
              testID="recover-streak-btn"
            >
              <Text style={[styles.recoverBtnText, { fontFamily: fontFamilyForWeight('500') }]}>
                Recupera tu racha
              </Text>
              <FireIcon width={20} height={20} />
            </TouchableOpacity>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Confirm modal for streak recovery (original colorBtn: 'uva_blue-600') */}
      <ConfirmModal
        visible={modalVisible}
        content={MODAL_CONTENT}
        textCancelButton="omitir"
        textOkButton="Pagar"
        reverseButton
        bordersInCancelBtn={false}
        colorBtn="uva_blue-600"
        onResult={(result) => {
          if (result === 'OK') {
            void handleRecoverStreak();
          } else {
            setModalVisible(false);
          }
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
// Numeric values mirror theme tokens: radius['4xl']=16, radius['3xl']=14,
// spacing.md=10, spacing.lg=16 (mobile/src/theme/theme.ts).

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },

  // Original .header: { display:flex; padding:10px; column; gap:10px; text-align:center }
  headerSection: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 10, // spacing.md
    gap: 10,
  },
  dayWrapper: {
    alignItems: 'center',
  },
  dateText: {
    // Original .date: 16px/700, line-height 150%
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },

  // global .measurement { padding: 10px }
  measurementWrapper: {
    padding: 10, // spacing.md
  },

  // %measurment: column, padding 10, gap 10, radius 16, margin-bottom 10
  sectionCard: {
    flexDirection: 'column',
    padding: 10, // spacing.md
    gap: 10,
    borderRadius: 16, // radius['4xl']
    width: '100%',
    marginBottom: 10,
  },
  // .measurement .title: 16/700 Blue-800, line-height 150%
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
  },

  // .measurement_result: bg Gray-50, radius 16, padding 10, gap 10
  taskCard: {
    borderRadius: 16, // radius['4xl']
    padding: 10,
    gap: 10,
  },
  // .measurement_result_title: row, gap 10
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // ion-checkbox md: 18x18, border-radius 2, border 2 (unchecked);
  // disabled blend over Gray-50 measured #67D3DC on evidence → opacity 0.63
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderWidth: 0,
    opacity: 0.63,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // .measurement_result_title: Gray-700 14/500 lh 150%
  taskName: {
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },

  // .measurement_result_value_content: row wrap, gap 10px 35px, width 300
  valueContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 35,
    width: 300,
  },
  // .measurement_result_value: column, height 48, align-items center
  valueCol: {
    flexDirection: 'column',
    height: 48,
    alignItems: 'center',
  },
  // .measurement_result_value_value: Blue-800 18/600 lh150%, align-self start
  valueText: {
    fontSize: 18,
    lineHeight: 27,
    alignSelf: 'flex-start',
  },

  // global .alert: column centered, padding 10/16, gap 20, radius 14, margin 10, border 1
  alert: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    paddingVertical: 10,
    paddingHorizontal: 16, // spacing.lg (--4xl)
    gap: 20,
    borderRadius: 14, // radius['3xl']
    borderWidth: 1,
  },
  // .alert p: 16/500
  alertText: {
    fontSize: 16,
  },
  // .alert .highlight: 20/600
  alertHighlight: {
    fontSize: 20,
  },

  // .bth_recover { margin-inline: 10px }; ion-button expand="block" uva_orange-500
  recoverBtn: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recoverBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  bottomPadding: { height: 24 },
});

export default MeasurementDetailScreen;
