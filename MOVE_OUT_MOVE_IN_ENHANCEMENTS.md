# Move-Out and Move-In Form Enhancements

## Summary of Changes

This document describes the comprehensive enhancements made to the move-out and move-in forms to improve the tenant experience and capture all necessary information for proper tenancy management.

## Issue 1: Tenant Details Not Showing in Rooms Table

### Status: ✅ Already Implemented

The rooms page (`/admin/houses/[id]/rooms`) already has the correct implementation to display tenant details:

**Features:**
- Fetches tenant information via JOIN with profiles table
- Displays: Tenant Name, Contact Email, Start Date, End Date, Rental Price
- Filters for OCCUPIED status tenancies
- Shows slot information for dual-capacity rooms

**Code Location:** `app/admin/houses/[id]/rooms/page.tsx` (lines 58-94)

### Troubleshooting

If tenant details aren't displaying, check:

1. **Tenancy Status:** Ensure the tenancy has `status = 'OCCUPIED'`
   ```sql
   SELECT id, status, tenant_user_id FROM tenancies WHERE id = 'your-tenancy-id';
   ```

2. **RLS Policies:** Verify policies allow reading tenant profiles
   ```sql
   -- Check if profiles table has SELECT policy for admins
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

3. **Data Integrity:** Verify tenant_user_id references a valid profile
   ```sql
   SELECT t.*, p.name, p.email 
   FROM tenancies t 
   LEFT JOIN profiles p ON t.tenant_user_id = p.id 
   WHERE t.id = 'your-tenancy-id';
   ```

## Issue 2: Enhanced Move-Out Form

### Overview

The move-out form has been significantly enhanced to collect comprehensive information required for proper move-out processing.

### New Fields Added

#### 1. Rent Payment Confirmation
- **Question:** "Have you paid all the rent up to the very day of your moving out?"
- **Type:** Yes/No radio buttons
- **Required:** Yes
- **Database:** `move_out_intentions.rent_paid_up` (boolean)

#### 2. Cleaning Confirmation
- **Question:** "Have you cleaned your bedroom and all common areas?"
- **Type:** Yes/No radio buttons
- **Required:** Yes
- **Database:** `move_out_intentions.areas_cleaned` (boolean)

#### 3. Damage Declaration
- **Question:** "Have you caused any damage/stain to any part of the house?"
- **Type:** Yes/No radio buttons
- **Required:** Yes
- **Database:** `move_out_intentions.has_damage` (boolean)
- **Note:** States that repair costs will be deducted from bond

**If "Yes" selected:**
- Shows text area for damage description
- **Field:** "Please specify the damage/stain details"
- **Type:** Long text (textarea)
- **Required:** Yes (when damage is "Yes")
- **Database:** `move_out_intentions.damage_description` (text)

#### 4. Photo Uploads

**General Condition Photos:**
- **Label:** "General Condition Photos (Kitchen, Bathroom, Living Room, Bedroom, etc.)"
- **Purpose:** Document overall condition of all areas
- **Type:** Multiple file upload
- **Accept:** image/*
- **Database:** `move_out_intentions.key_area_photos` (text array)
- **Storage:** Supabase Storage bucket 'move-out-photos'

**Damage Photos:**
- **Label:** "Damage/Stain Photos (If applicable)"
- **Purpose:** Document specific damages mentioned
- **Type:** Multiple file upload
- **Accept:** image/*
- **Database:** `move_out_intentions.damage_photos` (text array)
- **Storage:** Supabase Storage bucket 'move-out-photos'

#### 5. Bank Account Details for Bond Return

**Section Title:** "For the return of bond money, please transfer the amount to the following bank account:"

**Fields:**

1. **Bank**
   - Type: Text input
   - Required: Yes
   - Placeholder: "e.g., Commonwealth Bank, ANZ, Westpac"
   - Database: `move_out_intentions.bank_name` (text)

2. **Account Name**
   - Type: Text input
   - Required: Yes
   - Placeholder: "Name as it appears on your account"
   - Database: `move_out_intentions.account_name` (text)

3. **BSB**
   - Type: Text input with validation
   - Required: Yes
   - Format: XXX-XXX (6 digits with hyphen)
   - Validation: Pattern `[0-9]{3}-[0-9]{3}`
   - Auto-formatting: Inserts hyphen automatically
   - Placeholder: "XXX-XXX"
   - Database: `move_out_intentions.bsb` (text)

4. **Bank Account Number**
   - Type: Text input with validation
   - Required: Yes
   - Format: 6-10 digits
   - Validation: Pattern `[0-9]{6,10}`
   - Input sanitization: Only allows numbers
   - Placeholder: "6-10 digit account number"
   - Database: `move_out_intentions.account_number` (text)
   - **Security Note:** Consider encryption in production

5. **Bank Branch**
   - Type: Text input
   - Required: No (optional)
   - Placeholder: "Branch name or location (optional)"
   - Database: `move_out_intentions.bank_branch` (text)

### Instructions Sections

#### Further Instructions for Moving Out (Yellow box)
- Make arrangement with house coordinator for utilities payment
- Thoroughly clean room and common areas, get coordinator approval
- Return all keys given at start of tenancy

#### What Happens Next (Blue box)
- Coordinators and admins notified
- Coordinator reviews submission and photos
- Coordinator schedules move-out inspection
- After approval, bond refund processed to provided bank account

### Form Validation

**Client-side:**
- All required fields marked with asterisk (*)
- Radio buttons require selection
- BSB format validation (XXX-XXX)
- Account number length validation (6-10 digits)
- Conditional requirement for damage description

**User Experience:**
- Real-time formatting for BSB (auto-hyphen)
- Number-only input for account number
- Photo count display
- Upload progress indication
- Clear error messages

### Database Schema

```sql
-- New columns added to move_out_intentions table
ALTER TABLE move_out_intentions
ADD COLUMN IF NOT EXISTS rent_paid_up BOOLEAN,
ADD COLUMN IF NOT EXISTS areas_cleaned BOOLEAN,
ADD COLUMN IF NOT EXISTS has_damage BOOLEAN,
ADD COLUMN IF NOT EXISTS damage_description TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_name TEXT,
ADD COLUMN IF NOT EXISTS bsb TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_branch TEXT;
```

## Issue 3: Enhanced Move-In Acknowledgement

### Overview

The move-in acknowledgement has been transformed from a simple signature form to a comprehensive condition report review with photo documentation.

### New Features

#### 1. Tenancy Details Display

Shows current tenancy information:
- House name
- Room label
- Full address
- Start date

Displayed in a clean 2-column grid layout.

#### 2. General Condition Photos Gallery

**Purpose:** Display photos of key areas from previous tenant's move-out

**Features:**
- Responsive grid layout (2 cols mobile, 3 tablet, 4 desktop)
- Photos from `move_out_intentions.key_area_photos`
- Click to enlarge (opens in new tab)
- Hover effect with "Click to enlarge" overlay
- Professional shadow effects

**Display Logic:**
- Fetches photos from previous tenant's move-out intention
- Shows message if no photos available
- Graceful degradation

#### 3. Specific Damages/Issues Gallery

**Purpose:** Display documented damages from previous move-out

**Features:**
- Same responsive grid layout as general photos
- Photos from `move_out_intentions.damage_photos`
- Displays previous tenant's notes about damages
- Yellow highlighted note section
- Click to enlarge functionality

**Display:**
```
Previous tenant notes:
[damage_description text]
```

#### 4. Key Confirmation

**New Requirement:** Tenant must confirm receipt of keys

**Implementation:**
- Checkbox field: "I confirm that I have received the key(s) for this room"
- Helper text explaining importance
- Required before signature submission
- Saves to database with timestamp

**Database Fields:**
```sql
ALTER TABLE tenancies
ADD COLUMN IF NOT EXISTS keys_received BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS keys_received_at TIMESTAMPTZ;
```

**Validation:**
- Checkbox must be checked before submission
- Alert shown if not checked: "Please confirm you have received the keys"

#### 5. Enhanced Acknowledgement Checklist

**Updated "By signing, I acknowledge that:"**
- I have reviewed the room condition report and photos (if provided)
- I accept the current condition of the room as documented
- **I have received the key(s) for my room** ← NEW
- I understand my responsibilities as a tenant
- I will maintain the room in good condition during my tenancy
- **I will return the room in similar condition (normal wear and tear excepted)** ← NEW

### Server Actions

**New file:** `app/tenant/move-in/actions.ts`

**Actions:**

1. **getTenantPendingTenancy()**
   - Fetches tenant's active or pending tenancy
   - Includes room and house details
   - Includes previous move-out intentions with photos
   - Returns formatted data for display

2. **confirmKeysReceived(tenancyId)**
   - Updates tenancy record
   - Sets `keys_received = true`
   - Sets `keys_received_at = NOW()`
   - Validates tenant owns the tenancy

### Photo Display Logic

```typescript
// Fetch previous tenant's move-out data
const previousMoveOut = tenancyData?.move_out_intentions?.[0];
const keyAreaPhotos = previousMoveOut?.key_area_photos || [];
const damagePhotos = previousMoveOut?.damage_photos || [];

