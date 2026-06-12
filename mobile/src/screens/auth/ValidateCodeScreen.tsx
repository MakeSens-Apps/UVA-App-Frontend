/**
 * B12 — ValidateCodeScreen (placeholder)
 * Full implementation: B14
 *
 * Portability matrix: ValidateCodePage → Rewrite → B14
 * Navigation: AuthStack > ValidateCode
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ValidateCode'>;

export function ValidateCodeScreen({ route }: Props): React.JSX.Element {
  const { type } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ValidateCode</Text>
      <Text style={styles.subtitle}>type: {type}</Text>
      <Text style={styles.subtitle}>[Placeholder — B14 implementa]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});

export default ValidateCodeScreen;
