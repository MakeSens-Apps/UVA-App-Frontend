/**
 * B13b — RegisterMeasurementScreen (real implementation)
 *
 * Ported from: src/app/pages/measurement/register-measurement/register-measurement.page.ts + .html
 * Classification: Rewrite (UI layer, preserving all logic exactly)
 *
 * Preserved logic (portability-matrix §4.4):
 *   - digit-by-digit input with auto-advance via useRef[] array (replaces IonInput#digitsInput)
 *   - onDigitsChange: auto-advance to next field, assemble value from digits join
 *   - onDigitsFocus: reset digit + clear restriction alert
 *   - save(): full validation chain:
 *       1. measurementsWithoutValue guard
 *       2. someMeasurementMinusRange guard (range check)
 *       3. validateRestriction (motor B07, from preferences lastMeasurementValues)
 *       4. Open confirmation modal
 *       5. addMeasurement → MeasurementDSService
 *       6. goToNextFlowOrSavePreference
 *   - validateRestriction: loads lastMeasurementValues from Preferences (AsyncStorage B05)
 *   - goToNextFlowOrSavePreference:
 *       - if no nextFlow: remove lastMeasurementValues, wait 2s, completeTaskProcess (B07)
 *         then navigate back to Measurement tab (refetch via useFocusEffect, NOT window.location.reload)
 *       - if nextFlow: save lastMeasurementValues, navigate to next RegisterMeasurement
 *   - OpenGuide: opens GuideMeasurement screen (navigation.navigate)
 *   - hasGuide: shows "¿Cómo ver este dato?" link
 *   - getMessageError via measurement-engine B07
 *   - RichText for flow.text, item.name (HTML)
 *   - Modal confirmation (ConfirmModal B10) → Verifica los datos
 *   - Modal saved (ConfirmModal) → flow.name guardados + Siguiente button if nextFlow
 *   - Image loading for measurement icons via loadImage (ConfigContext)
 *
 * Changes from original:
 *   - ActivatedRoute queryParams → navigation.params (taskId) + loaded from config
 *   - window.location.reload() → navigation triggers useFocusEffect on MeasurementScreen
 *   - Preferences (Capacitor) → Preferences shim (B05, AsyncStorage)
 *   - document.getElementById + .setFocus() → inputRefs[i].current?.focus()
 *   - IonModal → ConfirmModal / View modal (B10)
 *   - Router.navigate → navigation.navigate (typed AppStackParamList)
 *   - location.go → removed (no window.location)
 *   - applyBlurFilter → not needed (modal overlay handles it)
 *
 * Risks: R-07, R-08, R-18, R-35, R-31, R-15
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  type TextInputProps,
} from 'react-native';
import ExclamationIcon from '@/assets/svg/icons/exclamation.svg';
import InformationCircleIcon from '@/assets/svg/icons/information-circle.svg';
import { BlurView } from 'expo-blur';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/navigation/types';
import { Header } from '@/components/header/Header';
import { RichText } from '@/components/rich-text/RichText';
import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

import { MeasurementDSService } from '@/data/datastore/measurement-ds';
import { GamificationService } from '@/domain/gamification/gamification';
import { Preferences, LAST_MEASUREMENT_VALUES_KEY } from '@/data/storage/preferences';
import {
  validateRestriction,
  getMessageError,
} from '@/domain/measurement-engine/measurement-engine';
import type {
  Flow,
  Measurement,
  MeasurementModel,
} from '@/data/models/configuration/measurements.model';
import type { MeasurementValue } from '@/domain/measurement-engine/measurement-engine';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfigIcon } from './ConfigIcon';

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AppStackParamList, 'RegisterMeasurement'>;

// ─── Local measurement state type ─────────────────────────────────────────────

interface LocalMeasurement extends Measurement {
  fieldsArray: string[];
  iconUri?: string | null;
  showRestrictionAlert?: boolean;
  textRestrictionAlert?: string;
  value?: number;
  id?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * RegisterMeasurementScreen
 *
 * Full measurement registration form with digit-by-digit inputs,
 * confirmation modal, save logic, and guide integration.
 */
