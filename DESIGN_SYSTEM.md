# LMC / Bolt Lightning — Unified Design System
### Field Ops · Mission Control · Warehouse IQ

**Version:** 1.0 — March 2026  
**Applies to:** All three apps in the LMC platform  
**Purpose:** This document is the single source of truth for visual design, component patterns, and development principles. Refer to it before building any new page or component.

---

## 1. The Three Apps

| App | Repo | URL | Audience |
|---|---|---|---|
| **Field Ops** | `KkarmLMC/field-ops` | `field-ops-psi.vercel.app` | Field crew, installers, supervisors |
| **Mission Control** | `KkarmLMC/bolt-mission-control` | `bolt-mission-control.vercel.app` | Management, COO, office staff |
| **Warehouse IQ** | `KkarmLMC/warehouse-iq` *(planned)* | TBD | Warehouse managers |

**Shared backend:** All three apps use the same Supabase project (`jnbdlhyjnzdsvscpgkqi`). One database, three front-end surfaces.

---

## 2. Stack

Every app in this platform uses the same stack. Do not introduce alternatives without discussion.

```
React 19          — UI framework
Vite 8            — Build tool
React Router 7    — Client-side routing
Supabase JS 2     — Database + auth client
Phosphor Icons    — Icon library (ONLY icon library — no emoji, no other libraries)
DM Mono           — Monospace font (shared across all apps)
CSS custom properties — Design tokens (no Tailwind, no CSS-in-JS)
Vercel            — Deployment
```

**Field Ops only additionally uses:** Dexie.js (offline), jsPDF (PDF generation)

---

## 3. Design Tokens

### 3.1 Colors

The canonical color palette. Copy these values exactly into any new `:root {}` block.

```css
/* Brand */
--navy:       #04245C;   /* LMC primary — sidebars, headers, key UI */
--navy-dark:  #031a45;   /* Hover on navy */
--red:        #F5333F;   /* Bolt Lightning primary — CTAs, active states */
--red-dark:   #D42430;   /* Hover on red */
--red-soft:   #FEF0F1;   /* Red background tint */

/* Text */
--text-1:  #000000;   /* Primary content */
--text-2:  #374151;   /* Labels, secondary */
--text-3:  #9CA3AF;   /* Timestamps, tertiary */
--text-4:  #D1D5DB;   /* Disabled, placeholder */

/* Surfaces */
--bg:              #FFFFFF;
--surface:         #FFFFFF;
--surface-raised:  #F7F8FA;   /* Card backgrounds */
--hover:           #F3F4F6;
--border-l:        #EFEFEF;   /* Row dividers only — no card borders */

/* Semantic */
--success:       #10B981;
--success-soft:  #ECFDF5;
--success-text:  #15803D;
--error:         #EF4444;
--error-soft:    #FEF2F2;
--error-alt:     #DC2626;
--warning:       #F59E0B;
--warning-soft:  #FFFBEB;
--warning-text:  #92400E;
--warning-border:#FCD34D;
--purple:        #7C3AED;
--purple-soft:   #F5F3FF;
--blue:          #1D4ED8;
--blue-soft:     #EFF6FF;
--teal:          #0D9488;
--teal-soft:     #F0FDFA;
```

### 3.2 Typography

```css
--font: 'Plus Jakarta Sans', sans-serif;   /* Field Ops */
--font: 'DM Sans', sans-serif;             /* Mission Control (to be unified) */
--mono: 'DM Mono', monospace;              /* Shared — all apps */

/* Type scale */
--fs-2xs:  0.5625rem;   /*  9px — micro labels */
--fs-xs:   0.75rem;     /* 12px — badges, meta */
--fs-sm:   0.8125rem;   /* 13px — secondary content */
--fs-base: 0.875rem;    /* 14px — body default */
--fs-md:   1rem;        /* 16px — emphasized body */
--fs-lg:   1.125rem;    /* 18px — section titles */
--fs-xl:   1.25rem;     /* 20px — card values */
--fs-2xl:  1.5rem;      /* 24px — page titles */
```

> **Note:** Field Ops uses Plus Jakarta Sans; Mission Control uses DM Sans. These will be unified to Plus Jakarta Sans in a future pass.

### 3.3 Spacing

Always use these tokens. Never write raw pixel values for spacing.

