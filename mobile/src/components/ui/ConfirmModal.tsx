/**
 * B10 — ConfirmModal
 *
 * Ported from: src/app/components/alert/alert.component.ts
 *
 * Replaces: Angular AlertComponent + ModalController.create/present/onDidDismiss
 *
 * Contract preserved:
 *   - content    — HTML body (rendered via RichText/B09)
 *   - ShowCancelButton — whether the cancel button is visible
 *   - textCancelButton — label for the cancel button
 *   - textOkButton — label for the OK button
 *   - reverseButton — swap OK/CANCEL order
 *   - bordersInCancelBtn — outline vs clear style for cancel
 *   - colorBtn — token name for button color (mapped to theme)
 *
 * Returns a Promise<'OK' | 'CANCEL'> via the `onResult` callback.
 * Usage pattern (replaces `modalCtrl.create + present + onDidDismiss`):
 *
 *   const result = await showConfirmModal({ ... });
 *   if (result === 'OK') { ... }
 *
 * Risks addressed: R-17, R-08, R-06, R-42
 *
 * NOTE: This component is self-contained and is used by useConfirmModal().
 * Callers should use the `useConfirmModal` hook rather than this directly.
 */

import React from 'react';
import {
  Modal,
  View,
  Pressable,
  Text,
  StyleSheet,
} from 'react-native';

import { RichText } from '@/components/rich-text/RichText';
import { useTheme } from '@/theme/ThemeProvider';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type ConfirmModalResult = 'OK' | 'CANCEL';

export interface ConfirmModalProps {
  /** Whether the modal is visible. */
  visible: boolean;
  /** HTML body content (rendered via RichText). */
  content: string;
  /** Whether to show the cancel button. Defaults to true. */
  showCancelButton?: boolean;
  /** Label for the cancel button. */
  textCancelButton?: string;
  /** Label for the OK button. */
  textOkButton?: string;
  /** If true, renders CANCEL button before OK button. */
  reverseButton?: boolean;
  /** If true, cancel button gets an outline border; false = clear style. */
  bordersInCancelBtn?: boolean;
  /**
   * Theme color key for the buttons.
   * Maps to theme token: 'uva_blue-500' → colors.blue[500], etc.
   * Defaults to 'uva_blue-500'.
   */
  colorBtn?: string;
  /** Invoked when the user taps OK or CANCEL. */
  onResult: (result: ConfirmModalResult) => void;
}

// ─── Color mapping (original: [color]="colorBtn" Ionic token) ──────────────────

/**
 * Maps an Ionic color token (e.g. 'uva_blue-500') to a concrete hex value
 * using the theme's color palette.
 */
