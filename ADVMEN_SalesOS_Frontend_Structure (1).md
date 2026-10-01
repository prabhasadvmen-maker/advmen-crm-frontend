# ADVMEN SalesOS — Frontend Architecture & Design System

**Companion document to:** ADVMEN SalesOS — Complete End-to-End Product & Technical Documentation
**Scope:** React + TypeScript frontend — design system, component architecture, folder structure, resilience patterns
**Status:** Production planning baseline (frontend layer)

---

## 0. How This Document Is Organized

| Section | Covers |
|---|---|
| 1 | Frontend principles derived from the product spec |
| 2 | Tech stack |
| 3 | Design system — color, elevation (skeuomorphism), type, spacing |
| 4 | Component architecture philosophy |
| 5 | Fault isolation strategy (the "one failure ≠ full crash" requirement) |
| 6 | Folder structure |
| 7 | Shared UI kit — the reusable component catalog |
| 8 | Feature module anatomy |
| 9 | State, data-fetching & permissions layer |
| 10 | Routing & role-based layout shells |
| 11 | Reference implementations (code) |
| 12 | Performance strategy |
| 13 | Accessibility standards |
| 14 | Testing strategy |
| 15 | Conventions & implementation checklist |

---

## 1. Principles Driving the Frontend

The product doc establishes three hard rules that the frontend must respect structurally, not just visually:

1. **"The frontend only reflects permissions already granted by the backend."** → every gated UI element is driven by a `permissions[]` array from the API, never by a hard-coded role check in a component.
2. **Every record belongs to a tenant, and every panel differs by role** (Super Admin, Org Admin, Sales Manager, Sales Executive, Telecaller, Marketing/SDR, Finance/Viewer) → the frontend needs **layout shells per role**, not one dashboard with conditionals sprinkled everywhere.
3. **The CRM is the system of record; AI and automation are assistive layers** → AI-generated content is always visually distinct (drafted vs. sent, suggested vs. applied) and gated behind an approval action in the UI, never auto-submitted.

Two additional requirements come directly from your brief:

4. **Composable, not copy-pasted.** Every recurring pattern (KPI tiles, status pills, timelines, data tables, slide-over panels) is built once in a shared kit and imported everywhere it's needed — Leads, Deals, Calls, Proposals, Invoices, Reports all reuse the same primitives.
5. **Blast-radius containment.** A broken AI widget, a failed report chart, or one bad API response must degrade only *that* card — the rest of the dashboard, sidebar, and navigation keep working. This is treated as an architectural requirement, not a nice-to-have (see §5).

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | React 18 + TypeScript | Matches backend doc's recommendation; strict typing pairs with the API's typed contracts |
| Routing | React Router v6 (data routers) | Native support for route-level `errorElement` and lazy loading |
| Server state | TanStack Query (React Query) | Per-widget caching, retries, and independent failure — critical for §5 |
| Client/UI state | Zustand | Sidebar state, active organization, theme, command-bar — small, no boilerplate |
| Forms | React Hook Form + Zod | Zod mirrors the backend's Zod/Joi validation layer — schemas can be shared |
| Styling | CSS variables (design tokens) + Tailwind (utility layer) | Tokens defined once, consumed by both Tailwind config and raw CSS for skeuomorphic layering |
| Tables | TanStack Table | Headless — needed for the dense, filterable, saved-view lead/deal tables |
| Charts | Recharts | Reports & pipeline analytics |
| Realtime | Socket.io client | Notifications, live SLA breach alerts, presence |
| Component workshop | Storybook | Shared UI kit is developed and visually regression-tested in isolation |
| Icons | Lucide React | Consistent stroke weight, works well with the skeuomorphic bevel treatment |

---

## 3. Design System

### 3.1 Color System

Three core families, each expressed as a full 10-step scale so the UI has room for depth, hierarchy, and the layered highlights/shadows skeuomorphism needs — not just one flat hex per role.

**Blue — Trust / Security / Primary Actions / Communication**

