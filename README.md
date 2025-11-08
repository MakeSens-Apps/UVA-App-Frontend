# UVA-App Frontend

> Mobile application for agricultural monitoring and vineyard management

## 📋 Project Description

UVA-App is a mobile application designed to solve agricultural monitoring challenges for grape vineyard management. The app enables farmers and agricultural professionals to track measurements, monitor progress, and make data-driven decisions based on agricultural best practices including lunar cycle integration.

## 🎯 Purpose

This repository contains the frontend mobile application built to:
- Enable offline-first data collection in agricultural environments
- Track time-series measurements with cloud synchronization
- Gamify agricultural monitoring to improve user engagement
- Provide visual analytics and historical data insights
- Support multi-project collaboration through RACIMO (cluster) organization

## ✨ Main Functionalities

- **Authentication & Security**: Phone-based authentication with SMS OTP and MFA
- **Measurement Tracking**: Daily task-based measurement system with time restrictions
- **Offline Support**: Local data storage with automatic cloud synchronization
- **Gamification**: Progress tracking with seeds, streaks, milestones, and achievements
- **Project Management**: Multi-tenant structure with project linking via codes
- **Moon Phase Integration**: Agricultural calendar based on lunar cycles
- **Data Visualization**: Historical charts and progress analytics
- **Real-time Sync**: GraphQL subscriptions for instant data updates

## 🚀 Basic Commands

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Ionic CLI (`npm install -g @ionic/cli`)
- Capacitor CLI (`npm install -g @capacitor/cli`)
- AWS Amplify CLI (`npm install -g @aws-amplify/cli`)
- Android Studio (for Android builds)
- JDK 11+ (for Android builds)

### Installation & Setup

```bash
# Clone the repository
git clone <repository-url>
cd UVA-App-Frontend

# Install dependencies
npm install

# Pull Amplify backend configuration
amplify pull

# Sync Capacitor with native projects
npx cap sync
```

### Run Locally

```bash
# Development server (web browser)
npm start
# or
ionic serve

# Run on Android emulator/device
ionic capacitor run android

# Open in Android Studio
ionic capacitor open android
```

### Build for Production

```bash
# Build web application
npm run build

# Build Android APK (debug)
npm run build-android-debug

# Build for production Android
ionic capacitor build android --prod
```

### Testing

```bash
# Run tests in watch mode
npm test

# Run tests in CI mode
npm run test:ci

# Run tests with coverage
npm run test:dev
```

### Deployment

The app is configured for Android deployment with:
- **App ID**: `com.makesens.uvaapp`
- **Current Version**: 2.1.6 (Version Code: 7)

Build outputs are generated in:
- Web: `www/` directory
- Android: `android/app/build/outputs/`

## 🏗️ General Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Mobile Application                     │
│              (Angular 18 + Ionic 8 + Capacitor)         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │    Pages     │  │  Components  │  │   Services   │  │
│  │              │  │              │  │              │  │
│  │ - Auth       │  │ - Charts     │  │ - API Layer  │  │
│  │ - Measurement│  │ - Calendar   │  │ - Auth       │  │
│  │ - Historical │  │ - Alerts     │  │ - DataStore  │  │
│  │ - Profile    │  │ - Moon Card  │  │ - Storage    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
├─────────────────────────────────────────────────────────┤
│              AWS Amplify DataStore (Offline)            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │          AWS Cloud Services (Backend)             │  │
│  │                                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │ AppSync  │  │ Cognito  │  │    S3    │       │  │
│  │  │ GraphQL  │  │   Auth   │  │  Storage │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  │                                                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Component Architecture

- **Presentation Layer**: Ionic UI components with Angular standalone architecture
- **Service Layer**: Business logic organized by domain (API, Auth, Storage, View)
- **Data Layer**: AWS Amplify DataStore with offline-first strategy
- **Backend Layer**: AWS managed services (AppSync, Cognito, S3, DynamoDB)

### Key Architectural Patterns

- **Offline-First**: Local data persistence with background sync
- **Service-Oriented**: Clear separation of concerns across service layers
- **Reactive Programming**: RxJS observables for async operations
- **Standalone Components**: Modern Angular architecture without NgModules
- **Path Aliases**: Clean imports using `@app/*`, `@components/*`, etc.

## 🛠️ Main Technologies

### Frontend Framework
- **Angular 18** - Web application framework
- **Ionic 8** - Mobile UI components
- **Capacitor 6** - Native runtime bridge
- **TypeScript 5.5** - Type-safe language
- **RxJS 7.8** - Reactive extensions

### Backend & Cloud
- **AWS Amplify 6.8** - Backend integration platform
- **AWS AppSync** - Managed GraphQL API
- **AWS Cognito** - Authentication & user management
- **AWS S3** - Object storage
- **AWS DynamoDB** - NoSQL database (via DataStore)

### UI & Visualization
- **Chart.js 4.4** - Data visualization
- **SweetAlert2** - Custom alerts
- **Ionicons** - Icon library
- **SCSS** - Styling with CSS variables

### Development Tools
- **Karma + Jasmine** - Testing framework
- **ESLint** - Code linting (strict mode)
- **Prettier** - Code formatting
- **Husky** - Git hooks

### Build & Deployment
- **Angular CLI** - Build tooling
- **Ionic CLI** - Mobile app development
- **Capacitor CLI** - Native builds
- **Android Gradle** - Android build system

## 📚 Documentation

Detailed technical documentation is available in the `/docs` folder:

- [Architecture Documentation](./docs/architecture.md) - System design and component details
- [Features Documentation](./docs/features.md) - Detailed feature descriptions and workflows
- [API Documentation](./docs/api.md) - GraphQL API endpoints and operations
- [Database Documentation](./docs/database.md) - Data models and relationships
- [Infrastructure Documentation](./docs/infrastructure.md) - AWS resources and configuration

## 📄 License

Copyright © MakeSens Apps

## 🤝 Contributing

This is a private repository. Contact the development team for contribution guidelines.

---

**Development Team**: MakeSens Apps
**Latest Version**: 2.1.6 (Build 7)
**Minimum Requirements**: Node.js 20+, Android SDK for mobile builds
