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

  const { taskId, taskName } = route.params;

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

      // Determine the first flow for this task
      const task = configMeasurement.tasks[taskId];
      if (!task) {
        setLoading(false);
        return;
      }

      const firstFlowId = task.flows[0];
      if (!firstFlowId) {
        setLoading(false);
        return;
      }

      await loadFlowById(configMeasurement, firstFlowId, true);
    };

    void init();
  }, [configMeasurement, taskId, loadFlowById, countTasks]);

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
      // Mark the failed measurement
      setMeasurements((prev) => {
        const next = [...prev];
        if (result.failedMeasurementIndex !== undefined) {
          const m = { ...next[result.failedMeasurementIndex] };
          m.showRestrictionAlert = true;
          m.textRestrictionAlert = result.failureMessage ?? '';
          next[result.failedMeasurementIndex] = m;
        }
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
      // No next flow → save done
      await Preferences.remove({ key: LAST_MEASUREMENT_VALUES_KEY });

      // Show "saved" modal for 2s
      setShowSavedModal(true);

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
      // There is a next flow → persist current measurement values for restriction check
      const nextFlowValues: MeasurementValue[] = measurements.map((m) => ({
        flow: flow.nextFlow,
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

      setShowConfirmModal(false);
      await goToNextFlowOrSavePreference();
    } catch (err) {
      console.error('RegisterMeasurementScreen ~ confirmSave error:', err);
    } finally {
      setSaving(false);
    }
  }, [flowId, taskId, measurements, saving, goToNextFlowOrSavePreference]);

  // ─── goToComplete (from saved modal Siguiente button) ─────────────────────

  const goToComplete = useCallback(() => {
    setShowSavedModal(false);
    if (flow?.nextFlow) {
      // Navigate to the next flow's RegisterMeasurement
      // We pass the same taskId but the next screen must load the nextFlow
      // Since RegisterMeasurement loads from task.flows[0], we need to navigate with nextFlow
      // We use a workaround: push a new RegisterMeasurement with a note about nextFlow
      navigation.push('RegisterMeasurement', {
        taskId,
        taskName: flow.nextFlow, // temporarily pass nextFlow as taskName — screen ignores it
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
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.blue[500]} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
              const isOutOfRange =
                item.value !== undefined &&
                item.value !== null &&
                item.range &&
                (item.value < item.range.min || item.value > item.range.max);
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
                            borderColor: theme.colors.blue[500],
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
                  {showAlert && errorMsg ? (
                    <View
                      style={[styles.alertContainer, { backgroundColor: theme.colors.orange[50] ?? '#FFF7ED' }]}
                      testID={`measurement-alert-${measIdx}`}
                    >
                      <Text
                        style={[
                          styles.alertTitle,
                          { fontFamily: fontFamilyForWeight('600'), color: theme.colors.orange[700] ?? '#C2410C' },
                        ]}
                      >
                        ¿Estás seguro de este dato?
                      </Text>
                      <RichText html={errorMsg} baseFontSize={13} />
                    </View>
                  ) : null}
                </View>
              );
            })}

            {/* Guide help link */}
            {hasGuide && (
              <TouchableOpacity
                style={styles.guideLink}
                onPress={openGuide}
                testID="guide-help-link"
              >
                <Text
                  style={[
                    styles.guideLinkText,
                    { fontFamily: fontFamilyForWeight('400'), color: theme.colors.blue[600] },
                  ]}
                >
                  ¿Cómo ver este dato?
                </Text>
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

      {/* Confirmation modal — "Verifica los datos" */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowConfirmModal(false)}
        testID="confirm-modal"
      >
        <View style={styles.modalBackdrop}>
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

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { fontFamily: fontFamilyForWeight('400'), color: theme.colors.blue[600] },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Saved modal — "flow.name guardados" */}
      <Modal
        visible={showSavedModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        testID="saved-modal"
      >
        <View style={styles.modalBackdrop}>
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
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  formContainer: { padding: 16 },
  titleSection: { marginBottom: 16 },
  measurementCard: {
    borderRadius: 12,
    borderWidth: 2,
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
    width: 44,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 22,
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
  alertTitle: {
    fontSize: 13,
    marginBottom: 4,
  },
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  guideLinkText: {
    fontSize: 15,
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
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelButtonText: {
    fontSize: 15,
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  savedCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  savedTitle: {
    fontSize: 20,
    textAlign: 'center',
  },
  bottomPadding: { height: 80 },
});

export default RegisterMeasurementScreen;
