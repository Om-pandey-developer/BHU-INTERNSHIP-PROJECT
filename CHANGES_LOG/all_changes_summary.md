# Complete Changes Summary — BHU Email Portal Frontend

**Date:** 18 June 2026  
**Author:** Antigravity AI  
**Scope:** Frontend only — Backend untouched (except `prisma generate`)

---

## Session Overview

All changes were frontend-only responsiveness and UI fixes. No backend logic, routes, controllers, models, or database schema were modified.

---

## 1. `frontend/src/app/globals.css`

### Changes Made:
- **Removed aggressive `h1` mobile override:** The blanket `h1 { font-size: 1.375rem !important }` at `<480px` was forcibly shrinking ALL headings including styled ones on login/register/hero pages.
- **Replaced with scoped selector:** `.prose h1, .content-h1` — only affects explicit content headings.
- **Added Turnstile CAPTCHA overflow fix:** `max-width: 100%` on `.cf-turnstile` and Cloudflare iframes for very small screens.

### Rolled Back:
- ❌ **Icon animations for admin dashboard** — Added pulse, float, wiggle, bounce, spin, pop-in animations for all material symbols on admin page. **ROLLED BACK** per user request.

---

## 2. `frontend/src/app/page.tsx` (Home / Landing Page)

### Changes Made:
- **Navbar padding:** `px-0` → `px-4 sm:px-6` — nav items were touching screen edge on mobile.
- **Hero heading:** `text-5xl md:text-6xl` → `text-3xl sm:text-4xl md:text-5xl lg:text-6xl` — scales down gracefully on small screens.
- **Hero subtitle:** `text-lg` → `text-sm sm:text-base lg:text-lg` — readable on all sizes.
- **Feature cards grid:** `grid-cols-1 md:grid-cols-3 gap-8 mt-20` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 md:mt-20` — 2 columns at tablet.
- **Hero section top padding:** `pt-18` → `pt-32 sm:pt-24 md:pt-20` — "Institutional Email" heading was overlapping navbar on mobile.
- **Inner content padding:** `py-20` → `pt-6 pb-16 sm:py-20` — better spacing on mobile.
- **Video dark overlay:** Uncommented `bg-black/50` overlay div (user adjusted to `bg-black/40`) — background video was too bright, text was unreadable.
- **Feature cards background:** `bg-black/8` → `bg-black/12` (user adjustment for better card contrast).
- **Navbar buttons hidden on mobile:** Sign In and Register buttons in navbar → `hidden sm:flex` — redundant on mobile since hero section has CTA buttons.

---

## 3. `frontend/src/app/login/page.tsx` (Login Page)

### Changes Made:
- **Right panel:** Added `overflow-y-auto min-h-screen` and reduced padding `p-8` → `p-5 sm:p-8` — form was clipped/cut off on small screens.
- **"Welcome back" heading:** Replaced hardcoded `text-[46px]` with responsive `text-3xl sm:text-4xl`.
- **Subtitle text:** Replaced hardcoded `text-[18px]` with responsive `text-sm sm:text-base`.
- **OTP boxes:** `w-12 h-14` → `w-10 h-12 sm:w-12 sm:h-14` — 6 boxes were overflowing on screens < 375px.
- **OTP box gap:** `gap-3` → `gap-2 sm:gap-3` — tighter on mobile.
- **Mobile branding icon:** `school` material icon → BHU favicon.ico image (`<Image src="/favicon.ico" />`).
- **Icon container background:** `bg-primary` → `bg-white shadow-sm` — white background with subtle shadow.
- **Form panel background:** `bg-background` → `bg-white` — clean white background for mobile form view.

---

## 4. `frontend/src/app/register/page.tsx` (Registration Page)

### Changes Made:
- **Right panel:** Added `overflow-y-auto min-h-screen` and reduced padding `p-8` → `p-5 sm:p-8` — long form was cut off on short screens.
- **"Create an Account" heading:** Replaced hardcoded `text-[40px]` with responsive `text-3xl sm:text-4xl`.
- **Subtitle class:** Removed stray `text black` (invalid CSS class), now just `text-sm text-outline`.
- **OTP boxes:** Same fix as login — `w-10 h-12 sm:w-12 sm:h-14` with `gap-2 sm:gap-3`.
- **Mobile branding icon:** Fixed incorrect nesting (Image was inside `<span>`) → proper `<Image>` directly inside container div.
- **Icon container background:** `bg-primary` → `bg-white shadow-sm`.
- **Form panel background:** `bg-background` → `bg-white`.

---

## 5. `frontend/src/app/dashboard/layout.tsx` (Dashboard Shell)

### Changes Made:
- **BHU Logo in header:** `width={200} height={200} className="w-full h-full"` → `width={160} height={50} className="h-11 w-auto"` — logo was enormous and uncontrolled, now properly sized.
- **"New Application" button:** Made smaller — padding `px-4 py-2` → `px-3 py-1.5`, font `text-sm` → `text-xs`, icon `text-[18px]` → `text-[15px]`, rounded `rounded-xl` → `rounded-lg`. On mobile shows just "New" instead of "New Application".
- **Page content padding:** `p-6 lg:p-8` → `p-4 sm:p-6 lg:p-8` — more breathing room on small screens.

### Applied & Rolled Back:
- ❌ **Sidebar permanently visible on desktop** — Added `lg:translate-x-0` to sidebar and `lg:ml-64 xl:ml-72` to main content, plus `lg:hidden` on hamburger. **ROLLED BACK** per user request — user preferred the original drawer/overlay behavior.

### Final State:
- Sidebar = drawer mode only (hidden by default, slides in on hamburger click on ALL screen sizes).
- Hamburger button visible on all screen sizes.

---

## 6. `frontend/src/app/dashboard/applicant/page.tsx` (Applicant Dashboard)

### Changes Made:
- **Page header:** `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center justify-between gap-3` — title and actions stack on mobile.
- **Application Details grid (in Modal):** `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — prevented text overflow in narrow modal drawers.
- **Modal actions row:** `flex items-center justify-end` → `flex flex-col sm:flex-row items-center justify-end` — buttons stack on mobile.

