# BHU Email Policy Implementation Report

This document outlines which rules and guidelines from the **University Email Usage and Management Policy-2025** have been implemented (executed) in the current codebase, and which are pending or not executed.

## 1. Mailbox Size Limits
> [!NOTE] 
> **Status: EXECUTED**

The policy specifies different storage quotas based on user categories:
* Faculty Members, Permanent Officers and Staff: **20 GB**
* Research Scholars: **10 GB**
* Temporary/Contractual/Research Staff: **5 GB**
* Post Graduate Students: **5 GB**

**Codebase verification:**
This is correctly executed in `google-workspace.service.ts` and `pdf.service.ts`. The codebase maps quotas accurately to the `ApplicantCategory`:
* `GROUP_A_OFFICER` & `TEACHING_STAFF` -> **20 GB**
* `RESEARCH_SCHOLAR` -> **10 GB**
* `POST_GRADUATE_STUDENT` & `NON_TEACHING_STAFF` -> **5 GB**

---

## 2. Email Format / Creation Process
> [!WARNING] 
> **Status: NOT EXECUTED (Hardcoded)**

The policy mandates specific email formats based on the user category:
* Faculty: `username.department@bhu.ac.in`
* Admin/Staff: `username.admin@bhu.ac.in`
* Temporary Staff: `username.temp/cont/ra/srf/jrf@bhu.ac.in`
* Scholars/PG: `username.department.yyyy@bhu.ac.in`

**Codebase verification:**
Currently, `google-workspace.service.ts` hardcodes a single generic email format for everyone:
```typescript
const bhuEmail = `${firstName}.${lastName}@${domain}`;
```
The logic to append department names, years, or suffixes like `.admin` or `.temp` is missing.

---

## 3. Account Deactivation and Retention Rules
> [!CAUTION] 
> **Status: PARTIALLY EXECUTED / LACKS AUTOMATION**

The policy states strict retention timelines:
* Faculty: Retained for 5 years after superannuation, then deleted.
* Staff/Scholars/PG Students: Retained for 1 year after superannuation/completion, then deleted.

**Codebase verification:**
The database (`schema.prisma`) includes `SUSPENDED` and `ARCHIVED` statuses, and there are API endpoints (`/api/v1/applications/:id/archive` and `/bulk-archive`) allowing admins to manually archive accounts. However, there are no automated Cron jobs or time-based background tasks to automatically suspend or delete accounts after the specified 1-year or 5-year periods.

---

## 4. Group Mailing Lists
> [!WARNING] 
> **Status: NOT EXECUTED**

The policy provides a comprehensive list of Group Mailing lists (e.g., `deans@bhu.ac.in`, `director@bhu.ac.in`, `allhead.fos@bhu.ac.in`).

**Codebase verification:**
There is no logic or configuration in the backend to manage these lists, create them during Google Workspace provisioning, or automatically assign users to these groups based on their department or role.

---

## Summary of Action Items Required
1. Update `google-workspace.service.ts` to dynamically generate the `bhuEmail` string based on the user's category, department, and joining year.
2. Implement a background task (e.g., using `@nestjs/schedule`) to automatically enforce retention policies for expired or graduated users.
3. Integrate Google Workspace Directory API group management to auto-subscribe users to the respective mailing lists (like `allhead`, `deans`) upon creation.
