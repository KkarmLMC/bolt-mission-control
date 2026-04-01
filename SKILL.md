# Mission Control — Project Brief

## What This Is
The management dashboard for Bolt Lightning Protection (Lightning Master Corporation, Clearwater FL).
Covers opportunity pipeline, sales order lifecycle, operations scheduling, and relationship tracking.
Built for COO, office staff, and management — not field crew.

---

## Current State (as of March 2026)

### What exists and works:
- Full Vite + React Router SPA deployed on Vercel
- Supabase auth with PIN verification
- Opportunity pipeline (leads from permit scraping + manual entry)
- Sales order lifecycle (draft → queue → fulfillment → shipment → complete)
- Compound statuses for split orders (partial_fulfillment, partial_shipment)
- Drop ship tracking (PLP supplier integration via WIQ)
- Change order management
- Relationship tracker (GCs, MEP engineers)
- Task board
- QuickBooks Desktop import (Excel CSV parsing)
- Ops Board (project schedule overview)
- User management (admin only)
- Profile with PIN management

### Cross-app integration:
- Sales orders flow to Warehouse IQ for fulfillment
- Drop ship and back order queues managed in WIQ
- Project data shared with Field Ops via Supabase

---

## Stack
- **Framework:** React 19 + Vite 8
- **Routing:** React Router 7
- **Styling:** CSS custom properties + BEM (globals.css)
- **Icons:** Phosphor Icons (ONLY icon library)
- **Backend:** Supabase JS 2 (project: jnbdlhyjnzdsvscpgkqi)
- **Deployment:** Vercel (project: bolt-mission-control, team: team_oKaol6h5RgP01y9JBHaQtnzG)
- **Repo:** github.com/KkarmLMC/bolt-mission-control

---

## Key Pages
| Page | Route | Purpose |
|---|---|---|
| Opportunities | /opportunities | Lead pipeline + permit feed |
| Sales Orders | /sales-orders | SO list view |
| SO Detail | /sales-orders/:id | Full SO lifecycle view |
| SO New | /sales-orders/new | Create new sales order |
| Ops Board | /ops-board | Project schedule grid |
| Change Orders | /change-orders | Field part request review |
| Relationships | /relationships | GC/engineer tracker |
| Task Board | /tasks | Team task management |
| QB Import | /qb-import | QuickBooks CSV import |
| User Management | /users | Admin user control |
| Profile | /profile | PIN + profile settings |

---

## Shared UI Kit
All components live in `src/components/ui/` organized by category:
- **primitives/** — Button, Input, Select, Badge, Spinner, etc.
- **navigation/** — Sidebar (shared renderer), PageHeader, BottomNav
- **data-display/** — Card, StatCard, StatusBadge, RowItem, SearchInput
- **workflows/** — ActionButton, FilterPills
- **foundations/** — Surface

Import via barrel: `import { Card, Button, Badge } from '../components/ui'`

---

## Design Rules
- 100% flat UI — no box-shadow anywhere
- Use semantic tokens (--text-primary, --surface-base) not raw hex
- BEM class naming — no structural inline styles
- All styles in globals.css — no CSS modules, no Tailwind
