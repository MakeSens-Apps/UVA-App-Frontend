/**
 * B12 — ProfileScreen (placeholder)
 * Full implementation: B16
 *
 * Portability matrix: ProfilePage → Rewrite → B16
 * Navigation: AppTabs > Profile
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppTabsParamList, AppStackParamList } from '@/navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabsParamList, 'Profile'>,
  NativeStackScreenProps<AppStackParamList>
>;

export function ProfileScreen({ navigation }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.subtitle}>[Placeholder — B16 implementa]</Text>
      <Pressable style={styles.button} onPress={() => navigation.navigate('Achievement')}>
        <Text style={styles.buttonText}>Logros</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => navigation.navigate('Alerts')}>
        <Text style={styles.buttonText}>Alertas</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => navigation.navigate('PersonalInfo')}>
        <Text style={styles.buttonText}>Info Personal</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => navigation.navigate('Configuration')}>
        <Text style={styles.buttonText}>Configuración</Text>
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
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});

export default ProfileScreen;
