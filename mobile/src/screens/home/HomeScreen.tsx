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
 *   - ion-modal bottom sheets → UvaBottomSheet (B10, altura por contenido)
 *   - Router.navigate → navigation.navigate (typed params)
 *   - ChangeDetectorRef.detectChanges → setState (React)
 *   - IonContent → ScrollView
 *
 * Visual parity fixes (home feature audit):
 *   - dateHeader: color blue[900] (#164551), textAlign:'center', fontWeight:'700'
 *     removed textTransform:'capitalize' (original only capitalizes "Hoy")
 *   - modal_Days: the three states use the original 40x40 assets (date_check /
 *     date_incomplete / date_current .svg) inside one white `.container_text` card
 *   - modal_Days_question: FIXED illustrative week (02..08) with its title inside the
 *     light-cyan panel + the inline `date_incomplete` badge in the closing sentence
 *   - modal_token: paragraph first, big "+N 🌰" below, both centred (screen-07)
 *   - modal_token_2: intro paragraph in its own white card, descriptions centred (screen-08)
 *
 * Device review (docs/evidence/device-2026-09-07): D-01, D-03, D-04, D-05, D-06(colour),
 * D-09, D-10, D-11, D-12, D-13, D-14, D-15 and D6 (progress race) are addressed here.
 *
 * Uses B07 getLastUserProgressPure (NOT legacy getLastUserProgress with side-effects).
 * recalculateDailyProgress runs at the START of the focus effect and is awaited before the
 * read, mirroring the original ionViewWillEnter → getLastUserProgress() ordering (D6).
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
  Image,
} from 'react-native';

// ─── SVG icon imports (static — Metro requires no dynamic paths) ──────────────
// Original home.page.html uses ion-icon src="semilla.svg", brote.svg, platula.svg, flor.svg,
// arrow-right.svg inline inside modals. Emoji replacements are NOT pixel-perfect.
import SemillaIcon from '@/assets/svg/icons/semilla.svg';
import PlatulaIcon from '@/assets/svg/icons/platula.svg';
import FlorIcon from '@/assets/svg/icons/flor.svg';
import ArrowRightIcon from '@/assets/svg/icons/arrow-right.svg';
// D-03: the original ⓘ is `information-circle.svg` — a FILLED dark-teal disc with a white
// "i" — not a text glyph. D-09/D-10/D-15: modal_Days and modal_token reuse the same day
// artwork as the original (date_check / date_incomplete / date_current /
// date_incomplete_to_done), all pure-vector SVGs.
import InformationCircleIcon from '@/assets/svg/icons/information-circle.svg';
import DateCheckIcon from '@/assets/svg/icons/date_check.svg';
import DateIncompleteIcon from '@/assets/svg/icons/date_incomplete.svg';
import DateCurrentIcon from '@/assets/svg/icons/date_current.svg';
import DateIncompleteToDoneIcon from '@/assets/svg/icons/date_incomplete_to_done.svg';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { HomeStackParamList } from '@/navigation/types';
import type { CalendarDay } from '@/components/calendar/calendarLogic';
import type { DayState } from '@/components/ui/Day';

import { Header } from '@/components/header/Header';
import { Calendar } from '@/components/calendar/Calendar';
import { Day } from '@/components/ui/Day';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MoonCard } from '@/components/moon-card/MoonCard';
import { UvaBottomSheet } from '@/components/ui/BottomSheet';
import type { BottomSheetRef } from '@/components/ui/BottomSheet';

import { UserProgressDSService } from '@/data/datastore/user-progress-ds';
import type { CompletedTask } from '@/data/datastore/user-progress-ds';
import { MoonPhaseService, LunarPhase } from '@/domain/moon/moon-phase';
import { useConfigContext } from '@/state/ConfigContext';
import { localRemindersService } from '@/native/notifications/LocalRemindersService';

import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

import type { UserProgress } from '@/data/models';

// ─── Constants ────────────────────────────────────────────────────────────────