```css
--sp-1:   0.25rem;   /*  4px */
--sp-2:   0.5rem;    /*  8px */
--sp-3:   0.75rem;   /* 12px */
--sp-4:   1rem;      /* 16px */
--sp-5:   1.25rem;   /* 20px */
--sp-6:   1.5rem;    /* 24px */
--sp-8:   2rem;      /* 32px */
--sp-10:  2.5rem;    /* 40px */
--content-pad: 1.25rem;   /* Standard page padding */
```

### 3.4 Border Radius

```css
--r-xs:   4px;
--r-sm:   6px;
--r-md:   8px;
--r-lg:   10px;
--r-xl:   14px;
--r-2xl:  18px;
--r-full: 9999px;   /* Pills, dots */
```

### 3.5 Shadows

```css
--shadow:    0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
--shadow-lg: 0 20px 50px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.06);
```

---

## 4. Icons

**Rule: Use Phosphor Icons everywhere. No emoji. No text characters. No other icon libraries.**

```jsx
import { Package, Receipt, Warning, CaretRight } from '@phosphor-icons/react'

// Standard sizes
// 12px — inside badges, tight spaces
// 14px — inline with text
// 16px — stat card icons
// 18–20px — action buttons
// 22–28px — page headers, FAB

// Weight conventions
// weight="regular" — default state
// weight="bold"    — active, selected
// weight="fill"    — status indicators (success, error, warning)
```

**Stat card icons:** Always pass an inline `style={{ color: 'var(--color)' }}` — don't rely on parent color inheritance.

---

## 5. Layout Shell

### Desktop (≥768px)
```
┌─────────────────────────────────────────┐
│  Sidebar (240px navy)  │  Main content  │
│  - Logo                │  - Header bar  │
│  - Nav items           │  - Page area   │
│  - Footer (user/out)   │                │
└─────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌────────────────────┐
│  Mobile header     │  ← Shows page title + back arrow
├────────────────────┤
│  Page content      │  ← Scrollable, padded
│                    │
│                    │
├────────────────────┤
│  Bottom nav bar    │  ← 64px fixed, safe area aware
└────────────────────┘
```

**Key rules:**
- Sidebar is **navy background** (`var(--navy)`), white text
- Nav items use `rgba(255,255,255,0.6)` at rest, `#fff` active
- Active nav item background: `rgba(255,255,255,0.12)`
- Page content uses `.page-content` class with `var(--content-pad)` padding
- Mobile bottom nav uses `env(safe-area-inset-bottom)` for notch phones

---

## 6. Navigation Principles

### Active State
- **Active filter pills:** `background: var(--navy)`, `color: #fff` — never red for filters
- **Active nav item:** navy background tint
- **Active bottom tab:** `color: var(--red)`, `fill` icon weight

### Route Naming Conventions
```
/section                  — Section root/overview
/section/subsection       — Child page
/section/:id              — Detail page
/section/new              — Create page
/section/:id/edit         — Edit page
```

### Sub-navigation (mobile)
- Use `PageSubNav` component for horizontal scrollable pill tabs under a section
- Suppress sub-nav on detail, create, and edit pages
- Suppression handled in `getSubNav()` with regex path matching

---

## 7. Component Patterns

### Buttons

```jsx
// Primary CTA — red background
<button style={{ background: 'var(--red)', color: '#fff', ... }}>Save</button>

// Secondary — raised surface with border
<button style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-l)', ... }}>Cancel</button>

// Ghost — text only
<button style={{ background: 'none', color: 'var(--text-3)', ... }}>Skip</button>
```

**Rules:**
- All buttons: `min-width: 0`, `box-sizing: border-box` (prevents flex overflow)
- All buttons: `font-family: var(--font)` (browsers default to system font)
- Disabled: `opacity: 0.7`, `cursor: not-allowed`
- Full-width submit buttons: always use `var(--navy)` background, not red

### Cards

```css
/* Standard card */
background: var(--surface-raised);
border-radius: var(--r-xl);
border: 1px solid var(--border-l);   /* or no border for flat design */
overflow: hidden;

/* Card header — navy */
background: var(--navy);
color: #fff;
padding: var(--sp-3) var(--sp-4);
```

**Flat design rule (Field Ops):** Cards use `background: var(--surface-raised)` with no border. Borders are only used for internal row dividers (`var(--border-l)`).

