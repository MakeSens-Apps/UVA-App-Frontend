# UVA App

Aplicación móvil para la recolección y monitoreo de datos ambientales comunitarios (temperatura, humedad, lluvia), con fase lunar y gamificación. Los usuarios son colaboradores de campo agrupados en **RACIMOS** (proyectos); la app funciona **sin conexión** y sincroniza en segundo plano cuando hay red.

## Stack

- **React Native 0.85** + **Expo SDK 56** (Dev Client, sin EAS Build)
- **TypeScript** estricto
- **React Navigation** (native-stack + bottom-tabs)
- **React Context** para estado global (sesión, sincronización, configuración, notificaciones) — sin Redux/MobX
- **AWS Amplify** (`aws-amplify` + `@aws-amplify/datastore`) — mismo backend GraphQL/AppSync/Cognito/S3 que la app Ionic
- **AsyncStorage** como adaptador de almacenamiento local de DataStore, con el límite de base de datos SQLite elevado a **200 MB** vía config plugin (ver `docs/arquitectura.md`)
- **react-native-svg** para gráficas (sin Chart.js, sin Skia, sin victory-native)
- **Jest** (`jest-expo`) + **@testing-library/react-native** para pruebas
- Build nativo: `expo prebuild` (Continuous Native Generation) + **Gradle** en GitHub Actions — **no se usa EAS Build/Submit**

## Estructura

```
├── App.tsx                 # Composición raíz: polyfills → Amplify/DataStore → Context providers → RootNavigator
├── index.ts                # Entry point de Expo
├── app.json                # Configuración de Expo (nombre, versión, permisos, plugins)
├── plugins/                # Config plugins de Expo (prebuild)
│   └── withAsyncStorageDbSize.js   # Eleva el cap de AsyncStorage/SQLite a 200MB
├── modules/                 # Módulos nativos propios (si aplica)
├── assets/                  # Iconos, splash, fuentes de nivel app
├── src/
│   ├── screens/             # Pantallas, agrupadas por flujo (auth, home, measurement, historical, moon, profile, configuration, splash, dev)
│   ├── navigation/          # RootNavigator, AuthStack, AppStack, AppTabs, gates de navegación
│   ├── components/          # Componentes de UI reutilizables (calendar, header, moon-card, areachart, sync-action, ui/, icons/, rich-text)
│   ├── state/                # Contexts: SessionContext, SyncContext, ConfigContext, notification/
│   ├── data/                 # Acceso a datos
│   │   ├── amplify-bootstrap/  # Amplify.configure + DataStore.configure + Hub (sync-monitor)
│   │   ├── api/                 # Llamadas directas a GraphQL (racimo, uva, user, user-progress, moon-phase)
│   │   ├── auth/                 # Autenticación (Cognito, OTP, test-users)
│   │   ├── datastore/            # Wrappers de DataStore por modelo (measurement, racimo, uva, user, user-progress, gamification-event)
│   │   ├── graphql/               # Queries/mutations/subscriptions generadas
│   │   ├── models/                 # Esquema DataStore (schema.js/.d.ts) y modelos
│   │   ├── session/                 # Persistencia de sesión (SecureStore/AsyncStorage)
│   │   └── storage/                  # file-system, preferences, S3
│   ├── domain/               # Lógica de negocio pura (testeable sin RN): measurement-engine, gamification, moon, report, aggregations, setup
│   ├── native/                # Envoltorios de módulos nativos: back handler, minimizar app, notificaciones locales, device/apiLevel, clipboard, share, filesystem
│   ├── theme/                 # ThemeProvider, tokens de diseño (colores, tipografía) — theming por RACIMO
│   ├── types/                 # Tipos compartidos
│   └── __tests__/             # Suite Jest (unit + component, RNTL)
└── package.json
```