| Token | Hex | Usage |
|---|---|---|
| `--blue-50` | `#EAF2FF` | Selected-row tint, hover backgrounds |
| `--blue-100` | `#D3E4FF` | Info banners, badge backgrounds |
| `--blue-200` | `#A6C8FF` | Chart secondary series |
| `--blue-300` | `#78ABFF` | Icon fills on light surfaces |
| `--blue-400` | `#4A8DFF` | Hover state of primary elements |
| `--blue-500` | `#2563EB` | **Primary brand / primary buttons / links / active nav** |
| `--blue-600` | `#1D4ED8` | Primary button pressed state |
| `--blue-700` | `#1E40AF` | Header/sidebar deep surface |
| `--blue-800` | `#1B3480` | Dark-surface text on blue-50 |
| `--blue-900` | `#13245B` | Super Admin panel accent (highest trust tier) |

**Green — Growth / Revenue / Positive Momentum**

| Token | Hex | Usage |
|---|---|---|
| `--green-50` | `#E8FBF1` | "Won" row background, positive-delta chip background |
| `--green-100` | `#CDF6E1` | Success toast background |
| `--green-200` | `#9AECC3` | Progress bar fill (low-emphasis) |
| `--green-300` | `#67E0A5` | Pipeline "Won" stage marker |
| `--green-400` | `#38CE88` | Hover on success actions |
| `--green-500` | `#10B981` | **"Deal Won," revenue KPIs, positive forecast, success buttons** |
| `--green-600` | `#059669` | Success button pressed state |
| `--green-700` | `#047857` | Revenue chart primary series |
| `--green-800` | `#065F46` | Text on green-50/100 backgrounds |
| `--green-900` | `#03362A` | Finance panel deep accent |

**Neutral — Structure / Readability / Base Canvas**

| Token | Hex | Usage |
|---|---|---|
| `--neutral-0` | `#FFFFFF` | Card surfaces, raised elements |
| `--neutral-50` | `#F7F8FA` | App canvas / page background |
| `--neutral-100` | `#EEF1F4` | Sunken surfaces (skeuomorphic inset base) |
| `--neutral-200` | `#E1E5EA` | Dividers, table borders |
| `--neutral-300` | `#CBD2D9` | Disabled borders |
| `--neutral-400` | `#98A2AE` | Placeholder text, inactive icons |
| `--neutral-500` | `#6B7684` | Secondary body text |
| `--neutral-600` | `#4B5563` | Primary body text (dark mode surfaces) |
| `--neutral-700` | `#333D4C` | Headings |
| `--neutral-800` | `#1F2733` | Sidebar/topbar dark surface |
| `--neutral-900` | `#11161D` | Highest-contrast text, dark-mode canvas |

**Semantic accents** (small, deliberately outside the core 3-family system — used only for state, never for branding):

| Token | Hex | Usage |
|---|---|---|
| `--amber-500` | `#F59E0B` | SLA at-risk, follow-up due soon, warnings |
| `--rose-500` | `#E11D48` | SLA breached, overdue tasks, "Lost" deals, destructive actions |
| `--violet-500` | `#7C5CFC` | AI-generated content marker (kept out of blue/green so AI suggestions are never mistaken for confirmed CRM data) |

**60/30/10 application rule:**
- **60% neutral** (canvas, cards, table backgrounds) — keeps dense sales data legible.
- **30% blue** (navigation, primary actions, headers, links, focus states).
- **10% green + semantic accents** (KPI deltas, "Won" states, alerts) — used sparingly so it stays meaningful. A green number should always mean "this went well"; overusing it dilutes that signal.

### 3.2 Skeuomorphic Elevation System

Modern, restrained skeuomorphism — tactile depth and a believable light source (top-left), not heavy textures or literal wood/leather. Every surface has a defined elevation token; components never invent ad-hoc shadows.

```css
:root {
  /* Light source: top-left. Every raised element gets a light edge (top) 
     and a soft dark cast shadow (bottom-right). Sunken elements invert this. */

  --bevel-light: rgba(255, 255, 255, 0.7);
  --bevel-dark: rgba(17, 22, 29, 0.12);

  /* Raised surfaces — buttons, cards, KPI tiles */
  --elevation-1: 0 1px 0 var(--bevel-light) inset,
                 0 1px 2px rgba(17, 22, 29, 0.06),
                 0 1px 1px rgba(17, 22, 29, 0.04);

  --elevation-2: 0 1px 0 var(--bevel-light) inset,
                 0 4px 10px rgba(17, 22, 29, 0.08),
                 0 2px 4px rgba(17, 22, 29, 0.05);

  --elevation-3: 0 1px 0 var(--bevel-light) inset,
                 0 12px 24px rgba(17, 22, 29, 0.12),
                 0 4px 8px rgba(17, 22, 29, 0.06);
  /* Modals, command bar, slide-over panels */

  /* Sunken surfaces — input fields, search bars, the "well" a KPI number sits in */
  --inset-1: inset 0 1px 2px rgba(17, 22, 29, 0.10),
             inset 0 -1px 0 var(--bevel-light);

  /* Pressed / active state — buttons, selected pipeline stage */
  --pressed: inset 0 2px 4px rgba(17, 22, 29, 0.16);

  /* Focus ring — accessibility, always blue-500, never removed */
  --focus-ring: 0 0 0 3px rgba(37, 99, 235, 0.35);

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-pill: 999px;
}
```