### Status Badges

```jsx
// Pattern: colored bg + matching text
const STATUS = {
  draft:     { color: '#64748B', bg: '#F1F5F9' },
  submitted: { color: '#D97706', bg: '#FEF3C7' },
  published: { color: '#1D4ED8', bg: '#EFF6FF' },
  approved:  { color: '#15803D', bg: '#F0FDF4' },
  rejected:  { color: '#B91C1C', bg: '#FEF2F2' },
}
```

### Search Input

```jsx
<div style={{ position: 'relative' }}>
  <MagnifyingGlass size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
  <input value={search} onChange={...} style={{ paddingLeft: 30, paddingRight: search ? 30 : 8 }} />
  {search && (
    <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, ... }}>
      <X size={13} />
    </button>
  )}
</div>
```

### Empty States

```jsx
<div className="empty">
  <IconName size={36} style={{ color: 'var(--text-3)', marginBottom: 'var(--sp-3)' }} />
  <div className="empty-title">Nothing here yet</div>
  <div className="empty-desc">Descriptive message about how to get started.</div>
</div>
```

**Rules:** Never use emoji in empty states. Always use a Phosphor icon at size 36, `color: var(--text-3)`.

### Loading States

```jsx
// Inline spinner
<div className="spinner" />   /* 18px, red border-top */

// Full page
<div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--sp-10)' }}>
  <div className="spinner" />
</div>
```

---

## 8. Forms

### Input Focus
```css
/* Focus ring: navy, not blue */
input:focus, select:focus, textarea:focus {
  border-color: var(--navy);
  box-shadow: 0 0 0 3px rgba(11,31,58,0.1);
  background: var(--surface);
}
```

### Required Fields
```jsx
<label>
  Customer Name
  <span style={{ color: 'var(--error)', marginLeft: 3 }}>*</span>
</label>
```

### Error Banner
```jsx
{error && (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3)', background: 'var(--error-soft)', borderRadius: 'var(--r-lg)', color: 'var(--error-alt)', fontSize: 'var(--fs-sm)' }}>
    <Warning size={14} style={{ flexShrink: 0 }} />
    {error}
  </div>
)}
```

### Save Pattern

Every form has two actions:
1. **Save Draft** — secondary button, saves without workflow impact
2. **Save & Submit / Confirm** — primary button (`var(--navy)` background), advances status

```jsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
  <button onClick={() => handleSave(false)}>Save Draft</button>
  <button onClick={() => handleSave(true)}>
    <ArrowRight size={15} /> Save & Submit
  </button>
</div>
```

---

## 9. Mobile Principles

**Mobile-first for Field Ops. Desktop-first for Mission Control.**

### Touch Targets
- Minimum tap target: 44×44px
- Row items (cards, list items): minimum 48px height
- Bottom nav tabs: full height of 64px bar

