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
import SemillaIcon from '@/assets/svg/icons/semilla.svg';
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

export function hasRestrictionTimeTask(task: Task): boolean {
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

export function getTextRestrictionTime(task: Task): string {
  if (task.restrictions.activeTime.enabled) {
    const [startH, startM] = task.restrictions.activeTime.start.split(':');
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
  // Fallback is 0 (not 1) so ProgressBar shows '0/0' instead of the misleading '0/1'
  // when config is unavailable (e.g. expo-file-system blocked in web validation mode).
  const totalTask = useMemo(
    () => (configMeasurement ? countTasks(configMeasurement) : 0),
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

      const localCompleted: TaskCompleted[] = [];
      const grouped = groupRemainingLazyMeasurements(localCompleted, completedRaw);
      const groupedKeys = Object.keys(grouped);

      const remainingTasks = [...rawTasks];
      groupedKeys.forEach((taskId) => {
        const indexTask = remainingTasks.findIndex((t) => t.id === taskId);
        if (indexTask < 0) return;
        const task = remainingTasks[indexTask];
        if (localCompleted.find((tc) => tc.id === taskId)) return;

        /*
         * BUG 2 / BUG 3 FIX — a task only counts as "completed" when EVERY measurement
         * of EVERY flow has been saved. Saving only flow1 (máximos) of a multi-flow task
         * (e.g. task1: flow1 máximos + flow2 mínimos) used to mark the whole task complete
         * with partial data, and pressing the header back mid-flow left it counted as done.
         *
         * We compute the union of measurement IDs across all the task's flows (the full
         * expected set) and compare it with the IDs actually saved today. If any are
         * missing the task stays under "Registros sin completar" so the user can resume
         * — `goToRegister` (via task.flowsComplete) picks the first incomplete flow.
         */
        const expectedIds = new Set<string>();
        const completedFlows: string[] = [];
        (task.flows ?? []).forEach((flowKey) => {
          const flowCfg = configMeasurement.flows[flowKey];
          if (!flowCfg) return;
          const flowMeasIds = flowCfg.measurements ?? [];
          flowMeasIds.forEach((id) => expectedIds.add(id));
          // A flow is complete when ALL of its measurements are present in the saved data.
          const savedIds = new Set(grouped[taskId].map((m) => m.id));
          if (flowMeasIds.length > 0 && flowMeasIds.every((id) => savedIds.has(id))) {
            completedFlows.push(flowKey);
          }
        });

        const savedIdSet = new Set(grouped[taskId].map((m) => m.id));
        const allFlowsComplete =
          expectedIds.size > 0 &&
          [...expectedIds].every((id) => savedIdSet.has(id));

        if (allFlowsComplete) {
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
        } else {
          // Partial: keep in "sin completar" with the flows already done annotated,
          // so goToRegister resumes on the first incomplete flow (mirrors original
          // task.flowsComplete — measurement.page.ts:396).
          remainingTasks[indexTask] = { ...task, flowsComplete: completedFlows };
        }
      });

      // A task is "complete" for the green section only if all its flows are done.
      setHasTaskComplete(localCompleted.length > 0);

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
        /*
         * FIX (multi-flow goToRegister — coverage-audit #1 CRÍTICA):
         * Original (measurement.page.ts:395-407) uses:
         *   task.flows.find(flow => !task.flowsComplete?.includes(flow))
         * i.e. it finds the first flow NOT already completed.
         * RN was always passing flows[0], even when flow1 was already complete,
         * causing users to re-do flow1 instead of starting on flow2.
         *
         * Fix: replicate the original find logic.
         */
        const flowId = task.flows.find((flow) => !task.flowsComplete?.includes(flow))
          ?? task.flows[0];
        navigation.navigate('RegisterMeasurement', {
          taskId: task.id ?? '',
          taskName: task.name,
          flowId,
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
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress card */}
        <View style={styles.card}>
          {/* Title row with semilla icon — mirrors Ionic: ion-icon src="semilla.svg" next to "+2" */}
          <View style={styles.cardTitleRow}>
            <Text
              style={[
                styles.cardTitle,
                { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[800] },
              ]}
            >
              Registra y gana: +2
            </Text>
            <SemillaIcon width={20} height={20} />
          </View>
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
            {/* measurement_incomplete: white bg, no border, borderRadius 16, padding 10, gap 10.
                D-22: the "Registros sin completar" heading is the FIRST CHILD of this card
                (measurement.page.html:39-40), not a label floating above it. */}
            <View style={styles.groupIncomplete}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[800] },
                ]}
              >
                Registros sin completar
              </Text>
              {tasks.map((task) => {
                const restricted = hasRestrictionTimeTask(task);
                const phone = session?.phone ?? '';
                const isTest = isTestUser(phone);
                /*
                 * DEVICE BUG (frame 054): at 08:16 the tasks labelled "Disponible hasta
                 * las 08:00" still looked ENABLED. The time comparison itself is a 1:1
                 * port of the original (hasRestrictionTimeTask above) — the divergence
                 * was purely visual: RN greyed the row out on `restricted && !isTestUser`,
                 * while the original applies the `.disable` class on the restriction
                 * ALONE (measurement.page.html:47-50 → `[ngClass]="{disable:
                 * hasRestrictionTimeTask(task)}"`). Only NAVIGATION is bypassed for test
                 * users (goToRegister / measurement.page.ts:388-394), never the styling,
                 * and the test user 3000000002 is exactly who ran the device session.
                 */
                const canNavigate = !restricted || isTest;
                return (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskRow}
                    onPress={() => goToRegister(task)}
                    activeOpacity={canNavigate ? 0.8 : 1}
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
                          // ion-checkbox::part(container) { border-color: --Colors-Gray-400 }
                          // measurement.page.scss:108-111 — the box is NOT recoloured by
                          // the restriction, only the label text is.
                          { borderColor: theme.colors.gray[400] },
                        ]}
                        testID={`task-checkbox-${task.id}`}
                      />
                      {/* .measurement_result_title: 14px / 500, --Gray-700 #404040
                          (global.scss:466-474); `.disable` swaps it for --Colors-Gray-400
                          (measurement.page.scss:96-100). D-23: RN used 18px — the size of
                          ion-checkbox's LABEL part, which this text is not (the name is
                          plain interpolation next to a slot="start" checkbox). */}
                      <RichText
                        html={task.name}
                        inline
                        baseFontSize={14}
                        baseColor={
                          restricted ? theme.colors.gray[400] : theme.colors.gray[700]
                        }
                      />
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
            {/* measurement_complete: green-100 bg, green-200 border, borderRadius 16.
                D-22: heading INSIDE the card (measurement.page.html:64-65). */}
            <View style={styles.groupComplete}>
              <Text
                style={[
                  styles.sectionTitle,
                  { fontFamily: fontFamilyForWeight('700'), color: theme.colors.blue[800] },
                ]}
              >
                Registros completados
              </Text>
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
                    {/* .measurement_result_title: 14px / 500, --Gray-700 — global.scss:466-474 */}
                    <RichText
                      html={task.name}
                      inline
                      baseFontSize={14}
                      baseColor={theme.colors.gray[700]}
                    />
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

      {/* Bonus surprise bottom sheet — sin snapPoints: alto por contenido
          (measurement.page.html:100 es un ion-modal --height:auto, breakpoints [0,1]). */}
      {bonusConfig && (
        <UvaBottomSheet
          ref={surpriseSheetRef}
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
    // .cards: gray-50 bg, gray-200 border, borderRadius 10, margin-inline 10px, padding 10px, padding-top 0
    // global.scss:335-345: margin-inline-start/end: 10px; padding: 10px; padding-top: 0
    marginHorizontal: 10,
    marginTop: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 0,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  cardTitleRow: {
    // Row that contains the title text + semilla icon (flexDirection row, alignItems center)
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    paddingTop: 10,
  },
  cardTitle: {
    fontSize: 16,
  },
  bonusBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  bonusText: { fontSize: 18 },
  // .measurement { padding: 10px } — global.scss:434-437
  section: { padding: 10 },
  // .measurement .title: 16px / 700, --Colors-Blue-800, line-height 150% — global.scss:438-443
  sectionTitle: { fontSize: 16, lineHeight: 24 },
  // %measurment + .measurement_incomplete: white bg, no border, borderRadius 16,
  // padding 10, gap 10, marginBottom 10 — global.scss:423-433 / 451-454
  groupIncomplete: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    gap: 10,
    marginBottom: 10,
  },
  // measurement_complete: green-100 bg + green-200 border — global.scss:445-449
  groupComplete: {
    backgroundColor: '#E3F2D5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C8E6B0',
    padding: 10,
    gap: 10,
    marginBottom: 10,
  },
  taskRow: {
    // .measurement_result: gray-50 bg, borderRadius 16, padding 10, gap 10 — global.scss:456-465
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    padding: 10,
    gap: 10,
  },
  taskRowInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // ion-checkbox::part(container) { border-radius: 4px } — measurement.page.scss:108-111
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
  },
  checkboxChecked: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  // .restrictionTime chip: orange-100 bg, orange-800 text, italic, borderRadius 8,
  // padding 4px 10px, 12px/500, line-height 150% — measurement.page.scss:80-95
  // D-24: an explicit lineHeight keeps the box at the original 26dp; without it the
  // platform line box inflated the chip.
  restrictionChip: {
    backgroundColor: '#FBF0D9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  restrictionText: {
    fontSize: 12,
    lineHeight: 18,
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
