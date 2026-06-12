/**
 * B12 — AuthStack
 *
 * Native stack navigator for unauthenticated flows.
 * All routes from AuthStackParamList.
 *
 * Portability matrix: Sistema de rutas/navegación → Auth stack → B12
 * Risks: R-15, R-30
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import type { AuthStackParamList } from './types';

import { LoginScreen } from '@/screens/auth/LoginScreen';
import { OtpScreen } from '@/screens/auth/OtpScreen';
import { ValidateCodeScreen } from '@/screens/auth/ValidateCodeScreen';
import { PreRegisterScreen } from '@/screens/auth/PreRegisterScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { SetPhoneRegisterScreen } from '@/screens/auth/SetPhoneRegisterScreen';
import { ProjectVinculationScreen } from '@/screens/auth/ProjectVinculationScreen';
import { ValidateProjectScreen } from '@/screens/auth/ValidateProjectScreen';
import { ProjectVinculationDoneScreen } from '@/screens/auth/ProjectVinculationDoneScreen';
import { RegisterProjectFormScreen } from '@/screens/auth/RegisterProjectFormScreen';
import { RegisterCompletedScreen } from '@/screens/auth/RegisterCompletedScreen';
import { RegisterSuccessScreen } from '@/screens/auth/RegisterSuccessScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="ValidateCode" component={ValidateCodeScreen} />
      <Stack.Screen name="PreRegister" component={PreRegisterScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="SetPhoneRegister" component={SetPhoneRegisterScreen} />
      <Stack.Screen name="ProjectVinculation" component={ProjectVinculationScreen} />
      <Stack.Screen name="ValidateProject" component={ValidateProjectScreen} />
      <Stack.Screen name="ProjectVinculationDone" component={ProjectVinculationDoneScreen} />
      <Stack.Screen name="RegisterProjectForm" component={RegisterProjectFormScreen} />
      <Stack.Screen name="RegisterCompleted" component={RegisterCompletedScreen} />
      <Stack.Screen name="RegisterSuccess" component={RegisterSuccessScreen} />
    </Stack.Navigator>
  );
}

export default AuthStack;