export function RegisterMeasurementScreen({ route, navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  // Edge-to-edge (targetSdk 36 / RN 0.85): this screen is a full-screen stack route
  // with no tab bar underneath, so its scroll content ends flush with the window
  // bottom — i.e. UNDER the Android system navigation bar. Pad by the bottom inset.
  const insets = useSafeAreaInsets();
  const { configMeasurement, countTasks, loadImage } = useConfigContext();

  const {
    taskId,
    taskName,
    /** flowId param — used to load a specific flow (multi-flow chaining fix) */
    flowId: initialFlowId,
    /** hasBackButton param — false for intermediate flows (mirrors backButtom:false) */
    hasBackButton: initialHasBackButton,
  } = route.params;

  // ─── State ─────────────────────────────────────────────────────────────────
  const [flow, setFlow] = useState<Flow | null>(null);
  const [flowId, setFlowId] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<LocalMeasurement[]>([]);
  const [hasGuide, setHasGuide] = useState(false);
  const [hasBackButton, setHasBackButton] = useState(true);
  const [totalTask, setTotalTask] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modal state — single <Modal> with a switchable stage.
  //
  // BUG 1 ROOT CAUSE (multi-flow máximos→mínimos didn't advance):
  // The screen previously used TWO stacked RN <Modal> components (confirm + saved).
  // On a real device you CANNOT reliably present a second <Modal> while the first is
  // still dismissing — the confirm modal's dismiss animation swallows the saved modal,
  // so the "Siguiente" button never appeared and the user got stuck on the máximos
  // entry screen (and often re-saved → duplicate partial records, observed live).
  //
  // Fix: drive both phases from ONE <Modal> via `modalStage`. The modal stays mounted
  // (visible while stage !== 'none') and only its INNER content switches from the
  // "Verifica los datos" confirmation to the "{flow.name} guardados" saved view.
  // No second Modal is ever mounted, so the "Siguiente" button always renders.
  type ModalStage = 'none' | 'confirm' | 'saved';
  const [modalStage, setModalStage] = useState<ModalStage>('none');
  const [saving, setSaving] = useState(false);

  // Input refs — Map<string, TextInput | null> keyed by "measIdx_digitIdx"
  // Populated via ref-callback (never accessed during render, only in callbacks/effects)
  const inputRefs = useRef<Map<string, TextInput | null>>(new Map());

  // ─── loadFlowById (declared before useEffect that calls it) ──────────────

  const loadFlowById = useCallback(
    async (config: MeasurementModel, fId: string, showBack: boolean) => {
      const flowData = config.flows[fId];
      if (!flowData) {
        setLoading(false);
        return;
      }

      setFlowId(fId);
      setFlow(flowData);
      setHasBackButton(showBack);

      // Build measurements array (mirrors original ngOnInit queryParams.subscribe logic)
      const builtMeasurements: LocalMeasurement[] = await Promise.all(
        flowData.measurements.map(async (measurementKey) => {
          const measurementComplete = { ...config.measurements[measurementKey] };
          const localM: LocalMeasurement = {
            ...measurementComplete,
            id: measurementKey,
            showRestrictionAlert: false,
            fieldsArray: Array.from({ length: measurementComplete.fields ?? 0 }, () => ''),
          };

          // Load icon image
          if (localM.icon?.imagePath) {
            try {
              localM.iconUri = await loadImage(localM.icon.imagePath as string);
            } catch {
              localM.iconUri = null;
            }
          }

          return localM;
        }),
      );

      setMeasurements(builtMeasurements);

      // Check for guides
      if (flowData.guides.length > 0) {
        setHasGuide(true);
        // Auto-open the guide of THIS flow (mirrors original showAutomatic logic).
        //
        // FIX (wrong guide on multi-flow advance): the auto-open previously passed only
        // { taskId }, so GuideMeasurementScreen fell back to tasks[taskId].flows[0]'s guide
        // (guide1 = máximos) even when the screen had advanced to flow2 (mínimos → guide2).
        // Pass the current flow's first guide key explicitly so the correct guide shows.
        const firstGuideKey = flowData.guides[0];
        if (config.guides[firstGuideKey]?.showAutomatic !== false) {
          setTimeout(() => {
            navigation.navigate('GuideMeasurement', { taskId, guideKey: firstGuideKey });
          }, 0);
        }
      } else {
        setHasGuide(false);
      }

      setLoading(false);
    },
    [loadImage, navigation, taskId],
  );

  // ─── Init: load flow from config ─────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      if (!configMeasurement) return;
      setTotalTask(countTasks(configMeasurement));

      const task = configMeasurement.tasks[taskId];
      if (!task) {
        setLoading(false);
        return;
      }

      /*
       * FIX (multi-flow goToComplete bug — audit #1 CRÍTICA):
       * Original (register-measurement.page.ts:136-144) reads flowId from queryParams.
       * RN previously always used task.flows[0], causing any task with multiple flows
       * to loop back to flow1 after completing flow1 (goToComplete passed nextFlow as
       * taskName which was ignored).
       *
       * Fix: use the route param `flowId` (initialFlowId) when provided.
       * `isFirst` is true only for the first flow in the sequence.
       * Mirrors original `backButtom !== 'false'` (register-measurement.page.ts:140).
       */
      const resolvedFlowId = initialFlowId ?? task.flows[0];
      if (!resolvedFlowId) {
        setLoading(false);
        return;
      }

      // Back button visibility mirrors the original EXACTLY:
      //   hasBackButtom = params.backButtom !== 'false'   (register-measurement.page.ts:140)
      // i.e. show the back button UNLESS hasBackButton was explicitly passed as false
      // (only the in-session "Siguiente" push sets hasBackButton:false). It does NOT
      // depend on whether the flow is flows[0] — so a flow2 resumed from the list
      // (goToRegister, no param) keeps its back button, just like the original.
      const showBack = initialHasBackButton !== false;

      await loadFlowById(configMeasurement, resolvedFlowId, showBack);
    };

    void init();
  }, [configMeasurement, taskId, loadFlowById, countTasks, initialFlowId, initialHasBackButton]);

  // ─── Digit input helpers ──────────────────────────────────────────────────

  /**
   * setInputRef — ref callback used in JSX (stores TextInput instance, never reads .current during render).
   * This avoids the react-hooks/refs lint error about accessing refs during render.
   */
  const setInputRef = useCallback(
    (measIdx: number, digitIdx: number) => (el: TextInput | null) => {
      inputRefs.current.set(`${measIdx}_${digitIdx}`, el);
    },
    [],
  );

  /**
   * focusInput — focuses a digit input (only called in callbacks, not during render).
   */
  const focusInput = useCallback((measIdx: number, digitIdx: number) => {
    const key = `${measIdx}_${digitIdx}`;
    inputRefs.current.get(key)?.focus();
  }, []);

  /**
   * onDigitsFocus — clears digit + restriction alert (mirrors original)
   */
  const onDigitsFocus = useCallback(
    (measIdx: number, digitIdx: number) => {
      setMeasurements((prev) => {
        const next = [...prev];
        if (next[measIdx]) {
          const m = { ...next[measIdx] };
          const fa = [...m.fieldsArray];
          fa[digitIdx] = '';
          m.fieldsArray = fa;
          m.showRestrictionAlert = false;
          next[measIdx] = m;
        }
        return next;
      });
    },
    [],
  );

  /**
   * onDigitsChange — validates single digit, auto-advances focus, assembles value
   * Mirrors original exactly: only single digit 0-9, then advance.
   */
  const onDigitsChange = useCallback(
    (text: string, measIdx: number, digitIdx: number) => {
      const inputValue = text;

      if (inputValue && inputValue.length === 1 && /^\d$/.test(inputValue)) {
        setMeasurements((prev) => {
          const next = [...prev];
          if (next[measIdx]) {
            const m = { ...next[measIdx] };
            const fa = [...m.fieldsArray];
            fa[digitIdx] = inputValue;
            m.fieldsArray = fa;
            m.value = Number(fa.join(''));
            m.showRestrictionAlert = false;
            next[measIdx] = m;
          }
          return next;
        });

        // Auto-advance to next digit field
        const nextDigitIdx = digitIdx + 1;
        focusInput(measIdx, nextDigitIdx);
      } else {
        // Clear invalid input
        setMeasurements((prev) => {
          const next = [...prev];
          if (next[measIdx]) {
            const m = { ...next[measIdx] };
            const fa = [...m.fieldsArray];
            fa[digitIdx] = '';
            m.fieldsArray = fa;
            next[measIdx] = m;
          }
          return next;
        });
      }
    },
    [focusInput],
  );

  // ─── validateRestriction (uses B07 engine + Preferences B05) ─────────────

  const runValidateRestriction = useCallback(async (): Promise<boolean> => {
    if (!flow?.restrictions || !flowId) return true;

    const keys = Object.keys(flow.restrictions);
    if (!keys.length) return true;

    const lastMeasurementValuesRaw = await Preferences.get({ key: LAST_MEASUREMENT_VALUES_KEY });
    if (!lastMeasurementValuesRaw.value) return true;

    const lastMeasurementValues: MeasurementValue[] = JSON.parse(
      lastMeasurementValuesRaw.value,
    ) as MeasurementValue[];

    // Only validate if the saved flow matches current flowId (mirrors original check)
    if (lastMeasurementValues[0]?.flow !== flowId) return true;

    const currentValues: MeasurementValue[] = measurements.map((m) => ({
      flow: flowId,
      id: m.id!,
      value: m.value,
    }));
    const allValues = [...lastMeasurementValues, ...currentValues];

    const restrictionSpecs = keys
      .map((key) => flow.restrictions![key])
      .filter(Boolean);

    const result = validateRestriction(restrictionSpecs, allValues);

    if (!result.valid) {
      /*
       * FIX (failedMeasurementIndex always 0 — audit #10 MEDIA):
       * Original (register-measurement.page.ts:449-453) uses:
       *   this.measurement?.findIndex(m => restriction.measurementIds.includes(m.id))
       * i.e. it searches the current screen's measurements array for the first
       * measurement whose id appears in the failing restriction's measurementIds.
       *
       * The engine returns the restriction-ids index, but to highlight the correct
       * input on screen we need the index in the current screen's `measurements` array.
       * Recalculate it here using the same logic as the original.
       */
      const failureRestriction = restrictionSpecs.find(
        (r) => r.enabled && result.failureMessage === r.message,
      );
      const screenIndex = failureRestriction
        ? measurements.findIndex(
            (m) => m.id !== undefined && failureRestriction.measurementIds.includes(m.id as string),
          )
        : -1;
      const failedIdx = screenIndex !== -1 ? screenIndex : (result.failedMeasurementIndex ?? 0);

      setMeasurements((prev) => {
        const next = [...prev];
        const m = { ...next[failedIdx] };
        m.showRestrictionAlert = true;
        m.textRestrictionAlert = result.failureMessage ?? '';
        next[failedIdx] = m;
        return next;
      });
      return false;
    }

    return true;
  }, [flow, flowId, measurements]);

  // ─── save() (mirrors original exactly) ────────────────────────────────────

  const save = useCallback(async () => {
    // 1. Guard: all measurements must have a value
    const withoutValue = measurements.filter(
      (m) => m.value === undefined || m.value === null,
    );
    if (withoutValue.length > 0) return;

    // 2. Guard: range check
    const outOfRange = measurements.some((m) => {
      if (m.value !== undefined && m.value !== null && m.range) {
        return m.value < m.range.min || m.value > m.range.max;
      }
      return false;
    });
    if (outOfRange) return;

    // 3. Restriction check
    if (flow?.restrictions) {
      const restrictionOk = await runValidateRestriction();
      if (!restrictionOk) return;
    }

    // 4. Open confirmation modal
    setModalStage('confirm');
  }, [measurements, flow, runValidateRestriction]);

  // ─── goToNextFlowOrSavePreference (declared before confirmSave that calls it) ─

  const goToNextFlowOrSavePreference = useCallback(async () => {
    if (!flow?.nextFlow) {
      // No next flow → this was the LAST flow of the task.
      // The "saved" stage is already visible (set in confirmSave), mirroring the
      // original OpenModalRegisterOk=true at register-measurement.page.ts:345.
      // completeTaskProcess runs ONLY here (no nextFlow) — this is what advances the
      // Home progress bar (userProgress.completedTasks). For multi-flow tasks it must
      // NOT run after an intermediate flow, otherwise the task would be counted as
      // complete with partial data (BUG 2 / BUG 3).
      await Preferences.remove({ key: LAST_MEASUREMENT_VALUES_KEY });

      setTimeout(async () => {
        setModalStage('none');
        try {
          await GamificationService.completeTaskProcess(totalTask);
        } catch (err) {
          console.error('RegisterMeasurementScreen ~ completeTaskProcess error:', err);
        }
        // Navigate back to Measurement tab — useFocusEffect will reload data (replaces window.location.reload)
        navigation.navigate('AppTabs', {
          screen: 'Measurement',
        });
      }, 2000);
    } else {
      // There is a next flow → persist current measurement values for restriction check.
      // nextFlow is guaranteed non-null in this branch (original: else of `!this.flow?.nextFlow`).
      // value is not filtered/defaulted — original maps `value: measurament.value` as-is,
      // and save() already guards that every measurement has a value.
      const nextFlow = flow.nextFlow;
      const nextFlowValues: MeasurementValue[] = measurements.map((m) => ({
        flow: nextFlow,
        id: m.id!,
        value: m.value,
      }));
      await Preferences.set({
        key: LAST_MEASUREMENT_VALUES_KEY,
        value: JSON.stringify(nextFlowValues),
      });
    }
  }, [flow, measurements, totalTask, navigation]);

  // ─── confirmSave: called from modal confirm button ─────────────────────────

  const confirmSave = useCallback(async () => {
    if (!flowId || !taskId || saving) return;
    setSaving(true);

    try {
      const measurementData: Record<string, number> = measurements.reduce(
        (acc, m) => {
          if (m.id) acc[m.id.toString()] = m.value ?? 0;
          return acc;
        },
        {} as Record<string, number>,
      );

      await MeasurementDSService.addMeasurement(
        'RAW',
        measurementData,
        {},
        new Date().toISOString(),
        taskId,
      );

      /*
       * FIX (BUG 1 — multi-flow advance max→min — audit CRÍTICA):
       * Original (register-measurement.page.ts:345) sets `OpenModalRegisterOk = true`
       * UNCONDITIONALLY after addMeasurement, so the "saved" view is ALWAYS shown.
       * Switch the SAME modal from 'confirm' to 'saved' (no second <Modal> is mounted,
       * so on a real device the "Siguiente" button always renders):
       *   - with nextFlow → stage stays 'saved' showing "Siguiente" (goToComplete)
       *   - without nextFlow → goToNextFlowOrSavePreference closes it after 2s
       */
      setModalStage('saved');
      await goToNextFlowOrSavePreference();
    } catch (err) {
      // Roll back to the confirm stage if persistence failed so the user can retry.
      setModalStage('confirm');
      console.error('RegisterMeasurementScreen ~ confirmSave error:', err);
    } finally {
      setSaving(false);
    }
  }, [flowId, taskId, measurements, saving, goToNextFlowOrSavePreference]);

  // ─── goToComplete (from saved modal Siguiente button) ─────────────────────

  const goToComplete = useCallback(() => {
    setModalStage('none');
    if (flow?.nextFlow) {
      /*
       * FIX (multi-flow goToComplete — audit #1 CRÍTICA):
       * Original (register-measurement.page.ts:534-552) navigates with flowId=this.flow.nextFlow.
       * RN previously passed nextFlow as taskName which was ignored, causing the screen to always
       * load tasks[taskId].flows[0] — an infinite loop for multi-flow tasks.
       *
       * Fix: pass flowId=flow.nextFlow so the next screen loads the correct flow.
       * hasBackButton=false mirrors original backButtom:false (register-measurement.page.ts:543).
       */
      navigation.push('RegisterMeasurement', {
        taskId,
        flowId: flow.nextFlow,
        hasBackButton: false,
      });
    }
  }, [flow, navigation, taskId]);

  // ─── OpenGuide ────────────────────────────────────────────────────────────

  const openGuide = useCallback(() => {
    // Open the guide of the CURRENT flow (not always flows[0]'s guide).
    // Mirrors original OpenGuide(flow.guides[0]) — register-measurement.page.html:69.
    const currentGuideKey = flow?.guides?.[0];
    navigation.navigate(
      'GuideMeasurement',
      currentGuideKey ? { taskId, guideKey: currentGuideKey } : { taskId },
    );
  }, [navigation, taskId, flow]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.gray[50] }]}>
        <ActivityIndicator color={theme.colors.blue[500]} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.gray[50] }]}>
      <Header
        title={flow?.name ?? taskName ?? ''}
        hasProfileButton={false}
        hasBackButton={hasBackButton}
        hasCenterTitle={!hasBackButton}
        onBackPress={() => navigation.navigate('AppTabs', { screen: 'Measurement' })}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {flow && (
          <View style={styles.formContainer}>
            {/* Flow text (HTML) */}
            <View style={styles.titleSection}>
              <RichText html={flow.text} baseFontSize={15} />
            </View>

            {/* Measurements */}
            {measurements.map((item, measIdx) => {
              /*
               * FIX (partial-digit alert guard — audit #12 MEDIA):
               * Original (register-measurement.page.html:49-63) guards the out-of-range alert
               * with `item.value.toString().length === item.fields` — only shows alert when
               * ALL digit fields are filled. RN was showing the alert with partial values
               * (e.g. "2" when fields=2 expects "25").
               *
               * Fix: only show range alert when assembled value has filled ALL fields.
               */
              const allDigitsFilled =
                item.value !== undefined &&
                item.value !== null &&
                item.fields !== undefined &&
                item.value.toString().length === item.fields;
              const isOutOfRange =
                allDigitsFilled &&
                item.range != null &&
                (item.value! < item.range.min || item.value! > item.range.max);
              const showAlert = isOutOfRange || item.showRestrictionAlert;
              const errorMsg = getMessageError(item);

              return (
                <View
                  key={item.id ?? measIdx}
                  style={[
                    styles.measurementCard,
                    {
                      backgroundColor: item.style?.backgroundColor?.colorHex ?? theme.colors.white,
                      borderColor: item.style?.borderColor?.colorHex ?? theme.colors.blue[200] ?? '#BFDBFE',
                    },
                  ]}
                  testID={`measurement-card-${measIdx}`}
                >
                  {/* Measurement name + icon.
                      `.measurements_name { justify-content: space-between }` — the
                      24×24 `item.icon` sits in the RIGHT corner of the card, painted
                      with `icon.colorHex`: ↑ green for máximos, ↓ red for mínimos
                      (register-measurement.page.html:21-30, screen-07 / screen-16).
                      D-30: it never painted because <Image> cannot decode the SVG
                      the RACIMO config ships — see ConfigIcon. */}
                  <View style={styles.measurementHeader}>
                    {item.name ? (
                      <RichText html={item.name} inline baseFontSize={14} />
                    ) : null}
                    {item.icon?.enable ? (
                      <ConfigIcon
                        uri={item.iconUri}
                        size={24}
                        color={item.icon.colorHex}
                        testID={`measurement-icon-${measIdx}`}
                      />
                    ) : null}
                  </View>

                  {/* Digit inputs */}
                  <View style={styles.digitContainer}>
                    {item.fieldsArray.map((digit, i) => (
                      <TextInput
                        key={i}
                        ref={setInputRef(measIdx, i)}
                        style={[
                          styles.digitInput,
                          {
                            fontFamily: fontFamilyForWeight('600'),
                            color: theme.semanticColors.text,
                          },
                        ]}
                        value={digit}
                        maxLength={1}
                        keyboardType="numeric"
                        inputMode="numeric"
                        onChangeText={(text) => onDigitsChange(text, measIdx, i)}
                        onFocus={() => onDigitsFocus(measIdx, i)}
                        testID={`digit-input-${measIdx}-${i}`}
                        selectTextOnFocus
                      />
                    ))}
                    <Text
                      style={[
                        styles.unitText,
                        { fontFamily: fontFamilyForWeight('400'), color: theme.semanticColors.textSecondary },
                      ]}
                    >
                      {item.unit}
                    </Text>
                  </View>

                  {/* Alert / error message — D-32.
                      The box is the GLOBAL `.alert` (global.scss:381-393): white
                      background, 1px --Gray-300 border, radius 14, padding 10px 16px,
                      column layout with `align-items: center`, 10px margin. The page
                      only overrides `gap: 0` and the title colour
                      (register-measurement.page.scss:121-134). So: ⚠️ alone on its
                      own centred line, then the centred orange 16/700 title, then the
                      message — see docs/evidence/measurement/screen-07. RN had a cream
                      box with the icon inline to the left of the title. */}
                  {showAlert && errorMsg ? (
                    <View
                      style={[
                        styles.alertContainer,
                        {
                          backgroundColor: theme.colors.white,
                          borderColor: theme.colors.gray[300],
                        },
                      ]}
                      testID={`measurement-alert-${measIdx}`}
                    >
                      <ExclamationIcon width={20} height={20} />
                      <Text
                        style={[
                          styles.alertTitle,
                          { fontFamily: fontFamilyForWeight('700'), color: theme.colors.orange[500] ?? '#E58B24' },
                        ]}
                      >
                        ¿Estás seguro de este dato?
                      </Text>
                      <RichText
                        html={errorMsg}
                        baseFontSize={16}
                        baseColor={theme.colors.gray[700]}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}

            {/* Guide help link — .help: white bg, borderRadius 16, space-between */}
            {hasGuide && (
              <TouchableOpacity
                style={styles.guideLink}
                onPress={openGuide}
                testID="guide-help-link"
              >
                <Text
                  style={[
                    styles.guideLinkText,
                    { fontFamily: fontFamilyForWeight('700'), color: theme.colors.gray[600] },
                  ]}
                >
                  ¿Cómo ver este dato?
                </Text>
                {/* D-31 — `.help ion-icon { width: 20px; height: 20px }` with
                    src="information-circle.svg": a FILLED dark-teal (#1A6270) circle
                    with a white "i", not the ℹ️ emoji
                    (register-measurement.page.html:71-74, .scss:29-32). */}
                <InformationCircleIcon width={20} height={20} testID="guide-help-icon" />
              </TouchableOpacity>
            )}

            {/* Save button */}
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.blue[600] }]}
                onPress={() => void save()}
                testID="save-button"
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    { fontFamily: fontFamilyForWeight('500'), color: theme.colors.white },
                  ]}
                >
                  Guardar registro
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* SINGLE modal — confirmation ("Verifica los datos 🧐") and saved
          ("{flow.name} guardados") phases share ONE <Modal>, switched by `modalStage`.
          See the BUG 1 ROOT CAUSE note on the modalStage state: two stacked <Modal>s
          do not transition reliably on a real device, which is what broke the
          máximos→mínimos advance. With one modal the "Siguiente" button always renders.

          BUG 6: original <ion-modal id="modal_confirmation"> is a CENTERED modal
          (ion-modal default + --height:auto, .wrapper margin-inline:10px), NOT a
          bottom-sheet. Render as a vertically-centered card over a blurred backdrop. */}
      <Modal
        visible={modalStage !== 'none'}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          // Hardware back closes only the confirmation phase (matches ion-modal backdrop
          // dismiss). The saved phase must be advanced via "Siguiente"/auto-navigate.
          if (modalStage === 'confirm') setModalStage('none');
        }}
        testID={modalStage === 'saved' ? 'saved-modal' : 'confirm-modal'}
      >
        {/* BlurView replaces solid overlay — mirrors backdrop-filter:blur(20px) */}
        <BlurView intensity={80} tint="light" style={styles.modalBackdropCentered}>
          {modalStage === 'saved' ? (
            /* ── Saved phase ──────────────────────────────────────────────────
               `.modal_saved` (global.scss:523-542): white card, 1px --Gray-200
               border, radius 10, `padding: 10px 0px`, centred column; the modal
               itself is 95% wide / max 400 (`ion-modal#modal_register_ok`).
               D-36: "Siguiente" is an `expand="block"` ion-button — full width of
               the modal with the usual button padding. RN rendered it hugging its
               label, and the card's own border cut across it because the button had
               no horizontal room. `.container_button` supplies the side padding
               that `.modal_saved`'s `padding: 10px 0` deliberately omits. */
            <View style={[styles.savedCard, { backgroundColor: theme.colors.white }]}>
              <Text
                style={[
                  styles.savedTitle,
                  { fontFamily: fontFamilyForWeight('700'), color: theme.colors.gray[600] },
                ]}
              >
                {flow?.name} guardados
              </Text>

              {/* If there's a next flow, show "Siguiente" button (multi-flow advance) */}
              {flow?.nextFlow ? (
                <View style={styles.savedButtonContainer} testID="next-flow-container">
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.colors.blue[600] }]}
                    onPress={goToComplete}
                    testID="next-flow-button"
                  >
                    <Text
                      style={[
                        styles.saveButtonText,
                        { fontFamily: fontFamilyForWeight('500'), color: theme.colors.white },
                      ]}
                    >
                      Siguiente
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ) : (
            // ── Confirmation phase ────────────────────────────────────────────
            /* D-35: there is NO white container card in the original. `.wrapper`
               only sets `margin-inline: 10px` and the modal part is transparent
               (`.custom-modal_confirmation::part(content) { background: transparent }`,
               register-measurement.page.scss:147-154), so the title, the measurement
               cards and the button float straight over the blurred form — see
               docs/evidence/measurement/screen-09 and screen-20. */
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalWrapper} testID="confirm-modal-wrapper">
                <Text
                  style={[
                    styles.modalTitle,
                    { fontFamily: fontFamilyForWeight('600'), color: theme.colors.gray[700] },
                  ]}
                >
                  Verifica los datos 🧐
                </Text>

                {/* Measurement summary — the SAME cards as the form, arrows included
                    (register-measurement.page.html:135-148). */}
                {measurements.map((item, measIdx) => (
                  <View
                    key={item.id ?? measIdx}
                    style={[
                      styles.measurementCard,
                      {
                        backgroundColor: item.style?.backgroundColor?.colorHex ?? theme.colors.white,
                        borderColor: item.style?.borderColor?.colorHex ?? theme.colors.blue[200] ?? '#BFDBFE',
                      },
                    ]}
                    testID={`confirm-card-${measIdx}`}
                  >
                    <View style={styles.measurementHeader}>
                      {item.name ? (
                        <RichText html={item.name} inline baseFontSize={14} />
                      ) : null}
                      {item.icon?.enable ? (
                        <ConfigIcon
                          uri={item.iconUri}
                          size={16}
                          color={item.icon.colorHex}
                          testID={`confirm-icon-${measIdx}`}
                        />
                      ) : null}
                    </View>
                    {/* D-35: the original re-renders the per-digit inputs, so the value
                        reads "2 8 °C" — one glyph per underlined 40dp box — not a single
                        joined "28 °C" string. */}
                    <View style={styles.digitContainer}>
                      {item.fieldsArray.map((digit, i) => (
                        <View
                          key={i}
                          style={styles.digitReadonly}
                          testID={`confirm-digit-${measIdx}-${i}`}
                        >
                          <Text
                            style={[
                              styles.digitReadonlyText,
                              {
                                fontFamily: fontFamilyForWeight('600'),
                                color: theme.semanticColors.text,
                              },
                            ]}
                          >
                            {digit}
                          </Text>
                        </View>
                      ))}
                      <Text
                        style={[
                          styles.unitText,
                          { fontFamily: fontFamilyForWeight('400'), color: theme.semanticColors.textSecondary },
                        ]}
                      >
                        {item.unit}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={styles.saveButtonContainer}>
                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: theme.colors.blue[600] }]}
                    onPress={() => void confirmSave()}
                    disabled={saving}
                    testID="confirm-save-button"
                  >
                    {saving ? (
                      <ActivityIndicator color={theme.colors.white} />
                    ) : (
                      <Text
                        style={[
                          styles.saveButtonText,
                          { fontFamily: fontFamilyForWeight('500'), color: theme.colors.white },
                        ]}
                      >
                        Guardar registro
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}
        </BlurView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  // .container { padding: 10px } — register-measurement.page.scss:56-57
  formContainer: { padding: 10 },
  titleSection: { marginBottom: 16 },
  measurementCard: {
    // Original: borderRadius 16, borderWidth 1 (not 2)
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  // `.measurements_name { display:flex; justify-content:space-between; align-items:flex-start; align-self:stretch }`
  // register-measurement.page.scss:71-76 — the icon is pinned to the RIGHT corner.
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginBottom: 12,
    gap: 8,
  },
  digitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  digitInput: {
    // Original .digit-input: border-bottom only (no full border), no borderRadius, width:40, fontSize:26
    // (register-measurement.page.scss:104-115 — --padding-start/end: 0)
    //
    // DEVICE BUG F-08 (Redmi Note 10S, Android 13, 440dpi): the typed digit was
    // clipped in half. On Android a <TextInput> adds its own vertical padding
    // plus the font's internal padding on top of the glyph box; with a fixed
    // 44dp height and a 26dp Montserrat face the ascender no longer fitted and
    // was cut off at the top. The five properties below make the glyph box
    // deterministic at any density:
    //   height 48       — 26dp glyph (~32dp line box) + breathing room
    //   lineHeight 34   — MUST be >= fontSize; Montserrat needs ~1.22em
    //   padding 0       — kills Android's implicit TextInput padding
    //   textAlignVertical: 'center' — centers the line box inside `height`
    //   includeFontPadding: false   — drops Android's extra ascent/descent pad
    width: 40,
    height: 48,
    lineHeight: 34,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    borderBottomWidth: 2,
    borderBottomColor: '#525252', // --Colors-Gray-600
    borderRadius: 0,
    textAlign: 'center',
    fontSize: 26,
  },
  /**
   * Read-only digit box of the confirmation modal — same metrics as `.digit-input`
   * so "2 8 °C" reads exactly like the form (D-35).
   */
  digitReadonly: {
    width: 40,
    height: 48,
    borderBottomWidth: 2,
    borderBottomColor: '#525252', // --Colors-Gray-600
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitReadonlyText: {
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
    includeFontPadding: false,
  },
  unitText: {
    fontSize: 16,
    marginLeft: 4,
  },
  /**
   * D-32 — the global `.alert` box (global.scss:381-393) with the page's `gap: 0`
   * override (register-measurement.page.scss:121-122): WHITE background, 1px
   * --Gray-300 border, radius 14, padding 10px 16px, margin 10, centred column.
   * `borderColor` / `backgroundColor` are applied from the theme at render time.
   */
  alertContainer: {
    margin: 10,
    alignSelf: 'stretch',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `.alert .title`: 16px / 700, --Colors-Orange-500, margin 4px 0, centred.
  alertTitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginVertical: 4,
  },
  guideLink: {
    // .help: white bg, borderRadius 16, paddingH 12, paddingV 10, space-between
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  guideLinkText: {
    // .help p: gray-600 #525252, 16px, weight 700
    fontSize: 16,
  },
  guideLinkIcon: {
    fontSize: 18,
  },
  // `.container_button { margin-top: 10px }` — register-measurement.page.scss:117-119
  saveButtonContainer: {
    marginTop: 10,
  },
  /**
   * D-33 — `<ion-button expand="block">` (MD): 36dp tall, full width, 8dp radius,
   * label at the MD button size in regular/medium weight — never the 48dp,
   * semibold slab RN was drawing (docs/evidence/measurement/screen-07, screen-19).
   */
  saveButton: {
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
  },
  // Modal styles
  // BlurView replaces solid overlay — backdrop-filter:blur(20px) from original SCSS.
  // BUG 2 FIX: confirmation + saved modals are CENTERED (ion-modal default),
  // not anchored to the bottom. Center both vertically and horizontally.
  modalBackdropCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ScrollView wrapper keeps the centered card scrollable + vertically centered
  // when its content is taller than the viewport (e.g. two measurement cards).
  modalScroll: {
    width: '100%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /**
   * D-35 — `.wrapper` is nothing but `margin-inline: 10px`
   * (register-measurement.page.scss:147-149). NO background, NO border, NO radius:
   * the content floats over the blurred form.
   */
  modalWrapper: {
    marginHorizontal: 10,
    alignSelf: 'stretch',
  },
  // `.title_modal_confirmation`: 18px / 600, --Colors-Gray-700, centred,
  // with the mixin's 10px block margins (register-measurement.page.scss:155-163).
  modalTitle: {
    fontSize: 18,
    lineHeight: 27,
    marginVertical: 10,
    textAlign: 'center',
  },
  savedCard: {
    // ion-modal#modal_register_ok: --width 95%, --max-width 400px, border-radius 10px
    // .modal_saved: border 1px Gray-200, `padding: 10px 0px`, centred column
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    paddingVertical: 10,
    paddingHorizontal: 0,
    width: '95%',
    maxWidth: 400,
    alignItems: 'center',
  },
  // `.modal_saved p`: 16px / 700, line-height 150%, --Colors-Gray-600
  savedTitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginVertical: 10,
  },
  /**
   * D-36 — `.container_button` wrapper around the `expand="block"` ion-button.
   * `alignSelf: 'stretch'` cancels the card's `align-items: center` (which is what
   * shrank the button to its label), and the side padding keeps the card border
   * clear of it.
   */
  savedButtonContainer: {
    alignSelf: 'stretch',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  bottomPadding: { height: 80 },
});

export default RegisterMeasurementScreen;
