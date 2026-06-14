# BHU Email Portal — UI/UX Design Document
> **Project**: BHU Email Registration & Auto-Provisioning Portal  
> **Purpose**: Comprehensive design spec for all pages — use this with Google Stitch to create UI designs  
> **Total Pages**: 11 unique screens + 7 modal overlays + shared layout components

---

## 📐 Design System — "Varanasi Academic Heritage"

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#6750A4` | Buttons, links, active states, accents |
| Primary Light | `#7F67BE` | Hover states |
| Primary Dark | `#4F378B` | Pressed states, left panel gradient |
| Primary Container | `#EADDFF` | Soft backgrounds, badges, nav active state |
| On Primary | `#FFFFFF` | Text on primary buttons |
| On Primary Container | `#21005D` | Text on primary container bg |
| **Secondary** | `#625B71` | HOD role badge, secondary accents |
| Secondary Container | `#E8DEF8` | HOD-related backgrounds |
| **Tertiary** | `#7D5260` | Admin role badge, tertiary accents |
| Tertiary Container | `#FFD8E4` | Admin-related backgrounds |
| **Background** | `#FCF9F8` | Page background |
| **Surface** | `#FFFBFE` | Cards, panels, modals |
| Surface Variant | `#E7E0EC` | Subtle card backgrounds, input fills |
| **Outline** | `#79747E` | Secondary text, labels |
| Outline Variant | `#CAC4D0` | Borders, dividers |
| **Error** | `#B3261E` | Error text, reject buttons |
| Error Container | `#F9DEDC` | Error message backgrounds |
| **Success** | `#1B873E` | Success text, approve buttons |
| Success Container | `#D4F5DF` | Success message backgrounds |
| **Warning** | `#E6A817` | Warning badges, pending status |
| Warning Container | `#FFF3D0` | Warning backgrounds |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Page Title (h1) | Serif (Playfair Display / Georgia) | 2rem (32px) | Bold (700) |
| Section Heading (h2) | Sans-serif (Inter) | 1.125rem (18px) | Semi-bold (600) |
| Sub heading (h3/h4) | Inter | 0.875rem (14px) | Semi-bold (600) |
| Body Text | Inter | 0.875rem (14px) | Regular (400) |
| Caption / Label | Inter | 0.75rem (12px) | Medium (500) |
| Tiny Label | Inter | 0.625rem–0.6875rem (10–11px) | Semi-bold (600), Uppercase |
| Monospace (IDs) | Geist Mono | 0.75rem | Regular |

### Spacing & Radius

| Token | Value |
|-------|-------|
| Border Radius (default) | 8px |
| Border Radius (large) | 16px (cards, modals) |
| Border Radius (full) | 9999px (badges, avatars) |
| Card Padding | 20–24px |
| Section Gap | 32px |
| Mobile Padding | 16px |

### Shadows

| Level | CSS |
|-------|-----|
| Shadow 1 (cards) | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` |
| Shadow 2 (hover) | `0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)` |
| Shadow 3 (modals) | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` |

### Icons
- **Library**: Google Material Symbols (Rounded variant)
- **Sizes**: 16px (inline), 20px (buttons/nav), 24px (cards), 36–48px (empty states)

### Animations
- **fadeIn**: opacity 0→1, translateY 8px→0, 0.4s ease-out
- **slideInRight**: opacity 0→1, translateX 16px→0, 0.3s ease-out
- **skeleton shimmer**: horizontal gradient sliding, 1.5s infinite

---

## 🧩 Reusable Component Library

### 1. Button
- **Variants**: `filled` (solid primary), `outlined` (border only), `tonal` (muted fill)
- **Sizes**: `sm` (px-4 py-1.5), `md` (px-5 py-2.5), `lg` (px-6 py-3)
- **States**: default, hover (darken), disabled (opacity 50%), loading (spinner)
- **Features**: Optional leading icon (Material Symbol), loading spinner replaces icon

### 2. Input
- **Style**: Rounded-lg, 2px border (outline-variant), left icon (20px), label as placeholder
- **States**: default, hover (border → outline), focus (border → primary), error (border → error)
- **Types**: text, email, password, date, number

