/**
 * B12 — OtpScreen (placeholder)
 * Full implementation: B14
 *
 * Portability matrix: OtpPage → Rewrite → B14
 * Navigation: AuthStack > Otp
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

export function OtpScreen({ route, navigation }: Props): React.JSX.Element {
  const { type, phone } = route.params;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>OTP</Text>
      <Text style={styles.subtitle}>type: {type} | phone: {phone}</Text>
      <Text style={styles.subtitle}>[Placeholder — B14 implementa]</Text>
      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('ValidateCode', { type, phone })}
      >
        <Text style={styles.buttonText}>Validar código (test)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
  button: {
    backgroundColor: '#1a4a7a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default OtpScreen;
