/**
 * B10 — LoadingOverlay
 *
 * Ported from: LoadingController (IonLoading) pattern
 *
 * Replaces:
 *   loadingCtrl.create({ message }) + present() + dismiss()
 *
 * Maps to:
 *   ActivityIndicator rendered in a full-screen overlay Modal
 *
 * API:
 *   <LoadingOverlay visible={isLoading} message="Cargando..." />
 *
 * Hook:
 *   const { loadingOverlay, showLoading, hideLoading } = useLoadingOverlay();
 *
 * Risks addressed: R-44
 */

import React from 'react';
import {
  Modal,
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
} from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

// ─── Component ─────────────────────────────────────────────────────────────────

export interface LoadingOverlayProps {
  /** Whether the overlay is visible. */
  visible: boolean;
  /** Optional message below the spinner. */
  message?: string;
}

/**
 * LoadingOverlay
 *
 * Renders a semi-transparent overlay with an ActivityIndicator.
 * Equivalent to IonLoading.
 *
 * @example
 *   <LoadingOverlay visible={isLoading} message="Sincronizando..." />
 */
export function LoadingOverlay({
  visible,
  message,
}: LoadingOverlayProps): React.JSX.Element {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <ActivityIndicator
            size="large"
            color={theme.semanticColors.primary}
          />
          {message ? (
            <Text
              style={[
                styles.message,
                { color: theme.semanticColors.text },
              ]}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 120,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    gap: 12,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
});

// ─── useLoadingOverlay hook ────────────────────────────────────────────────────

/**
 * useLoadingOverlay
 *
 * Manages loading overlay state.
 *
 * Usage (replaces `loadingCtrl.create + present + dismiss`):
 *
 *   const { loadingOverlay, showLoading, hideLoading } = useLoadingOverlay();
 *
 *   // In JSX: {loadingOverlay}
 *
 *   // In handler:
 *   showLoading('Guardando...');
 *   await saveData();
 *   hideLoading();
 */
export function useLoadingOverlay(): {
  loadingOverlay: React.JSX.Element;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
  isLoading: boolean;
} {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState<string | undefined>();

  const showLoading = React.useCallback((msg?: string) => {
    setMessage(msg);
    setVisible(true);
  }, []);

  const hideLoading = React.useCallback(() => {
    setVisible(false);
    setMessage(undefined);
  }, []);

  const loadingOverlay = (
    <LoadingOverlay visible={visible} message={message} />
  );

  return { loadingOverlay, showLoading, hideLoading, isLoading: visible };
}

export default LoadingOverlay;