### 3. Modal
- **Overlay**: Black 30% opacity backdrop
- **Container**: Surface bg, rounded-2xl (16px), max-width configurable (md: 480px, lg: 640px)
- **Structure**: Header (title + close X) → Body (scrollable) → Optional Footer (action buttons)
- **Animation**: Fade in + scale 95%→100%

### 4. StatusBadge
- **Mapping**:
  - PENDING_HOD → ⏳ "Pending HOD" — yellow/warning
  - APPROVED_HOD → ✅ "HOD Approved" — green/success  
  - REJECTED_HOD → ❌ "Rejected" — red/error
  - PROVISIONED → 🟣 "Provisioned" — purple/primary
  - FAILED_PROVISIONING → 🔴 "Failed" — red/error
- **Style**: Rounded-full pill, 10–11px uppercase text, container bg + text color

### 5. StatsCard
- **Layout**: Rounded-2xl card, left icon (colored container), label + large value + subtitle
- **Variants**: primary, success, warning, error, default (each has distinct icon bg)
- **Size**: Full-width in grid column

### 6. Timeline (Vertical)
- **Steps**: Connected via vertical line (2px)
- **Each step**: Circle indicator (filled/outlined/dashed) + label + optional timestamp
- **States**: completed (filled green circle ✓), current (filled primary, pulse animation), upcoming (dashed outline)

### 7. Toast
- **Position**: Bottom-right, stacked
- **Variants**: success (green), error (red), warning (yellow), info (blue)
- **Auto-dismiss**: 4–6 seconds
- **Style**: Rounded-xl, shadow-3, icon + message + close button

---

## 📄 Page-by-Page Design Specifications

---

### PAGE 1: Landing / Home Page
**Route**: `/`  
**Access**: Public (unauthenticated)

#### Layout
- **Navbar** (fixed top): Glassmorphic bg (`surface/80` + `backdrop-blur`), border-bottom
  - Left: Logo (primary rounded-xl square with `school` icon) + "BHU Email Portal" / "Banaras Hindu University"
  - Right: "Sign In" (text link) + "Register" (filled primary button)

#### Hero Section (centered, max-w-4xl)
- **Background decorations**: 3 large gradient circles (primary/tertiary/secondary at 3–8% opacity)
- **Badge**: Pill shape, primary-container bg, "✓ Official University Portal"
- **Heading**: 5xl–6xl serif font, "Institutional Email" (dark) + "Registration Portal" (gradient primary→tertiary)
- **Subtitle**: lg text, outline color, mentions @bhu.ac.in
- **CTA Row**: Two buttons — "Register Now" (filled, with `person_add` icon) + "Sign In" (outlined, with `login` icon)

#### Feature Cards (3-column grid, below hero)
Each card: Surface bg, rounded-2xl, border, hover: shadow + translate-y -4px
1. 📄 "Digital Application" — icon container, title, description
2. ✅ "Multi-Level Approval" — icon container, title, description
3. ⚡ "Auto Provisioning" — icon container, title, description

#### Footer
- Border-top, centered text: "© 2026 BHU — Computer Centre"

---

### PAGE 2: Login Page
**Route**: `/login`  
**Access**: Public

#### Layout: Split screen (50/50 on desktop, full-width form on mobile)

**Left Panel** (desktop only):
- Full-height gradient: `primary → primary-dark → on-primary-container`
- Decorative white circles (5–8% opacity) at corners
- University emblem (rounded-2xl, white/15 bg + blur, `school` icon 40px)
- Heading: "Banaras Hindu University" (serif, 4xl, white)
- Tagline: "Capital of Knowledge" (white/70)
- 3 feature bullets with icons: mail, verified_user, speed

**Right Panel** (form):
- Mobile: Shows logo bar (hidden on lg)
- Heading: "Welcome back" (serif, 2xl) + subtitle
- **Form fields**:
  - Email Input (mail icon)
  - Password Input (lock icon)
  - Error alert (red container, error icon)
  - "Sign In" Button (full-width, lg, `login` icon)
- Link: "Don't have an account? Register here" → `/register`
- Footer: Copyright line

---

### PAGE 3: Registration Page
**Route**: `/register`  
**Access**: Public

#### Layout: Split screen (5/12 branding + 7/12 form)

