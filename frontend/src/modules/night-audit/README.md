# Night Audit Module

## Overview
The Night Audit module is a comprehensive end-of-day processing system that automates critical hotel operations tasks including revenue posting, no-show processing, room status updates, and report generation.

## Features

### 1. Night Audit Dashboard
**Location:** `/night-audit`

**Features:**
- **Business Date Display:** Shows current business date with last audit information
- **Audit Status:** Real-time status of the latest audit (Completed, In Progress, Failed, or Pending)
- **Pending Blockers:** Lists any issues preventing audit execution (open shifts, etc.)
- **Run Audit CTA:** Primary action button to start the night audit process
- **Latest Audit Summary:** Quick view of key metrics from the most recent audit

**Access Control:**
- Only ADMIN and MANAGER roles can access
- Requires `manage_users` permission

### 2. Audit Progress Screen
**Location:** `/night-audit/:id/progress`

**Features:**
- **Real-time Progress Tracking:** Live updates of audit execution
- **Step-by-step Indicator:** Visual representation of each audit step
- **Live Logs:** Real-time messages for each step
- **Auto-polling:** Automatically refreshes every 2 seconds during execution
- **Retry Functionality:** Ability to retry failed audits
- **Error Display:** Clear presentation of any errors encountered

**Audit Steps:**
1. Validate Shift Closure - Ensures all cashier shifts are closed
2. Post Room Revenue - Posts daily room charges to guest folios
3. Process No-Shows - Identifies and processes reservations that didn't check in
4. Update Room Status - Updates room statuses based on current occupancy
5. Generate Reports - Creates daily audit reports and summaries
6. Rollover Business Date - Advances to the next business day

### 3. Audit Report Viewer
**Location:** `/night-audit/:id/report`

**Features:**
- **Printable Report:** Professional audit report with print functionality
- **Executive Summary:** Key metrics at a glance
  - Rooms Occupied
  - Room Revenue Posted
  - No-Shows Processed
  - Room Status Updates
- **Revenue Breakdown:** Detailed breakdown of all revenue categories
- **Occupancy Statistics:** Comprehensive occupancy data and averages
- **Reports Generated:** List of all generated reports
- **Audit Steps Summary:** Overview of all completed audit steps
- **Property Information:** Hotel details and audit metadata

## Backend Integration

### API Endpoints

All endpoints are prefixed with `/api/night-audit`

#### Get All Audits
```
GET /api/night-audit
Response: { success: true, data: NightAuditResponse[] }
```

#### Get Latest Audit
```
GET /api/night-audit/latest
Response: { success: true, data: NightAuditResponse | null }
```

#### Get Audit by ID
```
GET /api/night-audit/:id
Response: { success: true, data: NightAuditResponse }
```

#### Check if Audit Required
```
GET /api/night-audit/check-required
Response: { success: true, data: { isRequired: boolean } }
```

#### Start Night Audit
```
POST /api/night-audit/start
Body: { businessDate?: string }
Response: { success: true, data: NightAuditResponse }
```

#### Retry Failed Audit
```
POST /api/night-audit/:id/retry
Response: { success: true, data: NightAuditResponse }
```

### Data Types

```typescript
type NightAuditStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

type NightAuditStepType =
  | 'VALIDATE_SHIFT_CLOSURE'
  | 'POST_ROOM_REVENUE'
  | 'PROCESS_NO_SHOWS'
  | 'UPDATE_ROOM_STATUS'
  | 'GENERATE_REPORTS'
  | 'ROLLOVER_DATE';

type NightAuditResponse = {
  id: string;
  hotelId: string;
  hotelCode: string;
  businessDate: string; // YYYY-MM-DD
  status: NightAuditStatus;
  startedAt?: string;
  completedAt?: string;
  startedBy?: string;
  steps: NightAuditStep[];
  summary?: NightAuditSummary;
  errors?: string[];
  createdAt: string;
  updatedAt: string;
};

type NightAuditSummary = {
  totalRoomsOccupied: number;
  totalRevenuePosted: number;
  noShowsProcessed: number;
  roomStatusUpdates: number;
  reportsGenerated: string[];
};
```

## State Management

The module uses Zustand for state management via `useNightAuditStore`:

