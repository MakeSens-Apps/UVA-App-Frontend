# Arquitectura de UVA App (React Native)

## Resumen ejecutivo

UVA App es una aplicación móvil desarrollada en **React Native (Expo, target Android)** para la recolección y monitoreo de datos ambientales comunitarios (temperatura, humedad, lluvia), con fase lunar y gamificación. Usa **AWS Amplify** (DataStore + GraphQL/AppSync + Cognito + S3) como backend, funciona **offline-first** y sincroniza en segundo plano. Este documento describe la arquitectura del código en la raíz del repo, destino de la migración desde la app Ionic/Angular original (ver `docs/migration/plan.md` para el proceso de migración en sí).

## Stack tecnológico

- **React Native 0.85** + **Expo SDK 56**, Dev Client (no Expo Go — hay módulos nativos custom)
- **TypeScript** estricto
- **React Navigation** (`@react-navigation/native-stack` + `@react-navigation/bottom-tabs`) para la navegación
- **React Context** (sin Redux/MobX) para estado global reactivo
- **AWS Amplify** (`aws-amplify` + `@aws-amplify/datastore`) — mismo backend GraphQL que la app Ionic
- **AsyncStorage** (`@react-native-async-storage/async-storage`) como adaptador de almacenamiento de DataStore
- **react-native-svg** para gráficas y renderizado vectorial (sin Chart.js, sin Skia, sin victory-native — ver nota en "Gráficas" más abajo)
- **react-hook-form** para formularios
- **Jest** (`jest-expo`) + **@testing-library/react-native (RNTL)** para tests
- Build: `expo prebuild` (Continuous Native Generation) + **Gradle** en CI — sin EAS Build/Submit (ver `docs/release-workflow.md`)

## Composición de la app (`App.tsx`)

El árbol raíz sigue un orden de bootstrap estricto, documentado en cabecera en `App.tsx`:

1. Polyfills (`react-native-get-random-values`, `react-native-url-polyfill/auto`) — deben cargar antes que cualquier otra cosa porque Amplify/DataStore los necesita en tiempo de import.
2. `bootstrapAmplify()` (`src/data/amplify-bootstrap/amplify-config.ts`) — `Amplify.configure(amplifyconfiguration)` + `DataStore.configure({ syncExpressions })`.
3. `subscribeToSync()` (`src/data/amplify-bootstrap/sync-monitor.ts`) — listener de Hub para el estado de sincronización.
4. `initAppUsage()` — arranca el tracking de sesión de uso de la app.
5. Árbol de componentes:

```
GestureHandlerRootView
└─ SafeAreaProvider
   └─ SyncProvider           (estado de sincronización DataStore)
      └─ SessionProvider     (sesión del usuario autenticado)
         └─ ConfigProvider   (configuración persistida del dispositivo)
            └─ ThemeProvider (tokens de diseño, theming por RACIMO)
               └─ NotificationProvider (alertas/notificaciones locales)
                  ├─ RootNavigator
                  ├─ ToastHost   (react-native-toast-message)
                  └─ StatusBar
```

## Navegación (`src/navigation/`)

- **`RootNavigator`** decide entre el stack de autenticación y el stack de la app, mediante _gates_ de navegación (`navigationGate.ts`, `useNavigationGate.ts`, `useAuthGate.ts`, `authInitialRoute.ts`) que evalúan sesión/estado de setup antes de montar cualquiera de los dos.
- **`AuthStack`** — login, OTP, y todo el flujo de registro/vinculación a RACIMO.
- **`AppStack`** — pantallas post-login que no son tabs (detalle de medición, configuración, alertas, etc.).
- **`AppTabs`** + **`UvaTabBar`** — navegación principal por pestañas (home / medición / histórico / perfil), tab bar custom.
- `devBypass.ts` — atajo de navegación usado en desarrollo/testing (usuario de prueba, ver `docs/migration` para el número de teléfono que salta el OTP).

## Estado global (`src/state/`)

El estado global se maneja con **React Context**, uno por dominio, cada uno envolviendo un servicio/singleton de acceso a datos para no duplicar lógica de I/O:

- **`SessionContext`** — envuelve el singleton `sessionService` (`src/data/session/session.ts`); expone la sesión de forma reactiva a la UI (carga, actualiza campo, limpia) sin que los componentes tengan que hacer polling.
- **`SyncContext`** — puente reactivo hacia el estado de `DataStore` (estados `NOINIT`/`UNSYNC`/`SYNC`), suscrito a `Hub` de Amplify para eventos de red y de sincronización de modelos; expone `waitForSync()` basado en el evento de Hub en vez de polling por intervalo.
- **`ConfigContext`** — configuración persistida del dispositivo (branding activo, recordatorios, etc.).
- **`state/notification/NotificationContext`** — estado de alertas y notificaciones locales, coordinado con `src/native/notifications/LocalRemindersService.ts`.

## Acceso a datos (`src/data/`)

- **`amplify-bootstrap/`** — arranque de Amplify (`amplify-config.ts`) y monitor de sincronización sobre `Hub` (`sync-monitor.ts`).
- **`models/`** — esquema de DataStore (`schema.js`/`schema.d.ts`), generado desde el mismo backend GraphQL que la app Ionic.
- **`datastore/`** — un wrapper por modelo de dominio (`measurement-ds`, `racimo-ds`, `uva-ds`, `user-ds`, `user-progress-ds`, `gamification-event-ds`) que encapsula las queries/mutaciones de DataStore para cada entidad.
- **`api/`** — llamadas directas a GraphQL para operaciones que no pasan por DataStore (racimo, uva, user, user-progress, moon-phase), con manejo de errores centralizado en `api/errors-handle/`.
- **`auth/`** — autenticación contra Cognito (número de celular + OTP) y usuarios de prueba (`test-users.ts`) para desarrollo/QA.
- **`session/`** — persistencia de sesión (con variante `.web.ts` para la validación en navegador).
- **`storage/`** — `file-system` (archivos locales, con variante web), `preferences` (config del dispositivo) y `s3` (almacenamiento en la nube, con variante web).
- **`graphql/`** — queries/mutations/subscriptions generadas desde el esquema del backend.

### DataStore + AsyncStorage (offline-first)

DataStore usa **AsyncStorage** como adaptador de almacenamiento local en Android. El límite por defecto de la base SQLite interna de `@react-native-async-storage/async-storage` es de 6 MB (`AsyncStorage_db_size_in_MB` en su `config.gradle`) — insuficiente para el histórico de mediciones que acumula DataStore en el tiempo, lo que producía `SQLiteFullException` en dispositivos reales. Como `android/` es generado por `expo prebuild` (no se versiona ni se edita a mano), ese límite se eleva a **200 MB** mediante un config plugin de Expo, `plugins/withAsyncStorageDbSize.js`, que inyecta la propiedad Gradle correspondiente en cada prebuild vía `withGradleProperties`.

## Lógica de dominio (`src/domain/`)

Código puro, sin dependencias de React Native, pensado para ser 100% testeable con Jest sin mocks de plataforma:

- **`measurement-engine/`** — reglas de negocio de captura y validación de mediciones.
- **`gamification/`** — cálculo de logros y rachas (`gamification.ts`), disparadores de alertas de progreso (`gamification-alerts.ts`, `gamification-alerts-types.ts`).
- **`moon/`** — cálculo de fase lunar.
- **`report/`** — construcción del reporte ambiental y generación del archivo compartible (`environmental-report.ts`, `report-file.ts`).
- **`aggregations/`** — agregaciones históricas para las vistas de gráficas.
- **`setup/`** — inicialización de sesión/usuario y vinculación a RACIMO/UVA.

## Módulos nativos (`src/native/`)

Envoltorios delgados sobre APIs nativas/Expo, aislados del resto del código para poder mockearse fácilmente en tests:

- **`back/useBackHandler.ts`** — manejo del botón atrás de Android (minimiza en vez de salir en ciertas rutas, ver `minimize/routesToMinimize.ts`).
- **`minimize/useAppMinimize.ts`** — comportamiento al minimizar la app.
- **`notifications/LocalRemindersService.ts`** — notificaciones push locales (`expo-notifications`), incluyendo el diagnóstico de exact-alarm/optimización de batería en Android.
- **`device/apiLevel.ts`** — lectura del nivel de API de Android para lógica condicional por versión.
- **`clipboard/`, `share/`, `filesystem/`** — envoltorios sobre `expo-clipboard`, `expo-sharing`/`react-native-view-shot`, y el sistema de archivos.