**Left Panel**:
- Same gradient style as Login
- Heading: "Create Your Account" (serif, 4xl)
- Tagline: "Join the BHU Email Portal"
- 3 bullets: ⏱ Takes less than 2 minutes, 🔒 Data secured with encryption, 📊 Track application in real time

**Right Panel** (form):
- Heading: "Create an Account" (serif, 2xl) + subtitle
- **Form fields** (top to bottom):
  - First Name + Last Name (2-column grid, person icons)
  - Alternate Email (mail icon)
  - Department dropdown (apartment icon, optional)
  - Password + Confirm Password (2-column grid, lock icons)
  - Password hint text (info icon, 12px)
  - Error alert
  - "Create Account" Button (full-width, lg, `person_add` icon)
- Link: "Already have an account? Sign in"
- Footer: Copyright

**Success State**: Full-screen centered view → green checkmark circle → "Registration Successful!" → spinning loader → auto-redirect to login

---

### PAGE 4: Dashboard Layout (Shared Shell)
**Used by**: All dashboard pages  
**Access**: Authenticated only

#### Sidebar (fixed, 288px width, hidden on mobile with overlay)
- **Header**: Logo + "Banaras Hindu University" / "Email Portal"
- **Navigation** (role-specific):
  - *Applicant*: My Applications, New Application
  - *HOD*: Pending Reviews, Reviewed
  - *CC Admin*: Provisioning Queue, Analytics, Users
- **Nav Item Style**: rounded-xl, icon + label, active state = primary-container bg + dot indicator
- **User Card** (bottom): Avatar circle (initials), name, role badge (color-coded), logout button (hover: error)

#### Top Bar (sticky)
- Mobile: Hamburger menu button
- Right: Role badge pill

#### Content Area
- Padding: 24–32px, flex-1

---

### PAGE 5: Applicant Dashboard — My Applications
**Route**: `/dashboard/applicant`  
**Role**: APPLICANT

#### Header Row
- Title: "My Applications" (serif, 2xl) + subtitle
- CTA: "New Application" button (primary, `add_circle` icon)

#### Empty State
- Centered card (rounded-2xl, border), icon circle (primary, `description`), heading, description, large CTA button

#### Applications List
Each item is a card (rounded-xl, border, hover: shadow + primary border tint):
- Left: Icon container (primary, `mail`)
- Center: Tracking ID (bold) + StatusBadge (inline) + Department + date
- Right: Chevron right icon

#### Application Detail Modal
- Status badge + department name
- **Timeline component** (vertical progress tracker)
- **Details grid** (2-column): Dynamic key-value pairs from applicantDetails JSON
- HOD Remarks section (if present, primary-container/30 bg)
- CC Admin Remarks section (if present, tertiary-container/30 bg)
- Provisioned info card (if status = PROVISIONED, success-container bg, verified icon)

---

### PAGE 6: New Application Form (Multi-Step)
**Route**: `/dashboard/applicant/new`  
**Role**: APPLICANT

#### Step Indicator
- 3 circles (numbered) connected by horizontal lines
- Active/completed = primary bg, upcoming = surface-variant
- Labels below: "Category" → "Details" → "Review"

#### Step 1: Select Category
- Title: "Select Your Category" + subtitle
- **5 category cards** (full-width, button-like):
  - Each: Icon (colored circle), Category Name, Description, Storage Quota badge
  - Selected state: Primary border, primary-container/30 bg, primary icon bg
  - Categories: Group A Officer (20GB), Teaching Staff (20GB), Non-Teaching Staff (5GB), Research Scholar (10GB), PG Student (5GB)
- "Continue" button (right-aligned)

#### Step 2: Details + Photo
- Title: "Application Details" + category label + quota + "Change category" link
- **Department dropdown** (apartment icon)
- **Dynamic fields** (varies by category):
  - Staff: Designation, Employee ID, Date of Joining, Specialization
  - Scholar: Enrollment No, Supervisor, Research Topic, Year
  - PG Student: Enrollment No, Course, Year
- **Photo Upload area**:
  - Dashed border, click-to-upload
  - Empty: Icon (`add_photo_alternate` 40px), instructions, "JPEG or PNG, max 2MB"
  - With photo: Preview thumbnail (80×80, rounded-xl), filename, size, type, "Remove" link, green checkmark