**Component-level rules:**
- **Buttons (primary):** subtle top-to-bottom gradient (`blue-400 → blue-500`), `--elevation-1` at rest, `--pressed` + gradient reversed on `:active` — mimics a physical key depressing.
- **Cards / KPI tiles:** `neutral-0` surface, `--elevation-2`, 1px `neutral-200` border for crisp edge definition under the soft shadow.
- **Input fields:** `neutral-100` surface, `--inset-1` — reads as a "slot" the value sits inside, reinforcing that it's editable.
- **Status pills / badges:** small radial highlight at 30% opacity on the top edge, semantic-colored background, never shadowed (they're flat labels, not physical objects).
- **Slide-over panels & modals:** `--elevation-3`, slight scale-in + shadow-grow on enter to sell physical lift off the page.
- **Kanban pipeline cards:** `--elevation-1` at rest, lift to `--elevation-2` + 2° rotation on drag — this is the one place a slightly stronger physical metaphor is justified (the doc's #10 module explicitly calls this out as a Kanban surface).

Dark surfaces (sidebar, topbar) invert the light source subtly — bevel light becomes `rgba(255,255,255,0.06)` and shadows deepen — so the effect reads as consistent material, not a lighting bug.

### 3.3 Typography

| Role | Typeface | Weight/Size |
|---|---|---|
| Display (dashboard headers, empty states) | Inter (or "Inter Display" if licensed) | 600, 24–32px |
| UI / body | Inter | 400/500, 13–15px |
| Numeric / data (KPIs, currency, tables) | Inter with `font-variant-numeric: tabular-nums` | 500–700 | 

Tabular numerals are mandatory anywhere numbers stack vertically (deal tables, revenue reports) so digits align — a small detail that reads as "production-grade" rather than templated.

### 3.4 Spacing & Layout Grid

8px base unit (`--space-1: 4px` through `--space-12: 96px`), 12-column responsive grid, sidebar fixed at 264px (72px collapsed), content max-width 1440px with fluid gutters below that.

---

## 4. Component Architecture Philosophy

**Hybrid model:** atomic primitives + feature-sliced modules, connected only through public barrel exports.

```
Atoms (ui/)          →  Button, Input, Badge, Avatar, Icon, Switch
Patterns (patterns/) →  KPICard, StatusPill, DataTable, Timeline, SlideOver, CommandBar
Layout (layout/)      →  Sidebar, TopBar, PageShell, RoleLayout
Features (features/)  →  leads/, deals/, calls/, proposals/, ai/, reports/ ...
```

**Hard rule:** a feature module may import from `ui/`, `patterns/`, and `layout/` — but **no feature module may import directly from another feature module's internals.** If `deals/` needs something from `leads/`, it imports it from `leads/index.ts` (the public export), never `leads/components/LeadRow.tsx` directly. This is what makes "one component, reused everywhere" actually hold up over time instead of decaying into tangled imports.

Every shared component is:
- **Prop-driven, not context-coupled** — a `StatusPill` doesn't know it's rendering a lead vs. a deal vs. an invoice; it just receives `variant` and `label`.
- **Self-contained** — owns its own loading/empty/error visual states so a consuming page doesn't have to reimplement them.
- **Documented in Storybook** with every variant, so a developer building the Invoices module can see the same `StatusPill` used in Leads without reading its source.

---

## 5. Fault Isolation Strategy

This directly answers your requirement that "one component failure doesn't affect the others." It's enforced at three nested levels:

```
Route Boundary  (per top-level route: /leads, /deals, /reports)
   └── Module Boundary  (per major page section, e.g. "Pipeline" tab)
         └── Widget Boundary  (per independent card: AI Summary, Activity Timeline, KPI row)
```

**Why three levels, not one:** a single app-wide error boundary is not enough — the doc requires that an AI summary failure (Section 14) never blocks the sales rep from calling the lead (Section 9). Each independently-fetching widget gets its own boundary + its own React Query hook, so:

- If the **AI Summary widget** throws or its query fails → only that card shows a compact retry state. Call button, timeline, and tasks keep working.
- If an entire **module** (e.g., the Reports charting library) crashes → the rest of the dashboard (sidebar, nav, other tabs) is unaffected.
- If something catastrophic happens at the **route** level → the user sees a full-page recovery screen with a link back to a known-good route, not a blank white screen.

See §11.1 for the reference implementation (`WidgetBoundary`, used on every independent card across every module).

**Supporting rules:**
- Each widget fetches its **own** data via its own `useQuery` key — never one giant page-level fetch-everything call. A slow/broken endpoint for one card can't stall the rest of the page.
- No widget throws during render for expected states (empty, loading, permission-denied) — only genuine unexpected errors reach the boundary. Expected states are handled explicitly inside the component.
- Third-party/AI-generated content is always rendered inside its own boundary + visually flagged (violet accent, "AI draft" label), so if the model returns malformed content, it's contained to a clearly-labeled zone.

---

## 6. Folder Structure

```
frontend/
├── src/
│   ├── app/                        # App shell, providers, root router
│   │   ├── providers/               # QueryClientProvider, ThemeProvider, SocketProvider
│   │   ├── router.tsx                # Route tree w/ per-route errorElement + lazy()
│   │   └── App.tsx
│   │
│   ├── design-system/                # Design tokens — single source of truth
│   │   ├── tokens.css                 # Color, elevation, spacing, radius variables (§3)
│   │   ├── tailwind.tokens.ts          # Same tokens exposed to tailwind.config.ts
│   │   └── theme.ts                    # TS-typed token access for JS-driven styling
│   │
│   ├── components/
│   │   ├── ui/                       # Atoms — Button, Input, Badge, Avatar, Checkbox...
│   │   ├── patterns/                 # Molecules — KPICard, StatusPill, DataTable, Timeline,
│   │   │                              #   SlideOverPanel, CommandBar, EmptyState, ErrorState
│   │   └── system/                   # ErrorBoundary, WidgetBoundary, PermissionGate,
│   │                                  #   AsyncBoundary (Suspense+Query wrapper)
│   │
│   ├── layout/
│   │   ├── PageShell.tsx              # Sidebar + TopBar + content outlet
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx                 # Search/command bar, org switcher, notifications
│   │   └── role-layouts/              # SuperAdminLayout, OrgAdminLayout, SalesRepLayout...
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── leads/
│   │   │   ├── components/            # LeadTable, LeadDetailHeader, LeadScoreBadge...
│   │   │   ├── hooks/                 # useLeads, useLead, useAssignLead
│   │   │   ├── api/                   # leads.api.ts (typed fetch wrappers)
│   │   │   ├── types.ts
│   │   │   └── index.ts               # Public exports ONLY — enforced boundary (§4)
│   │   ├── contacts/
│   │   ├── companies/
│   │   ├── pipeline/
│   │   ├── deals/
│   │   ├── calls/
│   │   ├── inbox/                     # Unified WhatsApp/SMS/Email
│   │   ├── tasks/
│   │   ├── meetings/
│   │   ├── proposals/
│   │   ├── invoices/
│   │   ├── reports/
│   │   ├── ai/                        # AI Center — summary, next-best-action, drafts
│   │   ├── automation/                # Workflow builder
│   │   ├── notifications/
│   │   ├── subscription/              # SaaS plan/usage/billing (Org Admin)
│   │   └── admin/                     # Super Admin — orgs, platform health
│   │
│   ├── hooks/                        # Cross-cutting hooks: usePermission, useOrg, useDebounce
│   ├── stores/                       # Zustand stores: uiStore, sessionStore
│   ├── lib/                          # apiClient (axios/fetch + interceptors), socket, queryClient
│   ├── schemas/                      # Zod schemas shared with react-hook-form
│   ├── utils/                        # formatters (currency, date), permission helpers
│   └── types/                        # Global types generated from OpenAPI contract
│
├── .storybook/
├── tests/
└── tailwind.config.ts
```

This mirrors the backend's `modules/` structure module-for-module (§34 of the product doc), so a developer working full-stack on "Proposals" finds matching folder names on both sides.

---

## 7. Shared UI Kit — Reusable Component Catalog

Every row below is built **once** and imported everywhere that concept appears across the product (Leads, Deals, Calls, Proposals, Invoices all reuse the same primitives instead of each module growing its own variant).

| Component | Used by | Key props |
|---|---|---|
| `KPICard` | Dashboards, Reports, module headers | `label, value, delta, deltaDirection, icon, accent` |
| `StatusPill` | Lead status, deal stage, invoice status, call disposition | `variant: 'neutral'\|'info'\|'success'\|'warning'\|'danger'\|'ai', label` |
| `DataTable` | Leads, Deals, Contacts, Companies, Invoices, Reports | `columns, data, filters, savedViews, bulkActions, isLoading, error` |
| `Timeline` | Lead/Contact/Deal activity feed | `events[], groupByDay` |
| `SlideOverPanel` | Lead detail, Deal detail, Contact detail | `isOpen, onClose, title, children` |
| `KanbanBoard` / `KanbanCard` | Pipeline module | `stages[], cards[], onCardMove` |
| `CommandBar` | Global top search | `onSearch, recentItems, quickActions` |
| `PermissionGate` | Everywhere a permission key applies | `permission: string, fallback?, children` |
| `AIContentCard` | AI Summary, Next Best Action, drafts | `content, status: 'suggested'\|'approved', onApprove, onDiscard` |
| `EmptyState` / `ErrorState` | Every list/table/widget | `title, description, action?` |
| `WidgetBoundary` | Every independently-loading card (§5) | `name, fallback?, children` |
| `Avatar`, `Badge`, `Button`, `Input`, `Select`, `DatePicker`, `Textarea`, `Switch`, `Tooltip`, `Toast` | Global | standard atoms |

---

## 8. Feature Module Anatomy (example: `features/leads`)

```
leads/
├── components/
│   ├── LeadTable.tsx            # Wraps <DataTable> with lead-specific columns
│   ├── LeadDetailHeader.tsx      # Name, status pill, score, owner, call/message buttons
│   ├── LeadScoreBadge.tsx        # Thin wrapper over <StatusPill variant="ai">
│   ├── LeadTimeline.tsx          # Wraps <Timeline> with lead-event formatting
│   └── LeadAISummaryCard.tsx     # Wraps <WidgetBoundary><AIContentCard/></WidgetBoundary>
├── hooks/
│   ├── useLeads.ts               # useQuery(['leads', filters])
│   ├── useLead.ts                # useQuery(['lead', id])
│   ├── useAssignLead.ts          # useMutation + optimistic update
│   └── useLeadAISummary.ts       # Independent query — isolated per §5
├── api/leads.api.ts              # typed fetch functions hitting /api/v1/leads
├── types.ts                      # Lead, LeadStatus, LeadSource...
└── index.ts                      # export { LeadTable, LeadDetailHeader, useLeads, ... }
```

The **Lead Detail Page** (matching §19 of the product doc's wireframe) then composes entirely from these + shared patterns — no new one-off UI is invented at the page level:

```
LeadDetailPage
├── PageShell
├── LeadDetailHeader                     (leads/)
├── grid
│   ├── ContactCompanyCard                (leads/, reuses <Card>, <Avatar>)
│   └── WidgetBoundary → LeadAISummaryCard (ai/, isolated — §5)
├── WidgetBoundary → LeadTimeline          (leads/, reuses <Timeline>)
└── Tabs: Tasks | Meetings | Deals | Documents  (each tab = its own WidgetBoundary)
```

---

## 9. State, Data-Fetching & Permissions Layer

- **Server state:** every feature hook is a thin TanStack Query wrapper. Query keys are namespaced (`['leads', 'list', filters]`, `['leads', 'detail', id]`) so cache invalidation after a mutation (e.g., reassigning a lead) is precise.
- **Mutations** use optimistic updates where safe (status change, tag add) and always roll back on error — paired with a toast, never a silent failure.
- **Permissions:** the API returns a `permissions: string[]` array on session load (matches backend's `lead.view`, `lead.edit`, `billing.manage` keys). This is stored once in `sessionStore` (Zustand) and read via `usePermission('lead.export')` — **no component ever checks `user.role === 'admin'` directly.**
- **Tenant context:** active `organizationId` lives in `sessionStore`; the API client attaches it automatically via request interceptor. Components never pass `organizationId` manually — this mirrors the backend rule that the browser is never trusted with tenant identity.
- **Realtime:** Socket.io events (SLA breach, new lead assigned, deal won) update the React Query cache directly via `queryClient.setQueryData`, so live updates don't require polling.

---

## 10. Routing & Role-Based Layout Shells

Each role from §4 of the product doc gets a layout shell, not a conditional inside one shell:

```
/login, /signup, /verify                     → AuthLayout
/app/*                                        → RoleLayout (resolved from session)
    ├── SuperAdminLayout    → /admin/organizations, /admin/platform-health, /admin/support
    ├── OrgAdminLayout      → /settings, /team, /integrations, /billing  (+ full sales suite)
    ├── SalesManagerLayout  → /pipeline, /team-performance, /approvals   (+ full sales suite)
    ├── SalesRepLayout      → /my-leads, /my-tasks, /my-deals, /inbox
    ├── TelecallerLayout    → /call-queue  (minimal, high-density, click-to-call first)
    └── FinanceViewerLayout → /invoices, /payments, /reports (read-only)
```

Routes are code-split per module (`React.lazy`) with a route-level `errorElement`, so navigating into a broken module never breaks the sidebar/topbar shell around it (§5, outer boundary).

---

## 11. Reference Implementations

### 11.1 `WidgetBoundary` — the core resilience primitive

```tsx
// src/components/system/WidgetBoundary.tsx
import { Component, ReactNode, Suspense } from 'react';
import { ErrorState } from '@/components/patterns/ErrorState';
import { Skeleton } from '@/components/ui/Skeleton';

interface Props {
  name: string;           // used for logging/telemetry, e.g. "lead-ai-summary"
  fallback?: ReactNode;    // custom empty/error visual, optional
  children: ReactNode;
}
interface State { hasError: boolean }

class BoundaryCatcher extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Report to monitoring with the widget name — isolates which card failed
    console.error(`[WidgetBoundary:${this.props.name}]`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <ErrorState
            title="This section couldn't load"
            description="The rest of the page is unaffected — you can try again."
            action={{ label: 'Retry', onClick: () => this.setState({ hasError: false }) }}
          />
        )
      );
    }
    return this.props.children;
  }
}

/** Combines error catching + async loading isolation for one independent card. */
export function WidgetBoundary({ name, fallback, children }: Props) {
  return (
    <BoundaryCatcher name={name} fallback={fallback}>
      <Suspense fallback={<Skeleton variant="card" />}>{children}</Suspense>
    </BoundaryCatcher>
  );
}
```

Usage — every independently-loading card on every page is wrapped identically:

```tsx
<WidgetBoundary name="lead-ai-summary">
  <LeadAISummaryCard leadId={lead.id} />
</WidgetBoundary>

<WidgetBoundary name="lead-timeline">
  <LeadTimeline leadId={lead.id} />
</WidgetBoundary>
```

### 11.2 `PermissionGate` — server-driven, never role-name-driven

```tsx
// src/components/system/PermissionGate.tsx
import { ReactNode } from 'react';
import { useSessionStore } from '@/stores/sessionStore';

interface Props {
  permission: string;      // e.g. "lead.export", "billing.manage"
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({ permission, fallback = null, children }: Props) {
  const permissions = useSessionStore((s) => s.permissions);
  if (!permissions.includes(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
```

```tsx
<PermissionGate permission="lead.export">
  <Button variant="secondary" icon="download">Export</Button>
</PermissionGate>
```

### 11.3 `KPICard` — one component, used on every dashboard/report

```tsx
// src/components/patterns/KPICard.tsx
import { cn } from '@/utils/cn';

interface KPICardProps {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'flat';
  accent?: 'blue' | 'green' | 'neutral';
}

export function KPICard({ label, value, delta, deltaDirection = 'flat', accent = 'blue' }: KPICardProps) {
  return (
    <div className="kpi-card" data-accent={accent}>
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value">{value}</span>
      {delta && (
        <span className={cn('kpi-card__delta', `kpi-card__delta--${deltaDirection}`)}>
          {deltaDirection === 'up' ? '↑' : deltaDirection === 'down' ? '↓' : '→'} {delta}
        </span>
      )}
    </div>
  );
}
```

```css
.kpi-card {
  background: var(--neutral-0);
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
  box-shadow: var(--elevation-2);
  padding: var(--space-5);
}
.kpi-card__value { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 28px; }
.kpi-card__delta--up   { color: var(--green-700); }
.kpi-card__delta--down { color: var(--rose-500); }
```

Reused verbatim for "New Leads This Week" (blue), "Revenue Won" (green), "SLA Breaches" (rose via a custom accent) — one component, every dashboard.

### 11.4 `StatusPill` — dynamic, dumb, and everywhere

```tsx
// src/components/patterns/StatusPill.tsx
type Variant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'ai';

const VARIANT_STYLES: Record<Variant, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  info:    'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger:  'bg-rose-100 text-rose-700',
  ai:      'bg-violet-100 text-violet-700',
};

export function StatusPill({ label, variant = 'neutral' }: { label: string; variant?: Variant }) {
  return <span className={`status-pill ${VARIANT_STYLES[variant]}`}>{label}</span>;
}
```

A `LeadStatusBadge`, `DealStageBadge`, and `InvoiceStatusBadge` each become a **5-line wrapper** mapping their domain enum to a `variant` — the actual pill markup/styling is written once.

---

## 12. Performance Strategy

- **Route + module-level code splitting** via `React.lazy` — Reports, AI Center, and Automation (chart- and canvas-heavy) are never in the initial bundle.
- **Per-widget queries** (§5, §9) double as a performance win: nothing waits on the slowest card.
- **Virtualized tables** (TanStack Virtual) for lead/deal lists once row count is large.
- **Debounced search/filter** inputs feeding the command bar and data tables.
- **Memoized selectors** for derived pipeline/report data (`useMemo`, `React.memo` on pure presentational rows).
- **Optimistic UI** for high-frequency actions (status change, task complete) so the interface never feels blocked on network latency.

---

## 13. Accessibility Standards

- WCAG 2.1 AA contrast minimum on all text/background pairs in §3.1 — verified against `neutral-50` canvas and `neutral-0` cards specifically, since skeuomorphic shadows can visually reduce perceived contrast even when the hex values pass.
- Visible focus ring (`--focus-ring`) on every interactive element, never removed for aesthetics.
- All icon-only buttons carry `aria-label`.
- Kanban drag-and-drop has a keyboard-operable equivalent (move-to-stage menu) for the Pipeline module.
- `prefers-reduced-motion` respected — card lift/drag animations and page transitions degrade to instant state changes.

---

## 14. Testing Strategy

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest + React Testing Library | Shared `ui/`/`patterns/` components, hooks |
| Visual | Storybook + Chromatic (or equivalent) | Every shared component variant, skeuomorphic states (rest/hover/pressed) |
| Integration | RTL + MSW (mocked API) | Feature modules against a mocked `/api/v1/*` contract |
| E2E | Playwright | Mirrors backend §28: signup → lead → call → follow-up → deal → payment |
| Permission/role | Playwright, parametrized per role | Every role's layout shell renders only its permitted routes/actions |
| Accessibility | axe-core in CI | Automated contrast/ARIA checks on the shared kit |

---

## 15. Conventions & Implementation Checklist

**Conventions**
- Component files: `PascalCase.tsx`; hooks: `useCamelCase.ts`; one component per file.
- Every feature module's only public surface is its `index.ts` barrel.
- No inline hex colors or shadow values in components — always the CSS variables from `design-system/tokens.css`.
- No component reads `user.role` — only `usePermission()`.
- Every card that fetches its own data is wrapped in `WidgetBoundary`.

**Checklist**
- [ ] `design-system/tokens.css` implemented and wired into `tailwind.config.ts`
- [ ] `ui/` atom library built + documented in Storybook
- [ ] `patterns/` library built (`KPICard`, `StatusPill`, `DataTable`, `Timeline`, `SlideOverPanel`, `WidgetBoundary`, `PermissionGate`, `AIContentCard`)
- [ ] Role-based layout shells implemented for all 7 roles
- [ ] Route tree with per-route `errorElement` + `React.lazy` code splitting
- [ ] `sessionStore` wired to backend's `permissions[]` + `organizationId`
- [ ] Feature modules scaffolded per §6/§8 for every module in product doc §5
- [ ] Every independently-fetching card wrapped in `WidgetBoundary` (audit pass before launch)
- [ ] Accessibility pass (contrast, focus, reduced-motion, keyboard Kanban) before UAT
- [ ] Storybook visual regression baseline captured before first release
