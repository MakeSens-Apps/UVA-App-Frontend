/**
 * B13a — HomeScreen (real implementation)
 *
 * Ported from: src/app/pages/home/home.page.ts + .html
 * Classification: Rewrite (UI layer, preserving all logic)
 *
 * Preserved logic (portability-matrix §4.4):
 *   - useFocusEffect → getLastUserProgressPure + getCurrentPhase + getCompleteTaskWeek
 *   - ngOnInit logic → initial config load (countTasks)
 *   - 4 modals with EXACT texts from original html:
 *       modal_Days: "Los días tienen estos estados"
 *       modal_Days_question: "En el siguiente ejemplo se muestran dos días de racha"
 *       modal_token: "+2 semillas por día completo, +1 por incompleto, 5 para recuperar racha, +3 por 7 días"
 *       modal_token_2: "germinación mensual: 11-40 brote, 41-63 plántula, >63 flor, 0-10 nada"
 *   - goToDetail: navigate to MeasurementDetail if state !== 'future'
 *   - goToMoonCalendar: navigate to MoonPhase
 *   - setTimeout(300ms) between closing/opening consecutive modals (R-17 race condition)
 *
 * Changes from original:
 *   - ionViewWillEnter → useFocusEffect (React Navigation focus lifecycle)
 *   - ngOnInit → useEffect on mount
 *   - ion-modal bottom sheets → UvaFullBottomSheet (B10)
 *   - Router.navigate → navigation.navigate (typed params)
 *   - ChangeDetectorRef.detectChanges → setState (React)
 *   - IonContent → ScrollView
 *
 * Uses B07 getLastUserProgressPure (NOT legacy getLastUserProgress with side-effects).
 * recalculateDailyProgress is called once from onMount (mirrors ngOnInit timing).
 *
 * Risks: R-18, R-12, R-28, R-15
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { HomeStackParamList } from '@/navigation/types';
import type { CalendarDay } from '@/components/calendar/calendarLogic';

import { Header } from '@/components/header/Header';
import { Calendar } from '@/components/calendar/Calendar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MoonCard } from '@/components/moon-card/MoonCard';
import { UvaFullBottomSheet } from '@/components/ui/BottomSheet';
import type { BottomSheetRef } from '@/components/ui/BottomSheet';

import { UserProgressDSService } from '@/data/datastore/user-progress-ds';
import type { CompletedTask } from '@/data/datastore/user-progress-ds';
import { MoonPhaseService, LunarPhase } from '@/domain/moon/moon-phase';
import { useConfigContext } from '@/state/ConfigContext';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

import type { UserProgress } from '@/data/models';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * HomeScreen
 *
 * Dashboard principal — shows streak, weekly calendar, progress, and moon phase.
 * Equivalent to HomePage in Ionic.
 */
