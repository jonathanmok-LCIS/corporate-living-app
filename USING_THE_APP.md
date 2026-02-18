# Using the Corporate Living App

**Guide to features, portals, and workflows in the Corporate Living Move In/Out application.**

---

## 📋 Table of Contents

- [Overview](#overview)
- [The Three Portals](#the-three-portals)
  - [Admin Portal](#admin-portal)
  - [Coordinator Portal](#coordinator-portal)
  - [Tenant Portal](#tenant-portal)
- [Complete Workflows](#complete-workflows)
- [Navigation Guide](#navigation-guide)

---

## Overview

The Corporate Living App manages move-in and move-out processes for church corporate living houses with three distinct user roles:

- **ADMIN**: Manage houses, rooms, coordinators, and tenancies
- **COORDINATOR**: Handle move-out inspections for assigned houses
- **TENANT**: Submit move-out intentions and sign move-in acknowledgements

---

## The Three Portals

### Admin Portal

**Access:** http://localhost:3000/admin

**Purpose:** Complete management of houses, rooms, coordinators, and tenancies.

#### Features

**1. Dashboard**
- Overview of pending actions
- Recent activity
- Quick stats
- Navigation to all features

**2. Houses Management** (`/admin/houses`)
- **Create new houses**
  - Name and address
  - Activation status
- **Edit existing houses**
  - Update details
  - Archive houses
- **View house details**
  - See all rooms
  - View assigned coordinators
  - Check tenancies

**3. Rooms Management** (`/admin/houses/[id]/rooms`)
- **Add rooms to houses**
  - Room label/number
  - Capacity: 1 or 2 people
  - Slot support (A/B for 2-person rooms)
- **Edit room details**
  - Update capacity
  - Change status
- **Archive rooms**
  - Preserve history
  - Cannot delete if tenancies exist

**4. Coordinator Assignment** (`/admin/houses/[id]/coordinators`)
- **Assign coordinators to houses**
  - Select coordinator(s)
  - Multiple coordinators per house
- **View assignments**
  - See who manages which houses
- **Remove coordinators**
  - Unassign when needed

**5. Tenancies Management** (`/admin/tenancies`)
- **Create new tenancies**
  - Select room
  - Choose slot (A or B for 2-person rooms)
  - Assign tenant
  - Set start date
- **Manage tenancy lifecycle**
  - Track status changes
  - Set end dates
  - View history
- **Monitor statuses:**
  - OCCUPIED
  - MOVE_OUT_INTENDED
  - MOVE_OUT_INSPECTION_DRAFT
  - MOVE_OUT_INSPECTION_FINAL
  - MOVE_IN_PENDING_SIGNATURE
  - ENDED

#### Common Admin Tasks

**Create a House:**
1. Go to `/admin/houses`
2. Click "Add House"
3. Enter name and address
4. Save

**Add Rooms:**
1. View house details
2. Click "Add Room"
3. Set capacity (1 or 2)
4. Save

**Assign Tenant:**
1. Go to `/admin/tenancies`
2. Click "Add Tenancy"
3. Select room and slot
4. Choose tenant
5. Set start date
6. Save

---

### Coordinator Portal

**Access:** http://localhost:3000/coordinator

**Purpose:** Manage move-out inspections for assigned houses.

#### Features

**1. Dashboard**
- Pending move-out intentions
- Draft inspections
- Houses you coordinate
- Recent inspections

**2. Inspections List** (`/coordinator/inspections`)
- **View all inspections**
  - Draft inspections
  - Finalized inspections
  - Pending move-out intentions
- **Filter by status**
  - Draft
  - Final
- **Search and sort**

**3. Create Inspection** (`/coordinator/inspections/[id]`)
- **Start from move-out intention**
  - Select pending intention
  - Create inspection draft
- **Complete 7-item checklist:**
  1. Rent paid up to move-out date
  2. Bedroom and common areas cleaned
  3. No damage/stain caused
  4. All utilities settled/arranged
  5. Coordinator satisfied with cleaning
  6. Keys returned
  7. Bank details provided for bond refund
- **For each item:**
  - Select Yes or No
  - If No, description is required
- **Save as draft**
  - Can edit later
  - Not locked

**4. Photo Upload** (when configured)
- Upload inspection photos
- Categorize images
- Add captions
- Store in Supabase Storage

**5. Finalize Inspection**
- **Review all items**
  - Ensure checklist complete
  - Verify photos uploaded
- **Finalize:**
  - Locks inspection (immutable)
  - Updates tenancy status
  - Triggers email notification

#### Common Coordinator Tasks

**Create Inspection:**
1. Go to `/coordinator/inspections`
2. Find pending move-out intention
3. Click "Create Inspection"
4. Complete 7-item checklist
5. Save as draft

**Complete Checklist:**
1. For each item, select Yes or No
2. If No, provide description
3. All items must be answered
4. Save draft

**Finalize Inspection:**
1. Open draft inspection
2. Review all items
3. Upload photos (if needed)
4. Click "Finalize"
5. Confirm (cannot undo)

---

### Tenant Portal

**Access:** http://localhost:3000/tenant

**Purpose:** Submit move-out intentions and complete move-in acknowledgements.

#### Features

**1. Dashboard**
- Current tenancy status
- Pending actions
- Recent activity

**2. Move-Out Intention** (`/tenant/move-out`)
- **Submit intention to move out:**
  - Select planned move-out date
  - Add optional notes
  - Submit
- **Status updates:**
  - Changes tenancy to MOVE_OUT_INTENDED
  - Notifies coordinators
  - Notifies admins

**3. Move-In Acknowledgement** (`/tenant/move-in`)
- **View room condition report:**
  - Latest finalized inspection
  - Photos (when configured)
  - Checklist details
- **Sign acknowledgement:**
  - Mobile-friendly signature pad
  - Draw signature with finger/stylus
  - Clear and redraw if needed
- **Submit:**
  - Stores signature
  - Records signed timestamp
  - Updates status to OCCUPIED
  - Notifies admin and coordinator

#### Common Tenant Tasks

**Submit Move-Out Intention:**
1. Go to `/tenant/move-out`
2. Select move-out date
3. Add notes (optional)
4. Click "Submit"
5. Confirmation shown

**Sign Move-In:**
1. Go to `/tenant/move-in`
2. Review room condition report
3. Use signature pad
4. Sign with finger/mouse
5. Click "Submit"
6. Confirmation shown

---

## Complete Workflows

### Move-Out Workflow

**Step 1: Tenant Submits Intention**
1. Tenant goes to `/tenant/move-out`
2. Selects planned move-out date
3. Adds optional notes
4. Submits
5. **Status:** OCCUPIED → MOVE_OUT_INTENDED
6. **Emails sent to:** Coordinators + Admins

**Step 2: Coordinator Creates Inspection**
1. Coordinator sees notification
2. Goes to `/coordinator/inspections`
3. Clicks "Create Inspection" for the tenancy
4. **Status:** MOVE_OUT_INTENDED → MOVE_OUT_INSPECTION_DRAFT

**Step 3: Coordinator Completes Inspection**
1. Coordinator completes 7-item checklist
2. Uploads photos (if configured)
3. Saves draft (can edit)
4. Reviews everything
5. Clicks "Finalize"
6. **Status:** MOVE_OUT_INSPECTION_DRAFT → MOVE_OUT_INSPECTION_FINAL
7. **Email sent to:** Admins

**Step 4: Admin Assigns New Tenant**
1. Admin views finalized inspection
2. Creates new tenancy for room
3. Assigns new tenant
4. **Status:** MOVE_IN_PENDING_SIGNATURE

**Step 5: New Tenant Signs**
1. New tenant views condition report
2. Reviews inspection details
3. Signs on mobile signature pad
4. Submits
5. **Status:** MOVE_IN_PENDING_SIGNATURE → OCCUPIED
6. **Email sent to:** Admin + Coordinator

**Step 6: Old Tenancy Ends**
1. Admin marks old tenancy as ended
2. **Status:** ENDED

---

### Inspection Workflow

**Creating:**
1. Coordinator selects move-out intention
2. Creates inspection (DRAFT)
3. System links to tenancy + room

**Completing Checklist:**
1. For each of 7 items:
   - Select Yes or No (required)
   - If No, add description (required)
2. Save as draft
3. Can edit until finalized

**Adding Photos:** (when configured)
1. Upload photos to inspection
2. Add category and caption
3. Photos stored in Supabase Storage
4. URLs saved to database

**Finalizing:**
1. Review all checklist items
2. Verify photos uploaded
3. Click "Finalize"
4. **Inspection becomes immutable**
5. Status updates
6. Email notifications sent

---

### Move-In Workflow

**Prerequisites:**
- Room has finalized inspection
- Admin assigns new tenant
- Status is MOVE_IN_PENDING_SIGNATURE

**Process:**
1. **Tenant logs in**
2. **Views inspection report:**
   - Goes to `/tenant/move-in`
   - Sees latest finalized inspection
   - Reviews checklist and photos
3. **Signs acknowledgement:**
   - Uses signature pad on mobile
   - Draws signature
   - Can clear and retry
4. **Submits:**
   - Signature image saved
   - Timestamp recorded
   - Audit information stored
5. **Status updated:**
   - MOVE_IN_PENDING_SIGNATURE → OCCUPIED
6. **Notifications sent:**
   - Email to admin
   - Email to coordinator

---

## Navigation Guide

### URL Structure

```
/                               → Home page
/login                         → Authentication

/admin                         → Admin dashboard
/admin/houses                  → Houses list
/admin/houses/[id]/rooms       → Rooms for specific house
/admin/houses/[id]/coordinators → Coordinators for house
/admin/tenancies               → Tenancies management

/coordinator                   → Coordinator dashboard
/coordinator/inspections       → Inspections list
/coordinator/inspections/[id]  → Specific inspection

/tenant                        → Tenant dashboard
/tenant/move-out              → Move-out intention
/tenant/move-in               → Move-in acknowledgement
```

### Portal Access

**By Role:**
- Admin users redirected to `/admin` after login
- Coordinator users redirected to `/coordinator` after login
- Tenant users redirected to `/tenant` after login

**Navigation:**
- Each portal has its own layout
- Sidebar or navigation menu
- Links to main features
- Dashboard as home

### Common Actions

**Create/Add:**
- Look for "Add [Item]" or "Create [Item]" buttons
- Usually at top of list pages
- Opens form or modal

**Edit:**
- Click on item in list
- Or click "Edit" button/icon
- Opens edit form

**View Details:**
- Click on item name/title
- Shows full details page
- May have related items

**Archive/Delete:**
- Usually in edit form or details page
- Archive preserves data
- Delete may be restricted

---

## Tips and Tricks

### For Admins

**House Setup:**
1. Create house first
2. Add rooms second
3. Assign coordinators third
4. Then create tenancies

**Room Capacity:**
- Capacity 1: Single occupancy, no slot needed
- Capacity 2: Double occupancy, use slots A and B

**Tenancy Management:**
- Cannot delete tenancies with history
- Archive instead
- Track status changes

### For Coordinators

**Inspection Checklist:**
- Answer all 7 items (required)
- If any item is "No", description is required
- Save draft often
- Can't edit after finalize

**Finalizing:**
- Double-check all items
- Upload photos before finalizing
- Cannot undo finalize
- Inspection becomes permanent

### For Tenants

**Move-Out Intention:**
- Submit as soon as you know move-out date
- Can add helpful notes for coordinator
- Triggers notification to coordinator

**Move-In Signature:**
- Review inspection report carefully
- Use finger on mobile device
- Signature is legally binding
- Clear and redraw if needed

---

## Need Help?

**See these guides:**
- **TROUBLESHOOTING.md** - Common issues
- **NEXT_ACTIONS.md** - Database setup
- **SETUP.md** - Complete setup reference
- **SUCCESS.md** - Quick reference commands

**Still stuck?**
- Check if database migrations are run
- Verify user role is correct
- Check browser console for errors
- See TROUBLESHOOTING.md for debugging

---

**Enjoy using the Corporate Living App!** 🏘️
