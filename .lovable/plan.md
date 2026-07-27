## Tujuan
Ubah input Cash In / Cash Out di Finance supaya pakai **periode weekly** (sama dengan Weekly Report), bukan tanggal transaksi bebas. Periodenya di-lock ke S-Curve Baseline lewat `useProjectPeriods` — konsisten dengan Weekly Report, Weekly Photos, dan Quick Weekly Update.

## Perubahan UI — `FinanceEntriesEditor.tsx`

1. **Form Add** (dan edit inline):
   - Ganti field "Transaction Date" (`<input type="date">`) menjadi dropdown **"Periode Weekly"** yang isinya list dari `useProjectPeriods(projectId)`.
   - Label opsi: `W{order} — {period_start} → {period_end}` (contoh: `W7 — 12 Aug → 18 Aug 2025`).
   - Default value = `nextUnfilled` (sama seperti flow Weekly Report).
   - Kalau proyek belum punya baseline S-Curve, tampilkan pesan "Belum ada periode baseline — buat S-Curve dulu di tab S-Curve" dan disable tombol Add.

2. **Simpan ke DB**:
   - `period_date` = `period_end` dari periode terpilih (dipakai sebagai cut-off, konsisten dengan konvensi S-Curve ↔ Finance yang sudah ada di `.lovable/plan.md`).
   - `period_label` = `period_label` periode (mis. `W7`), bukan lagi `monthLabel`. Ini bikin agregasi weekly di chart lebih akurat.
   - `frequency` tetap `"monthly"` (kolom lama, tak dipakai UI) — atau ganti `"weekly"`; saya pilih **`"weekly"`** supaya jujur.

3. **Edit inline row**: sel kolom Date jadi dropdown periode yang sama.

4. **Tampilan tabel transaksi**: kolom "Date" berubah jadi **"Periode"** menampilkan `period_label` + tanggal `period_end` kecil di bawahnya, biar cepat dibaca.

## Yang TIDAK diubah
- Skema `finance_entries` (kolom `period_date` + `period_label` sudah cukup).
- Halaman `/finance` (agregasi weekly/monthly di `Finance.tsx` sudah pakai `period_date`, otomatis ikut).
- Chart & tabel Cashflow di Project Detail (sudah pakai `period_date`).
- Filter Date Range di editor — tetap ada, karena filter berdasarkan `period_date` tetap valid.

## Bagian Teknis
- Import `useProjectPeriods` dari `@/hooks/useProjects` … sebenarnya dari `@/hooks/useProjectPeriods`.
- Hapus helper `periodLabels()` (tak dipakai lagi setelah ganti sumber label).
- Tipe `Form.period_date` diganti jadi `period_id: string` (id row S-Curve); saat submit di-resolve ke `period_end` + `period_label`.

## Pertanyaan konfirmasi
Kalau ada transaksi lama yang `period_label`-nya masih format bulanan (mis. `Aug 2025`), biarkan apa adanya (tidak di-backfill) — hanya entry baru/edit yang pakai label weekly. OK?