---

## 7. `frontend/src/app/dashboard/hod/page.tsx` (HOD Dashboard)

### Changes Made:
- **Application row:** `flex items-center p-5 gap-4` → `flex items-center p-4 sm:p-5 gap-3 sm:gap-4 flex-wrap sm:flex-nowrap` — wraps properly on small screens.
- **Application Details grid (in Drawer):** `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`.

---

## 8. `frontend/src/app/dashboard/admin/page.tsx` (Admin Dashboard)

### Changes Made:
- **Provisioning Preview grid:** `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — inside detail drawer.
- **Application Details grid:** `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — inside detail drawer.
- *(Stats card grids and audit table were already responsive — `sm:grid-cols-*` and `overflow-x-auto` already in place.)*

---

## 9. Backend — `prisma generate`

### Action Taken:
- Ran `npx prisma generate` in the backend folder to regenerate TypeScript types after `git pull` brought in updated `schema.prisma` with new `ReapplyRequest` model.
- **No backend code was modified** — only Prisma client was regenerated.

---

## Files NOT Changed
- All backend source files (Node.js, NestJS routes, controllers, services, models)
- `docker-compose.yml`
- `frontend/src/app/layout.tsx` (root layout — already fine)
- `frontend/src/components/*` (Modal, Button, StatusBadge, etc.)
- Database schemas, environment variables, API endpoints
- `frontend/src/components/VideoBackground.tsx` (not modified by AI)

---

## Rolled Back Changes (Not Active)

| Change | File | Reason |
|--------|------|--------|
| Sidebar permanently visible on desktop | `dashboard/layout.tsx` | User preferred original drawer behavior |
| Icon animations (pulse, float, wiggle, bounce, pop-in) | `globals.css` | User requested rollback |
