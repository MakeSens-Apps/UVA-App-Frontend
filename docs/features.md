# Features Documentation

## Feature Overview

UVA-App provides comprehensive agricultural monitoring capabilities with gamification elements to encourage consistent data collection and user engagement.

---

## 1. Authentication & User Management

### Description
Secure phone-based authentication system with SMS verification, designed for users who may not have email addresses or prefer phone-based access.

### Use Cases
- **UC-01**: First-time user registration
- **UC-02**: Returning user login
- **UC-03**: OTP verification for security
- **UC-04**: Account recovery
- **UC-05**: Multi-factor authentication

### Workflow

#### Registration Flow
```
1. User opens app → Splash screen
   ↓
2. Click "Register" → Pre-registration page
   ↓
3. Enter phone number (format validation)
   ↓
4. Cognito sends SMS OTP
   ↓
5. Enter 6-digit OTP code
   ↓
6. OTP verification
   ↓
7. Choose: Join existing RACIMO (via code) OR Create new RACIMO
   ↓
8. Complete profile information
   ↓
9. Account created → Navigate to home
```

#### Login Flow
```
1. Enter phone number
   ↓
2. Cognito sends OTP
   ↓
3. Enter OTP code
   ↓
4. Verification success
   ↓
5. Session established
   ↓
6. DataStore syncs user data
   ↓
7. Navigate to home/tabs
```

### Key Features
- Phone number format validation
- SMS OTP delivery via AWS Cognito
- 6-digit verification code
- Automatic session management
- Secure token storage
- MFA enforcement for security

### Implementation Details
- **Services**: `auth-api.service.ts`, `session.service.ts`
- **Pages**: `src/app/pages/auth/`
- **Backend**: AWS Cognito User Pool

---

## 2. Measurement Tracking

### Description
Core feature for collecting time-series agricultural data. Users complete daily tasks with time restrictions and field-specific validation.

### Use Cases
- **UC-06**: Record daily measurements
- **UC-07**: View pending tasks
- **UC-08**: Complete time-restricted tasks
- **UC-09**: Submit measurements with validation
- **UC-10**: View measurement history

### Workflow

#### Daily Measurement Flow
```
1. User navigates to Measurement tab
   ↓
2. System displays available tasks for today
   ↓
3. User selects a task
   ↓
4. System validates:
   - Is task available today? (day-of-week check)
   - Is current time within allowed hours?
   - Has task been completed today?
   ↓
5. If valid → Show measurement form
   ↓
6. User enters data (with field validation)
   ↓
7. Submit measurement
   ↓
8. Save to DataStore (local-first)
   ↓
9. Update UI immediately (optimistic)
   ↓
10. Background sync to cloud
   ↓
11. Update gamification progress
   ↓
12. Show success message
```

### Key Features

#### Time Restrictions
- Tasks can be restricted to specific hours (e.g., 6 AM - 8 PM)
- Day-of-week scheduling (e.g., only Monday, Wednesday, Friday)
- Week-of-month patterns (e.g., 1st and 3rd week only)
- Monthly recurrence patterns

#### Task Types
- Numeric measurements (with min/max validation)
- Text observations
- Single/multiple choice selections
- Date/time stamps
- Photo attachments

#### Validation
- Required field checks
- Data type validation
- Range validation (min/max values)
- Time window enforcement
- Duplicate prevention (one task per day)

### Implementation Details
- **Services**: `uva-api.service.ts`, `measurement.service.ts`
- **Pages**: `src/app/pages/measurement/`
- **Components**: Form inputs, validation directives
- **Models**: `Measurement` DataStore model

---

## 3. Gamification System

### Description
Progress tracking and achievement system to encourage consistent data collection and app engagement.

### Use Cases
- **UC-11**: Track user progress (seeds, streaks)
- **UC-12**: Earn achievements
- **UC-13**: Complete bonus tasks
- **UC-14**: View leaderboard rankings
- **UC-15**: Unlock milestones

### Workflow

#### Progress Calculation
```
User completes measurement
   ↓
System calculates:
- Seeds earned (points for completion)
- Current streak (consecutive days)
- Milestone progress
- Bonus task eligibility
   ↓
Update UserProgress model
   ↓
Check for new achievements
   ↓
Display celebration UI (if applicable)
   ↓
Sync progress to cloud
```

### Key Features

#### Seeds (Points System)
- Earn seeds for each completed measurement
- Bonus seeds for:
  - Consecutive day streaks
  - Perfect weeks (all tasks completed)
  - First completion of new task types
  - Early morning completions

#### Streaks
- Daily streak counter
- Weekly streak tracking
- Longest streak record
- Streak recovery grace period (1 day)

#### Milestones
- Bronze, Silver, Gold, Platinum tiers
- Based on total measurements completed
- Special achievements for:
  - 7-day streak
  - 30-day streak
  - 100 total measurements
  - Perfect month

#### Bonus Tasks
- Weekly recurring challenges
- Monthly special events
- Seasonal agricultural activities
- Community challenges (RACIMO-wide)

