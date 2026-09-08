# app-minimize

Módulo local de Expo (Android-only) que expone `AppMinimize.minimize()` —
un wrapper nativo sobre `Activity.moveTaskToBack(true)` — para que al
presionar "atrás" en las pantallas raíz la app pase a segundo plano en
lugar de cerrarse.

## Dónde vive la resolución real

El código en `src/` (`AppMinimize.ts`, `index.ts`) de este módulo **no se
importa directamente desde ningún lugar de la app**. Nadie hace
`import { minimizeApp } from '.../modules/app-minimize/src'`.

La resolución real ocurre en
[`mobile/src/native/minimize/useAppMinimize.ts`](../../src/native/minimize/useAppMinimize.ts),
que sigue esta cadena de fallback en tiempo de ejecución:

1. **Registro de expo-modules** — intenta resolver el módulo nativo a
   través del sistema de autolinking de Expo (el mismo módulo Android
   compilado desde `android/src/.../AppMinimizeModule.kt`).
2. **`NativeModules.AppMinimize`** — si no aparece por la vía anterior,
   intenta acceder directamente al puente de React Native
   (`NativeModules.AppMinimize.minimize()`), que es exactamente lo que
   hace `src/AppMinimize.ts` en este paquete.
3. **`BackHandler.exitApp()`** — si el módulo nativo no está presente en
   el build (por ejemplo, un prebuild que no incluye este módulo local),
   se cae al comportamiento por defecto de cerrar la app.

En otras palabras: `src/AppMinimize.ts` documenta y prueba el contrato
del módulo nativo (paso 2 de la cadena), pero `useAppMinimize.ts` es la
única puerta de entrada que usa el resto de la app — no borres el módulo
nativo (`android/`), solo ten en cuenta que su API JS (`src/`) es
redundante con la lógica ya implementada en `useAppMinimize.ts` y existe
como referencia/contrato, no como dependencia activa.
