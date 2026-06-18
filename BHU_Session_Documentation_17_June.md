# BHU Project Session Documentation
**Date:** June 17, 2026
**Branches Involved:** `master`, `avnish-test`
**Key Focus:** Regression fixes, UI enhancements, Audit Logs improvement, and Complex Merge Resolutions.

---

## 1. Initial State & Problem Diagnosis
**The Issue:**
A previous merge by another contributor (merging branch `hari01` into `master` via commit `ec5d920`) went wrong. During conflict resolution, the contributor incorrectly favored older frontend files.
**Impact:**
- The `master` branch LOST the `DepartmentSelect` (searchable DB dropdown), `CountryCodeSelect`, `NationalitySelect`, and all advanced input validations (`maxDOB` 18+ check, Employee ID uppercase formatting, etc.).
- The frontend forms regressed to using hardcoded arrays and plain text inputs.
- On the `avnish-test` branch, a runtime bug existed in `page.tsx` where clicking "Download Preview" crashed the app because it referenced a deprecated `departments` array instead of the new `dbDepartments` state.

---

## 2. Phase 1: Local Fixes & Restorations (Morning Session)
Our primary goal was to fix the `avnish-test` bug and restore the lost features on `master` without losing the backend infrastructure fixes brought in by `hari01`.

### Actions Taken:
1. **Bug Fix on `avnish-test`:**
   - **File:** `frontend/src/app/dashboard/applicant/new/page.tsx` (Line 944)
   - **Change:** Updated `departments.find(...)` to `dbDepartments.find(...)`.
   - **Commit:** `67a06d8`

2. **Schema Update:**
   - Added `SUSPENDED` and `ARCHIVED` statuses back to the `ApplicationStatus` enum in `schema.prisma`.
   - **Commit:** `c335671`

3. **Restoring `master` Branch:**
   - Overwrote the broken `page.tsx` on `master` with the highly functional version from `avnish-test`. This successfully brought back all searchable dropdowns, age restrictions, and the `@bhu.ac.in` email suffix.
   - **Commit:** `b84c312`

4. **Syncing:**
   - Merged `master` back into `avnish-test` so that `avnish-test` also received the CC Admin Dashboard, PDF downloads, and `hari01` UI fixes.
   - **Commit:** `fce64ea`

---

## 3. Phase 2: Audit Logs Enhancement
**The Request:** 
The CC Admin Dashboard's Audit Logs table originally showed "IP Address" and truncated UUIDs (`APPLICATION: dcdca70d...`). The user requested to replace IP Address with the performer's Name & Department, and to show the full Application Tracking ID.

**Why IP Address was there:** 
It was initially added for strict IT compliance and security forensics (e.g., ISO 27001 standards) to trace actions. We kept it in the database but removed it from the UI for better usability.

### Actions Taken:
1. **Backend (`applications.service.ts`):**
   - Updated `getAuditLogs()` to fetch related user data (First Name, Last Name, Department) and Application data (tracking ID) by mapping `performedBy` and `entityId`.
2. **Frontend (`admin/page.tsx`):**
   - Replaced the "IP Address" column with **"Performed By"**.
   - Updated the "Entity" column to display the full Tracking ID (e.g., `BHU-20260613-3918`).
3. **Commit:** `e7f72a9` (on `avnish-test`)

---

## 4. Phase 3: Merging Upstream Features & Conflict Resolution
**The Situation:**
While we were working locally, another contributor pushed significant updates to `origin/master`:
- **Commit `ea68f69`:** Added `SignaturePad`, `SkeletonLoader`, and Email Notifications.
- **Commit `ffb37cc`:** The contributor successfully merged upstream and *fixed the hari01 regression themselves*. This meant `origin/master` now had the searchable dropdowns AND the new `SignaturePad`.

**The Conflict:**
When we ran `git pull origin master`, Git threw a massive conflict in `page.tsx` because both our local `master` and the remote `master` had heavily modified the same file to restore the dropdowns.

### The Resolution Strategy:
1. **Aborting the Messy Merge:**
   - Ran `git merge --abort` on `master` because inline conflict resolution would have been extremely prone to errors.
2. **Hard Resetting `master`:**
   - Since `origin/master` contained the perfect, truthful state (Restored Dropdowns + New SignaturePad), we forcefully synced local `master` to it: `git reset --hard origin/master`.
3. **Merging into `avnish-test`:**
   - Switched to `avnish-test` (which had our local Audit Log enhancements) and ran `git merge master`.
   - This caused a conflict in `page.tsx`.
4. **Resolving the Final Conflict:**
   - Because `master` already contained the `dbDepartments` fix and all the dropdown features, we resolved the conflict by accepting `master`'s version entirely (`git checkout --theirs frontend/src/app/dashboard/applicant/new/page.tsx`).
   - This cleanly combined our Audit Log fixes (which were in different files) with the upstream `SignaturePad` and UI features.
   - **Commit:** `6b8485d` (Merge commit)

---

## 5. Current State Summary
- **`master` branch:** Perfectly synced with `origin/master`. Contains `SignaturePad`, `SkeletonLoader`, and all the proper form validations and dropdowns.
- **`avnish-test` branch:** Contains EVERYTHING. It is exactly the same as `master`, but also includes the **Audit Logs Enhancements** (Name/Department instead of IP Address) that we built locally.
- **Status:** Codebase is clean, no conflicts, fully functional. Ready for further development or pushing to GitHub.
