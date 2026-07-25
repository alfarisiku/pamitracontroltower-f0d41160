## Tujuan
Integrasikan data S-Curve dengan Finance (Cash In/Out) melalui **tanggal periode** eksplisit di setiap baris S-Curve, sehingga cut-off, agregasi bulanan, dan overlay grafik selalu sinkron.

## Perubahan Skema (Backend)
Tambah kolom tanggal di tabel `s_curve_data`:
- `period_start` (date) — tanggal mulai periode
- `period_end` (date) — tanggal akhir periode (cut-off)

Kolom nullable dulu supaya data lama tidak rusak; index `(project_id, curve_type, period_end)` untuk join cepat.

## Perubahan Data Entry (S-Curve Editor)
Di `src/components/data-entry/SCurveEditor.tsx`:
- Tambah 2 kolom input tanggal di setiap row: **Period Start** dan **Period End** (pakai shadcn DatePicker).
- Tombol utilitas **"Auto-Generate Weekly"** dan **"Auto-Generate Monthly"**: isi otomatis start/end berdasarkan tanggal mulai project + step 7 hari atau akhir bulan.
- Saat menambah kurva baru (KSO), tanggal ikut disalin dari baseline supaya periode label + tanggal sinkron.
- Validasi: `period_end` harus > `period_start`, tidak overlap dengan periode lain di kurva sama.

## Perubahan Chart (Frontend)
Di `src/components/dashboard/SCurveChart.tsx`:
- Ganti logika `periodLabelToMonthKey` (parse label string) → gunakan `period_end` sebagai sumber kebenaran untuk agregasi Weekly/Monthly.
- Cut-off "Today" pindah ke row dengan `period_end` terbesar yang punya `actual_progress`.

Di `src/pages/ProjectDetail.tsx` (Health tab "Progress vs Cashflow per Periode" + Finance tab):
- Join S-Curve ↔ Finance memakai `period_end` (bucket bulanan). Ganti mapping via `period_label` yang selama ini rapuh.
- Tabel ringkasan periode ikut menampilkan kolom tanggal cut-off.

## Migrasi Data Lama
One-shot backfill: untuk baris S-Curve existing, hitung `period_end` dari `projects.start_date + (period_order * 7 hari)` (weekly) atau end-of-month untuk yang berlabel bulanan. Sisanya biarkan null dan tampil warning "belum ada tanggal — silakan set di Data Entry".

## Bagian Teknis (ringkas)
- Migration: `ALTER TABLE s_curve_data ADD COLUMN period_start date, period_end date; CREATE INDEX ...`
- Regenerasi `src/integrations/supabase/types.ts` otomatis setelah migrasi.
- Update `useSCurveData` hook — tidak perlu perubahan query, cuma tipe.
- Auto-fill logic di editor pakai `date-fns` (`addDays`, `endOfMonth`, `startOfMonth`).

## Yang TIDAK diubah
- UI selain S-Curve editor dan chart.
- Skema finance / procurement / WBS.
- Format tampilan Rupiah.

## Pertanyaan konfirmasi
1. Apakah default granularity periode = **weekly** (Senin–Minggu) atau **monthly** (1–akhir bulan)? Saya asumsikan **weekly** dengan opsi generator monthly.
2. Apakah cukup kolom `period_end` saja (cukup untuk join & cut-off) atau perlu `period_start` juga untuk tampilan range? Saya asumsikan **dua-duanya** untuk fleksibilitas.

Kalau setuju, saya lanjut migrasi + update editor + chart.