# Mission Control — Developer Documentation

> Complete technical reference for the Mission Control codebase. Last updated March 2026.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository & Deployment](#3-repository--deployment)
4. [Project Structure](#4-project-structure)
5. [Architecture Overview](#5-architecture-overview)
6. [Routing](#6-routing)
7. [Design System](#7-design-system)
8. [Component Library](#8-component-library)
9. [Database Tables](#9-database-tables)
10. [Sales Order Lifecycle](#10-sales-order-lifecycle)
11. [Cross-App Integration](#11-cross-app-integration)
12. [Role System](#12-role-system)
13. [Data Hooks](#13-data-hooks)
14. [Standards & Conventions](#14-standards--conventions)

---

## 1. Project Overview

**Mission Control** is the management dashboard for Bolt Lightning Protection (Lightning Master Corporation). It provides the office and management team with pipeline visibility, sales order lifecycle management, operations scheduling, and relationship tracking.

**Users:**
- **COO / Management** — full pipeline visibility, approve change orders, ops board
- **Office staff** — create sales orders, manage relationships, import from QuickBooks
- **Admin** — user management, system configuration

**Companion apps:**
- **Warehouse IQ** — handles physical fulfillment, shipping, drop ship, back order queues
- **Field Ops** — field crew workflow, daily logs, inspections, project detail

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| UI Framework | React | 19 |
| Routing | React Router DOM | 7 |
| Build Tool | Vite | 8 |
| Backend / DB | Supabase (Postgres + Storage) | 2 |
| Icons | Phosphor Icons | 2 |
| Deployment | Vercel | — |
| Styling | Plain CSS + CSS Custom Properties | — |

**No CSS frameworks.** All styles live in `src/styles/globals.css` using the token system.

---

## 3. Repository & Deployment

| Item | Value |
|---|---|
| **Repo** | github.com/KkarmLMC/bolt-mission-control |
| **Vercel project** | bolt-mission-control |
| **Vercel team** | team_oKaol6h5RgP01y9JBHaQtnzG |
| **Production URL** | bolt-mission-control.vercel.app |
| **Supabase project** | jnbdlhyjnzdsvscpgkqi |

**Deploy flow:** Push to `main` → Vercel auto-deploys via git integration.

---

## 4. Project Structure

```
src/
├── App.jsx                    # Root — routing, layout shell, header
├── main.jsx                   # Entry point
├── components/
│   ├── Sidebar.jsx            # Config wrapper (delegates to shared Sidebar)
│   ├── MobileTabBar.jsx       # Mobile bottom nav
│   ├── FAB.jsx                # Floating action button
│   ├── ProjectPicker.jsx      # Project selector
│   ├── modals/
│   │   ├── LeadModal.jsx      # Opportunity lead CRUD modal
│   │   └── OtherModals.jsx    # Task + relationship modals
│   └── ui/                    # Shared UI kit (synced across all 3 apps)
│       ├── index.js           # Barrel export
│       ├── primitives/        # Button, Input, Badge, Spinner...
│       ├── navigation/        # Sidebar (renderer), PageHeader, BottomNav...
│       ├── data-display/      # Card, StatCard, RowItem, StatusBadge...
│       ├── foundations/       # Surface
│       └── workflows/         # ActionButton, FilterPills
├── hooks/
│   └── useAppData.js          # Central data hook (leads, rels, tasks)
├── lib/
│   ├── supabase.js            # Supabase client
│   ├── statusColors.js        # Shared status color/label resolver
│   ├── logActivity.js         # Activity logging utility
│   ├── useRole.js             # Role-based access hook
│   └── utils.js               # Misc helpers
├── pages/                     # All route pages
└── styles/
    ├── globals.css             # Full design system + app-specific CSS
    └── ui-kit-components.css   # Shared UI kit supplementary styles
```

---

## 5. Architecture Overview

Mission Control is a single-page app with a shared Supabase backend. The app shell uses a config-only Sidebar that delegates all rendering to the shared `ui/navigation/Sidebar.jsx`.

**Key architectural decisions:**
- **Sidebar is config-only** — local Sidebar.jsx passes nav items, footer items, and slot JSX to the shared renderer. It does NOT render `<aside>` or any nav UI directly.
- **App.jsx has zero structural inline styles** — all layout uses CSS classes.
- **Modal pattern** — LeadModal and OtherModals are rendered at the App level, triggered by state.
- **Data centralized in useAppData** — leads, relationships, and tasks are loaded once and passed down via props.

---

## 6. Routing

| Route | Page | Description |
|---|---|---|
| `/` | → `/opportunities` | Redirect |
| `/opportunities` | Opportunities | Lead pipeline aggregate view |
| `/opportunities/permits` | PermitFeed | Live permit feed + lead management |
| `/relationships` | Relationships | GC/engineer relationship tracker |
| `/tasks` | TaskBoard | Team task board |
| `/change-orders` | ChangeOrders | Field change order review |
| `/sales-orders` | SalesOrders | SO list with filters |
| `/sales-orders/new` | SONew | Create new SO |
| `/sales-orders/:id` | SODetail | Full SO lifecycle detail |
| `/ops-board` | OpsBoard | Project schedule + crew deployment |
| `/qb-import` | QBImport | QuickBooks Desktop CSV import |
| `/profile` | Profile | User profile + PIN management |
| `/users` | UserManagement | Admin: manage users and roles |

---

## 7. Design System

See `DESIGN_SYSTEM.md` for the full spec. Key points:

- **3-layer token architecture:** Foundation → Semantic → Component
- **Flat UI** — no box-shadow anywhere
- **BEM naming** — `.block__element--modifier`
- **Semantic tokens** for new work: `--text-primary`, `--surface-base`, `--brand-primary`
- **Legacy alias layer** bridges old tokens during migration

---

## 8. Component Library

### Shared UI Kit (synced across all 3 apps)
Import from barrel: `import { Card, Button, Badge } from '../components/ui'`

| Category | Components |
|---|---|
| Primitives | Button, IconButton, Input, Select, Textarea, Badge, Divider, Spinner |
| Navigation | Sidebar, AppShell, MobileHeader, BottomNav, PageHeader, PageSubNav |
| Data Display | Card, StatCard, StatusBadge, RowItem, SearchInput, EmptyState |
| Foundations | Surface |
| Workflows | ActionButton, FilterPills |

### App-Specific Components
| Component | Purpose |
|---|---|
| Sidebar.jsx | Config wrapper — nav items with dynamic counts, alert slots |
| MobileTabBar.jsx | Mobile bottom navigation |
| FAB.jsx | Floating action button |
| ProjectPicker.jsx | Project selector dropdown |
| LeadModal.jsx | Opportunity lead create/edit modal |
| OtherModals.jsx | Task + relationship create/edit modals |

---

## 9. Database Tables

Mission Control primarily reads/writes these Supabase tables:

| Table | Usage |
|---|---|
| `sales_orders` | Full SO lifecycle — create, status transitions, QB sync |
| `so_line_items` | SO line items (materials + installation) |
| `fulfillment_sheets` | Read — check fulfillment state |
| `fulfillment_lines` | Read — line-level fulfillment data |
| `shipments` | Read — shipment tracking (warehouse + dropship) |
| `profiles` | User profiles, roles, PIN hashes |
| `user_activity_logs` | Activity audit trail |

Permit data, relationships, and tasks are stored in MC-specific tables managed by `useAppData`.

---

## 10. Sales Order Lifecycle

```
draft → queued → running → fulfillment → shipment → complete
                         ↘ partial_fulfillment → partial_shipment ↗
                         ↘ back_ordered (re-enters running)
```

**Status values:**
| Status | Meaning |
|---|---|
| `draft` | Created, not yet submitted |
| `queued` | In SO queue, waiting for warehouse |
| `running` | Inventory audit in progress (Run Order) |
| `fulfillment` | All lines being pulled |
| `partial_fulfillment` | Warehouse lines in fulfillment + drop ship/back order pending |
| `shipment` | All lines ready to ship |
| `partial_shipment` | Warehouse shipped, drop ship/back order still pending |
| `back_ordered` | Remaining lines waiting for restock |
| `complete` | All tracks resolved |
| `cancelled` | Order cancelled |

**Flags:** `has_back_order`, `has_drop_ship` — indicate parallel tracks.

---

## 11. Cross-App Integration

MC creates and manages SOs. Physical fulfillment happens in Warehouse IQ.

| Action in MC | Effect in WIQ |
|---|---|
| Submit SO to queue | Appears in WIQ SO Queue |
| View fulfillment | Links to WIQ fulfillment detail |
| View shipment | Links to WIQ shipment detail |
| View drop ship | Links to WIQ drop ship queue |

SODetail.jsx has action buttons that open WIQ URLs for each status:
```js
const WIQ_URL = 'https://warehouse-iq.vercel.app'
// partial_shipment → opens WIQ drop ship queue
// back_ordered → opens WIQ run order for re-run
```

---

## 12. Role System

| Role | Access |
|---|---|
| `admin` | Full access + user management |
| `manager` | Full access except user management |
| `staff` | Read access + own tasks |

Roles stored in `profiles.role`. Checked via `useAuth()` hook.

---

## 13. Data Hooks

### useAppData
Central data hook that loads leads, relationships, and tasks:
```js
const { leads, rels, tasks, loading, saveLead, saveRel, saveTask, toggleTask } = useAppData()
```
Returns loading states per data type: `loading.permits`, `loading.rels`, `loading.tasks`.

### useAuth
Auth hook providing session, profile, and signOut:
```js
const { session, loading, profile, signOut, user } = useAuth()
```

---

## 14. Standards & Conventions

See `STANDARDS.md` for the full spec. Summary:

- **No structural inline styles** — use BEM classes in globals.css
- **No raw hex values** — use semantic tokens
- **No box-shadow** — flat UI only
- **Build before push** — `npx vite build` must pass
- **Verify icon names** — check phosphoricons.com before using
- **Read before writing** — understand existing code before editing
- **Shared UI kit is canonical** — import from `../components/ui`, never duplicate
