
## 1. S-Curve — Period Comparison Table

In `src/pages/ProjectDetail.tsx` (S-Curve tab), add a table below the S-Curve chart card showing:
- **Current period** (row 1)
- **3 previous periods**

Columns: Period | Planned % | Actual % | Deviasi (Actual − Plan, colored red/green)

Data source: existing `s_curve_data` sorted by period. Take the most recent period ≤ today plus the three before it.

## 2. Remove Sector Categories

Drop the sector concept entirely (Oil & Gas / Infrastructure / Mining / Industrial / etc). Only **Status** and **Production** (I–IV) remain.

Files:
- `src/components/data-entry/ProjectCrudTab.tsx` — remove the `category` dropdown/field.
- `src/pages/ProjectSummary.tsx` — remove the category filter chip row; keep status + production filters.
- `src/pages/Index.tsx`, `src/pages/WarRoom.tsx`, `ProjectTable.tsx`, `ProjectOverviewModal.tsx` — remove any UI that displays or filters by category.
- Do not drop the DB column (keeps historic data safe); just ignore it in the UI.

## 3. Role-Based Access Control

Map the 3 requested tiers onto existing roles in `AuthContext`:

| Requested tier | Internal role | Capability |
|---|---|---|
| Administrator | `admin` | Everything, Data Entry, Account Manager, all projects |
| Project Admin | `team` | Only assigned projects (via `user_project_assignments`); weekly CRUD on those projects |
| Public | `client` | Overview + Project Summary + Project Detail (limited); all financial + risk/issue/report data hidden |

### Wiring

- **Re-enable auth gate.** Wrap routes in `src/App.tsx` with `AuthProvider` + `ProtectedRoute`. Restore `/login` and `/pending`. Root layout renders login if no session.
- **Sidebar** (`src/components/dashboard/Sidebar.tsx`): filter menu by role.
  - `admin`: all items.
  - `team` (Project Admin): Overview, Project Summary (assigned only), Schedule, Data Entry, Activity Log, User Guide.
  - `client` (Public): Overview, Project Summary, User Guide.
- **Project list scoping** (`useProjects` hook + `ProjectSummary`): if role is `team`, filter to `assignedProjectIds`. If `client`, show all but read-only.
- **ProjectDetail public-mode**: when `role === "client"`, hide the tabs `Finance`, `S-Curve`, `Cost`, `Risk`, `Weekly Report`, `Data Entry` links; hide Contract/RAP/PO/Cost/Cashflow KPIs in Overview + Health cards; keep progress %, location, photos, milestones (non-financial), general description.
- **Data Entry** (`/data-entry`): admin + team (scoped to assigned projects). `team` sees the assigned-projects picker only.
- **Account Manager** (`/account-manager`): admin only. Enable assign-project UI so admin can attach projects to team users via `user_project_assignments`.
- Add a small `useCanSeeFinance()` helper (`role !== 'client'`) used across finance components (`ProjectDetail` finance tab, `Finance.tsx`, KPI cards).

### Seed accounts (already exist via `seed-accounts` function)

Add two more test users through Account Manager UI:
- `projectadmin@pamitra.co.id` / `project123` → role `team`, assigned to PMT-001.
- `public@pamitra.co.id` / `public123` → role `client`.

## Technical notes

- Header/Sidebar labels: rename `Project Team` → `Project Admin`, `War Room` role label → `Public`.
- `ProtectedRoute` already handles pending + no-project states; reuse as-is.
- No schema migration needed — `user_roles`, `user_project_assignments`, `profiles.status` already exist.
- Keep `defaultAuthContext` fallback in `useAuth()` removed inside protected routes so unauthenticated users cannot slip through.