### Implementation Details
- **Services**: `gamification.service.ts`
- **Models**: `UserProgress` DataStore model
- **Components**: `progress-bar`, achievement badges
- **Pages**: Profile page displays achievements

---

## 4. Project Management (RACIMO)

### Description
Multi-tenant organization system where users belong to a RACIMO (cluster/project) and manage their UVA (vineyard unit).

### Use Cases
- **UC-16**: Join existing RACIMO via linkage code
- **UC-17**: Create new RACIMO
- **UC-18**: Configure UVA details
- **UC-19**: View RACIMO member list
- **UC-20**: Share linkage code with team members

### Workflow

#### Joining a RACIMO
```
During registration:
1. User receives linkage code from admin
   ↓
2. Select "Join existing RACIMO"
   ↓
3. Enter 8-character linkage code
   ↓
4. System validates code
   ↓
5. Link user to RACIMO
   ↓
6. Create UVA record for user
   ↓
7. Sync RACIMO configuration
   ↓
8. User can start measurements
```

#### Creating a RACIMO
```
During registration:
1. Select "Create new RACIMO"
   ↓
2. Enter RACIMO details:
   - Name
   - Location
   - Field configuration
   ↓
3. System generates unique linkage code
   ↓
4. Create RACIMO record
   ↓
5. Create UVA for creator
   ↓
6. Set creator as admin
   ↓
7. Display linkage code for sharing
```

### Key Features

#### RACIMO (Project/Cluster)
- Unique 8-character linkage code
- Name and description
- Geographic location
- Member management
- Shared task configurations

#### UVA (Agricultural Unit)
- Associated with one RACIMO
- One UVA per user
- Location data (latitude, longitude, altitude)
- Field-specific configuration
- Measurement history

#### Linkage Code
- 8-character alphanumeric code
- Case-insensitive
- Unique per RACIMO
- Shareable for team invitations

### Implementation Details
- **Services**: `racimo-api.service.ts`, `uva-api.service.ts`
- **Models**: `RACIMO`, `UVA` DataStore models
- **Pages**: Registration wizard, profile settings

---

## 5. Historical Data & Analytics

### Description
Visualization and analysis of historical measurement data with charts, trends, and export capabilities.

### Use Cases
- **UC-21**: View measurement history
- **UC-22**: Analyze trends over time
- **UC-23**: Compare different time periods
- **UC-24**: Export data for reporting
- **UC-25**: Filter by date range and task type

### Workflow

#### Viewing Historical Data
```
1. User navigates to Historical tab
   ↓
2. Select date range (default: last 30 days)
   ↓
3. Optionally filter by:
   - Task type
   - Measurement type
   - Specific UVA field
   ↓
4. System queries DataStore
   ↓
5. Aggregate and process data
   ↓
6. Render Chart.js visualizations
   ↓
7. Display summary statistics
```

### Key Features

#### Visualizations
- Area charts for time-series data
- Line charts for trends
- Bar charts for comparisons
- Summary cards with key metrics

#### Time Ranges
- Last 7 days
- Last 30 days
- Last 90 days
- Custom date range picker
- Year-to-date view

#### Analytics
- Average values
- Min/max detection
- Trend direction (up/down/stable)
- Completion rate percentage
- Streak visualization

### Implementation Details
- **Services**: `historical.service.ts`
- **Pages**: `src/app/pages/historical/`
- **Components**: `areachart` (Chart.js wrapper)
- **Libraries**: Chart.js 4.4, date-fns

---

## 6. Moon Phase Integration

### Description
Agricultural calendar based on lunar cycles, providing recommendations for planting, harvesting, and other farm activities.

### Use Cases
- **UC-26**: View current moon phase
- **UC-27**: See monthly moon calendar
- **UC-28**: Get agricultural recommendations
- **UC-29**: Plan activities based on lunar cycle
- **UC-30**: Receive moon phase notifications

### Workflow

#### Moon Phase View
```
1. User navigates to Moon Phase tab
   ↓
2. System fetches current moon data
   ↓
3. Display:
   - Current phase (with icon)
   - Phase name (New, Waxing, Full, Waning)
   - Illumination percentage
   - Next phase date
   ↓
4. Show agricultural recommendations
   ↓
5. Display monthly calendar
```

### Key Features

#### Moon Phases
- 8 distinct phases tracked
- Visual moon phase icons
- Illumination percentage
- Phase transition dates

#### Agricultural Recommendations
- Best days for planting
- Optimal harvest times
- Irrigation guidance
- Pest control timing

#### Calendar Integration
- Monthly moon phase calendar
- Phase indicators on dates
- Agricultural activity planning
- Reminder system

### Implementation Details
- **Services**: `moon-phase-api.service.ts`, `moon.service.ts`
- **Pages**: `src/app/pages/moon-phase/`
- **Components**: `moon-card`, `calendar`
- **Data**: Cached locally for offline access

---

## 7. Offline-First Capabilities

