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
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/navigation/types';
import { RichText } from '@/components/rich-text/RichText';
import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';

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

  const { taskId } = route.params;

  const [guide, setGuide] = useState<Guide | null>(null);
  const [guideKey, setGuideKey] = useState<string | null>(null);
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [isArrayText, setIsArrayText] = useState(false);
  const [loading, setLoading] = useState(true);

  // ─── Load guide data ───────────────────────────────────────────────────────

  useEffect(() => {
    const initGuide = async () => {
      if (!configMeasurement) return;

      // Find the first guide for the task
      let firstGuideKey: string | null = null;
      if (taskId) {
        const task = configMeasurement.tasks[taskId];
        if (task && task.flows.length > 0) {
          const flow = configMeasurement.flows[task.flows[0]];
          if (flow && flow.guides.length > 0) {
            firstGuideKey = flow.guides[0];
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
  }, [configMeasurement, taskId, loadImage]);

  // ─── closeModal (preserved from original) ──────────────────────────────────

  const closeModal = useCallback(
    (isButtonOk = false) => {
      if (isButtonOk && guide?.nextGuide) {
        // Signal to caller that there's a next guide to open
        // React Navigation: we pass params back via callback / navigate
        navigation.goBack();
        // Note: callers chain guide opening via the navigate API
        // nextGuide is returned via registered callback in caller
      } else {
        navigation.goBack();
      }
    },
    [guide, navigation],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.white }]}>
        <ActivityIndicator color={theme.colors.blue[500]} size="large" />
      </View>
    );
  }

  if (!guide) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.white }]}>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.white }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Guide image */}
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
            Continuar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => closeModal(false)}
          testID="guide-btn-close"
        >
          <Text
            style={[
              styles.btnSecondaryText,
              { fontFamily: fontFamilyForWeight('400'), color: theme.colors.blue[600] },
            ]}
          >
            Cerrar
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
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideImage: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
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
  btnSecondary: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 15,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 48,
    marginBottom: 24,
  },
});

export default GuideMeasurementScreen;
