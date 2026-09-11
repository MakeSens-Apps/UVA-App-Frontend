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
  useWindowDimensions,
} from 'react-native';
// Deep import (not the `@expo/vector-icons` barrel): the barrel registers the
// TTF of every icon family, and Metro then packs all ~20 of them into
// `res/raw` (~4 MB). Importing the single family the app uses keeps only
// Ionicons. See docs/migration/bundle-report.md.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { AppStackParamList } from '@/navigation/types';
import { RichText } from '@/components/rich-text/RichText';
import { useConfigContext } from '@/state/ConfigContext';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamilyForWeight } from '@/theme/theme';
import { ConfigIcon } from './ConfigIcon';

import type { Guide } from '@/data/models/configuration/measurements.model';

// ─── Props ─────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<AppStackParamList, 'GuideMeasurement'>;

// ─── Layout constants ─────────────────────────────────────────────────────────

/**
 * Height of the screen Header left visible above the guide sheet, matching the
 * original ion-modal sheet (screen-03): Header paddingTop 8 + toolbar minHeight
 * 44 (components/header/Header.tsx). Added on top of the status-bar inset.
 */
export const GUIDE_HEADER_GAP = 52;

/**
 * Backdrop opacity of the ion-modal sheet (Ionic MD `--backdrop-opacity: 0.32`).
 * D-29: the original DOES dim what stays visible above the sheet — the page
 * header reads washed-out in docs/evidence/measurement/screen-03.
 */
export const GUIDE_BACKDROP_OPACITY = 0.32;

/**
 * Fallback aspect ratio for the guide image before its natural size is known.
 * screen-03: the image box is 320×~314 inside a 360dp sheet.
 */
