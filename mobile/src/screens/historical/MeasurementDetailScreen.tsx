/**
 * B15 — MeasurementDetailScreen (full implementation)
 *
 * Ported from: src/app/pages/historical/measurement-detail/measurement-detail.page.ts + .html
 * Classification: Rewrite
 *
 * Preserved logic (portability-matrix §4.4):
 *   - isYesterday from date-fns
 *   - showAlert_incomplete: seed < 5
 *   - showAlert_complete_seed: shown after successful recoverStreak
 *   - Tasks loaded from ConfigContext; measurements from DataStore
 *   - groupRemainingLazyMeasurements: groups measurements by taskId
 *   - recoverStreak via GamificationService (cost: 5 seeds)
 *   - backRoute based on origin param ('home' | 'historical')
 *   - ConfirmModal content preserved literally from original modalContent
 *
 * Visual parity (measurement-detail.page.scss + global.scss):
 *   - Background: --Colors-Blue-50 = #EDFEFE
 *   - .date: Blue-900, 16px/700
 *   - .alert danger: red background, .highlight: Gray-700, 20px/600
 *   - .alert info: info background (blue-100)
 *   - .bth_recover: teal button, expand=block, margin-inline 10
 *   - Completed section: green check checkbox, task name, measurement sortName+value+unit
 *   - Incomplete section: unchecked checkbox, task name only
 *
 * Reference: docs/evidence/historical/screen-12 to screen-25
 *
 * Risks: R-32, R-12, R-15
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { isYesterday } from 'date-fns';
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

// ─── Modal content (preserved literally from original modalContent) ───────────
// Original: uses HTML with inline style — converted to string for RichText.

const MODAL_CONTENT = `
  <h2 style="color:#164551;text-align:center"> Recupera tu racha pagando: </h2>
  <p style="text-align:center;font-size:20px;font-weight:600"> <span>5</span> semillas</p>
  <p style="text-align:center"> ¿Quieres pagar 5 semillas para recuperar tu racha?</p>
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Groups remaining measurements by their associated tasks.
 * Preserved from original groupRemainingLazyMeasurements.
 */
