# UVA App Frontend - Claude Code Context

## Project Overview

**UVA App** is a mobile application for community environmental monitoring, built in **React Native (Expo, Android target)**. Field collaborators register environmental measurements — currently **temperature**, **humidity**, and **rain** — from their phones. Each user belongs to a **RACIMO** (group/project), linked during registration. The app is **offline-first** and syncs in the background when a connection is available.

> The codebase lives in `mobile/`. The original Ionic/Angular project still sits at the repo root and will be removed in the final cutover of the Ionic→RN migration (see `docs/migration/plan.md`). This file, and code under `mobile/`, describe the RN destination of that migration.

### Key Features
- Environmental measurement collection (temperature, humidity, rain), extensible to future sensor types
- User authentication and profiles (phone number + SMS OTP via Cognito)
- Historical data visualization with SVG-based charts
- Moon phase tracking integration
- Gamification system with achievements and streaks
- Data synchronization with AWS backend (Amplify DataStore, offline-first)
- Native Android build via `expo prebuild` + Gradle (no EAS Build/Submit)

## Technology Stack

### Frontend Framework
- **React Native 0.85** + **Expo SDK 56** (Dev Client — not Expo Go; the project uses custom native modules)
- **TypeScript** (strict)
- **React Navigation** (`@react-navigation/native-stack` + `@react-navigation/bottom-tabs`)
- **React Context** for global state (no Redux/MobX)

### Backend & Cloud Services
- **AWS Amplify** (`aws-amplify` + `@aws-amplify/datastore`) — same backend as the Ionic app
- **AWS Cognito** — phone-number authentication, SMS OTP
- **AWS AppSync** — GraphQL API with real-time subscriptions
- **DynamoDB** — via Amplify DataStore
- **S3** — file storage
- **AsyncStorage** (`@react-native-async-storage/async-storage`) — local DataStore adapter, SQLite size cap raised to **200 MB** via a config plugin (`mobile/plugins/withAsyncStorageDbSize.js`)

### Development Tools
- **ESLint** + **Prettier**
- **Jest** (`jest-expo` preset) + **@testing-library/react-native** for unit/component tests
- **Husky** for git hooks (see `mobile/.husky` — owned by a separate migration workstream)

### Key Libraries
- **react-native-svg** — charts and vector rendering (no Chart.js, no Skia, no victory-native — see `docs/arquitectura.md`)
- **react-hook-form** — forms
- **date-fns** — date manipulation
- **sanitize-html** — safe HTML rendering (replaces `dompurify`)
- **react-native-view-shot** — image capture for sharing (replaces `html-to-image`)
- **react-native-toast-message** — toasts (replaces `sweetalert2`)

## Project Structure

```
mobile/
├── App.tsx                 # Root composition: polyfills → Amplify/DataStore → Context providers → RootNavigator
├── app.json                # Expo config (name, version, permissions, plugins)
├── plugins/                # Expo config plugins (applied on `expo prebuild`)
├── assets/                 # App-level icons, splash, fonts
└── src/
    ├── screens/            # auth/, home/, measurement/, historical/, moon/, profile/, configuration/, splash/, dev/
    ├── navigation/         # RootNavigator, AuthStack, AppStack, AppTabs, navigation gates
    ├── components/         # ui/, calendar/, areachart/, header/, moon-card/, sync-action/, time-frame/, environmental-report/
    ├── state/              # SessionContext, SyncContext, ConfigContext, notification/
    ├── data/               # amplify-bootstrap/, api/, auth/, datastore/, graphql/, models/, session/, storage/
    ├── domain/             # Pure business logic: measurement-engine/, gamification/, moon/, report/, aggregations/, setup/
    ├── native/             # Native wrappers: back/, minimize/, notifications/, device/, clipboard/, share/, filesystem/
    ├── theme/              # ThemeProvider, design tokens (per-RACIMO theming)
    ├── types/              # Shared types
    └── __tests__/          # Jest suite (unit + component, RNTL)
```

See `docs/arquitectura.md` for the full architecture writeup and `CLAUDE.md` (root) for the business-domain context (RACIMO/UVA/measurements/gamification).

## Key Areas Architecture

### State Management (`src/state/`)
- **SessionContext** — wraps the `sessionService` singleton, exposes the authenticated session reactively.
- **SyncContext** — reactive bridge to Amplify DataStore's sync state (`NOINIT`/`UNSYNC`/`SYNC`), subscribed to `Hub` for network/sync events.
- **ConfigContext** — persisted device configuration (active branding, reminders, etc.).
- **notification/NotificationContext** — local alerts/notifications state.

