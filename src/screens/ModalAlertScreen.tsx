/**
 * B12 — ModalAlertScreen
 *
 * Modal group screen that presents a confirm/cancel modal.
 * Reuses ConfirmModal from B10 (as full-screen modal overlay in the App stack).
 *
 * Portability matrix: AlertComponent → ConfirmModal → B10
 * Navigation: AppStack > ModalAlert (presentation: 'modal')
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'ModalAlert'>;

export function ModalAlertScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const {
    title,
    message,
    confirmLabel = 'OK',
    cancelLabel = 'Cancelar',
  } = route.params;

  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.confirmButton]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1a4a7a' },
  message: { fontSize: 14, color: '#444' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  button: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cancelButton: { backgroundColor: '#eee' },
  confirmButton: { backgroundColor: '#1a4a7a' },
  cancelText: { color: '#444', fontWeight: '600' },
  confirmText: { color: '#fff', fontWeight: '600' },
});

export default ModalAlertScreen;
