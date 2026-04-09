
## 5 Fitur yang Akan Dibangun

### 1. S-Curve di Project Detail
- Tambah tab **"S-Curve"** di halaman Project Detail
- Menampilkan grafik S-Curve (planned vs actual progress over time) menggunakan Recharts AreaChart
- Data digenerate dari start_date, end_date, progress, dan milestones proyek
- Sumbu X = timeline (bulan), Sumbu Y = % progress kumulatif

### 2. Foto Utama vs Foto Weekly Update
- **Foto utama proyek** = field `image_url` (satu foto cover/thumbnail proyek)
- **Foto weekly** = tabel `project_photos` (banyak foto per minggu)
- Di Project Detail tab Media, pisahkan:
  - **Cover Photo**: foto utama proyek (dari `image_url`)
  - **Weekly Progress Gallery**: grid foto-foto mingguan dikelompokkan per minggu
- Di Data Entry, tambahkan upload foto utama (single file upload ke storage) terpisah dari upload foto weekly

### 3. Video & CCTV via YouTube Link
- Video: hanya terima YouTube URL, auto-convert ke embed format (`youtube.com/embed/VIDEO_ID`)
- CCTV: sama, hanya terima YouTube/streaming link, buka di tab baru via tombol "Open Stream"
- Tidak ada iframe embed langsung di dashboard untuk mengurangi beban
- Tampilkan thumbnail + tombol play yang membuka link di tab baru

### 4. Info Tooltip (ℹ️) untuk Rumus/Kalkulasi
- Tambahkan ikon ℹ️ di samping setiap metric yang menggunakan rumus:
  - **CPI** (Cost Performance Index): `CPI = (Progress% × Budget) / Spent`
  - **SPI** (Schedule Performance Index): `SPI = Actual Progress / Planned Progress`
  - **Budget Utilization**: `Spent / Budget × 100%`
  - **Weekly Progress**: estimasi berdasarkan delta progress
  - **Profit Margin**: `(Budget - Spent) / Budget × 100%`
- Klik ikon → muncul popover/tooltip dengan penjelasan rumus + standar interpretasi

### 5. War Room Redesign — "Investor-Ready Dashboard"
- Layout **full-screen tanpa scroll** (100vh)
- Bagian atas: Hero KPI bar (4 cards horizontal)
- Bagian tengah kiri: **Peta Indonesia interaktif** (Leaflet) dengan marker semua proyek, klik marker → info popup
- Bagian tengah kanan: **Bar Chart** perbandingan budget vs spent per proyek + **Pie Chart** distribusi status proyek
- Bagian bawah: ticker/carousel proyek aktif
- Semua data real-time dari database

### File yang Akan Diubah
| File | Perubahan |
|------|-----------|
| `src/pages/ProjectDetail.tsx` | Tambah tab S-Curve, pisah media foto utama vs weekly, tambah info tooltips, fix video/CCTV |
| `src/pages/WarRoom.tsx` | Redesign total: map, charts, no-scroll layout |
| `src/pages/DataEntry.tsx` | Upload foto utama terpisah dari weekly |
| `src/components/dashboard/SCurveChart.tsx` | **NEW** — komponen S-Curve |
| `src/components/dashboard/FormulaTooltip.tsx` | **NEW** — komponen info tooltip rumus |
