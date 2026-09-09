# Laporan PPT Siap Pakai untuk Weekly Meeting

## Kesimpulan analisis

Saat ini file dari "Create PPT" **belum bisa langsung dipakai** untuk rapat mingguan W20. Deck-nya sudah rapi secara visual, tetapi sebagai bahan rapat masih kurang: sebagian angka tidak konsisten dengan periode yang dipilih, isi slide dipotong sembarangan, dan tidak ada bagian yang biasanya paling dinanti dalam rapat (apa yang terjadi minggu ini, apa yang terlambat, apa yang perlu diputuskan).

Temuan utama (berdasarkan pembacaan halaman preview laporan):

1. **Angka di sampul tidak mengikuti periode terpilih** — progres di sampul memakai angka progres proyek secara umum, sementara slide Health memakai progres pada minggu terpilih. Dua angka berbeda di satu file adalah hal pertama yang akan dipertanyakan peserta rapat.
2. **Tidak ada peringatan bila minggu terpilih belum ada data aktual** — laporan tetap tercetak seolah-olah lengkap.
3. **Tidak ada slide "Ringkasan Minggu Ini"** — tidak ada satu halaman yang menjawab: posisi rencana vs realisasi, naik berapa dari minggu lalu, status sehat/terlambat, dan tiga hal yang butuh keputusan.
4. **Milestone tidak disaring dan tidak ditandai terlambat** — hanya 10 baris pertama apa adanya, tanpa penanda jatuh tempo/terlambat.
5. **WBS dipotong di 16 baris acak** — bukan area yang paling tertinggal, sehingga tidak informatif.
6. **Procurement menampilkan 9 item pertama** — bukan item kritis (belum PO, terlambat kirim) yang justru dibahas di rapat.
7. **Foto minggu terpilih bisa salah** — bila foto tidak berlabel minggu, sistem memakai tanggal unggah, bukan tanggal kejadian.
8. **Weekly report bisa mengambil minggu lain** bila minggu terpilih kosong, tanpa keterangan apa pun.
9. **Tidak ada halaman rencana 2 minggu ke depan dan daftar tindak lanjut** dengan PIC dan tenggat.
10. **Sumbu grafik S-Curve padat** karena menampilkan seluruh minggu sejak awal proyek.

## Yang akan diperbaiki

### A. Konsistensi data (paling penting)
- Semua angka progres, biaya, dan kas mengikuti **satu cut-off**: minggu terpilih.
- Sampul memakai progres minggu terpilih, bukan progres umum proyek.
- Setiap slide diberi label periode yang sama, format baku `W20 — (11 Mei 26 → 17 Mei 26)`.
- Bila minggu terpilih belum punya data aktual, muncul peringatan di layar preview dan catatan di slide ("data aktual per W19; W20 belum diinput").
- Catatan sumber & waktu cetak di footer: "Data per <cut-off> • dicetak <tanggal>".

### B. Slide baru
- **Ringkasan Eksekutif Minggu Ini** (setelah sampul): rencana vs realisasi, deviasi, kenaikan progres minggu ini, penyerapan biaya, status kesehatan proyek, dan 3 poin perhatian utama.
- **Rencana 2 Minggu ke Depan**: target minggu depan dari weekly report + milestone dan pengadaan yang jatuh tempo.
- **Tindak Lanjut & Keputusan**: risiko aktif, item outstanding, dan addendum menunggu persetujuan — lengkap dengan PIC dan tenggat.

### C. Perbaikan isi slide yang ada
- **Milestone**: hanya yang relevan (terlambat, jatuh tempo ≤ 30 hari, selesai minggu ini), diurut tanggal, dengan penanda TERLAMBAT / SEGERA.
- **WBS**: diurut berdasarkan deviasi terbesar (paling tertinggal di atas), menampilkan bobot, rencana, realisasi, dan deviasi per area.
- **Procurement**: menonjolkan item kritis (belum PO, pengiriman lewat tanggal, kebutuhan minggu ini) sebelum sisanya, dengan penanda keterlambatan.
- **Finance**: keterangan satuan diperbaiki agar sesuai nilai yang ditampilkan; ditambah kolom deviasi rencana vs realisasi.
- **Risiko**: diurut berdasarkan tingkat keparahan, menampilkan yang tertinggi lebih dulu.
- **Media**: memakai label minggu bila ada; bila tidak ada foto pada minggu terpilih, ditulis jelas "tidak ada dokumentasi minggu ini" dan tidak menampilkan foto minggu lain diam-diam.
- **S-Curve**: sumbu diringkas (maksimal ~16 titik terakhir menuju cut-off) agar terbaca saat diproyeksikan.

### D. Kenyamanan pakai
- Pemilih periode menandai minggu yang sudah/belum ada data aktual.
- Panel "Kelengkapan data" di halaman preview: mencantumkan bagian mana yang kosong untuk minggu itu, sehingga PM bisa melengkapi lewat Quick Weekly Update sebelum mencetak.
- Nama file: `KODEPROYEK-Weekly-W20-<tanggal cut-off>.pptx`.

## Catatan teknis
- Perubahan terpusat di `src/pages/ProjectPptPreview.tsx` (penyusunan slide, penyaringan cut-off, panel kelengkapan) dan penyesuaian kecil di `src/lib/pptSlides.ts` untuk footer bertanggal serta penanda status pada tabel.
- Semua nilai tetap dibaca dari tabel yang sudah ada (`s_curve_data`, `finance_entries`, `procurement_items`, `milestones`, `work_areas`/`work_items`, `alerts`, `weekly_progress_reports`, `project_photos`, `project_billings`, `addendums`). Tidak ada perubahan basis data dan tidak ada angka yang dikarang — bagian tanpa data ditandai kosong secara eksplisit.
- Preview dan file .pptx tetap memakai model slide yang sama sehingga hasil unduhan identik dengan tampilan.