### Flex Overflow Prevention
Any element that could overflow its flex container needs:
```css
min-width: 0;
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

Specifically: card titles, customer names, nav labels, any `flex: 1` child.

### Safe Areas
```css
padding-bottom: max(var(--sp-3), env(safe-area-inset-bottom));
```

Always apply to bottom nav bar and modal footers.

### Disable Pull-to-Refresh
Always add `overflow: hidden` to root elements. Without this, iOS/Android Safari will trigger a hard page refresh when the user pulls down on mobile.

```css
html, body, #root { height: 100%; overflow: hidden; }
```

Page content still scrolls normally because `.page-content` has `overflow-y: auto`.

### Bottom Sheets (mobile modals)
```css
border-radius: 20px 20px 0 0;
animation: sheetUp 0.25s cubic-bezier(0.32, 0.72, 0, 1);
max-height: 88vh;
```

---

## 10. Authentication

### Pattern (shared across all apps)
- Supabase Auth with email/password
- 6-digit PIN system for fast field access
- 7-day session persistence (`persistSession: true`)
- `AuthProvider` wraps the app in `main.jsx`
- `useAuth()` hook provides: `user`, `profile`, `role`, `isManagement`, `isField`, `signOut`

### Roles
```
field       — field crew, installers
management  — COO, office staff, managers
warehouse   — warehouse managers
admin       — full access to all three apps
```

### Route Protection
```jsx
// App.jsx pattern — show login if no session
if (!session) return (
  <Suspense fallback={null}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </Suspense>
)
```

### Per-App Branding
Each app sets its own name via Vercel environment variables:
```
VITE_APP_NAME=Field Ops
VITE_APP_SUBTITLE=Lightning Master · Bolt Lightning Protection
```

The shared `Login.jsx` reads `import.meta.env.VITE_APP_NAME` with a fallback.

---

## 11. Data & State

### Supabase Client Setup
```js
import { createClient } from '@supabase/supabase-js'
export const db = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      storageKey: '[appname]-auth',   // unique per app
      autoRefreshToken: true,
    }
  }
)
```

### Data Fetching Pattern
```jsx
const [data, setData]     = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  db.from('table').select('*').order('created_at', { ascending: false })
    .then(({ data }) => { setData(data || []); setLoading(false) })
}, [])
```

### Never Use Mock Data in Production
All pages should fetch from Supabase. Mock data (e.g. `mockData.js`) is only for development scaffolding and should be removed once real data is available.

---

## 12. Code Conventions

### File Structure
```
src/
  App.jsx              — Routes, auth gate, shell
  main.jsx             — Entry point, AuthProvider, BrowserRouter
  lib/
    supabase.js        — DB client
    useAuth.jsx        — Auth hook + AuthProvider
    useRole.js         — Re-exports from useAuth (backwards compat)
  components/
    Sidebar.jsx        — Desktop nav (navy background)
    BottomNav.jsx      — Mobile tab bar
    PageSubNav.jsx     — Section sub-tabs (mobile)
  pages/
    Login.jsx          — Shared login page (PIN + password)
    [PageName].jsx     — One file per route
  styles/
    globals.css        — All styles (no CSS modules, no Tailwind)
```

### Naming
- Pages: `PascalCase.jsx`
- Components: `PascalCase.jsx`
- Hooks: `camelCase.js` or `camelCase.jsx` (if JSX)
- Routes: `kebab-case` in URL, matching filename pattern

### Imports Order
```jsx
// 1. React
import { useState, useEffect } from 'react'
// 2. Router
import { useNavigate, useParams } from 'react-router-dom'
// 3. Icons
import { Package, Warning } from '@phosphor-icons/react'
// 4. Internal lib
import { db } from '../lib/supabase.js'
import { useAuth } from '../lib/useAuth.jsx'
// 5. Components
import Sidebar from '../components/Sidebar'
```

### Lazy Loading
All pages should be lazy-loaded in App.jsx:
```jsx
const PageName = lazy(() => import('./pages/PageName'))
```

---

## 13. What NOT to Do

| ❌ Don't | ✅ Do instead |
|---|---|
| Use emoji as icons | Use Phosphor Icons |
| Use `›` or `‹` as chevrons | Use `CaretRight` / `ArrowLeft` from Phosphor |
| Hardcode pixel spacing (`padding: 16px`) | Use `var(--sp-4)` |
| Use red for active filter pills | Use `var(--navy)` |
| Use `inline-flex` buttons without `min-width: 0` | Add `min-width: 0; box-sizing: border-box` |
| Use `localStorage` directly | Use Supabase auth session |
| Use hardcoded role checks (`role === 'management'`) | Use `useAuth()` → `isManagement` |
| Put JSX in a `.js` file | Use `.jsx` extension |
| Add env vars to `.env.local` without adding to Vercel dashboard | Add to both |
| Use `import.meta.env` values that aren't prefixed with `VITE_` | Prefix all client env vars with `VITE_` |

---

## 14. Adding a New App (Warehouse IQ Pattern)

When creating a new app in this platform:

1. **Create repo** under `KkarmLMC` org
2. **Copy** `src/lib/supabase.js`, `src/lib/useAuth.jsx`, `src/pages/Login.jsx` from field-ops
3. **Set unique** `storageKey` in Supabase client (`warehouse-iq-auth`)
4. **Copy** `globals.css` design tokens — do not start from scratch
5. **Set** `VITE_APP_NAME` and `VITE_APP_SUBTITLE` in Vercel project settings
6. **All apps** point to the same Supabase project ID: `jnbdlhyjnzdsvscpgkqi`
7. **Add** app slug to `app_access` array in the user's profile for access control

---

*Last updated: March 2026. Update this document when any design decisions change.*
