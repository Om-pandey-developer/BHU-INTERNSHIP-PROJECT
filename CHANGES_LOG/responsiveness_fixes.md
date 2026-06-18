# Responsiveness Fixes — BHU Email Portal Frontend

**Date:** 18 June 2026  
**Author:** Antigravity AI  
**Scope:** Frontend only — Backend untouched

---

## Summary

Pure CSS/JSX responsiveness fixes across all frontend pages and components.  
**No backend files were modified.**

---

## Files Changed

### 1. `frontend/src/app/globals.css`
- Removed the blanket `h1 { font-size: 1.375rem !important }` override at `<480px` — it was forcibly shrinking ALL headings (including the styled ones on login/register/hero pages) to a tiny size.
- Replaced with a scoped selector (`.prose h1, .content-h1`) so only explicit content headings are affected.
- Added Cloudflare Turnstile CAPTCHA overflow fix for very small screens (`max-width: 100%` on the iframe).

---

### 2. `frontend/src/app/page.tsx` (Home / Landing Page)
- **Navbar padding:** `px-0` → `px-4 sm:px-6` — nav items were touching the screen edge on mobile.
- **Hero heading:** `text-5xl md:text-6xl` → `text-3xl sm:text-4xl md:text-5xl lg:text-6xl` — now scales down gracefully on small screens.
- **Hero subtitle:** `text-lg` → `text-sm sm:text-base lg:text-lg` — readable on all sizes.
- **Feature cards grid:** `grid-cols-1 md:grid-cols-3 gap-8 mt-20` → `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 md:mt-20` — 2 columns at tablet, consistent spacing.

---

### 3. `frontend/src/app/login/page.tsx` (Login Page)
- **Right panel:** Added `overflow-y-auto min-h-screen` and reduced padding to `p-5 sm:p-8` — form was clipped/cut off on small screens.
- **"Welcome back" heading:** Replaced hardcoded `text-[46px]` with responsive `text-3xl sm:text-4xl`.
- **Subtitle text:** Replaced hardcoded `text-[18px]` with responsive `text-sm sm:text-base`.
- **OTP boxes:** `w-12 h-14` → `w-10 h-12 sm:w-12 sm:h-14` — 6 boxes were overflowing on very narrow screens (< 375px).
- **OTP box gap:** `gap-3` → `gap-2 sm:gap-3` — tighter on mobile.

---

### 4. `frontend/src/app/register/page.tsx` (Registration Page)
- **Right panel:** Added `overflow-y-auto min-h-screen` and reduced padding to `p-5 sm:p-8` — long form was cut off on short screens.
- **"Create an Account" heading:** Replaced hardcoded `text-[40px]` with responsive `text-3xl sm:text-4xl`.
- **Subtitle class:** Removed stray `text black` (invalid CSS class), now just `text-sm text-outline`.
- **OTP boxes:** Same fix as login — `w-10 h-12 sm:w-12 sm:h-14` with `gap-2 sm:gap-3`.

---

### 5. `frontend/src/app/dashboard/layout.tsx` (Dashboard Shell)
- **Sidebar — Desktop persistent:** Added `lg:translate-x-0` so the sidebar stays visible at `lg` breakpoint (1024px+) without needing the hamburger.
- **Sidebar — Width:** `w-72` → `w-64 sm:w-72` — slightly narrower on mid-sized screens.
- **Main content — Desktop margin:** Added `lg:ml-64 xl:ml-72` to the `<main>` element, so content doesn't slide under the pinned sidebar on desktop.
- **Hamburger button:** Added `lg:hidden` — the menu icon no longer shows on desktop where the sidebar is always visible.
- **Logo in header:** Changed `width={200} height={200} className="w-full h-full"` to `width={120} height={40} className="h-8 w-auto"` — the BHU logo was enormous and uncontrolled.
- **Page content padding:** `p-6 lg:p-8` → `p-4 sm:p-6 lg:p-8` — a bit more breathing room on small screens.

---

### 6. `frontend/src/app/dashboard/applicant/page.tsx` (Applicant Dashboard)
- **Page header:** `flex items-center justify-between` → `flex flex-col sm:flex-row sm:items-center justify-between gap-3` — title and actions stack on mobile.
- **Application Details grid (in Modal):** `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — prevented text overflow/truncation in narrow modal drawers on mobile.
- **Modal actions row:** `flex items-center justify-end` → `flex flex-col sm:flex-row items-center justify-end` — Close and Download buttons stack on mobile.

---

### 7. `frontend/src/app/dashboard/hod/page.tsx` (HOD Dashboard)
- **Application row:** `flex items-center p-5 gap-4` → `flex items-center p-4 sm:p-5 gap-3 sm:gap-4 flex-wrap sm:flex-nowrap` — checkbox, avatar, info, and action buttons wrap properly on small screens.
- **Application Details grid (in Drawer):** `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`.

---

### 8. `frontend/src/app/dashboard/admin/page.tsx` (Admin Dashboard)
- **Provisioning Preview grid:** `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — inside the detail drawer.
- **Application Details grid:** `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — inside the detail drawer.
- *(Stats card grids and audit table were already responsive — `sm:grid-cols-*` and `overflow-x-auto` were already in place.)*

---

## What Was NOT Changed
- All backend files (Node.js, routes, controllers, models)
- `docker-compose.yml`
- `frontend/src/app/layout.tsx` (root layout — already fine)
- `frontend/src/components/*` — only the pages were changed
- Database schemas, environment variables, API endpoints

---

## Additional Changes (Post-Responsiveness)

### A. `frontend/src/app/page.tsx` — Home Page (Additional)
- **Sidebar revert:** Sidebar drawer behavior restored to original (opens only on hamburger click, not permanently visible on desktop).
- **Navbar gap fix:** Hero section `pt-18` → `pt-32 sm:pt-24 md:pt-20` — on mobile, "Institutional Email" heading was overlapping the navbar.
- **Video overlay:** Uncommented `bg-black/50` overlay div — background video was too bright, text was unreadable. User adjusted to `bg-black/40`.
- **Feature cards:** `bg-black/8` → `bg-black/12` (user adjustment for card contrast).
- **Navbar buttons hidden on mobile:** Sign In and Register buttons in navbar → `hidden sm:flex` — buttons were redundant on mobile (hero already has CTA buttons).

### B. `frontend/src/app/login/page.tsx` — Login Page (Additional)
- **Mobile branding icon:** `school` material icon → BHU favicon.ico image (`<Image src="/favicon.ico" />`).
- **Icon container background:** `bg-primary` → `bg-white shadow-sm` — white background with subtle shadow.
- **Form panel background:** `bg-background` → `bg-white` — clean white background for mobile form view.

### C. `frontend/src/app/register/page.tsx` — Register Page (Additional)
- **Mobile branding icon:** Fixed incorrect nesting (Image was inside `<span>`) → proper `<Image>` directly inside container div.
- **Icon container background:** `bg-primary` → `bg-white shadow-sm` — white background with subtle shadow.
- **Form panel background:** `bg-background` → `bg-white` — clean white background for mobile form view.