**State:**
- `audits`: Array of all audits
- `currentAudit`: Currently selected audit
- `isLoading`: Loading state
- `isAuditRequired`: Whether audit is required for today
- `error`: Error message if any

**Actions:**
- `fetchAudits()`: Fetch all audits
- `fetchLatestAudit()`: Fetch the most recent audit
- `fetchAuditById(id)`: Fetch specific audit
- `checkAuditRequired()`: Check if audit is needed
- `startAudit(businessDate?)`: Start new audit
- `retryAudit(id)`: Retry failed audit
- `resetError()`: Clear error state

## UI Components

### Catalyst UI Usage
- **Cards:** For dashboard metrics and status displays
- **Steppers:** For audit progress visualization
- **Modals:** For confirmation dialogs
- **Badges:** For status indicators
- **Buttons:** For primary and secondary actions

### Disabled States
- Run Audit button disabled when:
  - Audit already in progress
  - Audit not required (already completed today)
  - Blockers detected
  - User lacks required permissions

### Confirmation Modal
Before starting audit, a modal displays:
- List of all audit steps
- Warning about process implications
- Cancel and Confirm actions

## User Flow

### Normal Flow
1. User navigates to Night Audit Dashboard
2. System checks if audit is required
3. System displays pending blockers (if any)
4. User clicks "Run Night Audit"
5. Confirmation modal appears
6. User confirms, audit starts
7. User redirected to Progress Screen
8. Real-time updates show each step
9. Upon completion, "View Report" button appears
10. User views/prints comprehensive report

### Retry Flow
1. User views failed audit on Dashboard
2. Clicks "Retry Audit" button
3. Redirected to Progress Screen with retry parameter
4. System resets and restarts audit
5. Real-time updates show progress
6. Upon completion, report is available

## Role-Based Access Control

### ADMIN Role
- Full access to all Night Audit features
- Can run audits
- Can retry failed audits
- Can view all reports

### MANAGER Role
- Full access to all Night Audit features
- Can run audits
- Can retry failed audits
- Can view all reports

### Other Roles
- No access to Night Audit module

## Blockers

The system checks for blockers before allowing audit execution:

1. **Open Shifts:** Any active cashier shifts must be closed
2. **Audit In Progress:** Cannot start if another audit is running
3. **Already Completed:** Cannot run if today's audit is already completed

## Files Created

### Frontend
```
src/
├── services/
│   └── nightAuditApi.ts          # API client for Night Audit
├── stores/
│   └── nightAuditStore.ts        # Zustand store for state management
└── modules/
    └── night-audit/
        ├── index.tsx              # Route configuration
        ├── NightAuditDashboard.tsx    # Main dashboard
        ├── AuditProgressScreen.tsx    # Progress tracking
        └── AuditReportViewer.tsx      # Report display
```

### Backend (Existing)
```
backend/src/
├── routes/
│   └── night-audit/
│       └── nightAudit.router.ts   # API routes
├── services/
│   └── nightAuditService.ts       # Business logic
└── types/
    └── domain.ts                   # Type definitions
```

## Dependencies

### Required Packages
- `react-router-dom`: For routing
- `zustand`: State management
- `lucide-react`: Icons
- `react-to-print`: Print functionality
- `date-fns`: Date formatting

## Testing Checklist

- [ ] Navigate to Night Audit Dashboard
- [ ] Verify business date displays correctly
- [ ] Check audit status shows latest audit
- [ ] Confirm blockers display when present
- [ ] Test Run Audit button (enabled/disabled states)
- [ ] Verify confirmation modal appears
- [ ] Start audit and verify progress tracking
- [ ] Check real-time updates during audit
- [ ] Verify completion status
- [ ] View and print report
- [ ] Test retry functionality for failed audits
- [ ] Verify role-based access control
- [ ] Test navigation between screens

## Future Enhancements

1. **Email Reports:** Auto-email reports to management
2. **Custom Report Templates:** Configurable report layouts
3. **Historical Trends:** Charts showing audit trends over time
4. **Scheduled Audits:** Automatic audit execution at set times
5. **Multi-property Support:** Run audits across property groups
6. **Audit Comparison:** Compare audits across dates
7. **Export Functionality:** Export reports to PDF/Excel
8. **Audit Notifications:** Push/SMS notifications on completion