- Error alert
- Back + "Review Application" buttons

#### Step 3: Review & Submit
- Title: "Review Your Application"
- **Summary Card** (rounded-2xl, border):
  - Banner: Category icon + name + department + quota badge (primary bg)
  - Details grid (2-column, surface-variant/40 bg)
  - Photo preview (56×56 thumbnail)
- **IT Policy Agreement** (surface-variant/30 bg, rounded-xl):
  - Policy text (scrollable, max-h-32)
  - Checkbox: "I have read and accept the IT Usage Policy"
- Error alert
- Back + "Submit Application" button (lg, `send` icon, disabled until policy accepted)

---

### PAGE 7: HOD Dashboard — Pending Reviews
**Route**: `/dashboard/hod`  
**Role**: HOD

#### Header
- Title: "Pending Reviews" (serif, 2xl) + count subtitle
- Bulk action bar (appears when items selected): "X selected" + "Bulk Approve" tonal button

#### Empty State
- Success-themed: green circle (`task_alt`), "All caught up!"

#### Application Queue
- **Select All** checkbox row
- Each application card (rounded-xl, border):
  - Checkbox (left, accent-primary)
  - Avatar circle (initials, primary-container)
  - Info: Full name + StatusBadge, Tracking ID + Department + Email, Submit date
  - **Action buttons** (right):
    - ✅ Approve (success-container bg, `check_circle`)
    - ❌ Reject (error-container bg, `cancel`)

#### Review Modal (when clicking application or action)
**Detail view**:
- Applicant card (avatar circle, name, email, department)
- Details grid (2-column)
- Footer: Reject (outlined, error) + Approve (filled, success) buttons

**Action view** (approve/reject):
- Same applicant info
- **Remarks textarea** (rounded-lg, 3 rows):
  - Approve: optional, green border tint
  - Reject: mandatory (*), red border tint
- Footer: Cancel + Approve/Reject button (color-coded)

---

### PAGE 8: HOD — Reviewed Applications
**Route**: `/dashboard/hod/reviewed`  
**Role**: HOD

#### Header
- Title: "Reviewed Applications" (serif, 2xl)
- Filter tabs (segmented control): All | Approved | Rejected

#### Empty State
- History icon, "No reviewed applications", link to Pending Reviews

#### List
- Same card layout as pending queue (without checkboxes and action buttons)
- Shows: Avatar, Name + StatusBadge, Tracking ID + Department, review date

#### Detail Modal
- Status + department
- Details grid
- "Your Remarks" section (primary-container/30)

---

### PAGE 9: CC Admin — Provisioning Queue
**Route**: `/dashboard/admin`  
**Role**: CC_ADMIN

#### Stats Cards Row (3-column)
1. 🟡 "In Queue" — count — "Ready for provisioning"
2. 🟣 "Total Quota" — sum GB — "Will be allocated"
3. ⚪ "Avg Wait" — Xh — "Since HOD approval"

#### Empty State
- Success: green circle (`verified`), "Queue is empty"

#### Queue List
Each card (rounded-xl, border):
- Avatar circle (larger, 48px)
- Info: Name + StatusBadge, Tracking ID + Department + Expected email, HOD name + Quota
- **"Provision" Button** (filled primary, `rocket_launch` icon, loading state)

#### Detail Modal
- Applicant card (avatar, name, email, department, StatusBadge)
- **Provisioning Preview** (primary-container/20 bg, border):
  - Expected BHU Email: `firstname.lastname@bhu.ac.in` (primary bold)
  - Storage Quota: X GB
- Details grid
- HOD Remarks (secondary-container/30)
- Footer: Close + "Provision Account" button (`rocket_launch`)

---

### PAGE 10: CC Admin — Analytics Dashboard
**Route**: `/dashboard/admin/analytics`  
**Role**: CC_ADMIN

#### Header
- Title: "Analytics Dashboard" (serif, 2xl) + "System-wide metrics"
- Refresh button (icon only)

#### Stats Cards (4-column grid)
1. 🟣 Total Applications — count
2. 🟢 Provisioned — count + "X GB allocated"
3. 🟡 Avg Approval Time — Xh + "Based on N applications"
4. ⚪ Total Quota — X GB + "N accounts"