Ver `docs/arquitectura.md` para el detalle de la arquitectura (navegación, Contexts, DataStore/AsyncStorage, módulos nativos) y `.claude/CLAUDE.md` / `CLAUDE.md` para las convenciones de trabajo con Claude Code en este repo.

## Requisitos

- Node.js 20+ y npm
- Java 17 (para builds nativos Android)
- Android SDK / Android Studio (para `expo prebuild` + Gradle local, o para el emulador)
- Un dispositivo o emulador Android (el target actual es **solo Android**)

## Cómo correr la app

```bash
npm install

# Servidor de desarrollo (requiere un Dev Client instalado en el dispositivo/emulador,
# no funciona con Expo Go porque el proyecto usa módulos nativos custom)
npm start                 # expo start --dev-client

# Generar y correr un Dev Client / build local en Android
npx expo prebuild --platform android
npm run android           # expo run:android

# Vista rápida en navegador (solo para layouts que soportan react-native-web)
npm run web
```

`amplifyconfiguration.json` es necesario para que la app arranque contra el backend real; está en `.gitignore` (se distribuye fuera del repo). Sin él, Metro falla al resolver el import en `src/data/amplify-bootstrap/amplify-config.ts`.

## Build local (APK/AAB) sin EAS

El pipeline de release usa `expo prebuild` para generar `android/` (Continuous Native Generation) y compila con Gradle directamente — no hay `eas build`/`eas submit` en el flujo de CI. Para reproducir localmente:

```bash
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease     # APK
./gradlew bundleRelease       # AAB (Google Play)
```

La firma de release se resuelve mediante un config plugin de Expo (inyecta el keystore/`signingConfigs` durante el prebuild) — ver `docs/android-build.md` y `docs/release-workflow.md` para el detalle de secrets y variables usadas en CI.

## Tests

```bash
npm run test        # jest
npm run test:watch
npm run test:ci      # jest --ci --coverage (el que corre en GitHub Actions)
npx tsc --noEmit      # chequeo de tipos, sin emitir output
npm run lint
```

La suite cubre lógica de dominio pura (`src/domain/`), los Contexts de estado, componentes de UI con `@testing-library/react-native`, y bootstrap de Amplify/DataStore con mocks. Una nota conocida: el snapshot de `MoonCard` en `b11-components.test.tsx` embebe una ruta de asset relativa al directorio del proyecto — si se ejecuta desde un _worktree_ de git con un path distinto al checkout normal, ese snapshot específico falla por la diferencia de ruta, no por una regresión real.

## Estado de la migración

El proyecto migró de Ionic/Angular a React Native (Expo); el cutover se ejecutó el 2026-09-11 y el árbol Ionic fue eliminado (código disponible en el tag `pre-cutover-2026-09-11` y en los tags `V2.x`). El plan completo, bloque por bloque, y el estado de verificación viven en:

- `docs/migration/plan.md` — roadmap completo (B01…B19) y decisiones
- `docs/migration/verification.md` — estado de gates y pendientes de validación en dispositivo
- `docs/migration/portability-matrix.md` — mapeo pantalla-por-pantalla y dependencia-por-dependencia Ionic → RN
- `docs/migration/bundle-report.md` — medición de tamaño del bundle Metro/Hermes vs. la referencia Ionic

Pendiente de producto (no técnico): issue #57 — logos institucionales Natura/ISAGEN en las pantallas correspondientes; no se tocan assets como parte de este trabajo de hardening/documentación.

## Documentación

- [`docs/arquitectura.md`](docs/arquitectura.md) — arquitectura de la app RN
- [`docs/android-build.md`](docs/android-build.md) — build Android local y en CI
- [`docs/release-workflow.md`](docs/release-workflow.md) — flujo de release (versionado, firma, Google Play)
- [`docs/github-actions-pipeline.md`](docs/github-actions-pipeline.md) — pipeline de CI/CD
- [`docs/README-PIPELINE.md`](docs/README-PIPELINE.md) — resumen operativo del pipeline y secrets