## Componentes de UI (`src/components/`)

- **`ui/`** — primitivas de interfaz reutilizables (botones, inputs, Toast, etc.).
- **`calendar/`** — calendario interactivo de mediciones.
- **`header/`**, **`moon-card/`**, **`sync-action/`**, **`time-frame/`**, **`environmental-report/`** — componentes de dominio equivalentes a sus contrapartes Ionic.
- **`areachart/`** — gráfica de área para series temporales de mediciones (ver nota debajo).
- **`icons/`**, **`rich-text/`**, **`explore-container/`** — utilitarios de presentación.

### Gráficas: por qué SVG puro y no Skia/victory-native

El componente de gráfica (`AreachartSvg.tsx`) se implementó con **`react-native-svg`** puro. La app pasó por un spike previo con `victory-native` (`CartesianChart`) sobre `@shopify/react-native-skia`, que nunca llegó a pintar correctamente en Android (problemas de fuente/ejes documentados en los comentarios del propio archivo). Ambas librerías se retiraron del proyecto — no quedan referencias de import en el código de producción (`package.json` ya no las declara como dependencias; ver `docs/migration/bundle-report.md` para la verificación de que no aparecen en el bundle final).

## Theming por RACIMO

`src/theme/` expone un `ThemeProvider` con tokens de diseño (colores, tipografía) que puede variar según el RACIMO/UVA del usuario activo — el branding se resuelve a partir de la configuración descargada para ese grupo (equivalente al mecanismo de theming dinámico de la app Ionic, portado a Context).

## Testing

- **Jest** con preset `jest-expo`, `@testing-library/react-native` para componentes, mocks explícitos para módulos nativos/Amplify en `src/__tests__/jest.setup.js` y en cada suite (ver el `package.json` de la raíz del repo para la configuración completa de `moduleNameMapper`/`transformIgnorePatterns`).
- La lógica de dominio pura se testea sin mocks de RN.
- Los Contexts y componentes de UI se testean con RNTL, incluyendo snapshots para componentes visuales estables.

## Build y CI/CD

- `expo prebuild` genera el proyecto nativo Android (Continuous Native Generation) a partir de `app.json` y los config plugins en `plugins/`.
- El binario se compila con **Gradle** directamente, tanto en local como en GitHub Actions — **no se usa EAS Build/Submit**.
- Ver `docs/android-build.md`, `docs/release-workflow.md` y `docs/github-actions-pipeline.md` para el detalle de build, firma y pipeline de CI/CD.

## Diferencias clave respecto a la arquitectura Ionic/Angular

| Aspecto                           | Ionic (antes)                                    | RN (ahora)                                                       |
| --------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------- |
| UI                                | Componentes Angular standalone + Ionic UI        | Componentes React Native + `react-native-svg`/primitivas propias |
| Estado                            | Servicios `@Injectable` + `BehaviorSubject`/RxJS | React Context + hooks                                            |
| Navegación                        | Angular Router + tabs de Ionic                   | React Navigation (native-stack + bottom-tabs)                    |
| Renderizado nativo                | WebView (Capacitor)                              | Nativo (Hermes)                                                  |
| Gráficas                          | Chart.js                                         | `react-native-svg` (SVG puro)                                    |
| Compartir imagen                  | `html-to-image`                                  | `react-native-view-shot`                                         |
| Sanitización HTML                 | `dompurify`                                      | `sanitize-html`                                                  |
| Alertas/modales                   | `sweetalert2`                                    | Componentes nativos / `react-native-toast-message`               |
| Almacenamiento local de DataStore | IndexedDB (web)                                  | AsyncStorage (cap elevado a 200 MB vía config plugin)            |
| Build nativo                      | Capacitor (`android/` versionado) + Gradle       | `expo prebuild` (`android/` generado) + Gradle, sin EAS          |

## Pendiente de producto

- **Issue #57** — logos institucionales Natura/ISAGEN pendientes de actualizar en las pantallas correspondientes. No forma parte de este trabajo de hardening/documentación; no se tocan assets.
