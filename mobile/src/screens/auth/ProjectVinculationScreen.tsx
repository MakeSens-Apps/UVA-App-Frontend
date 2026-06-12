/**
 * B12 — ProjectVinculationScreen (placeholder)
 * Full implementation: B14
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ProjectVinculation'>;

export function ProjectVinculationScreen({ navigation }: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ProjectVinculation</Text>
      <Text style={styles.subtitle}>[Placeholder — B14 implementa]</Text>
      <Pressable
        style={styles.button}
        onPress={() =>
          navigation.navigate('ValidateProject', { racimoCode: 'TEST01' })
        }
      >
        <Text style={styles.buttonText}>Validar proyecto (test)</Text>
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

export default ProjectVinculationScreen;
