/**
 * B10 — BottomSheet wrapper
 *
 * Ported from: IonModal + ModalController pattern
 *
 * Wraps @gorhom/bottom-sheet to provide the RN equivalent of the
 * IonModal / ModalController paradigm used extensively in the Ionic app.
 *
 * Two sub-variants:
 *   1. UvaBottomSheet — standard draggable bottom sheet
 *   2. UvaFullBottomSheet — full-height sheet (replaces IonModal fullscreen)
 *
 * Ref-based API mirrors ModalController.create + present + dismiss:
 *   const sheetRef = useRef<BottomSheetRef>(null);
 *   sheetRef.current?.present();
 *   sheetRef.current?.dismiss();
 *
 * Device review fixes (docs/evidence/device-2026-09-07):
 *   - D-13 — an `ion-modal` is an overlay on the whole app window: it covers the tab bar
 *     and its backdrop dims it too (docs/evidence/home/screen-05..08). Rendered inline in
 *     the screen tree, a gorhom sheet is clipped by the tab navigator, leaving a white
 *     strip at the bottom and an undimmed tab bar. The sheet is therefore hosted in a
 *     full-window RN `Modal` (statusBar + navigationBar translucent).
 *   - D-14 — every `ion-modal` with `[breakpoints]` shows a drag handle; the full sheet
 *     had `handleComponent={null}`. Restored as the grey pill of `screen-05..08`.
 *   - D-12 — close button is a white ✕ on a rounded teal square (`ion-button` with
 *     `color="uva_blue-600"` + `<ion-icon name="close" slot="icon-only">`), not a bare
 *     grey glyph. See `home.page.scss %modalCommons .contener_buttons_actions`.
 *
 * Risks addressed: R-17, R-18, R-36
 */

import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RNBottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

// ─── Public API ─────────────────────────────────────────────────────────────────

export interface BottomSheetRef {
  /** Present the bottom sheet (equivalent to ModalController.present). */
  present: () => void;
  /** Dismiss the bottom sheet (equivalent to ModalController.dismiss). */
  dismiss: () => void;
}

export interface UvaBottomSheetProps {
  /** Snap points (percentage strings or pixel numbers). Defaults to ['50%', '90%']. */
  snapPoints?: (string | number)[];
  /** Whether the sheet can be dismissed by dragging down. Defaults to true. */
  enablePanDownToClose?: boolean;
  /** Callback fired after the sheet fully closes. */
  onDismiss?: () => void;
  /** Content to render inside the sheet. */
  children: React.ReactNode;
  /** Optional style for the content container. */
  contentStyle?: StyleProp<ViewStyle>;
}

// ─── Backdrop (dimmed overlay) ─────────────────────────────────────────────────

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
);

// ─── Drag handle (D-14) ────────────────────────────────────────────────────────
// Original: every home/guide modal is an `ion-modal` with `[breakpoints]="[0,1]"`, which
// renders Ionic's grey handle pill at the top (docs/evidence/home/screen-05..08).

const HANDLE_INDICATOR_STYLE: ViewStyle = {
  backgroundColor: '#D4D4D4', // --Colors-Gray-300
  width: 36,
  height: 4,
};

// ─── Full-window host (D-13) ───────────────────────────────────────────────────

/**
 * Shared present/dismiss plumbing for a sheet hosted inside a full-window `Modal`.
 *
 * `present()` mounts the Modal; the sheet mounts at index 0 and animates in on its own.
 * `dismiss()` runs the sheet's closing animation and the Modal unmounts from `onClose`,
 * so the exit transition is preserved.
 */
