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
  Image,
  StyleSheet,
  ActivityIndicator,
  type TextInputProps,
} from 'react-native';
import ExclamationIcon from '@/assets/svg/icons/exclamation.svg';
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

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Input refs — Map<string, TextInput | null> keyed by "measIdx_digitIdx"
  // Populated via ref-callback (never accessed during render, only in callbacks/effects)
  const inputRefs = useRef<Map<string, TextInput | null>>(new Map());

  // ─── loadFlowById (declared before useEffect that calls it) ──────────────

  const loadFlowById = useCallback(
    async (config: MeasurementModel, fId: string, isFirst: boolean) => {
      const flowData = config.flows[fId];
      if (!flowData) {
        setLoading(false);
        return;
      }

      setFlowId(fId);
      setFlow(flowData);
      setHasBackButton(isFirst);

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
        // Auto-open first guide (mirrors original showAutomatic logic)
        const firstGuideKey = flowData.guides[0];
        if (config.guides[firstGuideKey]?.showAutomatic !== false) {
          setTimeout(() => {
            navigation.navigate('GuideMeasurement', { taskId });
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

      // isFirst: show back button only for the first flow in the sequence
      const isFirst = initialHasBackButton !== false && resolvedFlowId === task.flows[0];

      await loadFlowById(configMeasurement, resolvedFlowId, isFirst);
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
    setShowConfirmModal(true);
  }, [measurements, flow, runValidateRestriction]);

  // ─── goToNextFlowOrSavePreference (declared before confirmSave that calls it) ─

  const goToNextFlowOrSavePreference = useCallback(async () => {
    if (!flow?.nextFlow) {
      // No next flow → save done.
      // The "saved" modal is already visible (shown unconditionally in confirmSave,
      // mirroring original OpenModalRegisterOk=true at register-measurement.page.ts:345).
      await Preferences.remove({ key: LAST_MEASUREMENT_VALUES_KEY });

      setTimeout(async () => {
        setShowSavedModal(false);
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

      /*
       * FIX (BUG 1 — multi-flow advance max→min — audit CRÍTICA):
       * Original (register-measurement.page.ts:345) sets `OpenModalRegisterOk = true`
       * UNCONDITIONALLY before addMeasurement, so the "saved" modal is ALWAYS shown.
       * RN previously only opened it inside the no-nextFlow branch of
       * goToNextFlowOrSavePreference → for a flow WITH nextFlow the modal never
       * appeared, the "Siguiente" button never rendered, and the user stayed stuck
       * on the máximos view. Show it here unconditionally to match the original:
       *   - with nextFlow → modal stays open showing "Siguiente" (goToComplete)
       *   - without nextFlow → goToNextFlowOrSavePreference auto-closes it after 2s
       */
      setShowSavedModal(true);

      await MeasurementDSService.addMeasurement(
        'RAW',
        measurementData,
        {},
        new Date().toISOString(),
        taskId,
      );

      setShowConfirmModal(false);
      await goToNextFlowOrSavePreference();
    } catch (err) {
      // Roll back the optimistic "saved" modal if persistence failed.
      setShowSavedModal(false);
      console.error('RegisterMeasurementScreen ~ confirmSave error:', err);
    } finally {
      setSaving(false);
    }
  }, [flowId, taskId, measurements, saving, goToNextFlowOrSavePreference]);

  // ─── goToComplete (from saved modal Siguiente button) ─────────────────────

  const goToComplete = useCallback(() => {
    setShowSavedModal(false);
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
    navigation.navigate('GuideMeasurement', { taskId });
  }, [navigation, taskId]);

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

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
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
                  {/* Measurement name + icon */}
                  <View style={styles.measurementHeader}>
                    {item.name ? (
                      <RichText html={item.name} inline baseFontSize={14} />
                    ) : null}
                    {item.icon?.enable && item.iconUri ? (
                      <Image
                        source={{ uri: item.iconUri }}
                        style={[styles.iconImg, { tintColor: item.icon.colorHex }]}
                        resizeMode="contain"
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

                  {/* Alert / error message */}
                  {/* Original: .alert .title { color: var(--Colors-Orange-500, #e58b24) }
                      register-measurement.page.scss:130-131
                      ion-icon src="exclamation.svg" 20×20px (register-measurement.page.html:54) */}
                  {showAlert && errorMsg ? (
                    <View
                      style={[styles.alertContainer, { backgroundColor: theme.colors.orange[50] ?? '#FFF7ED' }]}
                      testID={`measurement-alert-${measIdx}`}
                    >
                      <View style={styles.alertTitleRow}>
                        <ExclamationIcon width={20} height={20} />
                        <Text
                          style={[
                            styles.alertTitle,
                            { fontFamily: fontFamilyForWeight('600'), color: theme.colors.orange[500] ?? '#E58B24' },
                          ]}
                        >
                          ¿Estás seguro de este dato?
                        </Text>
                      </View>
                      <RichText html={errorMsg} baseFontSize={13} />
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
                <Text style={[styles.guideLinkIcon, { color: theme.colors.blue[500] }]}>ℹ️</Text>
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
                    { fontFamily: fontFamilyForWeight('600'), color: theme.colors.white },
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

      {/* Confirmation modal — "Verifica los datos 🧐"
          BUG 2 FIX: original <ion-modal id="modal_confirmation" class="custom-modal_confirmation">
          is a CENTERED modal (ion-modal default + --height:auto, .wrapper margin-inline:10px),
          NOT a bottom-sheet. Render as a vertically-centered card over a blurred backdrop. */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowConfirmModal(false)}
        testID="confirm-modal"
      >
        {/* BlurView replaces solid overlay — mirrors backdrop-filter:blur(20px) */}
        <BlurView intensity={80} tint="light" style={styles.modalBackdropCentered}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
          <View style={[styles.modalCard, { backgroundColor: theme.colors.white }]}>
            <Text
              style={[
                styles.modalTitle,
                { fontFamily: fontFamilyForWeight('700'), color: theme.semanticColors.text },
              ]}
            >
              Verifica los datos 🧐
            </Text>

            {/* Measurement summary */}
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
              >
                <View style={styles.measurementHeader}>
                  {item.name ? (
                    <RichText html={item.name} inline baseFontSize={14} />
                  ) : null}
                </View>
                <View style={styles.digitContainer}>
                  <Text
                    style={[
                      styles.valueDisplay,
                      { fontFamily: fontFamilyForWeight('600'), color: theme.semanticColors.text },
                    ]}
                  >
                    {item.value ?? '--'}
                  </Text>
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
                    { fontFamily: fontFamilyForWeight('600'), color: theme.colors.white },
                  ]}
                >
                  Guardar registro
                </Text>
              )}
            </TouchableOpacity>

          </View>
          </ScrollView>
        </BlurView>
      </Modal>

      {/* Saved modal — "flow.name guardados" */}
      <Modal
        visible={showSavedModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        testID="saved-modal"
      >
        <BlurView intensity={80} tint="light" style={styles.modalBackdropCentered}>
          <View style={[styles.savedCard, { backgroundColor: theme.colors.white }]}>
            <Text
              style={[
                styles.savedTitle,
                { fontFamily: fontFamilyForWeight('600'), color: theme.semanticColors.text },
              ]}
            >
              {flow?.name} guardados
            </Text>

            {/* If there's a next flow, show "Siguiente" button */}
            {flow?.nextFlow ? (
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.blue[600], marginTop: 16 }]}
                onPress={goToComplete}
                testID="next-flow-button"
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    { fontFamily: fontFamilyForWeight('600'), color: theme.colors.white },
                  ]}
                >
                  Siguiente
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
  measurementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  iconImg: {
    width: 24,
    height: 24,
  },
  digitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  digitInput: {
    // Original .digit-input: border-bottom only (no full border), no borderRadius, width:40, fontSize:26
    width: 40,
    height: 44,
    borderBottomWidth: 2,
    borderBottomColor: '#525252', // --Colors-Gray-600
    borderRadius: 0,
    textAlign: 'center',
    fontSize: 26,
  },
  valueDisplay: {
    fontSize: 28,
  },
  unitText: {
    fontSize: 16,
    marginLeft: 4,
  },
  alertContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 13,
    flex: 1,
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
  saveButtonContainer: {
    marginTop: 8,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
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
  modalCard: {
    // .wrapper { margin-inline: 10px } → horizontal margin; full rounded card (not bottom-sheet)
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 10,
    width: '95%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  savedCard: {
    // ion-modal#modal_register_ok: --width 95%, --max-width 400px, border-radius 10px
    // .modal_saved: border 1px Gray-200, centered column
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 32,
    width: '95%',
    maxWidth: 400,
    alignItems: 'center',
  },
  savedTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  bottomPadding: { height: 80 },
});

export default RegisterMeasurementScreen;
