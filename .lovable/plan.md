## 1. Terminologi Status & Phase (global)

**Status baru** (ganti `on-track/at-risk/delayed/completed`):
- `planning` — Proyek baru, tahap persiapan/perencanaan
- `execution` — Proyek sedang berjalan
- `on-hold` — Proyek dihentikan sementara
- `completed` — Pekerjaan selesai, sisa retensi/denda
- `closed` — Administrasi, serah terima, close-out selesai

**Phase baru** (ganti `Engineering/Procurement/Construction/Commissioning`):
- `Production I`, `Production II`, `Production III`, `Production IV`

**Migrasi data existing:** randomize 15 proyek dummy ke 5 status & 4 phase baru supaya distribusi kelihatan bervariasi untuk demo.

**File yang diubah:** `src/lib/supabase.ts` (STATUS_CONFIG, PHASE_CONFIG, tipe), semua badge/filter/chart/color mapping di `ProjectTable`, `ProjectSummary`, `WarRoom`, `Index`, `IndonesiaMap`, `ProjectOverviewModal`, `ProjectCrudTab`, `RegularUpdateTab`, `RiskMonitoring`, `Reporting`, `Schedule`, `PhaseChart`, `MilestonesEditor`, `OverallSummary`, `mapUtils`, `useProjects`, plus DB migration ubah kolom `projects.status` & `projects.phase` (drop check constraint lama, isi enum baru) + UPDATE randomize.

## 2. Project Detail — Finance Tab Overhaul

**A. Cashflow & Progress → Bar Chart Bipolar**
- Recharts `BarChart` dengan sumbu Y ± (cash-in di atas, cash-out di bawah sebagai nilai negatif).
- 4 series per bulan: `Plan Cash In`, `Actual Cash In` (positif), `Plan Cash Out`, `Actual Cash Out` (negatif).
- Data dari `finance_entries` agregat bulanan (existing) + plan dari `monthly_budgets`.

**B. Cost Breakdown → Tabel + Grafik per Kategori**
- 10 kategori existing (`finance_entries.category`): Project Management, Material, Jasa/Subcon, Equipment Rental, Logistics, Overhead, Permits, Insurance, Contingency, Others.
- Tabel: kategori · RAP · Actual · Variance · % consumed.
- Horizontal bar chart (RAP vs Actual per kategori).

**C. Margin Calculation → hilangkan**, ganti dengan **Progress vs Cashflow Summary**:
- Tabel & area/composed chart per periode (bulan): `Progress Plan %`, `Progress Actual %`, `Total Cash In`, `Total Cash Out`.
- Dummy data disuntik lewat `finance_entries` + `s_curve_data` supaya kelihatan real.

**File:** `src/pages/ProjectDetail.tsx` (tab Finance), komponen baru `src/components/dashboard/CashflowBipolarChart.tsx`, `CostBreakdownByCategory.tsx`, `ProgressCashflowSummary.tsx`. Purchase Order table sudah dihapus di iterasi sebelumnya.

## 3. WBS EPC Phase Filter Berfungsi

- Di `ProjectDetail` tab WBS, tombol filter `Production I/II/III/IV/All` yang benar-benar memfilter `work_items` berdasarkan kolom `epcc_category`.
- Kolom `epcc_category` di `work_items` sudah ada; tambahkan mapping label baru (Engineering→Production I, dst.) atau ganti nilainya via migration + seed.
- Seed dummy: variasikan `epcc_category` pada work_items existing supaya tiap filter menghasilkan item (sekarang mayoritas kosong).

## 4. Data Entry — Urutan Menu = Project Detail

Urutan Project Detail: Overview → S-Curve → WBS → Finance → Procurement → Risk → Milestones → Manpower → Media → Reports.

Urutan Data Entry baru (samakan): Manage Projects → Quick Update → S-Curve → WBS → Finance & PO → Procurement → Risk → Milestones → Manpower → Media/Photos → Weekly Reports → Addendum → Activity Log.

**File:** `src/pages/DataEntry.tsx` — reorder array tabs.

## 5. Account Manager Berfungsi + Login Opsional

- Kembalikan **route `/login`** + `AuthProvider` di `App.tsx`, tapi rute lain tetap public (tidak dibungkus `ProtectedRoute`).
- Tambah **Login button** di `DashboardHeader` (Sign In / Sign Out toggle).
- **"Ingat saya / Tetap login"** checkbox di halaman Login → set `localStorage` flag; kalau on, `supabase.auth` pakai `persistSession: true` (default) dan tidak auto sign-out. Kalau off, sign-out saat tab ditutup (`persistSession: false`).
- `AccountManager` sudah 90% berfungsi — masalahnya cuma tidak ada user login sehingga `useAuth` return default. Setelah login diaktifkan, fitur approve/reject/assign role/assign project sudah jalan. Perbaiki bug kecil `isSystemUser` logic dan tambahkan tombol "Seed Admin Accounts" yang panggil edge function `seed-accounts` untuk membuat akun admin awal (`admin@pamitra.co.id / admin123`).
- Menu Account Manager di sidebar hanya muncul kalau user login sebagai admin.

**File:** `src/App.tsx` (wrap `AuthProvider`, add `/login`), `src/pages/Login.tsx` (tambah "stay signed in" checkbox), `src/components/dashboard/DashboardHeader.tsx` (auth button), `src/components/dashboard/Sidebar.tsx` (conditional Account Manager), `src/pages/AccountManager.tsx` (seed button + fix isSystemUser).

## 6. Dummy Data Refresh

Satu migration `INSERT`/`UPDATE`:
- Randomize `projects.status` & `projects.phase` ke enum baru (distribusi ~30% execution, 15% planning, 15% on-hold, 25% completed, 15% closed).
- Randomize `work_items.epcc_category` ke Production I–IV.
- Top up `finance_entries` supaya tiap proyek punya 6 bulan data dengan 10 kategori (plan + actual) untuk grafik cost breakdown & cashflow bipolar.

## Teknis Ringkas

- Enum diimplementasi sebagai `TEXT` + CHECK constraint (bukan Postgres enum) supaya migrasi cepat dan chart mapping fleksibel.
- Formatter `formatRupiah` (M/T) & tooltip formula tetap dipakai.
- Semua komponen chart pakai token warna semantic dari `index.css` (tidak hardcode).
- Tidak menyentuh modul Procurement, S-Curve, Milestones yang sudah stabil.

## Diluar Scope (kalau perlu dibahas lanjutan)

- Migrasi role-based route protection penuh (saat ini semua route tetap public, hanya `/account-manager` yang menampilkan konten setelah login).
- Password reset flow (belum diminta).