// semilla.svg is 23x31 — keep the aspect ratio at every size so the seed is not squashed.
const SEED_ICON_W = 16;
const SEED_ICON_H = 22;
const SEED_ICON_MED_W = 20;
const SEED_ICON_MED_H = 27;
const SEED_ICON_BIG_W = 24;
const SEED_ICON_BIG_H = 32;

// Original: calendar.component.html renders these initials for every calendar.
const EXAMPLE_DAY_HEADERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] as const;

/**
 * The FIXED week drawn inside modal_Days_question.
 *
 * The original is a static illustration (`assets/images/calendar_example.svg`) that always
 * shows 02 completo, 03 incompleto, 04 y 05 completos, 06 por registrar, 07 y 08 sin
 * registro — that is what makes the "¿Por qué solo dos días?" explanation work. RN was
 * rendering the user's real current week instead (D-10), so the example contradicted the
 * text. Hard-coded here for the same reason the original hard-codes its SVG.
 */
const STREAK_EXAMPLE_WEEK: { day: number; state: DayState }[] = [
  { day: 2, state: 'complete' },
  { day: 3, state: 'incomplete' },
  { day: 4, state: 'complete' },
  { day: 5, state: 'complete' },
  { day: 6, state: 'today' },
  { day: 7, state: 'future' },
  { day: 8, state: 'future' },
];

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
  // `null` = not resolved yet. Seeding the state with FULL_MOON made MoonCard paint
  // "Luna llena" for ~2s on every entry to Home before the real phase arrived
  // (D-08 / D-11 / D-13); MoonCard renders a neutral placeholder for null.
  const [phase, setPhase] = useState<LunarPhase | null>(null);

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

  // ─── Notification scheduling (port of home.page.ts:182-188) ─────────────

  /**
   * Schedules daily notifications if notifications are enabled.
   * Mirrors original setNotifications() called in ngOnInit (home.page.ts:182-188).
   *
   * Original:
   *   async setNotifications(): Promise<void> {
   *     const enableNotifications = await this.notificationService.getEnableNotifications();
   *     if (enableNotifications) {
   *       await this.notificationService.scheduleDailyNotifications();
   *     }
   *   }
   */
  async function setNotifications(): Promise<void> {
    const enableNotifications = await localRemindersService.getEnableNotifications();
    if (enableNotifications) {
      await localRemindersService.scheduleDailyNotifications();
    }
  }

  // ─── Initial load (mirrors ngOnInit) ──────────────────────────────────

  useEffect(() => {
    void (async () => {
      try {
        const configMeasurement = await getConfigurationMeasurement();
        if (configMeasurement) {
          setTotalTask(countTasks(configMeasurement));
        }
        // Port of home.page.ts:149 — setNotifications() called in ngOnInit:
        // schedules daily reminders if the user has notifications enabled.
        await setNotifications();
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
          // D6 — Inicio showed "1 de 3" while Registrar showed "0 de 3" for the same day.
          // The original calls getLastUserProgress() from ionViewWillEnter, i.e. it ROLLS
          // THE DAY OVER and then reads. RN had split that in two: recalculateDailyProgress()
          // ran from the mount effect while the focus effect read straight away, so the read
          // could win the race and return YESTERDAY's row — whose completedTasks is the
          // count Home then displayed, while MeasurementScreen counts today's measurements
          // (measurement.page.html:17 → `tasksCompleted.length`). Rolling over first, on
          // every focus, restores the original ordering and also handles a midnight
          // rollover while the app stays open. It is a no-op once today's row exists.
          await UserProgressDSService.recalculateDailyProgress();

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
      // `CalendarDay` exposes the day number as `dayOfMonth` (calendarLogic.ts:52);
      // reading `day.day` produced `new Date(y, m, undefined)` → Invalid Date. The week
      // strip always belongs to the current month, matching the original queryParams.
      navigation.getParent()?.getParent()?.navigate('MeasurementDetail', {
        calendar: (day.date ??
          new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            day.dayOfMonth ?? 1,
          )).toISOString(),
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

  // `null` while the progress row has not been read yet, so the header chip stays
  // blank instead of flashing 0 → real value on entry (original: `{{ seed }}` on an
  // undefined field renders an empty label — docs/evidence/home/screen-10-header.png).
  const seedValue = userProgress === undefined ? null : (userProgress?.Seed ?? 0);
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
        {/* Original: color: --Colors-Blue-900 = #164551; font-size: 16px; font-weight: 700;
            text-align: center; NO textTransform (original string "Hoy, lunes 11 de junio" is lowercase) */}
        <Text
          style={[
            styles.dateHeader,
            {
              fontFamily: fontFamilyForWeight('700'),
              color: theme.colors.blue[900],
            },
          ]}
          testID="date-header"
        >
          {`Hoy,${today}`}
        </Text>

        {/* Streak + weekly calendar card — global.scss `.cards` */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.gray[50],
              borderColor: theme.colors.gray[200],
            },
          ]}
          testID="home-card-streak"
        >
          <View style={styles.cardHeader}>
            <Text
              style={[
                styles.cardTitle,
                styles.cardTitleFlex,
                {
                  fontFamily: fontFamilyForWeight('700'),
                  color: theme.colors.blue[800],
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
              {/* D-03 — original `<ion-icon src="information-circle.svg">`: a FILLED dark
                  teal disc with a white "i", 25x25 (`.cards ion-card-header ion-icon`). */}
              <InformationCircleIcon width={25} height={25} />
            </TouchableOpacity>
          </View>

          {/* D-01 — original `.calendar_content`: white panel with a 1px Gray-200 border
              and radius 10, sitting on the grey card (calendar.component.scss:23-27). */}
          <View
            style={[
              styles.innerPanel,
              {
                backgroundColor: theme.colors.white,
                borderColor: theme.colors.gray[200],
              },
            ]}
            testID="home-calendar-panel"
          >
            <Calendar
              calendarView="week"
              hasHeader
              daysComplete={completeTask?.daysComplete ?? []}
              daysIncomplete={completeTask?.daysIncomplete ?? []}
              daysSaveStreak={completeTask?.daysSaveStreak ?? []}
              onDayPress={goToDetail}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600] }]}
            onPress={() => {
              // Historical tab is in AppTabs (parent of HomeStack)
              navigation.getParent()?.navigate('Historical');
            }}
            testID="ver-historial-btn"
          >
            {/* Original: `<ion-button>Ver historial <ion-icon name="arrow-forward-outline"
                slot="end">` — regular weight label + a separate, larger arrow glyph (D-05). */}
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('500') }]}>
              Ver historial
            </Text>
            <Text style={[styles.buttonArrow, { fontFamily: fontFamilyForWeight('400') }]}>
              →
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress + seeds card */}
        <View
          style={[
            styles.card,
            styles.cardMarginTop,
            {
              backgroundColor: theme.colors.gray[50],
              borderColor: theme.colors.gray[200],
            },
          ]}
          testID="home-card-seeds"
        >
          <View style={styles.cardHeader}>
            {/* Original home.page.html:39-41: "Registra y gana: +2<ion-icon src=\"semilla.svg\">"
                — the seed sits immediately after the "+2", inside the title (D-04). */}
            <View style={styles.cardTitleRow}>
              <Text
                style={[
                  styles.cardTitle,
                  {
                    fontFamily: fontFamilyForWeight('700'),
                    color: theme.colors.blue[800],
                  },
                ]}
                testID="seeds-label"
              >
                {'Registra y gana: +2'}
              </Text>
              <SemillaIcon width={SEED_ICON_W} height={SEED_ICON_H} />
            </View>
            <TouchableOpacity
              onPress={() => openModal(modalTokenRef)}
              testID="modal-token-trigger"
              accessibilityRole="button"
              accessibilityLabel="Información sobre semillas"
            >
              <InformationCircleIcon width={25} height={25} />
            </TouchableOpacity>
          </View>

          {/* D-01 — the ProgressBar's own white panel IS the inner box of the original
              (`progress-bar.component.scss .progress_container { background:#fff; radius:14 }`).
              It used to be suppressed by an opt-out prop while the card itself was white;
              the card is now grey (`.cards` = Gray-50 + Gray-200 border), so the panel must
              be visible and the opt-out has been removed from ProgressBar. */}
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
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('500') }]}>
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

      {/* modal_Days — "Los días tienen estos estados" (docs/evidence/home/screen-05) */}
      <UvaBottomSheet
        ref={modalDaysRef}
        contentStyle={styles.sheetSurface}
        onDismiss={() => {/* handled by gesture */}}
      >
        <View style={styles.modalContent} testID="modal-days">
          {/* Original: a single `.container_text` white card holds the heading and the
              three state rows (home.page.html:77-100). */}
          <View style={styles.textCard}>
            <Text
              style={[
                styles.modalText,
                styles.modalTextStrong,
                { color: theme.colors.blue[900] },
              ]}
            >
              Los días tienen estos estados:{' '}
            </Text>
            {/* The three glyphs are the original assets (date_check / date_incomplete /
                date_current .svg, 40x40 per `.modal_Days p ion-icon`), not re-drawn cells. */}
            <View style={styles.modalStateRow}>
              <DateCheckIcon width={40} height={40} />
              <Text style={[styles.modalText, styles.modalTextFlex, { color: theme.colors.blue[900] }]}>
                Registros del día{' '}
                <Text style={styles.modalTextStrong}>completos</Text>
              </Text>
            </View>
            <View style={styles.modalStateRow}>
              <DateIncompleteIcon width={40} height={40} />
              <Text style={[styles.modalText, styles.modalTextFlex, { color: theme.colors.blue[900] }]}>
                Registros del día{' '}
                <Text style={styles.modalTextStrong}>incompletos</Text>
              </Text>
            </View>
            <View style={styles.modalStateRow}>
              <DateCurrentIcon width={40} height={40} />
              <Text style={[styles.modalText, styles.modalTextFlex, { color: theme.colors.blue[900] }]}>
                Día <Text style={styles.modalTextStrong}>por registrar.</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600] }]}
            onPress={() => closeAndOpen(modalDaysRef, modalDaysQuestionRef)}
            testID="modal-days-siguiente"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('500') }]}>
              Siguiente
            </Text>
          </TouchableOpacity>
        </View>
      </UvaBottomSheet>

      {/* modal_Days_question — "En el siguiente ejemplo…" (docs/evidence/home/screen-06) */}
      <UvaBottomSheet
        ref={modalDaysQuestionRef}
        contentStyle={styles.sheetSurface}
        onDismiss={() => {/* handled by gesture */}}
      >
        <View style={styles.modalContent} testID="modal-days-question">
          <View style={styles.modalNavRow}>
            <Pressable
              onPress={() => closeAndOpen(modalDaysQuestionRef, modalDaysRef)}
              testID="modal-days-question-back"
              accessibilityRole="button"
            >
              <Text style={[styles.backArrow, { color: theme.colors.blue[900] }]}>←</Text>
            </Pressable>
            {/* D-12 — original `<ion-button color="uva_blue-600"><ion-icon name="close">`:
                white ✕ on a filled rounded teal square, 36px wide. */}
            <Pressable
              onPress={() => dismissModal(modalDaysQuestionRef)}
              testID="modal-days-question-close"
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={[styles.closeSquare, { backgroundColor: theme.colors.blue[600] }]}
            >
              <Text style={styles.closeSquareText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.textCard}>
            <Text style={[styles.modalText, { color: theme.colors.blue[900] }]}>
              En el siguiente <Text style={styles.modalTextStrong}>ejemplo</Text> se
              muestran dos días de racha:
            </Text>

            {/* D-10 — the original is a FIXED illustration (assets/images/calendar_example.svg):
                a light-cyan panel whose title sits INSIDE it and whose week is always
                02✓ / 03 incompleto / 04✓ / 05✓ / 06 por registrar / 07 / 08. The RN version
                was painting the user's REAL current week instead. Redrawn here with Day
                cells because the original SVG embeds a base64 bitmap through
                `<pattern><use xlink:href>`, which react-native-svg cannot rasterise. */}
            <View style={styles.exampleCard} testID="streak-example">
              <Text
                style={[
                  styles.exampleTitle,
                  {
                    fontFamily: fontFamilyForWeight('700'),
                    color: theme.colors.blue[800],
                  },
                ]}
              >
                Tienes 2 Días de racha 😌
              </Text>
              <View style={styles.exampleHeaderRow}>
                {EXAMPLE_DAY_HEADERS.map((label, idx) => (
                  <View key={`${label}-${idx}`} style={styles.exampleCell}>
                    <Text
                      style={[
                        styles.exampleHeaderText,
                        {
                          fontFamily: fontFamilyForWeight('400'),
                          color: theme.colors.gray[400],
                        },
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.exampleWeekRow}>
                {STREAK_EXAMPLE_WEEK.map(({ day, state }) => (
                  <View key={day} style={styles.exampleCell}>
                    <Day day={day} state={state} />
                  </View>
                ))}
              </View>
            </View>

            {/* D-11 — the original keeps the `date_incomplete.svg` badge INLINE in the
                sentence (`.modal_Days_question ion-icon { font-size: 26px }`). */}
            <Text style={[styles.modalText, { color: theme.colors.blue[900] }]}>
              <Text style={styles.modalTextStrong}>¿Por qué solo dos días? </Text>
              A pesar de haber 3 días completos, el día{' '}
              <View style={styles.inlineBadge}>
                <DateIncompleteIcon width={26} height={26} />
              </View>{' '}
              está incompleto y rompe con la secuencia.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600] }]}
            onPress={() => dismissModal(modalDaysQuestionRef)}
            testID="modal-days-question-entendido"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('500') }]}>
              Entendido
            </Text>
          </TouchableOpacity>
        </View>
      </UvaBottomSheet>

      {/* modal_token — semillas (docs/evidence/home/screen-07) */}
      <UvaBottomSheet
        ref={modalTokenRef}
        contentStyle={styles.sheetSurface}
        onDismiss={() => {/* handled by gesture */}}
      >
        {/* No inner ScrollView: UvaBottomSheet's own BottomSheetScrollView both measures
            this content (→ sheet height, `--height: auto`) and scrolls it when it
            outgrows the viewport. A nested ScrollView would report a height of 0. */}
        <View style={styles.modalContent} testID="modal-token">
          {/* D-09 — original order inside every `.container_text`: the explanatory <p>
              FIRST and the big `<h1>+N 🌰</h1>` BELOW it, both centred. There is no
              "5 🌰" heading on the third card: the original shows the
              `date_incomplete_to_done.svg` illustration between its two paragraphs. */}
          <View style={styles.tokenCard}>
            <Text style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}>
              Cada día que cumplas{' '}
              <Text style={styles.modalTextStrong}>con todos tus registros</Text> ganas dos
              semillas.
            </Text>
            <View style={styles.seedCountRow}>
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>+2</Text>
              <SemillaIcon width={SEED_ICON_BIG_W} height={SEED_ICON_BIG_H} />
            </View>
          </View>

          <View style={styles.tokenCard}>
            <Text style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}>
              Los días que{' '}
              <Text style={styles.modalTextStrong}>cumplas con algunos</Text> registros
              ganas una semilla.
            </Text>
            <View style={styles.seedCountRow}>
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>+1</Text>
              <SemillaIcon width={SEED_ICON_BIG_W} height={SEED_ICON_BIG_H} />
            </View>
          </View>

          <View style={styles.tokenCard}>
            <Text style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}>
              Con estas semillas podrás recuperar tu racha.
            </Text>
            {/* Original `<h1><ion-img src="date_incomplete_to_done.svg">`, 126x40 */}
            <View style={styles.streakRecoveryRow}>
              <DateIncompleteToDoneIcon width={126} height={40} />
            </View>
            <Text style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}>
              Para recuperar un día incompleto,{' '}
              <Text style={styles.modalTextStrong}>debes pagar 5 semillas.</Text>
            </Text>
          </View>

          <View style={styles.tokenCard}>
            <Text style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}>
              Si cumples <Text style={styles.modalTextStrong}>con 7 días de racha </Text>
              ganas <Text style={styles.modalTextStrong}>3 semillas adicionales.</Text>
            </Text>
            <View style={styles.seedCountRow}>
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>+3</Text>
              <SemillaIcon width={SEED_ICON_BIG_W} height={SEED_ICON_BIG_H} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600] }]}
            onPress={() => closeAndOpen(modalTokenRef, modalToken2Ref)}
            testID="modal-token-siguiente"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('500') }]}>
              Siguiente
            </Text>
          </TouchableOpacity>
        </View>
      </UvaBottomSheet>

      {/* modal_token_2 — germinación (docs/evidence/home/screen-08) */}
      <UvaBottomSheet
        ref={modalToken2Ref}
        contentStyle={styles.sheetSurface}
        onDismiss={() => {/* handled by gesture */}}
      >
        <View style={styles.modalNavRow}>
          <Pressable
            onPress={() => closeAndOpen(modalToken2Ref, modalTokenRef)}
            testID="modal-token2-back"
            accessibilityRole="button"
          >
            <Text style={[styles.backArrow, { color: theme.colors.blue[900] }]}>←</Text>
          </Pressable>
          <Pressable
            onPress={() => dismissModal(modalToken2Ref)}
            testID="modal-token2-close"
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            style={[styles.closeSquare, { backgroundColor: theme.colors.blue[600] }]}
          >
            <Text style={styles.closeSquareText}>✕</Text>
          </Pressable>
        </View>
        {/* Same as modal_token: the sheet itself is the scroller (see BottomSheet.tsx). */}
        <View style={styles.modalContent} testID="modal-token-2">
          {/* D-15 — the intro paragraph is its own `.container_text` white card in the
              original, and every range description is centred. */}
          <View style={styles.tokenCard}>
            <Text style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}>
              Al finalizar el <Text style={styles.modalTextStrong}>mes</Text> la cantidad
              de tus semillas <Text style={styles.modalTextStrong}>germinará</Text> de esta
              manera:
            </Text>
          </View>

          {/* Each germination range in its own white card.
              Original home.page.html:265-315: semilla.svg + arrow-right.svg + brote/platula/flor */}

          {/* 11 a 40 → brote — original: "11<semilla> a 40<semilla><arrow><brote>" */}
          <View style={styles.tokenCard}>
            <View style={styles.germinationRow}>
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>11</Text>
              <SemillaIcon width={SEED_ICON_MED_W} height={SEED_ICON_MED_H} />
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>{' a 40'}</Text>
              <SemillaIcon width={SEED_ICON_MED_W} height={SEED_ICON_MED_H} />
              <ArrowRightIcon width={18} height={18} />
              {/* brote uses PNG: assets/svg/icons/brote.svg is a raster pattern that
                  react-native-svg renders as a grey box. */}
              <Image
                source={require('@/assets/png/profile/brote1.png')}
                style={styles.germinationStageIcon}
                resizeMode="contain"
              />
            </View>
            <Text
              style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}
              testID="germination-brote"
            >
              De 11 a 40 semillas germina un{' '}
              <Text style={styles.modalTextStrong}>brote</Text>
            </Text>
          </View>

          {/* 41 a 63 → plántula — original: "41<semilla> a 63<semilla><arrow><platula>" */}
          <View style={styles.tokenCard}>
            <View style={styles.germinationRow}>
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>41</Text>
              <SemillaIcon width={SEED_ICON_MED_W} height={SEED_ICON_MED_H} />
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>{' a 63'}</Text>
              <SemillaIcon width={SEED_ICON_MED_W} height={SEED_ICON_MED_H} />
              <ArrowRightIcon width={18} height={18} />
              <PlatulaIcon width={26} height={32} />
            </View>
            <Text
              style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}
              testID="germination-plantula"
            >
              De 41 a 63 semillas germina una{' '}
              <Text style={styles.modalTextStrong}>plantula</Text>
            </Text>
          </View>

          {/* más de 63 → flor — original: "mas de 63<semilla><arrow><flor>" */}
          <View style={styles.tokenCard}>
            <View style={styles.germinationRow}>
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>
                {'mas de 63'}
              </Text>
              <SemillaIcon width={SEED_ICON_MED_W} height={SEED_ICON_MED_H} />
              <ArrowRightIcon width={18} height={18} />
              <FlorIcon width={32} height={32} />
            </View>
            <Text
              style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}
              testID="germination-flor"
            >
              más de 63 semillas germina una{' '}
              <Text style={styles.modalTextStrong}>flor</Text>
            </Text>
          </View>

          {/* 0 a 10 → nada — original: "0<semilla> a 10<semilla>" (no stage icon) */}
          <View style={styles.tokenCard}>
            <View style={styles.germinationRow}>
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>0</Text>
              <SemillaIcon width={SEED_ICON_MED_W} height={SEED_ICON_MED_H} />
              <Text style={[styles.modalBig, { color: theme.colors.blue[900] }]}>{' a 10'}</Text>
              <SemillaIcon width={SEED_ICON_MED_W} height={SEED_ICON_MED_H} />
            </View>
            <Text
              style={[styles.modalTextCentered, { color: theme.colors.blue[900] }]}
              testID="germination-nada"
            >
              De 0 a 10 semillas <Text style={styles.modalTextStrong}>No</Text> alcanza a
              germinar <Text style={styles.modalTextStrong}>nada</Text> 😒
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.blue[600] }]}
            onPress={() => dismissModal(modalToken2Ref)}
            testID="modal-token2-entendido"
          >
            <Text style={[styles.buttonText, { fontFamily: fontFamilyForWeight('500') }]}>
              Entendido
            </Text>
          </TouchableOpacity>
        </View>
      </UvaBottomSheet>
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
    // Original: home.page.scss ion-content { --background: #f4f4f4 }
    backgroundColor: '#F4F4F4',
  },
  scrollContent: {
    // Original: ion-content has no horizontal padding — `.cards` and `.card_moon` each
    // carry `margin-inline: 10px`, so the gutter is 10px, not 16px.
    paddingBottom: 32,
    // Ensure the gutter between cards is also #F4F4F4 (not white)
    backgroundColor: '#F4F4F4',
  },
  dateHeader: {
    fontSize: 16,
    // Original: .date-header { margin-block: 20px }
    marginTop: 20,
    marginBottom: 20,
    textAlign: 'center', // original: text-align: center (home.page.scss .date-header)
    // textTransform removed: original "Hoy, lunes 11 de junio" is NOT capitalize
  },
  // D-01 / D-09 — global.scss `.cards`:
  //   border-radius: 10px; border: 1px solid --Colors-Gray-200;
  //   background: --Colors-Gray-50; margin-inline: 10px; padding: 10px; padding-top: 0
  // (no shadow, and radius 10 — not the 24-ish radius + drop shadow RN was drawing).
  card: {
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 10,
    padding: 10,
    paddingTop: 0,
  },
  cardMarginTop: {
    // Original: `<div class="cards ion-margin-top">` → 16px
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Original: `.title_series { color: --Colors-Blue-800; font-size: 16px; font-weight: 700 }`
  // + `ion-card-title { padding: 6px 0 }` (D-05 / D-09 / D-10: was near-black at 15px).
  cardTitle: {
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: 6,
  },
  // Only the standalone title (card 1) stretches; inside `cardTitleRow` the text must NOT
  // take the remaining width or it pushes the seed icon to the far right (D-04).
  cardTitleFlex: {
    flex: 1,
    flexWrap: 'wrap',
  },
  button: {
    // Original: ion-button expand="block" → full width. Explicit width:'100%' ensures
    // parity on react-native-web where TouchableOpacity may not auto-stretch.
    width: '100%',
    paddingVertical: 12,
    // Original: `.cards ion-button { --border-radius: 8px }` + `ion-button { margin-top: 10px }`
    borderRadius: 8,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  buttonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 20,
  },
  // Original: `.calendar_content { border-radius: 10px; border: 1px solid --Colors-Gray-200;
  // background: #FFF }` — the white panel inside the grey card (D-01).
  innerPanel: {
    borderRadius: 10,
    borderWidth: 1,
  },
  // Modal styles
  // Original: `%modalCommons { padding: 10px 10px 20px 10px; background: --Colors-Gray-100 }`
  sheetSurface: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 0,
  },
  modalContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
    backgroundColor: '#F5F5F5',
  },
  modalNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  backArrow: {
    fontSize: 20,
    paddingVertical: 4,
  },
  // D-12 — white ✕ on a filled rounded teal square (original ion-button, width 36px).
  closeSquare: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeSquareText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontFamily: 'Montserrat-Regular',
  },
  modalText: {
    // Original: `.modal_Days p { font-size: 16px; font-weight: 500 }`, line-height 150%
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    lineHeight: 24,
  },
  modalTextCentered: {
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    lineHeight: 24,
    // Original: `.modal_token, .modal_token_2 { text-align: center }` (D-15)
    textAlign: 'center',
  },
  modalTextStrong: {
    fontFamily: 'Montserrat-Bold',
  },
  modalTextFlex: {
    flex: 1,
  },
  // Original: `.container_text { padding: 10px; border-radius: 10px; background: #FFF;
  // gap: 14px; margin-block: 20px }`
  textCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    gap: 14,
    marginVertical: 20,
  },
  modalBig: {
    // Original: `.modal_token h1 { font-size: 30px; font-weight: 600 }`
    fontSize: 30,
    fontFamily: 'Montserrat-SemiBold',
    textAlign: 'center',
  },
  // card title row: "Registra y gana: +2 <semilla.svg>"
  // Original: ion-card-title .title_series = text inline with semilla.svg icon
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  // Inline row for seed count display: "+2 <semilla.svg>" under the paragraph
  // Original: h1 { +2<ion-icon src="semilla.svg"> } in modal_token
  seedCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  // Row for germination range display: "11 <semilla> a 40 <semilla> → <brote>"
  // Original: h1 { 11<semilla> a 40<semilla><arrow><brote> } in modal_token_2
  germinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  // Stage icon in germination row (brote PNG / platula.svg / flor.svg)
  germinationStageIcon: {
    width: 32,
    height: 32,
  },
  // modal_Days state rows (screen-05: 40x40 asset + label side by side)
  // Original: `.modal_Days p ion-icon { margin-right: 14px; width: 40px; height: 40px }`
  modalStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // screen-07: streak recovery illustration (date_incomplete_to_done.svg, 126x40)
  streakRecoveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // White card for each seed rule / germination range (screen-07/08)
  // Original: .container_text { background: #FFF; border-radius: 10px; padding: 10px }
  tokenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    gap: 10,
    marginTop: 20,
  },
  // Fixed streak illustration inside modal_Days_question (screen-06):
  // light-cyan panel (--Colors-Blue-50 = #EDFEFE, radius 16) with the title inside.
  exampleCard: {
    backgroundColor: '#EDFEFE',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
  },
  exampleTitle: {
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  exampleHeaderRow: {
    flexDirection: 'row',
  },
  exampleWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exampleCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exampleHeaderText: {
    fontSize: 12,
  },
  // Inline `date_incomplete.svg` badge inside a paragraph (original renders the ion-icon
  // in the flow of the sentence at font-size 26).
  inlineBadge: {
    width: 26,
    height: 26,
  },
});

export default HomeScreen;
