# Architecture Documentation

## System Architecture

### Overview

UVA-App follows a **hybrid mobile architecture** with an **offline-first** strategy. The application is built using Angular and Ionic for cross-platform mobile development, with AWS Amplify providing backend services and data synchronization.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile Device                             │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Presentation Layer (Ionic UI)                  │ │
│  │  - Authentication Pages  - Measurement Pages                │ │
│  │  - Historical Views      - Profile Management               │ │
│  │  - Moon Phase Calendar   - Gamification UI                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Angular Service Layer                         │ │
│  │                                                              │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │ │
│  │  │   API    │  │   Auth   │  │ Storage  │  │   View   │  │ │
│  │  │ Services │  │ Services │  │ Services │  │ Services │  │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │            AWS Amplify DataStore (Local DB)                 │ │
│  │  - Offline data persistence    - Conflict resolution        │ │
│  │  - Background sync             - Optimistic updates         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              ↕                                    │
└──────────────────────────────┼──────────────────────────────────┘
                               │ HTTPS/WebSocket
                               ↕
┌─────────────────────────────────────────────────────────────────┐
│                      AWS Cloud Backend                           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   AppSync    │  │   Cognito    │  │      S3      │          │
│  │  (GraphQL)   │  │   (Auth)     │  │  (Storage)   │          │
│  └──────┬───────┘  └──────────────┘  └──────────────┘          │
│         │                                                         │
│         ↓                                                         │
│  ┌──────────────┐                                                │
│  │  DynamoDB    │                                                │
│  │  (Database)  │                                                │
│  └──────────────┘                                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Presentation Layer

#### Pages
Located in `src/app/pages/`, organized by feature:

- **Authentication** (`auth/`):
  - Login page with phone number input
  - Registration wizard (multi-step)
  - OTP verification page

- **Measurement** (`measurement/`):
  - Main measurement tracking interface
  - Task completion forms
  - Real-time validation

- **Historical** (`historical/`):
  - Data visualization with Chart.js
  - Time-series analysis
  - Filter and export capabilities

- **Profile** (`profile/`):
  - User settings and preferences
  - Achievement display
  - Account management

- **Moon Phase** (`moon-phase/`):
  - Lunar calendar view
  - Agricultural recommendations

#### Reusable Components
Located in `src/app/components/`:

- **alert**: Custom alert wrapper using SweetAlert2
- **areachart**: Chart.js area chart component for time-series data
- **calendar**: Custom calendar with task highlighting
- **header**: Shared header with navigation and branding
- **moon-card**: Moon phase display card
- **progress-bar**: Gamification progress visualization

### 2. Service Layer

Organized by domain in `src/app/core/services/`:

#### API Services (`api/`)
- **uva-api.service.ts**: UVA (vineyard) CRUD operations
- **user-api.service.ts**: User profile management
- **racimo-api.service.ts**: Project/cluster operations
- **moon-phase-api.service.ts**: Lunar data fetching

#### Authentication Services (`auth/`)
- Phone number validation
- OTP verification
- Session token management
- MFA handling