export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const { getConfigurationMeasurement, countTasks } = useConfigContext();

  // ─── State ─────────────────────────────────────────────────────────────

  const [userProgress, setUserProgress] = useState<UserProgress | undefined | null>(undefined);
  const [totalTask, setTotalTask] = useState(1);
  const [completeTask, setCompleteTask] = useState<CompletedTask | undefined>(undefined);
  const [phase, setPhase] = useState<LunarPhase>(LunarPhase.FULL_MOON);

  /** Formatted date string (Spanish), e.g. " lunes 11 de junio" */
  const today = format(new Date(), " EEEE dd 'de' MMMM", { locale: es });

  // ─── Bottom sheet refs ─────────────────────────────────────────────────

  const modalDaysRef = useRef<BottomSheetRef>(null);
  const modalDaysQuestionRef = useRef<BottomSheetRef>(null);
  const modalTokenRef = useRef<BottomSheetRef>(null);
  const modalToken2Ref = useRef<BottomSheetRef>(null);

  // ─── Modal helpers (mirrors onCloseAndOpen + setTimeout(300ms) pattern) ─

  const openModal = useCallback((ref: React.RefObject<BottomSheetRef | null>) => {
    ref.current?.present();
  }, []);

  const dismissModal = useCallback((ref: React.RefObject<BottomSheetRef | null>) => {
    ref.current?.dismiss();
  }, []);

  /**
   * Closes currentRef and opens nextRef after a 300ms delay.
   * Mirrors original onCloseAndOpen() setTimeout(300ms) to avoid animation races.
   */
  const closeAndOpen = useCallback(
    (
      currentRef: React.RefObject<BottomSheetRef | null>,
      nextRef: React.RefObject<BottomSheetRef | null>,
    ) => {
      currentRef.current?.dismiss();
      setTimeout(() => {
        nextRef.current?.present();
      }, 300);
    },
    [],
  );

  // ─── Initial load (mirrors ngOnInit) ──────────────────────────────────

  useEffect(() => {
    void (async () => {
      try {
        const configMeasurement = await getConfigurationMeasurement();
        if (configMeasurement) {
          setTotalTask(countTasks(configMeasurement));
        }
        // recalculateDailyProgress is idempotent — safe to call once on mount
        await UserProgressDSService.recalculateDailyProgress();
      } catch (err) {
        console.error('HomeScreen init error:', err);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Focus refresh (mirrors ionViewWillEnter) ─────────────────────────

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      void (async () => {
        try {
          // getLastUserProgressPure: pure read, no side-effects (R-28)
          const up = await UserProgressDSService.getLastUserProgressPure();
          if (mounted) setUserProgress(up);

          const currentPhase = await MoonPhaseService.getCurrentPhase();
          if (mounted && currentPhase.success) {
            setPhase(currentPhase.data);
          }

          const ct = await UserProgressDSService.getCompleteTaskWeek(totalTask);
          if (mounted) setCompleteTask(ct);
        } catch (err) {
          console.error('HomeScreen focus refresh error:', err);
        }
      })();

      return () => {
        mounted = false;
      };
    }, [totalTask]),
  );

  // ─── Navigation handlers ──────────────────────────────────────────────

  /**
   * Navigate to MeasurementDetail if the day is not in the future.
   * Mirrors original goToDetail($event).
   * MeasurementDetail lives in AppStack (grandparent of HomeStack).
   */
  const goToDetail = useCallback(
    (day: CalendarDay | null) => {
      if (!day || day.state === 'future') return;
      // AppStack is 2 levels up: Home → HomeStack tab → AppTabs → AppStack
      navigation.getParent()?.getParent()?.navigate('MeasurementDetail', {
        calendar: new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          day.day,
        ).toISOString(),
        origin: 'home' as const,
      });
    },
    [navigation],
  );

  /**
   * Navigate to MoonPhase screen.
   * Mirrors original goToMoonCalendar().
   * MoonPhase is a sibling screen in HomeStack.
   */
  const goToMoonCalendar = useCallback(() => {
    navigation.navigate('MoonPhase');
  }, [navigation]);

  // ─── Render ───────────────────────────────────────────────────────────

  const seedValue = userProgress?.Seed ?? 0;
  const streakValue = userProgress?.Streak ?? 0;
  const completedTasksValue = userProgress?.completedTasks ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.semanticColors.background }]}>
      <Header
        title="Inicio"
        seed={seedValue}
        hasProfileButton
        onProfilePress={() => {
          // Profile is in AppTabs (1 level up from HomeStack)
          navigation.getParent()?.navigate('Profile');
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date header */}
        <Text
          style={[
            styles.dateHeader,
            {
              fontFamily: fontFamilyForWeight('600'),
              color: theme.semanticColors.text,
            },
          ]}
          testID="date-header"
        >
          {`Hoy,${today}`}
        </Text>

        {/* Streak + weekly calendar card */}
        <View style={[styles.card, { backgroundColor: theme.colors.white }]}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitle,
                {
                  fontFamily: fontFamilyForWeight('700'),
                  color: theme.semanticColors.text,
                },
              ]}
              testID="streak-label"
            >
              {`Tienes ${streakValue} Días de racha 😌`}
            </Text>
            <TouchableOpacity
              onPress={() => openModal(modalDaysRef)}
              testID="modal-days-trigger"
              accessibilityRole="button"
              accessibilityLabel="Información sobre los días de racha"
            >
              <Text style={[styles.infoIcon, { color: theme.colors.blue[500] }]}>ⓘ</Text>
            </TouchableOpacity>
          </View>

          <Calendar
            calendarView="week"
            hasHeader
            daysComplete={completeTask?.daysComplete ?? []}
            daysIncomplete={completeTask?.daysIncomplete ?? []}
            daysSaveStreak={completeTask?.daysSaveStreak ?? []}
            onDayPress={goToDetail}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600] }]}
            onPress={() => {
              // Historical tab is in AppTabs (parent of HomeStack)
              navigation.getParent()?.navigate('Historical');
            }}
            testID="ver-historial-btn"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('600') }]}>
              Ver historial →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress + seeds card */}
        <View style={[styles.card, styles.cardMarginTop, { backgroundColor: theme.colors.white }]}>
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitle,
                {
                  fontFamily: fontFamilyForWeight('700'),
                  color: theme.semanticColors.text,
                },
              ]}
            >
              {'Registra y gana: +2 🌰'}
            </Text>
            <TouchableOpacity
              onPress={() => openModal(modalTokenRef)}
              testID="modal-token-trigger"
              accessibilityRole="button"
              accessibilityLabel="Información sobre semillas"
            >
              <Text style={[styles.infoIcon, { color: theme.colors.blue[500] }]}>ⓘ</Text>
            </TouchableOpacity>
          </View>

          <ProgressBar
            currentProgress={completedTasksValue}
            totalProgress={totalTask}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600] }]}
            onPress={() => {
              // Measurement tab is in AppTabs (parent of HomeStack)
              navigation.getParent()?.navigate('Measurement');
            }}
            testID="completar-registros-btn"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('600') }]}>
              Completar registros
            </Text>
          </TouchableOpacity>
        </View>

        {/* Moon card */}
        <TouchableOpacity
          onPress={goToMoonCalendar}
          testID="moon-card-btn"
          accessibilityRole="button"
          accessibilityLabel="Ver fase lunar"
        >
          <MoonCard phase={phase} hasArrow />
        </TouchableOpacity>
      </ScrollView>

      {/* ─── Bottom Sheet Modals ─────────────────────────────────────────── */}

      {/* modal_Days — "Los días tienen estos estados" */}
      <UvaFullBottomSheet
        ref={modalDaysRef}
        onDismiss={() => {/* handled by gesture */}}
      >
        <View style={styles.modalContent} testID="modal-days">
          <Text style={[styles.modalText, { fontFamily: fontFamilyForWeight('700'), color: theme.semanticColors.text }]}>
            Los días tienen estos estados:{' '}
          </Text>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            ✓ Registros del día <Text style={{ fontFamily: fontFamilyForWeight('700') }}>completos</Text>
          </Text>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            ◗ Registros del día <Text style={{ fontFamily: fontFamilyForWeight('700') }}>incompletos</Text>
          </Text>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            ○ Día <Text style={{ fontFamily: fontFamilyForWeight('700') }}>por registrar.</Text>
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600], marginTop: 16 }]}
            onPress={() => closeAndOpen(modalDaysRef, modalDaysQuestionRef)}
            testID="modal-days-siguiente"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('600') }]}>
              Siguiente
            </Text>
          </TouchableOpacity>
        </View>
      </UvaFullBottomSheet>

      {/* modal_Days_question — "En el siguiente ejemplo..." */}
      <UvaFullBottomSheet
        ref={modalDaysQuestionRef}
        onDismiss={() => {/* handled by gesture */}}
      >
        <View style={styles.modalContent} testID="modal-days-question">
          <View style={styles.modalNavRow}>
            <Pressable
              onPress={() => closeAndOpen(modalDaysQuestionRef, modalDaysRef)}
              testID="modal-days-question-back"
              accessibilityRole="button"
            >
              <Text style={[styles.backArrow, { color: theme.semanticColors.text }]}>←</Text>
            </Pressable>
            <Pressable
              onPress={() => dismissModal(modalDaysQuestionRef)}
              testID="modal-days-question-close"
              accessibilityRole="button"
            >
              <Text style={[styles.closeBtn, { color: theme.colors.blue[600] }]}>✕</Text>
            </Pressable>
          </View>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            En el siguiente <Text style={{ fontFamily: fontFamilyForWeight('700') }}>ejemplo</Text> se muestran dos días de racha:
          </Text>
          <Text style={[styles.modalText, { color: theme.semanticColors.text, marginTop: 8 }]}>
            <Text style={{ fontFamily: fontFamilyForWeight('700') }}>¿Por qué solo dos días?</Text> A pesar de haber 3 días completos, el día ◗ está incompleto y rompe con la secuencia.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600], marginTop: 16 }]}
            onPress={() => dismissModal(modalDaysQuestionRef)}
            testID="modal-days-question-entendido"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('600') }]}>
              Entendido
            </Text>
          </TouchableOpacity>
        </View>
      </UvaFullBottomSheet>

      {/* modal_token — "+2 semillas por día completo..." */}
      <UvaFullBottomSheet
        ref={modalTokenRef}
        onDismiss={() => {/* handled by gesture */}}
      >
        <ScrollView
          style={styles.modalScrollContainer}
          contentContainerStyle={styles.modalContent}
          testID="modal-token"
        >
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            Cada día que cumplas <Text style={{ fontFamily: fontFamilyForWeight('700') }}>con todos tus registros</Text> ganas dos semillas.
          </Text>
          <Text style={[styles.modalBig, { color: theme.semanticColors.text }]}>+2 🌰</Text>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            Los días que <Text style={{ fontFamily: fontFamilyForWeight('700') }}>cumplas con algunos</Text> registros ganas una semilla.
          </Text>
          <Text style={[styles.modalBig, { color: theme.semanticColors.text }]}>+1 🌰</Text>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            Con estas semillas podrás recuperar tu racha.
          </Text>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            Para recuperar un día incompleto, <Text style={{ fontFamily: fontFamilyForWeight('700') }}>debes pagar 5 semillas.</Text>
          </Text>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            Si cumples <Text style={{ fontFamily: fontFamilyForWeight('700') }}>con 7 días de racha</Text> ganas <Text style={{ fontFamily: fontFamilyForWeight('700') }}>3 semillas adicionales.</Text>
          </Text>
          <Text style={[styles.modalBig, { color: theme.semanticColors.text }]}>+3 🌰</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600], marginTop: 16 }]}
            onPress={() => closeAndOpen(modalTokenRef, modalToken2Ref)}
            testID="modal-token-siguiente"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('600') }]}>
              Siguiente
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </UvaFullBottomSheet>

      {/* modal_token_2 — "Al finalizar el mes la cantidad de tus semillas germinará..." */}
      <UvaFullBottomSheet
        ref={modalToken2Ref}
        onDismiss={() => {/* handled by gesture */}}
      >
        <View style={styles.modalNavRow}>
          <Pressable
            onPress={() => closeAndOpen(modalToken2Ref, modalTokenRef)}
            testID="modal-token2-back"
            accessibilityRole="button"
          >
            <Text style={[styles.backArrow, { color: theme.semanticColors.text }]}>←</Text>
          </Pressable>
          <Pressable
            onPress={() => dismissModal(modalToken2Ref)}
            testID="modal-token2-close"
            accessibilityRole="button"
          >
            <Text style={[styles.closeBtn, { color: theme.colors.blue[600] }]}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.modalScrollContainer}
          contentContainerStyle={styles.modalContent}
          testID="modal-token-2"
        >
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]}>
            Al finalizar el <Text style={{ fontFamily: fontFamilyForWeight('700') }}>mes</Text> la cantidad de tus semillas <Text style={{ fontFamily: fontFamilyForWeight('700') }}>germinará</Text> de esta manera:
          </Text>

          {/* 11 a 40 → brote */}
          <View style={styles.germinationRow}>
            <Text style={[styles.modalBig, { color: theme.semanticColors.text }]}>11 🌰 a 40 🌰 → 🌱</Text>
          </View>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]} testID="germination-brote">
            De 11 a 40 semillas germina un <Text style={{ fontFamily: fontFamilyForWeight('700') }}>brote</Text>
          </Text>

          {/* 41 a 63 → plántula */}
          <View style={styles.germinationRow}>
            <Text style={[styles.modalBig, { color: theme.semanticColors.text }]}>41 🌰 a 63 🌰 → 🌿</Text>
          </View>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]} testID="germination-plantula">
            De 41 a 63 semillas germina una <Text style={{ fontFamily: fontFamilyForWeight('700') }}>plantula</Text>
          </Text>

          {/* más de 63 → flor */}
          <View style={styles.germinationRow}>
            <Text style={[styles.modalBig, { color: theme.semanticColors.text }]}>mas de 63 🌰 → 🌸</Text>
          </View>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]} testID="germination-flor">
            más de 63 semillas germina una <Text style={{ fontFamily: fontFamilyForWeight('700') }}>flor</Text>
          </Text>

          {/* 0 a 10 → nada */}
          <View style={styles.germinationRow}>
            <Text style={[styles.modalBig, { color: theme.semanticColors.text }]}>0 🌰 a 10 🌰</Text>
          </View>
          <Text style={[styles.modalText, { color: theme.semanticColors.text }]} testID="germination-nada">
            De 0 a 10 semillas <Text style={{ fontFamily: fontFamilyForWeight('700') }}>No</Text> alcanza a germinar <Text style={{ fontFamily: fontFamilyForWeight('700') }}>nada</Text> 😒
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600], marginTop: 16 }]}
            onPress={() => dismissModal(modalToken2Ref)}
            testID="modal-token2-entendido"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('600') }]}>
              Entendido
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </UvaFullBottomSheet>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 0,
    paddingBottom: 32,
  },
  dateHeader: {
    fontSize: 16,
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardMarginTop: {
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    flex: 1,
    flexWrap: 'wrap',
  },
  infoIcon: {
    fontSize: 20,
    paddingLeft: 8,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  // Modal styles
  modalContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  modalScrollContainer: {
    flex: 1,
  },
  modalNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backArrow: {
    fontSize: 22,
    paddingVertical: 4,
  },
  closeBtn: {
    fontSize: 20,
    paddingVertical: 4,
  },
  modalText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    lineHeight: 20,
  },
  modalBig: {
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    marginVertical: 4,
  },
  germinationRow: {
    alignItems: 'center',
    marginTop: 8,
  },
});

export default HomeScreen;
