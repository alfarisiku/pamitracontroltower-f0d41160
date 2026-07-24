## Data-only EPC rebuild — final execution plan

Zero code, zero schema changes. Only DELETE + INSERT/UPDATE on data. Existing project IDs preserved (photos already uploaded stay attached); `[Example]` prefix removed; `project_code` retained. 6 projects total (portfolio designed for the required mixes).

### Portfolio design — one story per project

| Code | Renamed | Client | Type | Phase focus | Schedule health | Financial health | Contract structure |
|---|---|---|---|---|---|---|---|
| PMT-001 | Terminal Terpadu Palaran (Samarinda) | Pelindo Multi Terminal | Multi-tank terminal | Active Construction | Slight delay | Low margin | **KSO** (Lead: Pamitra 60% / Partner: Wijaya Karya 40%) + **1 addendum** (scope add loading arm) |
| PMT-002 | Terminal LPG Kolaka | Pertamina Patra Niaga | LPG bullet + jetty | Procurement-intensive → early Construction | Major delay (vendor+shipping) | Cost overrun | Contract + **2 addendums** (scope + time extension) |
| PMT-003 | Jetty IT Manggis (Bali) | Pertamina Patra Niaga | Marine jetty | Commissioning → Handover (closed) | Recovered after delay | Healthy margin | Contract only |
| PMT-004 | Terminal BBM Meksip (Sorong) | Pertamina Patra Niaga | Fuel terminal | Completed | Finished ahead of schedule | Healthy margin | Contract + 1 addendum (minor CO) |
| PERAK-001 | SPK-1 Repair Tank T-43/T-47/T-53 IT Surabaya | Pertamina Patra Niaga | 3-tank repair | Active Construction | On schedule | Healthy margin | Contract only |
| SPK-2 | Perbaikan Tangki T-63 IT Surabaya | Pertamina Patra Niaga | Single tank repair | Active Engineering → early Procurement | On schedule (early) | Healthy margin | Contract only |

Additional new project to hit "Planning" + "KSO+Addendum" + Loss-making mix:

| Code | Name | Client | Type | Phase | Schedule | Finance | Contract |
|---|---|---|---|---|---|---|---|
| PMT-005 | Storage Tank Farm Bontang | Pupuk Kaltim | Ammonia storage 2×5,000 m³ | Planning / FEED | On schedule | TBD (still planning) | **KSO + 1 addendum** (Lead: Pamitra 55% / Partner: Rekayasa Industri 45%) |
| PMT-006 | Retrofit Loading Facility Cilacap | Pertamina Patra Niaga | Loading arm + pipe rework | Active Construction | Major delay | **Loss-making** | Contract + 3 addendums (repeated scope revs) |

Final portfolio = 8 projects, covering every required mix without duplication.

### WBS philosophies (each different)
- PMT-001: **Area-based** (Berth, Tank Farm, Utility, Building, Fire System, E&I, Loading Facility)
- PMT-002: **Facility-based** (Bullet Tanks, Jetty, Pipeline, Compressor, Flare, F&G, MC)
- PMT-003: **Discipline-based marine** (Marine Pile, Deck, Loading Arm, Fender & Mooring, Piping, E&I, PAC)
- PMT-004: **EPCC linear** (Engineering, Procurement, Construction, Commissioning, Handover)
- PERAK-001: **Tank-by-tank** (T-43, T-47, T-53 each with Civil→Erection→Piping→Painting→Hydrotest)
- SPK-2: **Discipline** (Civil, Mechanical, Piping, Painting, Test)
- PMT-005: **Engineering → Procurement → Construction → Commissioning** (early stage light)
- PMT-006: **Zone-based** (Zone A jetty, Zone B pipe rack, Zone C loading, Utilities)

Level 1 sums to 100.00; every Level 2 group sums to 100.00 of its parent. L3 subtasks populated for larger projects (PMT-001, 002, 004, 006).

### S-Curve behavior (weekly, full duration)
Logistic shape with EPC-realistic transitions: flat-start (Eng+Mob) → early Procurement ramp → sharp Construction acceleration → Commissioning tail. Actual truncated at project's reporting cut-off, deviating per the assigned schedule-health archetype. Addendum projects get **layered baselines** stamped at the addendum approval week; period labels shared with finance/monthly rollups.

### Cut-off convention
- Execution projects: actuals through **week ending 2026-07-17** (Fri before "today" 2026-07-24).
- PMT-003 closed: full curve + retention release.
- PMT-004 completed: full curve, PAC done.
- PMT-005 planning: baseline only, actual ≈ 3% (kick-off).

### Cross-module consistency rules enforced
1. `progress` = milestone weight-completion = last actual S-Curve %.
2. `spent` = Σ cash-out actual through cut-off.
3. PO totals ⊆ Material cash-outs; procurement delivery date drives Construction start weeks on affected WBS items.
4. Delayed procurement → S-Curve dip → Weekly Report narrative → Risk register entry (Vendor/Shipping Delay) → shifted cash-out spike.
5. Addendum event → new baseline row (S-Curve) + scope-add WBS lines + extra PO(s) + cash-in claim + explicit mention in that week's Weekly Report.
6. Loss project (PMT-006): cumulative cash-out > cash-in at close; Risk register flags Cash Flow Constraint; Weekly Reports escalate to management.
7. Media stage-matched: early projects show earthwork/foundation; late/closed show hydrotest/PAC.

### Staged migration order (each = one `insert` tool call, awaits your ACK)

Because the `insert` tool runs a single SQL batch and doesn't require approval per call, I'll still pause after each stage to show you a verification query. Stages:

- **Stage A — Portfolio reset**: DELETE cascaded rows for the 6 existing projects (photos preserved by not touching `project_photos`); INSERT PMT-005 and PMT-006 headers; UPDATE all 8 project headers (contract_value, RAP, margin, tkdn, dates, map coords, description, KSO metadata inside description).
- **Stage B — WBS for all 8 projects** (work_areas + work_items + sub_tasks).
- **Stage C — Milestones for all 8 projects**.
- **Stage D — S-Curve baselines + Actual** (includes KSO curves and addendum baselines).
- **Stage E — Procurement + PO lifecycle**.
- **Stage F — Finance entries + monthly_budgets**.
- **Stage G — Risk register (project_alerts)**.
- **Stage H — Weekly reports + Manpower logs + Addendums**.
- **Stage I — Recompute rollups** (`projects.progress`, `spent`, ensure header numbers match module data) + spot-check verification.

Photos already uploaded stay; I won't touch `project_photos` binaries. If you want me to seed placeholder photo rows for the new projects PMT-005/PMT-006 or clean out stale weekly slots, tell me now.

### Please confirm to proceed
1. **OK to add PMT-005 (Planning/KSO+Addendum) and PMT-006 (Loss/Construction/3 addendums)** so the portfolio covers every mix from your spec? (Otherwise I compress everything into the existing 6 and drop the Planning + Loss variants.)
2. **OK to strip `[Example]` prefix** from PMT-001..004 names?
3. **Cut-off = 2026-07-17** for actuals on all execution projects — confirm?
4. **Photos**: leave existing binaries untouched, do not seed new photo rows for PMT-005/006 — confirm?

On your "go" I start Stage A.