#### Storage Services (`storage/`)
- **datastore/**: AWS DataStore wrapper services
- **s3/**: File upload/download to S3
- **file-system/**: Capacitor filesystem integration

#### View Services (`view/`)
- **gamification/**: Progress calculation and achievement logic
- **moon/**: Moon phase calculations
- **setup/**: App initialization and configuration

### 3. Data Layer

#### AWS Amplify DataStore
- Automatic offline sync
- Optimistic UI updates
- Conflict resolution with versioning
- Real-time subscriptions via WebSocket

#### Models
Located in `src/models/`:
- Auto-generated from GraphQL schema
- Type-safe TypeScript interfaces
- Built-in CRUD operations

## Data Flow

### Offline-First Flow

```
User Action
    ↓
Angular Component
    ↓
Service Layer (Business Logic)
    ↓
DataStore API (Save locally)
    ↓
Local IndexedDB ─────────→ UI Update (Optimistic)
    ↓
Background Sync (when online)
    ↓
AWS AppSync (GraphQL)
    ↓
DynamoDB
    ↓
Sync Response ───────────→ Conflict Resolution (if needed)
    ↓
UI Update (Final)
```

### Authentication Flow

```
1. User enters phone number
   ↓
2. Cognito sends SMS OTP
   ↓
3. User enters OTP code
   ↓
4. Cognito validates and issues tokens
   ↓
5. App stores session (secure storage)
   ↓
6. Amplify configures with user credentials
   ↓
7. DataStore syncs user data
   ↓
8. User redirected to home/tabs
```

### Measurement Submission Flow

```
User selects task
   ↓
Form validation (time restrictions, field validation)
   ↓
Save to DataStore (local-first)
   ↓
UI updated immediately (optimistic)
   ↓
Background sync to AppSync
   ↓
GraphQL mutation to DynamoDB
   ↓
Update user progress (gamification)
   ↓
Sync back to device
```

## External Integrations

### AWS Services

1. **AWS AppSync**
   - GraphQL API endpoint
   - Real-time subscriptions
   - Managed API with authorization
   - Region: us-east-1

2. **AWS Cognito**
   - User pool for authentication
   - Phone number as username
   - SMS OTP delivery
   - MFA enforcement
   - Session management

3. **AWS S3**
   - Profile picture storage
   - Measurement attachments
   - Public and private buckets

4. **AWS DynamoDB**
   - Primary data store (via AppSync)
   - Automatic scaling
   - Global secondary indexes

5. **AWS Analytics (Pinpoint)**
   - Session tracking
   - Page view analytics
   - Custom event tracking

### Third-Party Services

1. **Moon Phase API**
   - External API for lunar calculations
   - Cached locally for offline access
   - Service: `moon-phase-api.service.ts`

2. **SMS Provider**
   - SMS delivery via Cognito
   - OTP verification codes

## Design Patterns

### 1. Service-Oriented Architecture
All business logic is encapsulated in injectable services, promoting:
- Separation of concerns
- Testability
- Reusability
- Maintainability

### 2. Reactive Programming
Using RxJS observables for:
- Async operations
- Event streams
- Data transformation
- Error handling

### 3. Standalone Components
Modern Angular architecture:
- No NgModules required
- Direct dependency injection
- Tree-shakable bundles
- Improved performance

### 4. Repository Pattern
DataStore services act as repositories:
- Abstract data source details
- Consistent API across models
- Centralized caching logic

### 5. Optimistic UI
Update UI immediately, sync in background:
- Better user experience
- Offline functionality
- Background conflict resolution

## Code Organization

### Path Aliases
Configured in `tsconfig.json`:
```typescript
@app/*          → src/app/*
@components/*   → src/app/components/*
@pages/*        → src/app/pages/*
@service/*      → src/app/core/services/*
@storage/*      → src/app/core/services/storage/*
@interfaces/*   → src/app/Interfaces/*
```

### Module Structure
```
src/app/
├── components/       # Shared UI components
├── pages/           # Route-level pages
├── core/
│   ├── services/    # Business logic services
│   └── pipes/       # Custom Angular pipes
├── Interfaces/      # TypeScript interfaces
└── app.routes.ts    # Route configuration
```

## Security Architecture

### Authentication
- Phone-based authentication (no passwords)
- SMS OTP verification
- MFA enforcement
- Secure token storage via Capacitor SecureStorage

### Authorization
- User-scoped data access
- Owner-based authorization in GraphQL
- Private file storage in S3

### Data Protection
- HTTPS for all API calls
- Encrypted local storage
- DOMPurify for HTML sanitization
- Strict Content Security Policy

### Code Security
- ESLint strict rules (no `any` types)
- TypeScript strict mode
- Input validation on forms
- Output sanitization

## Performance Optimizations

### 1. Lazy Loading
- Routes lazy-loaded per page
- Components loaded on-demand
- Reduced initial bundle size

### 2. Caching Strategy
- DataStore caches all synced data
- S3 files cached in local filesystem
- Moon phase data cached for offline use

### 3. Bundle Optimization
- Tree-shaking via standalone components
- Production build minification
- AOT (Ahead-of-Time) compilation
- 7MB max bundle size limit

### 4. Image Optimization
- Lazy loading for images
- Responsive images
- WebP format support (via Capacitor)

## Scalability Considerations

### Frontend Scalability
- Standalone components for better tree-shaking
- Service workers for offline capabilities
- Efficient change detection strategies

### Backend Scalability
- AWS managed services auto-scale
- AppSync handles concurrent connections
- DynamoDB on-demand capacity mode
- S3 unlimited storage

### Data Synchronization
- Incremental sync (only changed records)
- Pagination for large datasets
- Selective sync (user-scoped data only)

## Testing Architecture

### Unit Tests
- Karma + Jasmine test runner
- 56+ test files (`.spec.ts`)
- Service layer fully testable
- Mock data for offline testing

### Test Configuration
- Chrome Headless for CI/CD
- Firefox Headless as fallback
- Coverage reporting (Istanbul)
- Automated test runs on commit

## Build & Deployment Architecture

### Build Process
```
Source Code (TypeScript/SCSS)
    ↓
Angular Compiler (AOT)
    ↓
Webpack Bundling
    ↓
Minification & Optimization
    ↓
Web Build (www/)
    ↓
Capacitor Copy
    ↓
Native Project (android/)
    ↓
Gradle Build
    ↓
APK/AAB Output
```

### Environment Configuration
- `environment.ts`: Development config
- `environment.prod.ts`: Production config
- Runtime Amplify configuration
- Build-time feature flags

### Deployment Targets
- Web: Static hosting (www/ directory)
- Android: Google Play Store (APK/AAB)
- Potential iOS: Apple App Store (future)

## Monitoring & Analytics

### Application Monitoring
- AWS Analytics (Pinpoint) integration
- Session tracking
- Page view tracking
- Custom event tracking

### Error Tracking
- Console error logging
- DataStore sync error handling
- Network failure recovery

### Performance Monitoring
- Angular performance profiling
- DataStore sync metrics
- API response time tracking
