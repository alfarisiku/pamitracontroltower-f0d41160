# Perbaikan S-Curve SPK 1 yang Menurun di Des 2026

## Penyebab (sudah dipastikan dari data)

Pada proyek MOR V - SPK 1 ada satu baris minggu **W50** yang tanggal akhir periodenya salah ketik:

- W50: mulai 25 Des 2025, tetapi tanggal cut-off tertulis **31 Des 2026** (seharusnya 31 Des 2025)
- Nilai actual baris itu 42,80%

Karena tampilan bulanan mengelompokkan data berdasarkan tanggal cut-off, baris ini "melompat" ke Desember 2026 — sesudah periode terakhir yang sebenarnya (Sep/Okt 2026, 70,93%) — sehingga grafik terlihat turun ke 42,80% di akhir. Di halaman Data Entry angka ini tampil sebagai W50 (Desember 2025), jadi terasa seperti data yang tidak ada.

## Yang akan diperbaiki

1. Betulkan tanggal cut-off W50 SPK 1 menjadi 31 Des 2025 supaya grafik bulanan kembali naik rapi.
2. Cek seluruh proyek untuk kasus serupa (tanggal akhir periode lebih awal/lebih jauh dari urutan mingguannya) dan betulkan yang jelas salah tahun.
3. Tambahkan pengaman di editor S-Curve: peringatan saat tanggal periode tidak berurutan atau selisihnya tidak wajar (bukan sekitar 7 hari), agar salah ketik tahun langsung terlihat sebelum disimpan.
4. Tambahkan pengaman tampilan: pengelompokan bulanan mengikuti urutan periode, sehingga satu tanggal aneh tidak lagi membuat grafik turun mendadak.

## Catatan teknis

- Data: perbaikan `s_curve_data.period_end` untuk baris W50 (period_order 51) proyek SPK 1, plus audit lintas proyek di mana `period_end` menyimpang lebih dari beberapa hari dari `period_start + 6 hari`.
- UI: validasi di `src/components/data-entry/SCurveEditor.tsx` (badge/peringatan per baris) dan urutan bucket bulanan pada blok S-Curve di `src/pages/ProjectDetail.tsx` diurutkan memakai `period_order`, bukan hanya label bulan.