// Display sections only if photos exist
{keyAreaPhotos.length > 0 && (
  // Show general condition photos gallery
)}

{damagePhotos.length > 0 && (
  // Show damage photos gallery
)}

// Fallback message if no photos
{keyAreaPhotos.length === 0 && damagePhotos.length === 0 && (
  // Show "No photos available" message
)}
```

### User Experience Flow

1. **Page Load:**
   - Fetches tenant's tenancy data
   - Loads previous move-out photos (if available)
   - Displays tenancy details

2. **Review:**
   - Tenant views general condition photos
   - Tenant views any documented damages
   - Tenant reads previous tenant's notes

3. **Confirmation:**
   - Tenant checks "keys received" checkbox
   - Tenant signs acknowledgement

4. **Submission:**
   - Validates signature exists
   - Validates keys confirmed
   - Saves key confirmation to database
   - Shows success message

### Database Schema

```sql
-- New columns added to tenancies table
ALTER TABLE tenancies
ADD COLUMN IF NOT EXISTS keys_received BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS keys_received_at TIMESTAMPTZ;

COMMENT ON COLUMN tenancies.keys_received IS 
  'Tenant confirmation of receiving keys during move-in acknowledgement';
```

## Database Migration

### File: `supabase/migrations/006_enhance_move_out_move_in.sql`

**Run this migration to apply all schema changes:**

```bash
# Option 1: Supabase Dashboard
# Copy contents of migration file to SQL Editor and execute