### Data Access (`src/data/`)
- **amplify-bootstrap/** — `Amplify.configure` + `DataStore.configure` + Hub subscription.
- **datastore/** — one wrapper per domain model (measurement, racimo, uva, user, user-progress, gamification-event).
- **api/** — direct GraphQL calls for operations that bypass DataStore, with centralized error handling in `api/errors-handle/`.
- **auth/** — Cognito phone-number auth + OTP, plus `test-users.ts` for dev/QA.

### Business Logic (`src/domain/`)
Pure, RN-independent logic — fully testable with Jest without platform mocks: measurement capture/validation, gamification (achievements/streaks), moon phase calculation, environmental report generation, historical aggregations, RACIMO/UVA setup.

## Development Guidelines

### Code Style
- Functional components with hooks (no class components)
- React Context + custom hooks for shared state, not a global store library
- TypeScript interfaces/types for all data contracts
- Keep `src/domain/` free of React Native imports — it must stay testable in plain Jest

### Architecture Patterns
- **Context + singleton service** pairing: each Context wraps a plain-object service that owns the actual I/O (DataStore/AsyncStorage/SecureStore), so the same service can be used outside React (e.g. from other DS wrappers) without duplicating logic
- **Offline-first**: DataStore is the source of truth locally; sync happens in the background via Hub events, not polling
- **Config plugins over hand-edited native code**: anything that needs to touch generated `android/` (which `expo prebuild` regenerates and is not committed) goes through a plugin in `mobile/plugins/`, never a manual edit under `android/`

### Testing Requirements
- Unit tests for domain logic and Contexts using **Jest** (`jest-expo` preset)
- Component tests with **@testing-library/react-native**
- Run tests with: `npm run test` or `npm run test:ci` (in `mobile/`)
- Known caveat: the `MoonCard` snapshot in `src/__tests__/b11-components.test.tsx` embeds a project-relative asset path; running the suite from a git worktree at a different path than the normal checkout makes that one snapshot fail on the path string alone — not a real regression.

### Build and Deployment
- **Development**: `cd mobile && npm start` (`expo start --dev-client`)
- **Local Android run**: `npm run android` (`expo run:android`)
- **Native build**: `npx expo prebuild --platform android` then Gradle (`./gradlew assembleRelease` / `bundleRelease`) — see `docs/android-build.md`
- **Linting**: `npm run lint` (fix with `npm run lint:fix`)
- **Formatting**: `npm run format`
- Release/signing/versioning: see `docs/release-workflow.md`; CI process: see `docs/github-actions-pipeline.md`

## AWS Amplify Configuration

### Authentication
- **User Pool**: Cognito-based with phone number verification
- **MFA**: SMS-based multi-factor authentication
- **Attributes**: Name, family name, phone number

### API
- **GraphQL Endpoint**: AppSync with Cognito authentication
- **Real-time**: WebSocket subscriptions for live data
- **Offline**: DataStore for offline-first functionality, backed by AsyncStorage (200 MB cap, see above)

### Storage
- **S3 Bucket**: User file uploads and app assets
- **DynamoDB**: Backend data storage through DataStore

`mobile/amplifyconfiguration.json` is gitignored and required at runtime/build time — without it Metro fails to resolve the import in `src/data/amplify-bootstrap/amplify-config.ts`.

## Important Conventions

### File Naming
- **Screens**: `NameScreen.tsx` (e.g., `HomeScreen.tsx`)
- **Components**: `Name.tsx` (PascalCase component files under `src/components/<area>/`)
- **Services / data modules**: `name.ts` (e.g., `measurement-ds.ts`, `amplify-config.ts`)
- **Contexts**: `NameContext.tsx` (e.g., `SessionContext.tsx`)

### Component Structure
- Functional components, typed props via TypeScript interfaces
- Cleanup via `useEffect` return functions (no lifecycle classes)
- Platform-specific variants use the `.web.ts`/`.native.ts` Metro resolution convention where needed (e.g. `session.web.ts`, `s3.web.ts`, `file-system.web.ts`)

### Service Patterns
- Plain singleton objects/classes for I/O (session, file-system, S3), wrapped by a Context when the UI needs reactivity
- Error handling centralized in `data/api/errors-handle/`
- Type safety with interfaces and generics throughout

## Security Considerations
- **No hardcoded credentials** — `amplifyconfiguration.json` is gitignored; release signing secrets live in GitHub Actions secrets (`ANDROID_KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`), never in the repo
- **Secure API calls** with proper Cognito-authenticated headers
- **Input validation** on all user inputs
- **Safe HTML rendering** using `sanitize-html`
- **File upload restrictions** and validation in `data/storage/`

## Performance Guidelines
- Charts render with `react-native-svg` directly — no heavy charting engine (Chart.js/Skia/victory-native were evaluated and dropped, see `docs/arquitectura.md` and `docs/migration/bundle-report.md`)
- Keep `src/domain/` dependency-free of RN so it stays cheap to test and reason about
- Subscription/listener cleanup in every Context and native wrapper hook to prevent leaks
- Bundle size is tracked via `expo export`; see `docs/migration/bundle-report.md` for the current measurement

## Common Commands

```bash
cd mobile

# Development
npm start                    # expo start --dev-client
npm run android               # expo run:android
npm run web                    # expo start --web

# Native build (no EAS)
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease   # or bundleRelease

# Quality Assurance
npm run lint
npm run lint:fix
npm run format
npm run test
npm run test:ci
npx tsc --noEmit
```

## Environment Variables
- `mobile/amplifyconfiguration.json` — Amplify backend config (gitignored, provided out-of-band)
- `EXPO_PUBLIC_*` — public runtime config consumed by the app (environment-specific values)
- CI/release secrets: see `docs/release-workflow.md` and `docs/github-actions-pipeline.md`

## Current Measurement Types

### Supported Environmental Data
- **Temperature** — Ambient temperature readings
- **Humidity** — Relative humidity percentage
- **Rain** — Precipitation measurements

### Future Extensibility
The measurement system in `src/domain/measurement-engine/` and `src/data/models/` is designed to accommodate additional sensor types (UV radiation, air quality, wind, atmospheric pressure, soil moisture, light intensity) without major architectural changes.

## Known Product Debt
- **Issue #57** — Natura/ISAGEN institutional logos pending an update on the relevant screens. Not part of the hardening/documentation work; assets are intentionally untouched here.

## Migration Status
This app is the target of an in-progress Ionic→React Native migration. Full plan, block-by-block status, and verification gates:
- `docs/migration/plan.md`
- `docs/migration/verification.md`
- `docs/migration/portability-matrix.md`
- `docs/migration/bundle-report.md`

---

This context should help Claude Code understand the project structure, technology stack, and development patterns used in the UVA App Frontend (React Native).
