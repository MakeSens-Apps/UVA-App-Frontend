# UVA App Frontend - Claude Code Context

## Project Overview

**UVA App** is a generic hybrid mobile application developed for environmental measurements and monitoring. The app serves as a flexible platform for collecting various environmental data points. In this initial version, the application focuses on measuring **temperature**, **humidity**, and **rain**, but the architecture is designed to support additional environmental measurements in future versions.

### Key Features
- Environmental measurement collection (temperature, humidity, rain)
- Extensible measurement system for future sensor types
- User authentication and profiles
- Historical data visualization with charts
- Moon phase tracking integration
- Gamification system with achievements
- Data synchronization with AWS backend
- Offline-first architecture with local storage
- Community participation in environmental data collection

## Technology Stack

### Frontend Framework
- **Angular 18** - Primary framework with standalone components
- **Ionic 8** - Mobile UI framework for cross-platform development
- **TypeScript 5.5** - Primary programming language
- **SCSS** - Styling with CSS preprocessor

### Mobile Development
- **Capacitor 6** - Native mobile functionality bridge
- **Android** - Primary mobile platform target
- **Cordova plugins** - Additional native capabilities

### Backend & Cloud Services
- **AWS Amplify** - Full-stack development platform
- **AWS Cognito** - User authentication and management
- **AWS AppSync** - GraphQL API with real-time capabilities
- **DynamoDB** - NoSQL database through Amplify DataStore
- **S3** - File storage for user uploads and assets

### Development Tools
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **Karma + Jasmine** - Unit testing framework
- **Husky** - Git hooks for code quality

### Key Libraries
- **Chart.js** - Data visualization and charts
- **SweetAlert2** - User-friendly alerts and modals
- **date-fns** - Date manipulation and formatting
- **RxJS** - Reactive programming with observables

## Project Structure

```
src/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── alert/          # Custom alert component
│   │   ├── areachart/      # Chart.js area chart wrapper
│   │   ├── calendar/       # Custom calendar with day component
│   │   ├── header/         # App header component
│   │   ├── moon-card/      # Moon phase display card
│   │   └── progress-bar/   # Custom progress indicator
│   ├── core/               # Core services and utilities
│   │   ├── pipes/          # Custom Angular pipes (safe-html)
│   │   └── services/       # Business logic services
│   │       ├── api/        # API integration services
│   │       ├── auth/       # Authentication services
│   │       ├── storage/    # Data storage abstractions
│   │       └── view/       # View-specific services
│   ├── pages/              # Application pages/screens
│   │   ├── auth/           # Authentication flow pages
│   │   ├── home/           # Main dashboard
│   │   ├── measurement/    # Environmental measurement features
│   │   ├── historical/     # Data history and analytics
│   │   ├── profile/        # User profile and settings
│   │   └── tabs/           # Bottom tab navigation
│   └── Interfaces/         # TypeScript type definitions
├── assets/                 # Static assets (images, fonts, icons)
├── environments/           # Environment configurations
└── theme/                 # Global SCSS styling
```

## Key Services Architecture

### Authentication (`auth.service.ts`)
- AWS Cognito integration
- Phone number-based authentication
- SMS verification
- User session management

### Data Storage
- **DataStore Services** - Local-first data with AWS sync
- **API Services** - Direct GraphQL API communication
- **File System Service** - Local file management
- **S3 Service** - Cloud storage integration

### Business Logic
- **Measurement Services** - Environmental data collection and processing (temperature, humidity, rain)
- **Moon Phase Service** - Astronomical calculations
- **Gamification Service** - Achievement and progress tracking
- **Setup Services** - App initialization and configuration

## Development Guidelines

### Code Style
- Use **standalone Angular components** (new Angular 18 approach)
- Follow **Ionic Angular** patterns and conventions
- Implement **reactive programming** with RxJS observables
- Use **TypeScript interfaces** for type safety
- Follow **ESLint rules** configured for the project

### Architecture Patterns
- **Service-oriented architecture** with clear separation of concerns
- **DataStore pattern** for offline-first data management
- **Component composition** over inheritance
- **Reactive forms** for user input handling

### Testing Requirements
- Unit tests for all services using **Jasmine**
- Component testing with **Angular Testing Utilities**
- Run tests with: `npm run test` or `npm run test:ci`
- Maintain test coverage for critical business logic

### Build and Deployment
- **Development**: `ionic serve` for web development
- **Production Build**: `npm run build`
- **Android Build**: `npm run android:build`
- **Linting**: `npm run lint` (fix with `npm run lint:fix`)
- **Code Formatting**: `npm run format`

## AWS Amplify Configuration

### Authentication
- **User Pool**: Cognito-based with phone number verification
- **MFA**: SMS-based multi-factor authentication
- **Attributes**: Name, family name, phone number

### API
- **GraphQL Endpoint**: AppSync with Cognito authentication
- **Real-time**: WebSocket subscriptions for live data
- **Offline**: DataStore for offline-first functionality

### Storage
- **S3 Bucket**: User file uploads and app assets
- **DynamoDB**: Backend data storage through DataStore

## Important Conventions

### File Naming
- **Pages**: `name.page.ts` (e.g., `home.page.ts`)
- **Components**: `name.component.ts` (e.g., `header.component.ts`)
- **Services**: `name.service.ts` (e.g., `auth.service.ts`)
- **Interfaces**: `IName.ts` (e.g., `IMeasurement.ts`)

### Component Structure
- Use **standalone components** with imports array
- Include proper **OnDestroy** implementation for cleanup
- Use **ViewChild** for DOM element access
- Implement **OnInit** for initialization logic

### Service Patterns
- **Injectable** with `providedIn: 'root'` for singletons
- **BehaviorSubject** for state management
- **Error handling** with try-catch and user feedback
- **Type safety** with interfaces and generics

## Security Considerations
- **No hardcoded credentials** - use environment variables
- **Secure API calls** with proper authentication headers
- **Input validation** on all user inputs
- **Safe HTML rendering** using custom pipe
- **File upload restrictions** and validation

## Performance Guidelines
- **Lazy loading** for page modules
- **OnPush change detection** where appropriate
- **Subscription management** to prevent memory leaks
- **Image optimization** for mobile performance
- **Bundle size monitoring** with Angular budgets

## Common Commands

```bash
# Development
npm start                    # Start development server
ionic serve --lab          # Multi-platform preview

# Building
npm run build               # Production build
npm run android:build      # Android build

# Quality Assurance
npm run lint               # Run ESLint
npm run lint:fix          # Fix ESLint issues
npm run format            # Format code with Prettier
npm run test              # Run unit tests

# AWS Amplify
amplify status            # Check backend status
amplify push             # Deploy backend changes
npm run update-graphql   # Update GraphQL schema
```

## Environment Variables
- Development environment uses `environment.ts`
- Production environment uses `environment.prod.ts`
- AWS configuration in `amplifyconfiguration.json`

## Current Measurement Types

### Supported Environmental Data
- **Temperature** - Ambient temperature readings
- **Humidity** - Relative humidity percentage
- **Rain** - Precipitation measurements

### Future Extensibility
The application architecture is designed to easily accommodate additional environmental measurements such as:
- UV radiation levels
- Air quality indices
- Wind speed and direction
- Atmospheric pressure
- Soil moisture
- Light intensity

The measurement system uses a flexible data model that allows for new sensor types to be added without major architectural changes.

---

This context should help Claude Code understand the project structure, technology stack, and development patterns used in the UVA App Frontend.