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
 * Risks addressed: R-17, R-18, R-36
 */

import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import RNBottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';

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
    const sheetRef = useRef<RNBottomSheet>(null);

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.snapToIndex(0),
      dismiss: () => sheetRef.current?.close(),
    }));

    return (
      <RNBottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose={enablePanDownToClose}
        backdropComponent={renderBackdrop}
        onClose={onDismiss}
        backgroundStyle={{ backgroundColor: theme.colors.white }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.gray[300] }}
      >
        <BottomSheetView style={[styles.content, contentStyle]}>
          {children}
        </BottomSheetView>
      </RNBottomSheet>
    );
  },
);

// ─── UvaFullBottomSheet ────────────────────────────────────────────────────────

export interface UvaFullBottomSheetProps
  extends Omit<UvaBottomSheetProps, 'snapPoints'> {
  /** Whether to show a close button in the top-right corner. */
  showCloseButton?: boolean;
  /** Label for the close button. Defaults to '×'. */
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
  { onDismiss, children, contentStyle, showCloseButton = false, closeButtonLabel = '×', enablePanDownToClose = false },
  ref,
) {
  const { theme } = useTheme();
  const sheetRef = useRef<RNBottomSheet>(null);

  const dismiss = useCallback(() => sheetRef.current?.close(), []);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.snapToIndex(0),
    dismiss,
  }));

  return (
    <RNBottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['100%']}
      enablePanDownToClose={enablePanDownToClose}
      backdropComponent={renderBackdrop}
      onClose={onDismiss}
      backgroundStyle={{ backgroundColor: theme.colors.white }}
      handleComponent={null}
    >
      <BottomSheetView style={[styles.fullContent, contentStyle]}>
        {showCloseButton && (
          <View style={styles.closeRow}>
            <Pressable onPress={dismiss} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>{closeButtonLabel}</Text>
            </Pressable>
          </View>
        )}
        {children}
      </BottomSheetView>
    </RNBottomSheet>
  );
});

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 22,
    color: '#525252',
    fontFamily: 'Montserrat-Regular',
  },
});