function groupRemainingLazyMeasurements(
  tasksCompleted: TaskCompleted[],
  dataMeasurementCompleted: Array<{
    data?: string | Record<string, number> | null;
    task?: string | null;
  }>,
): Record<string, Array<{ id: string; value: number }>> {
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
    {} as Record<string, Array<{ id: string; value: number }>>,
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
  const { calendar: calendarParam, origin } = route.params;
  const selectedDate = new Date(calendarParam);
  const dayOfMonth = selectedDate.getDate();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState<number>(0);
  const [showAlertIncomplete, setShowAlertIncomplete] = useState(true);
  const [showAlertCompleteSeed, setShowAlertCompleteSeed] = useState(false);
  const [isYest, setIsYest] = useState(false);
  const [dayState, setDayState] = useState<DayState>('normal');
  const [dateFormatted, setDateFormatted] = useState<string>('');
  const [hasTaskComplete, setHasTaskComplete] = useState(false);
  const [tasksCompleted, setTasksCompleted] = useState<TaskCompleted[]>([]);
  const [tasksIncomplete, setTasksIncomplete] = useState<Task[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // ─── Date format (original: "EEEE d 'de' MMMM, yyyy" in es-ES locale) ─────
  const formatDate = useCallback((date: Date): string => {
    // date-fns es-ES: ej. "martes 2 de mayo, 2026"
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // ─── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      setLoading(true);
      try {
        // Load user progress (R-28: pure read)
        const progress = await UserProgressDSService.getLastUserProgressPure();
        if (mounted && progress) {
          const seedValue = progress.Seed ?? 0;
          setSeed(seedValue);
          setShowAlertIncomplete(seedValue < 5);
        }

        // Determine if yesterday
        const isYesterdayDate = isYesterday(selectedDate);
        if (mounted) {
          setIsYest(isYesterdayDate);
          setDateFormatted(formatDate(selectedDate));
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
        const groupLazy = groupRemainingLazyMeasurements([], dataMeasurementCompleted as Array<{ data?: string | Record<string, number> | null; task?: string | null }>);
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

  const handleRecoverStreak = useCallback(async () => {
    setModalVisible(false);
    const success = await GamificationService.recoverStreak();
    if (success) {
      setDayState('complete');
      setShowAlertCompleteSeed(true);
    }
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: '#EDFEFE' }]}>
        <ActivityIndicator color={theme.colors.blue[500]} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#EDFEFE' }]}>
      <Header
        title="Historial de registros"
        seed={seed}
        hasBackButton
        onBackPress={() => navigation.goBack()}
      />

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

        {/* Completed tasks */}
        {hasTaskComplete && tasksCompleted.length > 0 && (
          <View style={styles.measurementSection}>
            <Text
              style={[
                styles.sectionTitle,
                { fontFamily: fontFamilyForWeight('600'), color: theme.colors.blue[900] },
              ]}
            >
              Registros completados
            </Text>

            {tasksCompleted.map((task, idx) => (
              <View key={`${task.id}-${idx}`} style={[styles.taskCard, { backgroundColor: theme.colors.white, borderColor: theme.colors.gray[200] }]}>
                <View style={styles.taskHeader}>
                  {/* Original: ion-checkbox checked color=uva_blue-500 */}
                  <View style={[styles.checkbox, styles.checkboxChecked, { backgroundColor: theme.colors.blue[500] }]}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                  <Text
                    style={[
                      styles.taskName,
                      { fontFamily: fontFamilyForWeight('500'), color: theme.colors.blue[900] },
                    ]}
                  >
                    {task.name}
                  </Text>
                </View>

                {/* Measurement values */}
                <View style={styles.measurementValues}>
                  {task.measurements.map((item, mIdx) => (
                    <View key={`${item.id}-${mIdx}`} style={styles.measurementValue}>
                      {/* Original: [innerHTML]="item.sortName | safeHtml" */}
                      <RichText
                        html={item.sortName ?? ''}
                        baseFontSize={13}
                        baseColor={theme.semanticColors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.valueText,
                          { fontFamily: fontFamilyForWeight('600'), color: theme.colors.blue[900] },
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

        {/* Incomplete tasks */}
        {tasksIncomplete.length > 0 && (
          <View style={styles.measurementSection}>
            <Text
              style={[
                styles.sectionTitle,
                { fontFamily: fontFamilyForWeight('600'), color: theme.colors.blue[900] },
              ]}
            >
              Registros sin completar
            </Text>

            {tasksIncomplete.map((task, idx) => (
              <View key={`inc-${task.id ?? idx}`} style={[styles.taskCard, { backgroundColor: theme.colors.white, borderColor: theme.colors.gray[200] }]}>
                <View style={styles.taskHeader}>
                  {/* Original: ion-checkbox disabled (unchecked) */}
                  <View style={[styles.checkbox, { borderColor: theme.colors.gray[400] }]} />
                  <Text
                    style={[
                      styles.taskName,
                      { fontFamily: fontFamilyForWeight('500'), color: theme.colors.gray[600] },
                    ]}
                  >
                    {task.name}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Alert: insufficient seeds — shown when isYesterday + incomplete */}
        {showAlertIncomplete && isYest && dayState === 'incomplete' && (
          <View style={[styles.alert, styles.alertDanger]}>
            <Text style={[styles.alertText, { fontFamily: fontFamilyForWeight('400') }]}>
              {'No tienes suficientes semillas para recuperar tu racha😒, necesitas: '}
              <Text
                style={[
                  styles.alertHighlight,
                  {
                    // Original: .alert .highlight { color: var(--Gray-700, #404040); 20px/600 }
                    fontFamily: fontFamilyForWeight('600'),
                    color: theme.colors.gray[700],
                  },
                ]}
              >
                {'5 🌱'}
              </Text>
            </Text>
          </View>
        )}

        {/* Alert: day completed with seeds */}
        {showAlertCompleteSeed && (
          <View style={[styles.alert, styles.alertInfo, { backgroundColor: theme.colors.blue[100] }]}>
            <Text style={[styles.alertText, { fontFamily: fontFamilyForWeight('400'), color: theme.colors.blue[900] }]}>
              Día completado con semillas
            </Text>
          </View>
        )}

        {/* Button: Recover streak — only when isYesterday + incomplete + seeds >= 5 */}
        {dayState === 'incomplete' && isYest && !showAlertIncomplete && (
          <TouchableOpacity
            style={[styles.recoverBtn, { backgroundColor: theme.colors.orange[500] }]}
            onPress={() => setModalVisible(true)}
            testID="recover-streak-btn"
          >
            <Text style={[styles.recoverBtnText, { fontFamily: fontFamilyForWeight('500') }]}>
              Recupera tu racha 🔥
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Confirm modal for streak recovery */}
      <ConfirmModal
        visible={modalVisible}
        content={MODAL_CONTENT}
        textCancelButton="omitir"
        textOkButton="Pagar"
        reverseButton
        bordersInCancelBtn={false}
        colorBtn="primary"
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },

  // Header section: Day circle + date text
  // Original: .header { display: flex; padding: 10px; flex-direction: column; gap: 10px; text-align: center }
  headerSection: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  dayWrapper: {
    alignItems: 'center',
  },
  dateText: {
    // Original: .date { color: var(--Colors-Blue-900); 16px/700; line-height: 150% }
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },

  measurementSection: {
    marginHorizontal: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    // Original: .measurement_complete .title / .measurement_incomplete .title
    fontSize: 14,
    marginBottom: 8,
    marginTop: 4,
  },

  taskCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderWidth: 0,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  taskName: {
    fontSize: 14,
    flex: 1,
  },

  measurementValues: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  measurementValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FFFE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  valueText: {
    fontSize: 14,
  },

  // Alerts
  // Original: global.scss .alert { ... } .alert.danger { ... }
  alert: {
    marginHorizontal: 10,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
  },
  alertDanger: {
    backgroundColor: '#FEE2E2', // red-100 equivalent
    borderLeftWidth: 4,
    borderLeftColor: '#E5245E', // --Colors-Danger
  },
  alertInfo: {
    borderLeftWidth: 4,
    borderLeftColor: '#10BCCA',
  },
  alertText: {
    fontSize: 14,
    color: '#374151',
  },
  alertHighlight: {
    // Original: .alert .highlight { 20px/600; color: #404040 }
    fontSize: 20,
  },

  // Recover streak button
  // Original: .bth_recover { margin-inline: 10px }; ion-button expand="block" color="uva_orange-500"
  recoverBtn: {
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoverBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
  },

  bottomPadding: { height: 80 },
});

export default MeasurementDetailScreen;