const GUIDE_IMAGE_FALLBACK_ASPECT = 320 / 314;

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
export function GuideMeasurementScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const { theme } = useTheme();
  // Edge-to-edge (targetSdk 36 / RN 0.85): this screen is a full-screen stack route
  // with no tab bar underneath, so its scroll content ends flush with the window
  // bottom — i.e. UNDER the Android system navigation bar. Pad by the bottom inset.
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { configMeasurement, loadImage } = useConfigContext();

  /*
   * DEVICE BUG F-11 (Redmi Note 10S, Android 13, edge-to-edge / targetSdk 36):
   * the guide filled the whole window, so its close button sat UNDER the status
   * bar and was practically untappable.
   *
   * The original is an ion-modal sheet (`initialBreakpoint: 1`,
   * register-measurement.page.ts:199-227) presented over the register page, so
   * the page header stays visible above it and the X sits clearly below the
   * status bar — docs/evidence/measurement/screen-03-guide-flow1-step1.png.
   *
   * SHEET HEIGHT (petición del usuario, 2026-09-10): the sheet must be exactly as
   * tall as its content — image + title + steps + checkbox + button — and anchored
   * to the BOTTOM of the window, like the Home help sheets (`UvaBottomSheet` with
   * `enableDynamicSizing`, components/ui/BottomSheet.tsx). That is also what
   * `ion-modal { --height: auto }` does in the original. It used to be a
   * `flex: 1` sheet pinned by `marginTop: sheetTop`, i.e. always full height.
   *
   * `sheetMaxHeight` is the ceiling that replaces the old fixed top offset: the
   * window minus the status-bar inset minus the Header height (paddingTop 8 +
   * toolbar minHeight 44, header/Header.tsx). Short content ⇒ short sheet; tall
   * content ⇒ the sheet stops at the ceiling and its ScrollView scrolls inside.
   * Either way everything in the sheet — the absolutely positioned X included —
   * lays out at or below `insets.top + GUIDE_HEADER_GAP`, which is what F-11
   * required. The BOTTOM inset is handled by the button container.
   */
  const sheetMaxHeight = Math.max(
    windowHeight - insets.top - GUIDE_HEADER_GAP,
    1,
  );

  const { taskId, guideKey: initialGuideKey } = route.params;

  const [guide, setGuide] = useState<Guide | null>(null);
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [isArrayText, setIsArrayText] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imgAspect, setImgAspect] = useState<number>(
    GUIDE_IMAGE_FALLBACK_ASPECT,
  );
  /*
   * D-28 — "Mostrar automaticamente."
   * The original checkbox (guide-measurement.component.html:39-47) has NO binding
   * at all: no [checked], no ngModel, no (ionChange). It therefore renders
   * UNCHECKED on every open and persists nothing — `showAutomatic` is forced to
   * `true` in code before the guide is opened anyway
   * (register-measurement.page.ts:174). RN shipped it pre-checked AND wrote a
   * Preferences key that nothing ever read. Both are gone: local state only,
   * starting unchecked, exactly like the original.
   */
  const [showAutomatic, setShowAutomatic] = useState(false);

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
      const nextGuideKey = (guide as (Guide & { nextGuide?: string }) | null)
        ?.nextGuide;
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
        navigation.replace('GuideMeasurement', {
          taskId,
          guideKey: nextGuideKey,
        });
      } else {
        navigation.goBack();
      }
    },
    [guide, navigation, taskId],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  /**
   * Stage shared by every state: the dimming backdrop (D-29) over the strip of
   * page left visible above the sheet, then the sheet itself.
   */
  const withBackdrop = (children: React.ReactNode) => (
    <View style={styles.root} testID="guide-root">
      {/* ion-modal backdrop; tapping it dismisses, like `backdropDismiss: true`
          (register-measurement.page.ts:212). */}
      <Pressable
        style={[styles.backdrop, { opacity: GUIDE_BACKDROP_OPACITY }]}
        onPress={() => closeModal(false)}
        testID="guide-backdrop"
        accessibilityRole="button"
        accessibilityLabel="Cerrar guía"
      />
      {children}
    </View>
  );

  if (loading) {
    return withBackdrop(
      <View
        style={[
          styles.loadingContainer,
          styles.sheet,
          { maxHeight: sheetMaxHeight, backgroundColor: theme.colors.gray[50] },
        ]}
        testID="guide-sheet"
      >
        <ActivityIndicator color={theme.colors.blue[500]} size="large" />
      </View>,
    );
  }

  if (!guide) {
    return withBackdrop(
      <View
        style={[
          styles.container,
          styles.sheet,
          { maxHeight: sheetMaxHeight, backgroundColor: theme.colors.gray[50] },
        ]}
        testID="guide-sheet"
      >
        <Text
          style={[
            styles.errorText,
            {
              fontFamily: fontFamilyForWeight('400'),
              color: theme.semanticColors.textSecondary,
            },
          ]}
        >
          Guía no disponible
        </Text>
        <TouchableOpacity
          style={[
            styles.btnPrimary,
            { backgroundColor: theme.colors.blue[600] },
          ]}
          onPress={() => closeModal(false)}
        >
          <Text
            style={[
              styles.btnPrimaryText,
              { fontFamily: fontFamilyForWeight('600') },
            ]}
          >
            Cerrar
          </Text>
        </TouchableOpacity>
      </View>,
    );
  }

  // Button label: "Siguiente" if there is a nextGuide, "Entendido" otherwise
  const buttonLabel = (guide as Guide & { nextGuide?: string }).nextGuide
    ? 'Siguiente'
    : 'Entendido';

  const guideIcon = (
    guide as Guide & {
      icon?: { enable?: boolean; colorHex?: string };
    }
  ).icon;
  const guideColor = guideIcon?.colorHex ?? theme.colors.blue[700];

  return withBackdrop(
    <>
      <View
        style={[
          styles.container,
          styles.sheet,
          { maxHeight: sheetMaxHeight, backgroundColor: theme.colors.gray[50] },
        ]}
        testID="guide-sheet"
      >
        {/* D-14/D-29 — sheet drag handle. Ionic renders `.modal-handle` for every
            breakpoint sheet: 36×4, absolute at top 5, centred, step-350 grey. */}
        <View style={styles.dragHandle} testID="guide-drag-handle" />

        {/* Close button — .btn_close: absolute top-right, teal #10BCCA bg, 38px, borderRadius 4
            Original: ion-button with ion-icon name="close" (Ionicons vectorial icon).
            `top: 10` is now relative to the sheet, which already starts below the
            status bar + header (see sheetTop above) — device bug F-11. */}
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
          testID="guide-scroll"
        >
          {/* Guide image — `<ion-img>` inside `.guide { padding: 10px 20px 30px }`:
              full content width, natural aspect ratio (D-27). */}
          {imgUri ? (
            <Image
              source={{ uri: imgUri }}
              style={[styles.guideImage, { aspectRatio: imgAspect }]}
              resizeMode="contain"
              /* The decoded size is the only reliable source for the natural
                 aspect ratio of an S3 asset; until it arrives the sheet uses the
                 measured ratio of the reference capture. */
              onLoad={(event) => {
                const source = event.nativeEvent?.source;
                if (source?.width && source?.height) {
                  setImgAspect(source.width / source.height);
                }
              }}
              testID="guide-image"
            />
          ) : null}

          {/* Guide title row — `.title { display:flex; justify-content:space-between }`
              (guide-measurement.component.scss:14-31): the name on the left and the
              24×24 `guide.icon` on the right, both painted with `icon.colorHex`
              (↑ green for máximos, ↓ red for mínimos — D-26). The icon used to be
              rendered as a separate 64×64 centred <Image>, which additionally could
              never paint because the RACIMO icons are SVG (see ConfigIcon). */}
          {guide.name ? (
            <View style={styles.titleRow} testID="guide-title-row">
              <Text
                style={[
                  styles.guideTitle,
                  { fontFamily: fontFamilyForWeight('700'), color: guideColor },
                ]}
              >
                {guide.name}
              </Text>
              {guideIcon?.enable !== false && iconUri ? (
                <ConfigIcon
                  uri={iconUri}
                  size={24}
                  color={guideIcon?.colorHex}
                  testID="guide-icon"
                />
              ) : null}
            </View>
          ) : null}

          {/* Guide text — array or HTML */}
          {isArrayText ? (
            <View style={styles.arrayTextContainer}>
              {(guide.text as unknown as string[]).map((textItem, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.arrayTextItem,
                    {
                      fontFamily: fontFamilyForWeight('400'),
                      color: theme.semanticColors.text,
                    },
                  ]}
                >
                  {textItem}
                </Text>
              ))}
            </View>
          ) : (
            <RichText html={guide.text as string} baseFontSize={15} />
          )}

          {/* Checkbox "Mostrar automaticamente."
              Original: <ion-checkbox> with border-radius:4px, color=uva_blue-600, and
              the label written WITHOUT the accent and WITH a full stop
              (guide-measurement.component.html:45). It starts unchecked — D-28. */}
          <Pressable
            style={styles.checkboxRow}
            onPress={() => setShowAutomatic((v) => !v)}
            testID="guide-show-automatic"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: showAutomatic }}
          >
            <View
              style={[
                styles.checkboxBox,
                showAutomatic
                  ? {
                      backgroundColor: theme.colors.blue[600],
                      borderColor: theme.colors.blue[600],
                    }
                  : { borderColor: theme.colors.blue[600] },
              ]}
              testID="guide-show-automatic-box"
            >
              {showAutomatic ? (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={theme.colors.white}
                />
              ) : null}
            </View>
            <Text
              style={[
                styles.checkboxLabel,
                {
                  fontFamily: fontFamilyForWeight('500'),
                  color: theme.colors.gray[700],
                },
              ]}
            >
              Mostrar automaticamente.
            </Text>
          </Pressable>
        </ScrollView>

        {/* Action buttons.
            D-25: on an edge-to-edge device (targetSdk 36) this container ends flush
            with the window bottom, i.e. UNDER the Android navigation bar, so
            "Entendido" was unreachable (frames 056 / 065). Pad by the bottom inset —
            the TOP offset (sheetTop) is untouched. */}
        <View
          style={[
            styles.buttonsContainer,
            {
              paddingBottom:
                styles.buttonsContainer.paddingBottom + insets.bottom,
            },
          ]}
          testID="guide-buttons"
        >
          <TouchableOpacity
            style={[
              styles.btnPrimary,
              { backgroundColor: theme.colors.blue[600] },
            ]}
            onPress={() => closeModal(true)}
            testID="guide-btn-ok"
          >
            <Text
              style={[
                styles.btnPrimaryText,
                {
                  fontFamily: fontFamilyForWeight('500'),
                  color: theme.colors.white,
                },
              ]}
            >
              {buttonLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>,
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /** Transparent stage: backdrop + sheet (the route itself is presented modally). */
  root: {
    flex: 1,
  },
  /** ion-modal backdrop over the strip of page left visible above the sheet. */
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  /**
   * Content box of the sheet. NO `flex: 1`: its height is the sum of its children
   * (image + title + steps + checkbox + button), which is what makes the sheet as
   * tall as its content — `ion-modal { --height: auto }` / `enableDynamicSizing`.
   */
  container: {},
  /**
   * Sheet chrome shared by the loading / error / content states.
   *
   * `marginTop: 'auto'` anchors the sheet to the BOTTOM of the transparent modal
   * route (the backdrop is absolutely positioned, so the sheet is the only in-flow
   * child). `maxHeight` is applied inline — it depends on the runtime window height
   * and status-bar inset — and is the ceiling
   * `windowHeight − insets.top − GUIDE_HEADER_GAP`.
   * The rounded top corners mirror the ion-modal sheet of the original.
   */
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
  },
  /**
   * `flexShrink: 1` (RN's default is 0) is what lets the scroller give up height
   * once the sheet hits `maxHeight`, so tall guides scroll INSIDE the sheet instead
   * of pushing the "Entendido" button off-screen. `flexGrow: 0` keeps a short guide
   * from stretching the sheet to the ceiling.
   */
  scroll: { flexShrink: 1, flexGrow: 0 },
  /**
   * `.guide { padding: 10px 20px 30px 20px; gap: 20px }`
   * (guide-measurement.component.scss:3-9). The close button is absolutely
   * positioned in the original too, so it does NOT push the content down — it
   * overlaps the top-right corner of the image, exactly as in screen-03.
   */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
    gap: 20,
  },
  // Ionic `.modal-handle`: 36×4, top 5, centred, --ion-color-step-350.
  dragHandle: {
    position: 'absolute',
    top: 5,
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 8,
    backgroundColor: '#C0C0BE',
    zIndex: 10,
  },
  /**
   * The loading sheet has no content to measure yet, so it gets an explicit
   * placeholder height instead of `flex: 1` (which would make it full-height and
   * defeat the content-sized sheet).
   */
  loadingContainer: {
    height: 200,
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
  /**
   * D-27 — `<ion-img>` is a block image at width:100% of `.guide`'s content box
   * (320dp on a 360dp sheet) whose height follows the natural aspect ratio.
   * `aspectRatio` is supplied at render time from Image.getSize.
   */
  guideImage: {
    width: '100%',
    alignSelf: 'stretch',
  },
  // `.title { display:flex; justify-content:space-between; align-items:center; width:100% }`
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  // `.title p`: 16px / 700, line-height 150%
  guideTitle: {
    fontSize: 16,
    lineHeight: 24,
    flexShrink: 1,
  },
  arrayTextContainer: {
    gap: 8,
  },
  arrayTextItem: {
    fontSize: 15,
    lineHeight: 22,
  },
  // `.ion-align-self-start` wrapper — the row hugs the left edge (html:39-47).
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
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
  /**
   * `.container_button { width: 100% }` inside `.guide`: no separator rule, the
   * sheet's 20dp side padding, the 20dp flex gap above it and the sheet's 30dp
   * bottom padding (guide-measurement.component.scss:3-9, 38-40).
   * `paddingBottom` MUST stay a number — the render adds `insets.bottom` to it.
   */
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    gap: 8,
  },
  // ion-button (MD, expand="block"): full width, 36dp tall, 8dp radius, weight 500.
  btnPrimary: {
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 15,
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