# Option 2: Supabase CLI
supabase db push
```

**Migration includes:**
1. All move_out_intentions columns
2. All tenancies columns for key confirmation
3. Comments for documentation
4. Index for performance

## Security Considerations

### Bank Account Information

**Current Implementation:**
- Account numbers stored as plain text
- Migration includes security comment

**Recommendation for Production:**
```typescript
// Consider encrypting sensitive data before storage
import { encrypt, decrypt } from '@/lib/encryption';

const encryptedAccountNumber = await encrypt(formData.accountNumber);

// Store encrypted value
await supabase.from('move_out_intentions').insert({
  account_number: encryptedAccountNumber,
  // ... other fields
});

// Decrypt when displaying (to coordinators/admins only)
const decryptedAccountNumber = await decrypt(stored.account_number);
```

**Alternative:** Use Supabase Vault for sensitive data storage

### Photo Storage

**Current Implementation:**
- Photos stored in public Supabase Storage bucket
- URLs are public once uploaded

**Recommendations:**
1. Use private bucket with signed URLs
2. Implement access control via RLS
3. Set expiration on signed URLs
4. Audit photo access

## Testing Guide

### Testing Move-Out Form

1. **Navigate:** Login as tenant → Move-Out
2. **Fill Required Fields:**
   - Select future move-out date
   - Answer rent payment (Yes/No)
   - Answer cleaning (Yes/No)
   - Answer damage question (Yes/No)
     - If Yes: Fill damage description
   - Fill bank details (test validation):
     - BSB: Type "123456" → Should format to "123-456"
     - Account: Type "12345678" → Should accept 6-10 digits
3. **Upload Photos:**
   - Select multiple general condition photos
   - Select damage photos (if applicable)
4. **Submit:** Verify success message and database entry

### Testing Move-In Acknowledgement

1. **Prerequisites:**
   - Have a PENDING or OCCUPIED tenancy
   - Previous tenant has submitted move-out with photos

2. **Navigate:** Login as tenant → Move-In

3. **Verify Display:**
   - Tenancy details show correctly
   - General condition photos display (if available)
   - Damage photos display (if available)
   - Previous notes display (if available)

4. **Test Actions:**
   - Try submitting without checking keys → Should show alert
   - Try submitting without signature → Should show alert
   - Check keys checkbox
   - Sign acknowledgement
   - Submit → Verify success

5. **Verify Database:**
   ```sql
   SELECT keys_received, keys_received_at 
   FROM tenancies 
   WHERE id = 'tenancy-id';
   ```

## Future Enhancements

### Move-Out Form
1. Digital bond receipt generation
2. Automatic utility calculation integration
3. Email confirmation to tenant
4. PDF export of move-out form
5. Integration with payment systems

### Move-In Acknowledgement
6. Digital signature verification
7. PDF generation of signed acknowledgement
8. Comparison tool (move-in vs move-out photos)
9. 360-degree room photos
10. Video walkthrough support

## Support

For issues or questions:
1. Check database migration was applied
2. Verify Supabase Storage bucket 'move-out-photos' exists
3. Check browser console for JavaScript errors
4. Verify RLS policies allow required operations
5. Test with sample data before production use

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-20  
**Author:** Development Team
