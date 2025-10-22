# Fix for Detektorlister RLS Policy Error

## Problem
When saving detektorlister, you get the error:
```
Error code: 42501
Message: "new row violates row-level security policy for table 'detektorlister'"
```

This happens because the `detektorlister` and `detektor_items` tables have Row Level Security (RLS) enabled but no policies have been configured.

## Solution
Run the SQL migration file: `add_rls_policies_detektorlister.sql`

### How to Apply

#### Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `add_rls_policies_detektorlister.sql`
4. Copy the entire content
5. Paste it into the SQL Editor
6. Click **Run**

#### Option 2: Via Supabase CLI
```bash
supabase db push
```

Or manually:
```bash
psql -h <your-db-host> -U postgres -d postgres -f supabase_migrations/add_rls_policies_detektorlister.sql
```

## What the Migration Does

The migration adds the following RLS policies:

### For `detektorlister` table:
- **SELECT**: Authenticated users can view all detektorlister
- **INSERT**: Authenticated users can create new detektorlister
- **UPDATE**: Authenticated users can update detektorlister
- **DELETE**: Authenticated users can delete detektorlister

### For `detektor_items` table:
- **SELECT**: Authenticated users can view all detektor_items
- **INSERT**: Authenticated users can create new detektor_items
- **UPDATE**: Authenticated users can update detektor_items
- **DELETE**: Authenticated users can delete detektor_items

## Verification

After running the migration, you should be able to:
1. Create new detektorlister
2. Edit existing detektorlister
3. Add/remove detector items
4. Save without getting the 42501 error

## Code Changes

The `DetektorlisteEditor.tsx` component has also been updated to:
- Properly handle and check for errors from Supabase operations
- Display user-friendly error messages when RLS policy errors occur
- Log detailed error information to the console for debugging
