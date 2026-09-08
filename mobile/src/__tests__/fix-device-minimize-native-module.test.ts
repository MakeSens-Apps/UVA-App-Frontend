/**
 * Device bug B1 — resolución del módulo nativo AppMinimize.
 *
 * Con Expo SDK 56 / RN 0.85 (New Architecture, bridgeless) los módulos declarados
 * con expo-modules (ModuleDefinition + Name("AppMinimize"), ver
 * mobile/modules/app-minimize/android/.../AppMinimizeModule.kt) se registran en el
 * registro de Expo, NO en RN NativeModules. Si minimizeApp() sólo mirase
 * NativeModules.AppMinimize caería en el fallback BackHandler.exitApp(), que CIERRA
 * la app en vez de minimizarla — justo el síntoma reportado (al relanzar, la app
 * vuelve al flujo de auth/registro).
 *
 * Orden de resolución esperado:
 *   1. requireOptionalNativeModule('AppMinimize')  (registro de expo-modules)
 *   2. NativeModules.AppMinimize                   (bridge / arquitectura antigua)
 *   3. BackHandler.exitApp()                       (último recurso, con warning)
 */

import { resolveMinimizeFn } from '@/native/minimize/useAppMinimize';

describe('B1 — resolveMinimizeFn: orden de resolución del módulo nativo', () => {
  it('REGRESIÓN: prefiere el registro de expo-modules (ruta real en New Architecture)', () => {
    const expoMinimize = jest.fn();
    const bridgeMinimize = jest.fn();

    const fn = resolveMinimizeFn(
      (name) => (name === 'AppMinimize' ? { minimize: expoMinimize } : null),
      { AppMinimize: { minimize: bridgeMinimize } },
    );

    expect(fn).not.toBeNull();
    fn?.();
    expect(expoMinimize).toHaveBeenCalledTimes(1);
    expect(bridgeMinimize).not.toHaveBeenCalled();
  });

  it('cae a NativeModules.AppMinimize cuando el registro de expo no lo tiene', () => {
    const bridgeMinimize = jest.fn();

    const fn = resolveMinimizeFn(() => null, { AppMinimize: { minimize: bridgeMinimize } });

    expect(fn).not.toBeNull();
    fn?.();
    expect(bridgeMinimize).toHaveBeenCalledTimes(1);
  });

  it('cae a NativeModules.AppMinimize si la búsqueda en expo lanza', () => {
    const bridgeMinimize = jest.fn();

    const fn = resolveMinimizeFn(
      () => {
        throw new Error('expo module registry unavailable');
      },
      { AppMinimize: { minimize: bridgeMinimize } },
    );

    expect(fn).not.toBeNull();
    fn?.();
    expect(bridgeMinimize).toHaveBeenCalledTimes(1);
  });

  it('funciona sin expo-modules-core (lookup null)', () => {
    const bridgeMinimize = jest.fn();
    const fn = resolveMinimizeFn(null, { AppMinimize: { minimize: bridgeMinimize } });
    fn?.();
    expect(bridgeMinimize).toHaveBeenCalledTimes(1);
  });

  it('devuelve null cuando no hay módulo por ninguna vía (→ minimizeApp usa exitApp)', () => {
    expect(resolveMinimizeFn(() => null, {})).toBeNull();
    expect(resolveMinimizeFn(() => null, undefined)).toBeNull();
    expect(resolveMinimizeFn(null, { AppMinimize: {} })).toBeNull();
  });
});
