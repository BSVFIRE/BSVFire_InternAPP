# Offline Mode Implementation for Fire Alarm Systems

## Overview
Added offline mode and automatic synchronization support for NS3960 and FG790 fire alarm control systems (brannalarm). Users can now work without internet connection, and all changes will be automatically synchronized when network access is restored.

## Implementation Date
2025-10-14

## Changes Made

### 1. OfflineInfoDialog Component (`src/components/OfflineInfoDialog.tsx`)

#### New Component:
A comprehensive dialog component that provides users with:
- Visual explanation of status indicators (Offline, Syncing, Saved)
- Step-by-step guide on how offline mode works
- Practical examples (basement without coverage, unstable connection, battery saving)
- Important warnings and best practices
- What works offline vs. what requires internet
- Troubleshooting section

#### Features:
- Modal dialog with backdrop
- Scrollable content for long guide
- Organized sections with visual hierarchy
- Color-coded status examples
- Close button and click-outside-to-close

### 2. Layout Component (`src/components/Layout.tsx`)

#### Added Features:
- Info icon button in user section (sidebar footer)
- State management for dialog visibility
- Blue hover effect on info button
- Positioned next to logout button

#### Key Changes:
1. **Imports Added**:
   - `useState` hook
   - `Info` icon from lucide-react
   - `OfflineInfoDialog` component

2. **UI Updates**:
   - Info button with tooltip "Offline-modus info"
   - Blue color scheme for info button (matches info theme)
   - Dialog integration at app level

### 3. NS3960KontrollView (`src/pages/rapporter/brannalarm/kontroll/NS3960KontrollView.tsx`)

#### Added Features:
- **Offline Detection**: Automatically detects when the device is offline
- **Local Caching**: All control data is cached locally using `localStorage`
- **Queue System**: Changes made offline are queued for synchronization
- **Visual Indicators**: Shows offline/online status and sync progress
- **Auto-sync**: Automatically syncs when connection is restored

#### Key Changes:
1. **Imports Added**:
   - `useOfflineStatus` - Hook for monitoring online/offline status
   - `useOfflineQueue` - Hook for queuing changes
   - `cacheData`, `getCachedData` - Functions for local storage
   - `WifiOff`, `Wifi` - Icons for status indicators

2. **Data Loading**:
   - Checks if offline and loads from cache first
   - Falls back to online data fetching if online
   - Caches all loaded data for offline access

3. **Data Saving**:
   - Saves to cache immediately (both online and offline)
   - If offline: queues changes for later sync
   - If online: saves directly to Supabase database

4. **UI Indicators**:
   - Orange "Offline" badge when no connection
   - Blue "Synkroniserer..." badge during sync
   - Green checkmark with timestamp when saved

### 2. FG790KontrollView (`src/pages/rapporter/brannalarm/kontroll/FG790KontrollView.tsx`)

#### Added Features:
Same features as NS3960KontrollView, adapted for FG790 control structure:
- Offline detection and caching
- Queue system for offline changes
- Visual status indicators
- Automatic synchronization

#### Key Changes:
1. **Imports Added**:
   - `useOfflineStatus`, `useOfflineQueue`
   - `cacheData`, `getCachedData`
   - `WifiOff` icon

2. **Data Management**:
   - Caches FG790-specific data including:
     - Control points (kontrollpunkter)
     - Facility assessment (anleggsvurdering)
     - Scoring data (AG-verdier, poeng)
   - Queues all changes when offline

3. **UI Updates**:
   - Offline/online indicator in header
   - Sync progress indicator
   - Clear user feedback for offline saves

## Technical Details

### Cache Keys
- NS3960: `ns3960_kontroll_{anleggId}`
- FG790: `fg790_kontroll_{anleggId}`

### Cached Data Structure

#### NS3960:
```typescript
{
  kontrollId: string
  anleggsNavn: string
  leverandor: string
  sentraltype: string
  merknader: string
  harFeil: boolean
  feilKommentar: string
  harUtkoblinger: boolean
  utkoblingKommentar: string
  data: Record<string, KontrollpunktData>
}
```

#### FG790:
```typescript
{
  kontrollId: string
  anleggsNavn: string
  kontrollorVurderingSum: number | null
  kontrollorVurderingKommentar: string
  ingenAnleggsvurdering: boolean
  ingenAnleggsvurderingKommentar: string
  kritiskFeil: boolean
  kritiskFeilKommentar: string
  data: Record<string, KontrollpunktData>
}
```

### Queued Operations
When offline, the following operations are queued:

1. **NS3960**:
   - Update `anleggsdata_kontroll` table
   - Update `anleggsdata_brannalarm` table
   - Insert `ns3960_kontrollpunkter` records

2. **FG790**:
   - Update `anleggsdata_kontroll` table
   - Insert `kontrollsjekkpunkter_brannalarm` records

## User Experience

### Info Button
- Blue info icon (ℹ️) located in the sidebar next to the logout button
- Click to open comprehensive offline mode guide
- Shows status indicators, examples, and troubleshooting tips
- Available to all users at all times

### Offline Mode
1. User loses internet connection
2. Orange "Offline" badge appears in header
3. User continues working normally
4. All changes are saved locally
5. Alert confirms: "✓ Lagret lokalt (offline). Synkroniseres når nettilgang er tilgjengelig."

### Coming Back Online
1. Internet connection is restored
2. Blue "Synkroniserer..." badge appears
3. All queued changes are automatically synced to database
4. Green checkmark appears when sync is complete
5. User can continue working with full online functionality

## Benefits

1. **Uninterrupted Work**: Technicians can work in areas with poor/no connectivity
2. **Data Safety**: All data is cached locally, preventing data loss
3. **Automatic Sync**: No manual intervention needed when connection returns
4. **Clear Feedback**: Visual indicators keep users informed of connection status
5. **Seamless Experience**: Offline mode works transparently in the background

## Testing Recommendations

1. **Offline Scenario**:
   - Disable network connection
   - Open a control (NS3960 or FG790)
   - Make changes and save
   - Verify "Offline" badge appears
   - Verify data is cached locally

2. **Sync Scenario**:
   - Make changes while offline
   - Re-enable network connection
   - Verify "Synkroniserer..." badge appears
   - Verify changes are synced to database
   - Verify no data loss

3. **Cache Loading**:
   - Load data while online
   - Go offline
   - Reload the page
   - Verify cached data loads correctly

## Dependencies

- Existing offline infrastructure (`src/lib/offline.ts`)
- Existing hooks (`src/hooks/useOffline.ts`)
- LocalStorage API (browser built-in)
- Supabase client for online operations

## Future Enhancements

1. **Conflict Resolution**: Handle cases where data changes both offline and online
2. **Sync Status Details**: Show which specific items are being synced
3. **Manual Sync Button**: Allow users to manually trigger sync
4. **Offline Indicator Badge**: Show number of pending changes
5. **Sync History**: Log of all sync operations for debugging

## Notes

- Cache is stored in browser's localStorage (typically 5-10MB limit)
- Cache persists across browser sessions
- Clearing browser data will clear the cache
- Multiple devices will have separate caches (no cross-device sync)
