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
- **`SyncContext`** — puente reactivo hacia el estado de `DataStore` (estados `NOINIT`/`UNSYNC`/`SYNC`), suscrito a `Hub` de Amplify para eventos de red y de sincronización de modelos; expone `waitForSync()` basado en el evento de Hub en vez de polling por intervalo, y `hasPendingChanges`, que viene del rastreador de pendientes (ver "Cambios pendientes de subir").
- **`ConfigContext`** — configuración persistida del dispositivo (branding activo, recordatorios, etc.).
- **`state/notification/NotificationContext`** — estado de alertas y notificaciones locales, coordinado con `src/native/notifications/LocalRemindersService.ts`.
- **`RegistrationLockContext`** — bloqueo del registro (RACIMO no activo #61, UVA deshabilitada o versión mínima #60, ADR-005 del dashboard). Envuelve `registrationLockService` y se vuelve a evaluar con cada sincronización, con cada cambio local de la UVA o de su RACIMO y en cada foco de Inicio y Medición. `useRegistrationLockNotice` da el aviso único de esas pantallas (con el nombre actual del RACIMO) y el aviso verde de reactivación. Perfil, Alertas y el detalle del día leen el estado de la estación (UVA y RACIMO juntos) para no proponer "Recupera tu racha" mientras está deshabilitada.

## Acceso a datos (`src/data/`)

- **`amplify-bootstrap/`** — arranque de Amplify (`amplify-config.ts`), monitor de sincronización sobre `Hub` (`sync-monitor.ts`) y rastreador de cambios pendientes de subir (`pending-sync-tracker.ts`).
- **`models/`** — esquema de DataStore (`schema.js`/`schema.d.ts`), generado desde el mismo backend GraphQL que la app Ionic.
- **`datastore/`** — un wrapper por modelo de dominio (`measurement-ds`, `racimo-ds`, `uva-ds`, `user-ds`, `user-progress-ds`, `gamification-event-ds`) que encapsula las queries/mutaciones de DataStore para cada entidad.
- **`api/`** — llamadas directas a GraphQL para operaciones que no pasan por DataStore (racimo, uva, user, user-progress, moon-phase), con manejo de errores centralizado en `api/errors-handle/`.
- **`auth/`** — autenticación contra Cognito (número de celular + OTP) y usuarios de prueba (`test-users.ts`) para desarrollo/QA.
- **`session/`** — persistencia de sesión (con variante `.web.ts` para la validación en navegador).
- **`storage/`** — `file-system` (archivos locales, con variante web), `preferences` (config del dispositivo) y `s3` (almacenamiento en la nube, con variante web).
- **`graphql/`** — queries/mutations/subscriptions generadas desde el esquema del backend. Se regeneran junto con `models/` desde UVA-App `develop` (modelos desde `amplify/backend/api/UVAv2/schema.graphql` y operaciones desde la introspección de `UVAv2-develop`, que también actualiza `schema.json`). Regenerar los modelos cambia la versión del esquema de DataStore: al abrir la app, DataStore borra su base local y vuelve a sincronizar.

  Cómo se regeneraron (#61), fuera del repo y sin escribir en AWS:
  1. `aws appsync get-introspection-schema --api-id <apiId de .graphqlconfig.yml> --format JSON schema.json` (solo lectura, API `UVAv2-develop`).
  2. El esquema de entrada sale del clon de UVA-App: `amplify/backend/api/UVAv2/schema.graphql` en `origin/develop`.
  3. En una carpeta temporal con `@aws-amplify/graphql-generator@0.5.4` y `@aws-amplify/graphql-directives`: `generateModels` sobre el esquema de entrada (objetivo `javascript`, directivas `DefaultDirectives`, transformador v2, `generateIndexRules`, `emitAuthProvider`, `respectPrimaryKeyAttributesOnConnectionField`, `generateModelsForLazyLoadAndCustomSelectionSet`, `addTimestampFields`, `handleListNullabilityTransparently`); `generateStatements` (objetivo `typescript`, `maxDepth: 2`) y `generateTypes` (objetivo `typescript`, `introspection: true`, `amplifyJsLibraryVersion: 6`, con las operaciones generadas en formato `graphql`) sobre la introspección.
  4. Se copia el resultado a `src/data/models/` y `src/data/graphql/`, y la introspección a `schema.json`, y se formatea con Prettier. `schema.js` también refleja las reglas de autorización del backend.

- **`registration-lock/`** — servicio que decide si se puede registrar con lo último sincronizado: el RACIMO de la UVA y la UVA en DataStore, y la versión mínima de `public/app/version-policy.json`, guardada como última conocida. También recuerda el estado de la estación (UVA y RACIMO juntos) para el aviso de reactivación, y lo borra al cerrar sesión. Es un servicio de aplicación: coordina además la pausa de `native/notifications` y lee la versión instalada de `native/device/appVersion.ts`.
- **`app-version-report/`** — reporte de la versión de la app en la UVA (#76, campos de UVA-App#34). Después de cada sincronización con el backend (evento `syncQueriesReady`, que DataStore solo emite con conexión), al volver a primer plano con conexión y cuando la UVA cambia en el celular con conexión (una UVA recién registrada llega después de la primera sincronización), escribe juntos `appVersion` (la `versionName`, la misma de la versión mínima) y `appVersionReportedAt` (UTC ISO 8601) cuando cambia la versión y como máximo una vez por día local. Sin conexión no escribe: lo hace en la siguiente sincronización. Reporta aunque la UVA esté deshabilitada o el RACIMO desactivado, y solo sobre la UVA de la persona, que busca en DataStore por el `userID` de la sesión (como el auth gate). El `uvaID` de la sesión solo desempata si la persona tiene varias UVAs en el celular y está entre ellas (#61, la misma regla del auth gate): justo después del login ese id puede ser el de una UVA que no está en el celular, y entonces se usa la primera. Cada intento deja una línea `[app-version-report]` en el log, con el disparador (`sync`, `foreground` o `uva-change`), la decisión y si escribió, sin ids ni datos de la persona. Lo último reportado se guarda en AsyncStorage (`lastAppVersionReport`) cuando DataStore acepta la escritura local, y se borra al cerrar sesión; un reporte en curso al cerrar sesión no escribe. Las reglas están en `domain/app-version-report/`; arranca en `App.tsx`. Lee la versión instalada de `native/device/appVersion.ts` y el regreso a primer plano de `native/app-state/onAppForeground.ts`, y la conexión de `amplify-bootstrap/sync-monitor.ts`.

Dependencias de `data/` hacia `native/`: `registration-lock/` (`device/appVersion.ts` y `notifications/`) y `app-version-report/` (`device/appVersion.ts` y `app-state/onAppForeground.ts`). Ningún módulo de `data/` importa `react-native` directamente para estas APIs de la plataforma.

### DataStore + AsyncStorage (offline-first)

DataStore usa **AsyncStorage** como adaptador de almacenamiento local en Android. El límite por defecto de la base SQLite interna de `@react-native-async-storage/async-storage` es de 6 MB (`AsyncStorage_db_size_in_MB` en su `config.gradle`) — insuficiente para el histórico de mediciones que acumula DataStore en el tiempo, lo que producía `SQLiteFullException` en dispositivos reales. Como `android/` es generado por `expo prebuild` (no se versiona ni se edita a mano), ese límite se eleva a **200 MB** mediante un config plugin de Expo, `plugins/withAsyncStorageDbSize.js`, que inyecta la propiedad Gradle correspondiente en cada prebuild vía `withGradleProperties`.

### Cambios pendientes de subir

"Con sincronizaciones pendientes" en Configuración sale de `pendingSyncTracker` (`src/data/amplify-bootstrap/pending-sync-tracker.ts`, #79), que cuenta los cambios de la persona que siguen en la cola de salida de DataStore: mediciones, progreso de racha y logros, UVA y perfil. La telemetría de uso (`AppUsageEvent`) no cuenta.

- Escucha los eventos de Hub del motor de sincronización: `outboxMutationEnqueued` suma, `outboxMutationProcessed` resta y `outboxStatus` con `isEmpty: true` (al arrancar y cuando la cola se vacía) lo deja en cero, lo que también corrige las mutaciones que la cola fusiona (crear y editar sin conexión: dos encoladas, una procesada).
- Persiste el conteo en AsyncStorage (`pendingSyncCount`) para que sobreviva a un reinicio, y lo borra al cerrar sesión (`signedOut`), porque `DataStore.clear()` vacía la cola.
- Sin conteo guardado (justo después de actualizar con cosas en la cola, o después de cerrar sesión hasta que la cola se ve vacía), una cola no vacía cuenta como pendiente hasta que se vacía. El primer `outboxStatus` con `isEmpty: true` guarda el conteo base (0).
- Límites conocidos, que se corrigen con el siguiente vaciado de la cola o al reiniciar: una mutación que falla del todo sale de la cola sin ningún evento y sigue contada; y un cambio guardado justo entre que DataStore saca una mutación y avisa que la cola quedó vacía se cuenta en cero aunque siga en la cola (con red se sube enseguida, solo se nota si la conexión se cae en ese instante).
- `SyncContext` lo expone como `hasPendingChanges` con `useSyncExternalStore`, así la pantalla cambia en vivo sin reenfocarla. El estado `UNSYNC` y `synchronizedData()` no cambian: `UNSYNC` se activa con cualquier mutación, incluida la telemetría, y solo se limpia cuando DataStore arranca de nuevo, por eso el aviso no se iba sin reiniciar la app.

Subida en segundo plano: la app no tiene una tarea nativa de sincronización (ni WorkManager ni tareas sin interfaz). La cola la sube DataStore desde el JS mientras el proceso está vivo y `NetInfo` informa conexión. Lo observado al salir del ahorro de batería (Doze) está en `docs/migration/verification.md` §3.

## Lógica de dominio (`src/domain/`)

Código puro, sin dependencias de React Native, pensado para ser 100% testeable con Jest sin mocks de plataforma:

- **`measurement-engine/`** — reglas de negocio de captura y validación de mediciones.
- **`gamification/`** — cálculo de logros y rachas (`gamification.ts`), disparadores de alertas de progreso (`gamification-alerts.ts`, `gamification-alerts-types.ts`).
- **`moon/`** — cálculo de fase lunar.
- **`report/`** — construcción del reporte ambiental y generación del archivo compartible (`environmental-report.ts`, `report-file.ts`).
- **`aggregations/`** — agregaciones históricas para las vistas de gráficas.
- **`setup/`** — inicialización de sesión/usuario y vinculación a RACIMO/UVA. Un RACIMO no activo no admite nuevos participantes (#61): su código no escribe nada en la sesión, y si el backend rechaza la creación de la UVA con `RacimoInactive` la app vuelve a la pantalla del código con el aviso.
- **`app-version-report/`** — cuándo reportar la versión de la app (#76): versión nueva, o como máximo una vez por día local del celular, y los dos campos que se escriben juntos.
- **`registration-lock/`** — regla del ADR-005: estado efectivo de la UVA con el corte del 2026-11-25 y el estado desconocido, estado del RACIMO (`enabled !== false` es activo), estado combinado de la estación, versión mínima, orden de los avisos (RACIMO, UVA, actualización), reactivación, pausa de recordatorios y racha.

## Módulos nativos (`src/native/`)

Envoltorios delgados sobre APIs nativas/Expo, aislados del resto del código para poder mockearse fácilmente en tests:

- **`back/useBackHandler.ts`** — manejo del botón atrás de Android (minimiza en vez de salir en ciertas rutas, ver `minimize/routesToMinimize.ts`).
- **`minimize/useAppMinimize.ts`** — comportamiento al minimizar la app.
- **`notifications/LocalRemindersService.ts`** — notificaciones push locales (`expo-notifications`), incluyendo el diagnóstico de exact-alarm/optimización de batería en Android.
- **`device/apiLevel.ts`** — lectura del nivel de API de Android para lógica condicional por versión.
- **`device/appVersion.ts`** — versión instalada (`versionName`, con `expo-application`) y enlace a la ficha de la tienda.
- **`app-state/onAppForeground.ts`** — aviso de regreso a primer plano (`AppState`), para el reporte de versión (#76).
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
