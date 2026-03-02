# Corporate Living App — Presentation for Admins & Operators
### How the app works day-to-day, and why it's better than spreadsheets

---

## 1. The Problem Today

Right now, managing our corporate living houses looks something like this:

| Task                            | Current Tool                  | Pain Point                                               |
|---------------------------------|-------------------------------|----------------------------------------------------------|
| Track which tenants are in which rooms | Google Sheets           | Easy to accidentally overwrite; no validation            |
| Tenant submits move-out notice  | Google Form / WhatsApp        | Scattered across channels; easy to miss                  |
| Coordinate move-out inspection  | Email / WhatsApp              | No standard checklist; photos lost in chat history       |
| Record room condition           | Paper form / photos in chat   | Hard to find later; no structured record                 |
| New tenant signs move-in acknowledgement | Paper signature / PDF  | Scanning, filing, easy to lose                          |
| Know who's assigned to what house | Another spreadsheet          | Multiple versions floating around                       |
| Generate occupancy reports      | Manual counting in spreadsheet| Time-consuming; error-prone                              |

**You end up spending more time coordinating tools than actually managing houses.**

---

## 2. What This App Does

One place. One login. Everything connected.

### Three Portals, One App

| Portal          | Who uses it                     | What they can do                                         |
|-----------------|---------------------------------|----------------------------------------------------------|
| **Admin Portal**    | Church admin team           | Manage houses, rooms, tenants, coordinators, view everything |
| **Coordinator Portal** | House coordinators       | Run inspections, review move-out requests, manage assigned houses |
| **Tenant Portal**   | Tenants living in houses    | Submit move-out intention, view & sign move-in inspection |

Each user logs in with their own account and **only sees what's relevant to their role**. No more sharing a single spreadsheet link with everyone.

---

## 3. The Workflows — Step by Step

### Workflow A: Setting Up a House

```
Admin logs in
  └─→ Goes to "Houses" → clicks "Add House"
       └─→ Enters house name, address
            └─→ Adds rooms (Room 1, Room 2…) with capacity (1 or 2 people)
                 └─→ Assigns a coordinator to the house
                      └─→ Done! House is ready to accept tenants.
```

**vs. Spreadsheet**: Create a new sheet tab, copy headers, remember to update the master list, tell coordinators which sheet to look at…

---

### Workflow B: Assigning a Tenant to a Room

```
Admin goes to "Tenancies" → "New Tenancy"
  └─→ Selects the house and room
       └─→ Selects the tenant (from registered users)
            └─→ Sets start date
                 └─→ Room is now marked as occupied
                      └─→ Tenant can log in and see their room details
```

**vs. Spreadsheet**: Find the right cell, type the name, hope nobody overwrites it, manually email the tenant…

---

### Workflow C: Tenant Wants to Move Out 🏠→🚪

This is the **core workflow** the app is built around:

```
Step 1: TENANT submits move-out intention
   └─→ Logs in → "Move Out" → enters planned date + optional notes → Submit
        └─→ System automatically notifies admin & coordinator
             └─→ Tenancy status changes to "Move-Out Intended"

Step 2: COORDINATOR reviews the request
   └─→ Sees it in their dashboard → can add notes
        └─→ Approves or asks for more info

Step 3: COORDINATOR conducts move-out inspection
   └─→ Creates inspection → goes through 7-item checklist:
        ☐ Walls & ceiling condition
        ☐ Flooring
        ☐ Bathroom
        ☐ Kitchen area
        ☐ Furniture & fixtures
        ☐ Windows & blinds
        ☐ General cleanliness
   └─→ For any "No" answer, writes description of the issue
   └─→ Takes photos directly from phone/tablet → uploads to the inspection
   └─→ Clicks "Finalise" → inspection is LOCKED (no more edits)
        └─→ Tenancy status changes to "Inspection Complete"

Step 4: NEW TENANT does move-in acknowledgement
   └─→ Logs in → sees the most recent inspection report with all photos
   └─→ Reviews room condition
   └─→ Signs digitally on their phone (signature pad)
   └─→ System records: signature + timestamp + IP address
        └─→ Tenancy status changes to "Occupied"
        └─→ Everyone gets notified
```

**vs. Spreadsheet + Google Form**:
- Tenant sends WhatsApp message → admin updates spreadsheet → emails coordinator → coordinator does paper inspection → takes photos on phone → sends photos via WhatsApp → admin updates spreadsheet → new tenant signs paper form → admin scans it → files somewhere…
- **5+ tools, 10+ manual steps, easy to lose track**

---

### Workflow D: Day-to-Day Dashboard

When you log in as **Admin**, you immediately see:

```
┌─────────────────────────────────────────────────────┐
│                    Dashboard                         │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  │ 12       │  │ 48       │  │ 41       │  │ 3        │
│  │ Houses   │  │ Rooms    │  │ Active   │  │ Pending  │
│  │          │  │          │  │ Tenants  │  │ Move-Outs│
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘
│                                                      │
│  Quick Actions:                                      │
│  [+ Add House]  [+ New Tenancy]  [View Move-Outs]   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

No more opening three spreadsheets and manually counting rows.

---

## 4. Benefits vs. Spreadsheets & Google Forms

| Feature                        | Spreadsheet / Forms            | This App                                |
|--------------------------------|--------------------------------|-----------------------------------------|
| **Single source of truth**     | ❌ Multiple files, versions    | ✅ One database, one URL                |
| **Role-based access**          | ❌ Shared link = shared access | ✅ Each user sees only what they need   |
| **Automated status tracking**  | ❌ Manual cell updates         | ✅ Status updates automatically         |
| **Notifications**              | ❌ Manual emails / WhatsApp    | ✅ System sends notifications           |
| **Photo management**           | ❌ Lost in chat / email        | ✅ Attached to specific inspection item |
| **Digital signatures**         | ❌ Paper / scanned PDF         | ✅ On-screen signature, legally timestamped |
| **Inspection history**         | ❌ Hard to find old forms      | ✅ Searchable, always available         |
| **Data integrity**             | ❌ Anyone can overwrite        | ✅ Validated, constrained, immutable after sign-off |
| **Mobile-friendly**            | ⚠️ Spreadsheets are painful on phone | ✅ Designed for phone use (inspections, signatures) |
| **Audit trail**                | ❌ Limited version history     | ✅ Who did what, when, with IP logging  |
| **Reporting**                  | ❌ Manual formulas             | ✅ Live dashboard with real-time counts |
| **Onboarding new admin**       | ❌ "Here are 5 spreadsheets…"  | ✅ "Here's your login"                 |

---

## 5. What It Looks Like on Your Phone

The app is **mobile-optimised**. This matters because:
- Coordinators do inspections **on-site** with their phone
- Tenants sign move-in acknowledgements **on their phone/tablet**
- Photos are taken and uploaded **directly from the phone camera**

No more:
- Taking photos → saving to gallery → sending via WhatsApp → coordinator downloading → uploading to Drive…
- Just: **take photo → it's attached to the inspection item. Done.**

---

## 6. Getting Started as an Admin

### First-Time Setup (One-Off)
1. **Log in** at the app URL with your admin credentials
2. **Add your houses** — name, address
3. **Add rooms** to each house — room label, capacity (1 or 2)
4. **Assign coordinators** to houses
5. **Create tenant accounts** and assign them to rooms

### Ongoing Operations
- **Check your dashboard** for pending move-outs and statistics
- **Review move-out intentions** as they come in
- **Monitor inspections** as coordinators complete them
- **Assign new tenants** to vacated rooms

That's it. The system handles status tracking, notifications, and record-keeping.

---

## 7. Common Questions from Admins

**Q: Do I need to be technical to use this?**  
A: No. If you can use a website and fill in forms, you can use this app. It's simpler than managing spreadsheets.

**Q: Can I still see all the data?**  
A: Yes. As an admin, you have full visibility into all houses, rooms, tenants, inspections, and intentions.

**Q: What if a coordinator makes a mistake in an inspection?**  
A: They can edit the inspection freely while it's in draft. Once they click "Finalise", it's locked — this protects the record's integrity. If something is truly wrong, an admin can assist.

**Q: Can I export data?**  
A: The underlying database supports full data export. Reporting features with CSV/PDF export are planned.

**Q: What happens if the internet goes down?**  
A: The app needs internet to work (it's a web app). But all data is safely stored in the cloud — nothing is lost. You can continue as soon as connection is restored.

**Q: Can tenants see other tenants' information?**  
A: No. Each tenant can only see their own room, their own tenancy, and their own move-out/move-in records. This is enforced at the database level (not just hidden in the UI).

**Q: How do tenants sign the move-in acknowledgement?**  
A: They open the app on their phone, view the inspection report for their room, and draw their signature on screen. The system records the signature, the exact time, and their IP address.

**Q: Is there a way to track which houses are underperforming or have frequent issues?**  
A: Inspection records and move-out data are linked to specific houses and rooms, making it possible to spot patterns. A dedicated reporting dashboard is planned.

---

## 8. A Day in the Life

### Before the App
```
9:00  Check WhatsApp — tenant John says he wants to move out
9:15  Open the spreadsheet — find John's room — update the cell
9:30  Email the house coordinator — please schedule an inspection
11:00 Coordinator does inspection — takes photos on phone
11:30 Coordinator sends photos via WhatsApp group
12:00 Admin downloads photos — uploads to Google Drive folder
12:30 Admin updates spreadsheet — "inspection done"
2:00  New tenant Mary arrives — prints paper acknowledgement form
2:15  Mary signs — admin scans it — uploads to Drive
2:30  Admin updates spreadsheet — "Mary moved in"
3:00  Someone asks "how many rooms are available?" — count rows manually
```

### After the App
```
9:00  Dashboard shows: "1 new move-out intention from John"
9:05  Click → review → approve (coordinator notified automatically)
11:00 Coordinator opens app at the house → runs digital inspection → takes photos → finalise
11:05 Admin dashboard updates: "Inspection complete for Room 3"
2:00  Mary logs in → sees inspection report → signs on phone
2:02  Dashboard updates: "Room 3 — Mary — Occupied"
3:00  Dashboard: "47 rooms occupied, 1 available" — instantly visible
```

**Time saved: ~2 hours per move-out/move-in cycle. No lost documents. No version confusion.**

---

## Summary

| **Before**                                  | **After**                                  |
|---------------------------------------------|--------------------------------------------|
| 5+ tools (Sheets, Forms, WhatsApp, email, Drive) | 1 app                                 |
| Manual status tracking                      | Automatic status progression               |
| Photos lost in chat                         | Photos attached to inspections             |
| Paper signatures scanned & filed            | Digital signatures with audit trail        |
| "Which spreadsheet was that in?"            | Search & find in seconds                   |
| "Who changed this cell?"                    | Full audit trail                           |
| Train new admin on 5 tools                  | Hand them a login                          |

**One app. One login. Everything in one place. Secure. Mobile-ready. Built for how you actually work.**