### Description
Full app functionality even without internet connection, with automatic background synchronization when online.

### Use Cases
- **UC-31**: Use app in remote areas without connectivity
- **UC-32**: Record measurements offline
- **UC-33**: View historical data offline
- **UC-34**: Auto-sync when connection restored
- **UC-35**: Resolve sync conflicts

### Workflow

#### Offline Operation
```
User opens app (no internet)
   ↓
DataStore loads from local IndexedDB
   ↓
All data available for viewing
   ↓
User records new measurement
   ↓
Saved to local DataStore
   ↓
UI updated immediately
   ↓
DataStore queues for sync
   ↓
[Later, when online]
   ↓
Background sync starts
   ↓
Upload pending changes
   ↓
Download server updates
   ↓
Resolve conflicts (if any)
   ↓
Notify user of sync status
```

### Key Features

#### Offline Storage
- All synced data cached locally
- IndexedDB for structured data
- Capacitor Filesystem for files
- Unlimited storage capacity

#### Sync Strategy
- Optimistic UI updates
- Background sync when online
- Incremental sync (only changes)
- Conflict resolution with versioning

#### Conflict Resolution
- Last-write-wins strategy
- Version-based conflict detection
- User notification for conflicts
- Manual resolution option

### Implementation Details
- **Services**: AWS Amplify DataStore
- **Storage**: IndexedDB, Capacitor Filesystem
- **Sync**: Automatic background process

---

## 8. Profile & Settings

### Description
User profile management, app settings, and account preferences.

### Use Cases
- **UC-36**: Update profile information
- **UC-37**: View achievements and stats
- **UC-38**: Configure app settings
- **UC-39**: Manage account security
- **UC-40**: Logout and session management

### Workflow

#### Profile Update
```
1. User navigates to Profile tab
   ↓
2. View current profile data
   ↓
3. Click "Edit Profile"
   ↓
4. Modify fields (name, UVA details, etc.)
   ↓
5. Optional: Upload profile picture to S3
   ↓
6. Save changes to DataStore
   ↓
7. Sync to backend
   ↓
8. Show success confirmation
```

### Key Features

#### Profile Information
- Name and contact details
- Associated UVA information
- RACIMO membership details
- Profile picture (S3 storage)
- Account creation date

#### Achievements Display
- Total seeds earned
- Current streak
- Milestones reached
- Badge collection
- Leaderboard ranking

#### Settings
- Language preferences
- Notification settings
- Data sync preferences
- Theme options (future)
- Privacy settings

#### Account Management
- Change phone number
- Enable/disable MFA
- Logout functionality
- Account deletion request

### Implementation Details
- **Services**: `user-api.service.ts`, `s3.service.ts`
- **Pages**: `src/app/pages/profile/`
- **Storage**: S3 for profile pictures

---

## 9. Notifications & Reminders

### Description
Push notifications and in-app reminders to encourage daily task completion.

### Use Cases
- **UC-41**: Receive daily task reminders
- **UC-42**: Get streak warning notifications
- **UC-43**: Achievement unlock celebrations
- **UC-44**: RACIMO updates and announcements

### Key Features

#### Notification Types
- Daily task reminders (configurable time)
- Streak warning (if tasks not completed)
- Achievement unlocked
- RACIMO admin announcements
- Sync status updates

#### Scheduling
- User-defined reminder times
- Smart timing (based on task restrictions)
- Snooze functionality
- Do-not-disturb hours

### Implementation Details
- **Platform**: Capacitor Local Notifications
- **Backend**: AWS Pinpoint (future)
- **Scheduling**: Local notification scheduler

---

## 10. Data Export & Reporting

### Description
Export measurement data for external analysis, reporting, and record-keeping.

### Use Cases
- **UC-45**: Export data to CSV
- **UC-46**: Generate PDF reports
- **UC-47**: Share data with team members
- **UC-48**: Backup personal data

### Key Features

#### Export Formats
- CSV for spreadsheet analysis
- JSON for programmatic access
- PDF reports with charts (future)

#### Export Options
- Date range selection
- Task type filtering
- Include/exclude metadata
- Aggregate vs. raw data

### Implementation Details
- **Services**: Export utilities
- **Libraries**: CSV parser, PDF generator
- **Storage**: Capacitor Filesystem, Share API

---

## Feature Roadmap

### Planned Features
- **iOS Support**: Build and deploy iOS version
- **Photo Attachments**: Attach photos to measurements
- **Weather Integration**: Correlate measurements with weather data
- **Team Collaboration**: Comments and shared notes
- **Advanced Analytics**: ML-based insights and predictions
- **Multi-language Support**: Spanish, Portuguese localization
- **Dark Mode**: Theme customization
- **Voice Input**: Hands-free data entry for fieldwork
- **Barcode Scanning**: Quick product/field identification

### Under Consideration
- Web dashboard for RACIMO admins
- Integration with IoT sensors
- Automated measurement suggestions
- Expert system recommendations
- Social features and community
