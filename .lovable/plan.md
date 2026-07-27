## Tujuan
Data `finance_entries` saat ini masih monthly (label `Jun 2024` dst, `period_date` selalu tanggal 1). Regenerate ulang supaya sinkron dengan periode **weekly S-Curve Baseline** — sama seperti flow input weekly yang sudah dipakai editor.

## Yang dilakukan
1. **Hapus** semua `finance_entries` untuk 8 project existing.
2. **Regenerate** per project berdasarkan periode weekly baseline (`s_curve_data` where `curve_type='baseline'`), dengan aturan realistis EPC di bawah.
3. Frontend/editor **tidak diubah** — dropdown weekly & tabel Periode sudah jalan sejak update kemarin.

## Aturan generasi (per project)

Sumber periode: semua baris baseline `s_curve_data` yang punya `period_start`/`period_end`, urut `period_order`. Kunci: `period_date = period_end`, `period_label = period_label` (mis. `W7`), `frequency = 'weekly'`.

### Cash Out (planning & actual)
- **Total planned cash-out** = `RAP` project.
- Distribusi per periode = proporsi **incremental planned progress** periode itu (`planned[i] - planned[i-1]`) × RAP. Ini bikin kurva cash-out mengikuti kurva-S baseline (front-load engineering ringan, puncak di construction, ekor commissioning).
- 3 kategori per periode (split fixed): `material` 55%, `equipment` 20%, `services` 25%. Skip periode yang share-nya < Rp 5 juta.
- **Actual cash-out** hanya untuk periode yang `actual_progress IS NOT NULL` (≤ cut-off):
  - Distribusi = proporsi **incremental actual progress** × `spent` project (fallback: RAP × (actual_terakhir/100) kalau `spent` kosong).
  - Sedikit volatilitas ±8% per periode (deterministic dari hash `project_id||period_order` supaya reproducible & tidak berubah tiap regenerate).

### Cash In (planning & actual)
- **Total planned cash-in** = `contract_value` project.
- Distribusi milestone-based (payment terms EPC umum), dipetakan ke periode weekly terdekat berdasarkan cumulative planned progress:
  - **DP 20%** — periode pertama (W1).
  - **Progress 25%** — periode saat cum planned ≥ 30%.
  - **Progress 25%** — periode saat cum planned ≥ 60%.
  - **Progress 20%** — periode saat cum planned ≥ 90%.
  - **Retensi 10%** — periode terakhir.
- **Actual cash-in** = sama termin, tapi hanya termin yang periodenya sudah lewat cut-off (`actual_progress IS NOT NULL`). Delay realistis: dicatat 1–2 periode setelah termin planned tercapai (deterministic dari hash).

### Metadata entry
- `entry_kind`: `'planned'` untuk plan; `'actual'` untuk realisasi.
- `direction`: `'in'` / `'out'`.
- `category`: cash-in → `progress_payment` (DP → `down_payment`, retensi → `retention`); cash-out → `material` / `equipment` / `services`.
- `description`: contoh `"Progress payment 25% — W23"`, `"Material W12"`.
- `related_activity`: null.
- `po_id`: null (tidak menyentuh `purchase_orders`).

## Yang TIDAK diubah
- Schema `finance_entries` (kolom sudah cukup).
- Tabel lain: `purchase_orders`, `s_curve_data`, `projects.spent`, dst.
- Kode frontend (editor, chart Finance, table Cashflow di ProjectDetail) — semua sudah baca `period_date` & `period_label`, otomatis ikut.

## Bagian Teknis
- Eksekusi lewat 1 SQL script (DELETE + generate_series/CTE). Dihitung server-side pakai `LATERAL` join ke baseline periods, `LAG()` untuk incremental progress, dan `hashtext()` untuk volatilitas deterministik.
- 8 project total. Estimasi output ~2.500–3.500 entries baru (weekly × 3 kategori out + termin in).
- Setelah regenerate, `Finance.tsx` dan `ProjectDetail.tsx` (chart & tabel Cashflow) langsung menampilkan angka weekly tanpa perubahan kode.

## Verifikasi
- Cek: `SELECT project_id, count(*), min(period_date), max(period_date) FROM finance_entries GROUP BY 1;`
- Buka Project Detail → tab Finance → chart harus punya banyak titik (weekly) dan tabel Cashflow menampilkan baris per minggu.
