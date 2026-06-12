/**
 * B12 — RegisterProjectFormScreen (placeholder)
 * Full implementation: B14
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'RegisterProjectForm'>;

export function RegisterProjectFormScreen({ route }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RegisterProjectForm</Text>
      <Text style={styles.subtitle}>racimoCode: {route.params.racimoCode}</Text>
      <Text style={styles.subtitle}>[Placeholder — B14 implementa]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default RegisterProjectFormScreen;