function resolveButtonColor(
  colorBtn: string,
  theme: ReturnType<typeof useTheme>['theme'],
): string {
  // Direct theme map based on the tokens used in the app
  const colorMap: Record<string, string> = {
    'uva_blue-500': theme.colors.blue[500],
    'uva_blue-600': theme.colors.blue[600],
    'uva_green-500': theme.colors.green[500],
    'uva_orange-500': theme.colors.orange[500],
    danger: theme.colors.danger,
    primary: theme.semanticColors.primary,
  };
  return colorMap[colorBtn] ?? theme.semanticColors.primary;
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * ConfirmModal
 *
 * A self-contained modal that renders HTML content and offers OK/CANCEL buttons.
 * Resolves the user action via `onResult`.
 *
 * @example
 *   <ConfirmModal
 *     visible={isOpen}
 *     content={htmlContent}
 *     textOkButton="Confirmar"
 *     textCancelButton="Cancelar"
 *     onResult={(r) => { setIsOpen(false); if (r === 'OK') doAction(); }}
 *   />
 */
export function ConfirmModal({
  visible,
  content,
  showCancelButton = true,
  textCancelButton = '',
  textOkButton = '',
  reverseButton = false,
  bordersInCancelBtn = true,
  colorBtn = 'uva_blue-500',
  onResult,
}: ConfirmModalProps): React.JSX.Element {
  const { theme } = useTheme();
  const resolvedColor = resolveButtonColor(colorBtn, theme);

  const handleOk = () => onResult('OK');
  const handleCancel = () => onResult('CANCEL');

  const cancelButton = showCancelButton ? (
    <Pressable
      onPress={handleCancel}
      style={[
        styles.button,
        bordersInCancelBtn
          ? [styles.buttonOutline, { borderColor: resolvedColor }]
          : styles.buttonClear,
      ]}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonText, { color: resolvedColor }]}>
        {textCancelButton}
      </Text>
    </Pressable>
  ) : null;

  const okButton = (
    <Pressable
      onPress={handleOk}
      style={[styles.button, styles.buttonFilled, { backgroundColor: resolvedColor }]}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonText, styles.buttonTextFilled]}>
        {textOkButton}
      </Text>
    </Pressable>
  );

  const buttons = reverseButton
    ? [okButton, cancelButton]
    : [cancelButton, okButton];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* HTML body rendered by RichText (B09) */}
          <View style={styles.contentContainer}>
            <RichText html={content} baseFontSize={14} />
          </View>

          {/* Button row */}
          <View
            style={[
              styles.buttonContainer,
              reverseButton && styles.buttonContainerReversed,
            ]}
          >
            {buttons.map((btn, idx) =>
              btn ? React.cloneElement(btn, { key: idx }) : null,
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)', // more transparent — login bg remains visible (alert.component.scss:3-14)
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20, // .modal-wrapper border-radius:20px (alert.component.scss:41-44)
    padding: 20,
    width: '100%',
    maxWidth: 400,
    // elevation replaces box-shadow (R-06 / R-42)
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  contentContainer: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', // .button-container (alert.component.scss:22-27)
    gap: 10,
  },
  buttonContainerReversed: {
    flexDirection: 'row-reverse',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1, // ion-button flex:1 (alert.component.scss:16-20)
    alignItems: 'center',
  },
  buttonFilled: {
    // backgroundColor set dynamically
  },
  buttonOutline: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  buttonClear: {
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Montserrat-SemiBold',
  },
  buttonTextFilled: {
    color: '#FFFFFF',
  },
});

// ─── useConfirmModal hook ──────────────────────────────────────────────────────

/**
 * useConfirmModal
 *
 * Convenience hook that manages modal state and returns a show() function
 * that resolves a Promise<ConfirmModalResult>.
 *
 * Usage (replaces `modalCtrl.create + present + onDidDismiss`):
 *
 *   const { confirmModal, show } = useConfirmModal();
 *
 *   // In JSX: {confirmModal}
 *
 *   // In handler:
 *   const result = await show({
 *     content: '<p>¿Confirmar?</p>',
 *     textOkButton: 'Sí',
 *     textCancelButton: 'No',
 *   });
 *   if (result === 'OK') { ... }
 */
export type ShowConfirmModalOptions = Omit<ConfirmModalProps, 'visible' | 'onResult'>;

export function useConfirmModal(): {
  confirmModal: React.JSX.Element | null;
  show: (options: ShowConfirmModalOptions) => Promise<ConfirmModalResult>;
} {
  const [visible, setVisible] = React.useState(false);
  const [options, setOptions] = React.useState<ShowConfirmModalOptions>({
    content: '',
    textOkButton: 'OK',
    textCancelButton: 'Cancelar',
  });
  const resolverRef = React.useRef<((result: ConfirmModalResult) => void) | null>(null);

  const show = React.useCallback(
    (opts: ShowConfirmModalOptions): Promise<ConfirmModalResult> => {
      return new Promise<ConfirmModalResult>((resolve) => {
        setOptions(opts);
        resolverRef.current = resolve;
        setVisible(true);
      });
    },
    [],
  );

  const handleResult = React.useCallback((result: ConfirmModalResult) => {
    setVisible(false);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  const confirmModal = (
    <ConfirmModal
      {...options}
      visible={visible}
      onResult={handleResult}
    />
  );

  return { confirmModal, show };
}

export default ConfirmModal;
