/**
 * B13b — GuideMeasurementScreen (real implementation)
 *
 * Ported from: src/app/pages/measurement/guide-measurement/guide-measurement.component.ts + .html
 * Classification: Rewrite (UI layer, preserving all logic)
 *
 * Preserved logic (portability-matrix §4.4):
 *   - Array.isArray(guide.text) detection → IsArrayText flag
 *   - loadImage via ConfigContext.loadImage (file:// URI)
 *   - loadImage for guide.icon.imagePath
 *   - closeModal(isButtonOk): if ok, pass nextGuide back (navigation callback)
 *   - isHtmlText → renders guide.text as RichText HTML
 *   - Guide shown as bottom sheet (replaces IonModal fullscreen)
 *
 * Changes from original:
 *   - Angular ModalController.dismiss → navigation.goBack() + route param callbacks
 *   - IonModal → UvaFullBottomSheet (B10)
 *   - SafeHtmlPipe → RichText (B09)
 *   - loadImage via ConfigContext (file:// URI, no Capacitor.convertFileSrc)
 *   - This is a screen (not a component), presented as a modal screen via stack navigator
 *
 * Risks: R-08, R-17, R-20
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/navigation/types';
import { RichText } from '@/components/rich-text/RichText';
import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { Preferences } from '@/data/storage/preferences';

import type { Guide } from '@/data/models/configuration/measurements.model';

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AppStackParamList, 'GuideMeasurement'>;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * GuideMeasurementScreen
 *
 * Presents a guide for a given measurement flow.
 * Equivalent to GuideMeasurementComponent presented in a fullscreen IonModal.
 * Uses native stack modal presentation.
 *
 * The guide data is passed via navigation params or loaded from configMeasurement.
 * On "OK", returns { nextGuide } via navigation.goBack() result.
 */