#### Charts Row (2-column grid)
**Left: Status Breakdown**
- Card (rounded-2xl, border), pie_chart icon
- Horizontal bar chart (CSS-based):
  - Each status: Label + count, colored bar (percentage of max)
  - Colors: PENDING_HOD=#E6A817, APPROVED_HOD=#6750A4, REJECTED=#B3261E, PROVISIONED=#1B873E

**Right: Department Volume**  
- Card (rounded-2xl, border), apartment icon
- Horizontal bars (gradient primary→tertiary)
- Scrollable (max-h-64)

#### Recent Applications Table
- Card (rounded-2xl, border)
- Table columns: Tracking ID (primary color) | Applicant (name + email) | Department | Status (badge) | Date
- Row hover: surface-variant/30

---

### PAGE 11: CC Admin — User Management
**Route**: `/dashboard/admin/users`  
**Role**: CC_ADMIN

#### Header
- Title: "User Management" (serif, 2xl) + "N registered users"
- Refresh button

#### Stats Cards (4-column)
1. 🟣 Total Users
2. ⚪ Applicants — count
3. 🟡 HODs — count
4. 🔴 Admins — count

#### Filters Row
- **Search Input** (rounded-xl, search icon, clear button)
- **Role Tabs** (segmented control, surface-variant bg): All (N) | Applicants (N) | HODs (N) | Admins (N)

#### Users Table
- Card container (rounded-2xl, border, overflow hidden)
- Header row: surface-variant/30 bg
- Columns: User (avatar+name) | Email | Role (colored badge) | BHU Email (green if provisioned, "—" if not) | Joined
- Row hover + clickable

#### User Detail Modal
- **Profile header** (surface-variant/30, rounded-xl):
  - Large avatar (64px), Name, Email, Role badge
- **Info grid** (2×2):
  - User ID (monospace, truncated)
  - Joined date (long format)
  - BHU Email (or "Not provisioned")
  - Department ID

---

## 🔄 User Flow Diagrams

### Flow 1: Applicant Journey
```
Landing Page → Register → Login → Applicant Dashboard (empty)
    → New Application → Step 1 (Category) → Step 2 (Details + Photo)
    → Step 3 (Review + Policy) → Submit → Dashboard (with application card)
    → Click card → Detail Modal (Timeline shows progress)
```

### Flow 2: HOD Review
```
Login → HOD Dashboard → See pending applications
    → Click Approve → Modal with Remarks → Confirm
    → Application moves to CC Admin queue
    → HOD sees it in "Reviewed" tab
```

### Flow 3: CC Admin Provisioning
```
Login → Admin Dashboard → See HOD-approved applications
    → Click "Provision" → Account created on Google Workspace
    → Success toast → Application removed from queue
    → Check Analytics for metrics
    → Manage Users for user overview
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| **< 1024px** (mobile/tablet) | Sidebar hidden (hamburger menu overlay), single-column grids |
| **≥ 1024px** (lg desktop) | Sidebar visible (sticky), multi-column grids |
| **Form grids** | 2-col → 1-col on mobile |
| **Stats cards** | 4-col → 2-col → 1-col |
| **Split screens** (Login/Register) | Side panel hidden on mobile, form full-width |

---

## 🎨 Design Tips for Google Stitch

1. **Background**: Use `#FCF9F8` as base — very slightly warm off-white
2. **Cards**: Always `#FFFBFE` surface with 1px `#CAC4D0` border, 16px radius
3. **Primary purple**: `#6750A4` — use for CTAs, active states, key accent elements
4. **Typography hierarchy**: Serif for page titles only, sans-serif (Inter) for everything else
5. **Micro-interactions**: Hover = slight shadow elevation + subtle border color shift
6. **Empty states**: Always include a large icon (in container circle), heading, description, and CTA
7. **Role color coding**: Applicant=Purple, HOD=Secondary, Admin=Tertiary — consistent across all badges
8. **Form inputs**: Always have left icon, 2px border, generous padding (12px vertical)
9. **Modals**: Always centered, dark overlay, have clear header/body/footer structure
10. **Spacing**: Use 8px grid system — gaps are multiples of 4 or 8
