/**
 * B12 — ValidateProjectScreen (placeholder)
 * Full implementation: B14
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';
import { devBypassToApp } from '@/navigation/devBypass';

type Props = NativeStackScreenProps<AuthStackParamList, 'ValidateProject'>;

export function ValidateProjectScreen({ route }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ValidateProject</Text>
      <Text style={styles.subtitle}>racimoCode: {route.params.racimoCode}</Text>
      <Text style={styles.subtitle}>[Placeholder — B14 implementa]</Text>
      <TouchableOpacity style={styles.button} onPress={() => devBypassToApp()}>
        <Text style={styles.buttonText}>Ir al inicio (test)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
  button: { marginTop: 16, backgroundColor: '#10BCCA', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default ValidateProjectScreen;