export function GuideMeasurementScreen({ route, navigation }: Props): React.JSX.Element {
  const { theme } = useTheme();
  const { configMeasurement, loadImage } = useConfigContext();

  const { taskId, guideKey: initialGuideKey } = route.params;

  const [guide, setGuide] = useState<Guide | null>(null);
  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [isArrayText, setIsArrayText] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAutomatic, setShowAutomatic] = useState(true);

  // ─── Load guide data ───────────────────────────────────────────────────────

  useEffect(() => {
    const initGuide = async () => {
      if (!configMeasurement) return;

      /*
       * FIX (nextGuide chaining — audit #4 ALTA):
       * When `guideKey` param is provided (from nextGuide chaining), load that guide directly.
       * This mirrors original OpenGuide(_guide) param (register-measurement.page.ts:199-227)
       * which accepts a specific guide key and opens it.
       * Previously, the screen always loaded the first guide for the task and
       * closeModal(true) only called goBack() without opening the next guide.
       */
      let firstGuideKey: string | null = initialGuideKey ?? null;

      if (!firstGuideKey) {
        // Find the first guide for the task (original auto-open logic)
        if (taskId) {
          const task = configMeasurement.tasks[taskId];
          if (task && task.flows.length > 0) {
            const flow = configMeasurement.flows[task.flows[0]];
            if (flow && flow.guides.length > 0) {
              firstGuideKey = flow.guides[0];
            }
          }
        }
      }

      if (!firstGuideKey) {
        // Fallback: use first guide available
        const keys = Object.keys(configMeasurement.guides);
        if (keys.length > 0) firstGuideKey = keys[0];
      }

      if (!firstGuideKey) {
        setLoading(false);
        return;
      }

      const guideData = configMeasurement.guides[firstGuideKey];
      if (!guideData) {
        setLoading(false);
        return;
      }

      setGuideKey(firstGuideKey);
      setGuide(guideData);
      setIsArrayText(Array.isArray(guideData.text));

      // Load guide image
      try {
        const imgUrl = await loadImage(guideData.image);
        setImgUri(imgUrl);
      } catch {
        setImgUri(null);
      }

      // Load icon image if available
      if (guideData.icon?.imagePath) {
        try {
          const iconUrl = await loadImage(guideData.icon.imagePath as string);
          setIconUri(iconUrl);
        } catch {
          setIconUri(null);
        }
      }

      setLoading(false);
    };

    void initGuide();
  }, [configMeasurement, taskId, loadImage, initialGuideKey]);

  // ─── closeModal (preserved from original) ──────────────────────────────────

  const closeModal = useCallback(
    (isButtonOk = false) => {
      const nextGuideKey = (guide as (Guide & { nextGuide?: string }) | null)?.nextGuide;
      if (isButtonOk && nextGuideKey) {
        /*
         * FIX (nextGuide chaining — audit #4 ALTA):
         * Original (guide-measurement.component.ts:97-98) dismisses the current modal
         * and caller's onDidDismiss (register-measurement.page.ts:219-224) recursively
         * calls OpenGuide(nextGuide), creating a chain of guides.
         *
         * RN fix: instead of goBack() unconditionally, replace (push on top of current)
         * with a new GuideMeasurement screen passing the next guideKey.
         * This mirrors the recursive OpenGuide() chaining of the original.
         */
        navigation.replace('GuideMeasurement', { taskId, guideKey: nextGuideKey });
      } else {
        navigation.goBack();
      }
    },
    [guide, navigation, taskId],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.gray[50] }]}>
        <ActivityIndicator color={theme.colors.blue[500]} size="large" />
      </View>
    );
  }

  if (!guide) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.gray[50] }]}>
        <Text
          style={[
            styles.errorText,
            { fontFamily: fontFamilyForWeight('400'), color: theme.semanticColors.textSecondary },
          ]}
        >
          Guía no disponible
        </Text>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: theme.colors.blue[600] }]}
          onPress={() => closeModal(false)}
        >
          <Text style={[styles.btnPrimaryText, { fontFamily: fontFamilyForWeight('600') }]}>
            Cerrar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Button label: "Siguiente" if there is a nextGuide, "Entendido" otherwise
  const buttonLabel = (guide as Guide & { nextGuide?: string }).nextGuide ? 'Siguiente' : 'Entendido';

  const handleShowAutomaticChange = async (value: boolean) => {
    setShowAutomatic(value);
    await Preferences.set({ key: `guide_showAutomatic_${guideKey}`, value: String(value) });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.gray[50] }]}>
      {/* Close button — .btn_close: absolute top-right, teal #10BCCA bg, 38px, borderRadius 4
          Original: ion-button with ion-icon name="close" (Ionicons vectorial icon) */}
      <TouchableOpacity
        style={[styles.btnClose, { backgroundColor: theme.colors.blue[500] }]}
        onPress={() => closeModal(false)}
        testID="guide-btn-close"
      >
        <Ionicons name="close" size={20} color={theme.colors.white} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Guide image — 70% width, height 260 */}
        {imgUri ? (
          <Image
            source={{ uri: imgUri }}
            style={styles.guideImage}
            resizeMode="contain"
            testID="guide-image"
          />
        ) : null}

        {/* Guide icon image */}
        {iconUri ? (
          <Image
            source={{ uri: iconUri }}
            style={styles.iconImage}
            resizeMode="contain"
            testID="guide-icon"
          />
        ) : null}

        {/* Guide title — original [ngStyle]="{ color: guide.icon.colorHex }" — guide-measurement.html:10
            Falls back to blue[700] when colorHex is not configured */}
        {guide.name ? (
          <Text
            style={[
              styles.guideTitle,
              {
                fontFamily: fontFamilyForWeight('700'),
                color: (guide as Guide & { icon?: { colorHex?: string } }).icon?.colorHex ?? theme.colors.blue[700],
              },
            ]}
          >
            {guide.name}
          </Text>
        ) : null}

        {/* Guide text — array or HTML */}
        {isArrayText ? (
          <View style={styles.arrayTextContainer}>
            {(guide.text as unknown as string[]).map((textItem, idx) => (
              <Text
                key={idx}
                style={[
                  styles.arrayTextItem,
                  { fontFamily: fontFamilyForWeight('400'), color: theme.semanticColors.text },
                ]}
              >
                {textItem}
              </Text>
            ))}
          </View>
        ) : (
          <RichText html={guide.text as string} baseFontSize={15} />
        )}

        {/* Checkbox "Mostrar automáticamente"
            Original: <ion-checkbox> with border-radius:4px, color=uva_blue-600
            guide-measurement.component.scss:62-64 and guide-measurement.component.html:39-47 */}
        <Pressable
          style={styles.checkboxRow}
          onPress={() => void handleShowAutomaticChange(!showAutomatic)}
          testID="guide-show-automatic"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: showAutomatic }}
        >
          <View
            style={[
              styles.checkboxBox,
              showAutomatic
                ? { backgroundColor: theme.colors.blue[600], borderColor: theme.colors.blue[600] }
                : { borderColor: theme.colors.blue[600] },
            ]}
          >
            {showAutomatic ? (
              <Ionicons name="checkmark" size={14} color={theme.colors.white} />
            ) : null}
          </View>
          <Text
            style={[
              styles.checkboxLabel,
              { fontFamily: fontFamilyForWeight('500'), color: theme.colors.gray[700] },
            ]}
          >
            Mostrar automáticamente
          </Text>
        </Pressable>
      </ScrollView>

      {/* Action buttons */}
      <View style={[styles.buttonsContainer, { borderTopColor: theme.semanticColors.border }]}>
        <TouchableOpacity
          style={[styles.btnPrimary, { backgroundColor: theme.colors.blue[600] }]}
          onPress={() => closeModal(true)}
          testID="guide-btn-ok"
        >
          <Text
            style={[
              styles.btnPrimaryText,
              { fontFamily: fontFamilyForWeight('600'), color: theme.colors.white },
            ]}
          >
            {buttonLabel}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingTop: 54, // leave room for the absolute close button
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // .btn_close: absolute top-right, 38×38px, teal bg, borderRadius 4
  // Original uses ion-icon name="close" (Ionicons vectorial) — guide-measurement.component.html:4-7
  btnClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 70% width, height 260 (60% of screen width, centered)
  guideImage: {
    width: '70%',
    height: 260,
    marginBottom: 16,
    alignSelf: 'center',
  },
  guideTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  iconImage: {
    width: 64,
    height: 64,
    marginBottom: 12,
    alignSelf: 'center',
  },
  arrayTextContainer: {
    gap: 8,
  },
  arrayTextItem: {
    fontSize: 15,
    lineHeight: 22,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  // ion-checkbox::part(container) { border-radius: 4px; border-color: #1097aa }
  // guide-measurement.component.scss:62-64
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    // ion-checkbox::part(label): 14px, 500, color Gray-700 — guide-measurement.component.scss:67-74
    fontSize: 14,
  },
  buttonsContainer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  btnPrimary: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 48,
    marginBottom: 24,
  },
});

export default GuideMeasurementScreen;
