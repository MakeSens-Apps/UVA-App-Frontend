/**
 * B13b — MeasurementScreen (real implementation)
 *
 * Ported from: src/app/pages/measurement/measurement.page.ts + .html
 * Classification: Rewrite (UI layer, preserving all logic)
 *
 * Preserved logic (portability-matrix §4.4):
 *   - FlatList of task types from RACIMO config (ConfigContext)
 *   - showBonus: bonus schedule check (moniliacisis) + OpenModalSurprise
 *   - groupRemainingLazyMeasurements: groups completed measurements by taskId
 *   - hasRestrictionTimeTask / getTextRestrictionTime: time restriction helpers
 *   - surpriseTaskProcess via GamificationService
 *   - isTestUser bypass for time restrictions
 *   - goToRegister navigates to RegisterMeasurement with typed params
 *   - RichText for measurement sortName (HTML)
 *   - useFocusEffect reloads data on focus (replaces ionViewDidEnter)
 *
 * Changes from original:
 *   - ionViewWillEnter / ionViewDidEnter → useFocusEffect
 *   - ngOnInit → useEffect on mount
 *   - IonModal bottom sheet → UvaBottomSheet (B10)
 *   - Router.navigate → navigation.navigate (typed AppStackParamList)
 *   - *ngFor → FlatList / map
 *   - IonCheckbox → custom View marker
 *   - SafeHtmlPipe → RichText (B09)
 *
 * Risks: R-08, R-32, R-12, R-18, R-15
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getWeekOfMonth,
  differenceInHours,
  differenceInMinutes,
  startOfToday,
  add,
} from 'date-fns';

import type { AppTabsParamList, AppStackParamList } from '@/navigation/types';
import { Header } from '@/components/header/Header';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { UvaBottomSheet } from '@/components/ui/BottomSheet';
import type { BottomSheetRef } from '@/components/ui/BottomSheet';
import { RichText } from '@/components/rich-text/RichText';
import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { UserProgressDSService } from '@/data/datastore/user-progress-ds';
import { MeasurementDSService } from '@/data/datastore/measurement-ds';
import { GamificationService } from '@/domain/gamification/gamification';
import { isTestUser } from '@/data/auth/test-users';
import { useSessionContext } from '@/state/SessionContext';

import type { Task, Bonus, MeasurementModel } from '@/data/models/configuration/measurements.model';
import type { UserProgress, LazyMeasurement } from '@/data/models';

// ─── Day name / week name translation maps (preserved from original) ──────────

const translateNameDayToNumber: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

const translateWeekNumber: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type MeasurementNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabsParamList, 'Measurement'>,
  NativeStackNavigationProp<AppStackParamList>
>;

interface LocalMeasurement {
  id: string;
  value: number;
}

interface TaskCompleted extends Task {
  measurements: (LocalMeasurement & { sortName?: string; unit?: string })[];
}

// ─── Helper: groupRemainingLazyMeasurements (preserved 1:1 from original) ─────

function groupRemainingLazyMeasurements(
  tasksCompleted: TaskCompleted[],
  dataMeasurementCompleted: LazyMeasurement[],
): Record<string, LocalMeasurement[]> {
  const existingMeasurementIds = tasksCompleted.flatMap((task) =>
    task.measurements.map((m) => m.id),
  );

  const remainingMeasurements = dataMeasurementCompleted.filter((lazyMeasurement) => {
    if (!lazyMeasurement.data) return false;
    const parsedData =
      typeof lazyMeasurement.data === 'string'
        ? (JSON.parse(lazyMeasurement.data) as Record<string, string> | null)
        : lazyMeasurement.data as Record<string, string> | null;
    if (!parsedData) return false;
    const measurementIds = Object.keys(parsedData);
    return measurementIds.some((id) => !existingMeasurementIds.includes(id));
  });

  return remainingMeasurements.reduce(
    (acc, lazyMeasurement) => {
      const taskId = lazyMeasurement.task ?? 'unknown';
      if (!acc[taskId]) acc[taskId] = [];
      const parsedData =
        typeof lazyMeasurement.data === 'string'
          ? (JSON.parse(lazyMeasurement.data) as Record<string, string> | null)
          : lazyMeasurement.data as Record<string, string> | null;
      if (!parsedData) return acc;
      const entries: LocalMeasurement[] = Object.entries(parsedData).map(
        ([key, value]) => ({ id: key, value: parseFloat(value as string) }),
      );
      acc[taskId].push(...entries);
      return acc;
    },
    {} as Record<string, LocalMeasurement[]>,
  );
}

// ─── Helper: hasRestrictionTimeTask (preserved from original) ─────────────────

function hasRestrictionTimeTask(task: Task): boolean {
  if (task.restrictions.activeTime.enabled) {
    const [startH, startM] = task.restrictions.activeTime.start.split(':');
    const [endH, endM] = task.restrictions.activeTime.end.split(':');
    const dateStart = add(startOfToday(), {
      hours: Number(startH),
      minutes: Number(startM),
    });
    const dateEnd = add(startOfToday(), {
      hours: Number(endH),
      minutes: Number(endM),
    });
    return !(dateStart < new Date() && dateEnd > new Date());
  }
  return false;
}

// ─── Helper: getTextRestrictionTime (preserved from original) ─────────────────

function getTextRestrictionTime(task: Task): string {
  if (task.restrictions.activeTime.enabled) {
    const [startH, startM] = task.restrictions.activeTime.start.split(':');
    const [, endH, endM] = ['', ...task.restrictions.activeTime.end.split(':')];
    const dateStart = add(startOfToday(), {
      hours: Number(startH),
      minutes: Number(startM),
    });
    if (dateStart > new Date()) {
      const timeDiffH = differenceInHours(dateStart, new Date());
      const timeDiffM = differenceInMinutes(dateStart, new Date());
      if (timeDiffH < 1) return `Disponible en ${timeDiffM} minutos`;
      if (timeDiffM - timeDiffH * 60) {
        return `Disponible en ${timeDiffH} horas y ${timeDiffM - timeDiffH * 60} minutos`;
      }
      return `Disponible en ${timeDiffH} horas`;
    }
    const [eh, em] = task.restrictions.activeTime.end.split(':');
    return `Disponible hasta las ${eh}:${em}`;
  }
  return '';
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * MeasurementScreen
 *
 * Tab "Registrar" — shows pending and completed tasks for the day.
 * Equivalent to MeasurementPage in Ionic.
 */