function useSheetHost(onDismiss?: () => void) {
  const [visible, setVisible] = useState(false);
  const sheetRef = useRef<RNBottomSheet>(null);

  const present = useCallback(() => setVisible(true), []);

  const dismiss = useCallback(() => {
    if (sheetRef.current) {
      // Animates out; `onClose` unmounts the host Modal.
      sheetRef.current.close();
    } else {
      setVisible(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    onDismiss?.();
  }, [onDismiss]);

  return { visible, sheetRef, present, dismiss, handleClose };
}

// ─── UvaBottomSheet ────────────────────────────────────────────────────────────

/**
 * UvaBottomSheet
 *
 * Draggable bottom sheet with snap points.
 *
 * @example
 *   const sheetRef = useRef<BottomSheetRef>(null);
 *
 *   // In JSX:
 *   <UvaBottomSheet ref={sheetRef} snapPoints={['40%', '80%']}>
 *     <MyContent />
 *   </UvaBottomSheet>
 *
 *   // To open:
 *   sheetRef.current?.present();
 */
export const UvaBottomSheet = forwardRef<BottomSheetRef, UvaBottomSheetProps>(
  function UvaBottomSheet(
    {
      snapPoints = ['50%', '90%'],
      enablePanDownToClose = true,
      onDismiss,
      children,
      contentStyle,
    },
    ref,
  ) {
    const { theme } = useTheme();
    const { visible, sheetRef, present, dismiss, handleClose } =
      useSheetHost(onDismiss);
    // Edge-to-edge (targetSdk 36): the sheet reaches the bottom of the window, which
    // is UNDER the Android system navigation bar. Pad the content by the bottom inset
    // so the last row / action button stays tappable above the nav bar.
    const insets = useSafeAreaInsets();

    useImperativeHandle(ref, () => ({ present, dismiss }));

    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={dismiss}
      >
        <GestureHandlerRootView style={styles.host}>
          <RNBottomSheet
            ref={sheetRef}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose={enablePanDownToClose}
            backdropComponent={renderBackdrop}
            onClose={handleClose}
            backgroundStyle={{ backgroundColor: theme.colors.white }}
            handleIndicatorStyle={HANDLE_INDICATOR_STYLE}
          >
            <BottomSheetView
              style={[
                styles.content,
                { paddingBottom: styles.content.paddingBottom + insets.bottom },
                contentStyle,
              ]}
            >
              {children}
            </BottomSheetView>
          </RNBottomSheet>
        </GestureHandlerRootView>
      </Modal>
    );
  },
);

// ─── UvaFullBottomSheet ────────────────────────────────────────────────────────

export interface UvaFullBottomSheetProps
  extends Omit<UvaBottomSheetProps, 'snapPoints'> {
  /** Whether to show a close button in the top-right corner. */
  showCloseButton?: boolean;
  /** Label for the close button. Defaults to '✕'. */
  closeButtonLabel?: string;
}

/**
 * UvaFullBottomSheet
 *
 * Full-height bottom sheet (equivalent to IonModal with fullscreen breakpoint).
 * Used for guide flows, registration modals, etc.
 */
export const UvaFullBottomSheet = forwardRef<
  BottomSheetRef,
  UvaFullBottomSheetProps
>(function UvaFullBottomSheet(
  {
    onDismiss,
    children,
    contentStyle,
    showCloseButton = false,
    closeButtonLabel = '✕',
    enablePanDownToClose = false,
  },
  ref,
) {
  const { theme } = useTheme();
  const { visible, sheetRef, present, dismiss, handleClose } =
    useSheetHost(onDismiss);
  // See UvaBottomSheet — bottom inset for the edge-to-edge system nav bar.
  const insets = useSafeAreaInsets();

  useImperativeHandle(ref, () => ({ present, dismiss }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={dismiss}
    >
      <GestureHandlerRootView style={styles.host}>
        <RNBottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={['100%']}
          enablePanDownToClose={enablePanDownToClose}
          backdropComponent={renderBackdrop}
          onClose={handleClose}
          backgroundStyle={{ backgroundColor: theme.colors.white }}
          handleIndicatorStyle={HANDLE_INDICATOR_STYLE}
        >
          <BottomSheetView
            style={[
              styles.fullContent,
              { paddingBottom: styles.fullContent.paddingBottom + insets.bottom },
              contentStyle,
            ]}
          >
            {showCloseButton && (
              <View style={styles.closeRow}>
                <Pressable
                  onPress={dismiss}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  testID="bottom-sheet-close"
                >
                  <Text style={styles.closeButtonText}>{closeButtonLabel}</Text>
                </Pressable>
              </View>
            )}
            {children}
          </BottomSheetView>
        </RNBottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
});

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Full-window host inside the RN Modal: the sheet and its backdrop lay out against
  // the whole app window, so both cover the tab bar (D-13).
  host: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  fullContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  closeRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  // D-12 — original: `<ion-button color="uva_blue-600"><ion-icon name="close" …>`,
  // i.e. a filled rounded teal square with a white glyph, 36px wide
  // (home.page.scss %modalCommons .contener_buttons_actions ion-button { width: 36px }).
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1097AA', // --Colors-Blue-600 (uva_blue-600)
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    lineHeight: 22,
    color: '#FFFFFF',
    fontFamily: 'Montserrat-Regular',
  },
});