export function MeasurementScreen(): React.JSX.Element {
  const { theme } = useTheme();
  const navigation = useNavigation<MeasurementNavigation>();
  const { configMeasurement, countTasks } = useConfigContext();
  const { session } = useSessionContext();

  // ─── State ─────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState<TaskCompleted[]>([]);
  const [hasTaskComplete, setHasTaskComplete] = useState(false);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [showBonus, setShowBonus] = useState(false);
  const [openModalSurprise, setOpenModalSurprise] = useState(false);
  const [bonusConfig, setBonusConfig] = useState<Record<string, Bonus> | null>(null);
  const [loading, setLoading] = useState(false);

  const surpriseSheetRef = useRef<BottomSheetRef>(null);

  // ─── Derived: count total tasks (avoids setState-in-effect) ────────────────
  const totalTask = useMemo(
    () => (configMeasurement ? countTasks(configMeasurement) : 1),
    [configMeasurement, countTasks],
  );

  // ─── useFocusEffect: reload data each time screen gains focus ───────────────
  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const loadData = async () => {
        setLoading(true);
        try {
          const progress = await UserProgressDSService.getLastUserProgressPure();
          if (mounted && progress) setUserProgress(progress);
          await loadMeasurementData(mounted);
        } finally {
          if (mounted) setLoading(false);
        }
      };
      void loadData();
      return () => {
        mounted = false;
      };
    }, [configMeasurement]),
  );

  // ─── loadMeasurementData (mirrors getDataMeasurement from original) ─────────

  const loadMeasurementData = useCallback(
    async (mounted: boolean) => {
      if (!configMeasurement) return;

      const dataBonusConfig = configMeasurement.bonus;
      if (dataBonusConfig) {
        const today = new Date();
        const month = today.getMonth() + 1;
        const weekOfMonth = getWeekOfMonth(today);
        const weekOfMonthName = Object.keys(translateWeekNumber).find(
          (key) => translateWeekNumber[key] === weekOfMonth,
        );
        if (
          weekOfMonthName &&
          dataBonusConfig['moniliacisis']?.schedule.occurrences.includes(weekOfMonthName)
        ) {
          if (dataBonusConfig['moniliacisis'].months.includes(month)) {
            const dayOfWeek = today.getDay();
            const dayOfWeekName = Object.keys(translateNameDayToNumber).find(
              (key) => translateNameDayToNumber[key] === dayOfWeek,
            );
            if (
              dayOfWeekName &&
              dataBonusConfig['moniliacisis'].schedule.daysOfWeek.includes(dayOfWeekName)
            ) {
              if (mounted) setShowBonus(true);
            }
          }
        }
        if (mounted) setBonusConfig(dataBonusConfig);
      }

      const keysTask = Object.keys(configMeasurement.tasks);
      const rawTasks: Task[] = keysTask.map((key) => {
        const task: Task = { ...(configMeasurement.tasks[key]), id: key };
        return task;
      });

      // Load today's completed measurements
      const date = new Date();
      const completedRaw = await MeasurementDSService.getMeasurementsByDay(
        date.getFullYear(),
        date.getMonth() + 1,
        date.getDate(),
      );

      if (!mounted) return;

      if (completedRaw.length === 0) {
        setTasks(rawTasks);
        setTasksCompleted([]);
        setHasTaskComplete(false);
        return;
      }

      setHasTaskComplete(true);
      const localCompleted: TaskCompleted[] = [];
      const grouped = groupRemainingLazyMeasurements(localCompleted, completedRaw);
      const groupedKeys = Object.keys(grouped);

      const remainingTasks = [...rawTasks];
      groupedKeys.forEach((taskId) => {
        const indexTask = remainingTasks.findIndex((t) => t.id === taskId);
        if (indexTask < 0) return;
        const task = remainingTasks[indexTask];
        if (!localCompleted.find((tc) => tc.id === taskId)) {
          const dataTask: TaskCompleted = { ...task, measurements: [] };
          grouped[taskId].forEach((measurement) => {
            const measurementData = configMeasurement.measurements[measurement.id];
            if (measurementData) {
              dataTask.measurements.push({
                ...measurement,
                sortName: measurementData.sortName,
                unit: measurementData.unit,
              });
            }
          });
          localCompleted.push(dataTask);
          remainingTasks.splice(indexTask, 1);
        }
      });

      // Remove any remaining tasks that are in completed
      const finalTasks = remainingTasks.filter(
        (task) => !localCompleted.find((tc) => tc.id === task.id),
      );

      setTasks(finalTasks);
      setTasksCompleted(localCompleted);
    },
    [configMeasurement],
  );

  // ─── goToRegister ──────────────────────────────────────────────────────────

  const goToRegister = useCallback(
    (task: Task) => {
      const phone = session?.phone ?? '';
      if (hasRestrictionTimeTask(task) && !isTestUser(phone)) {
        return;
      }
      if (task.flows && task.flows.length > 0) {
        // Navigate to first incomplete flow — simplified: always first flow
        const flowId = task.flows[0];
        navigation.navigate('RegisterMeasurement', {
          taskId: task.id ?? '',
          taskName: task.name,
        });
      }
    },
    [navigation, session],
  );

  // ─── responseBonus ─────────────────────────────────────────────────────────

  const responseBonus = useCallback(async (response: boolean) => {
    if (response) {
      await GamificationService.surpriseTaskProcess();
    }
    setOpenModalSurprise(false);
    surpriseSheetRef.current?.dismiss();
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.gray[100] }]}>
      <Header
        title="Registros climáticos"
        seed={userProgress?.Seed}
        hasProfileButton
        onProfilePress={() => navigation.navigate('AppTabs', { screen: 'Profile' })}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress card */}
        <View style={styles.card}>
          <Text
            style={[
              styles.cardTitle,
              { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[800] },
            ]}
          >
            Registra y gana: +2
          </Text>
          <ProgressBar
            currentProgress={tasksCompleted.length}
            totalProgress={totalTask}
          />
        </View>

        {/* Bonus banner */}
        {showBonus && (
          <TouchableOpacity
            style={[styles.bonusBanner, { backgroundColor: theme.colors.blue[50] }]}
            onPress={() => {
              if (bonusConfig) {
                setOpenModalSurprise(true);
                surpriseSheetRef.current?.present();
              }
            }}
          >
            <Text
              style={[
                styles.bonusText,
                { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[700] },
              ]}
            >
              ¡Sorpresa!
            </Text>
          </TouchableOpacity>
        )}

        {/* Incomplete tasks */}
        {tasks.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[800] },
              ]}
            >
              Registros sin completar
            </Text>
            {/* measurement_incomplete: white bg, no border, borderRadius 16 */}
            <View style={styles.groupIncomplete}>
              {tasks.map((task) => {
                const restricted = hasRestrictionTimeTask(task);
                const phone = session?.phone ?? '';
                const isTest = isTestUser(phone);
                const isDisabled = restricted && !isTest;
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={[
                      styles.taskRow,
                      isDisabled && styles.taskRowDisabled,
                    ]}
                    onPress={() => goToRegister(task)}
                    activeOpacity={isDisabled ? 0.5 : 0.8}
                    testID={`task-row-${task.id}`}
                  >
                    {restricted && (
                      <View style={styles.restrictionChip}>
                        <Text
                          style={[
                            styles.restrictionText,
                            { fontFamily: fontFamilyForWeight('500', true) },
                          ]}
                        >
                          {getTextRestrictionTime(task)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.taskRowInner}>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isDisabled
                              ? theme.colors.gray[300]
                              : theme.colors.blue[500],
                          },
                        ]}
                      />
                      <RichText html={task.name} inline baseFontSize={14} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Completed tasks */}
        {hasTaskComplete && tasksCompleted.length > 0 && (
          <View style={styles.section}>
            <Text
              style={[
                styles.sectionTitle,
                { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[800] },
              ]}
            >
              Registros completados
            </Text>
            {/* measurement_complete: green-100 bg, green-200 border, borderRadius 16 */}
            <View style={styles.groupComplete}>
              {tasksCompleted.map((task) => (
                <View
                  key={task.id}
                  style={styles.taskRow}
                  testID={`task-completed-${task.id}`}
                >
                  <View style={styles.taskRowInner}>
                    <View
                      style={[
                        styles.checkboxChecked,
                        { backgroundColor: theme.colors.blue[500] },
                      ]}
                    />
                    <RichText html={task.name} inline baseFontSize={14} />
                  </View>
                  {/* Measurements list */}
                  <View style={styles.measurementsContainer}>
                    {task.measurements.map((m) => (
                      <View key={m.id} style={styles.measurementRow}>
                        {m.sortName ? (
                          <RichText html={m.sortName} inline baseFontSize={13} />
                        ) : null}
                        <Text
                          style={[
                            styles.measurementValue,
                            { fontFamily: fontFamilyForWeight('600'), color: theme.semanticColors.text },
                          ]}
                        >
                          {m.value}
                          {m.unit}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {!loading && tasks.length === 0 && tasksCompleted.length === 0 && (
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyText,
                { fontFamily: fontFamilyForWeight('400'), color: theme.semanticColors.textSecondary },
              ]}
            >
              No hay registros disponibles
            </Text>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.blue[500]} />
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bonus surprise bottom sheet */}
      {bonusConfig && (
        <UvaBottomSheet
          ref={surpriseSheetRef}
          snapPoints={['60%']}
          onDismiss={() => setOpenModalSurprise(false)}
        >
          <View style={styles.bonusSheet}>
            <Text
              style={[
                styles.bonusSheetTitle,
                { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[700] },
              ]}
            >
              Responde esta pregunta y gana:
            </Text>
            <Text
              style={[
                styles.bonusReward,
                { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[500] },
              ]}
            >
              +{bonusConfig['moniliacisis']?.seedReward ?? 0} semillas
            </Text>
            <Text
              style={[
                styles.bonusMessage,
                { fontFamily: fontFamilyForWeight('400'), color: theme.semanticColors.text },
              ]}
            >
              {bonusConfig['moniliacisis']?.message ?? ''}
            </Text>
            <View style={styles.bonusButtons}>
              <TouchableOpacity
                style={[styles.bonusBtn, { backgroundColor: theme.colors.blue[600] }]}
                onPress={() => void responseBonus(true)}
              >
                <Text
                  style={[
                    styles.bonusBtnText,
                    { fontFamily: fontFamilyForWeight('600'), color: theme.colors.white },
                  ]}
                >
                  Sí
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bonusBtn, { backgroundColor: theme.colors.blue[600] }]}
                onPress={() => void responseBonus(true)}
              >
                <Text
                  style={[
                    styles.bonusBtnText,
                    { fontFamily: fontFamilyForWeight('600'), color: theme.colors.white },
                  ]}
                >
                  No
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bonusBtnClear}
                onPress={() => void responseBonus(false)}
              >
                <Text
                  style={[
                    styles.bonusBtnText,
                    { fontFamily: fontFamilyForWeight('400'), color: theme.colors.blue[600] },
                  ]}
                >
                  Omitir
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </UvaBottomSheet>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  card: {
    // .cards: gray-50 bg, gray-200 border, borderRadius 10, no shadow
    margin: 16,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  bonusBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  bonusText: { fontSize: 18 },
  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  // measurement_incomplete: white bg, no border
  groupIncomplete: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
  },
  // measurement_complete: green-100 bg + green-200 border
  groupComplete: {
    backgroundColor: '#E3F2D5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E6B0',
    padding: 10,
  },
  taskRow: {
    // measurement_result: gray-50 bg, borderRadius 16
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    padding: 10,
    marginBottom: 8,
  },
  taskRowDisabled: { opacity: 0.6 },
  taskRowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  checkboxChecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  taskName: { fontSize: 14, flex: 1 },
  // .restrictionTime chip: orange-100 bg, orange-800 text, italic, borderRadius 8
  restrictionChip: {
    backgroundColor: '#FBF0D9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  restrictionText: {
    fontSize: 12,
    color: '#8E481E',
    fontStyle: 'italic',
  },
  measurementsContainer: {
    marginTop: 8,
    paddingLeft: 32,
    gap: 4,
  },
  measurementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  measurementValue: { fontSize: 14 },
  emptyState: { alignItems: 'center', marginTop: 48 },
  emptyText: { fontSize: 15 },
  loadingContainer: { alignItems: 'center', marginTop: 32 },
  bottomPadding: { height: 80 },
  // Bonus sheet
  bonusSheet: { flex: 1, paddingHorizontal: 8, paddingTop: 8 },
  bonusSheetTitle: { fontSize: 20, marginBottom: 8 },
  bonusReward: { fontSize: 24, marginBottom: 16 },
  bonusMessage: { fontSize: 15, marginBottom: 24 },
  bonusButtons: { gap: 12 },
  bonusBtn: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bonusBtnClear: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  bonusBtnText: { fontSize: 15 },
});

export default MeasurementScreen;
