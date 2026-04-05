

## Masalah yang Ditemukan

Tombol "Edit" di tab **Manage Projects** saat ini hanya mengarahkan ke tab "Regular Update" yang hanya bisa mengubah progress, status, dan phase. **Tidak ada form edit lengkap** untuk mengubah data master proyek seperti nama, kode, PM, lokasi, tanggal, foto, video, CCTV, dll.

Tab "Structural Update" juga hanya mencakup 3 field (PM, deadline, description) — jauh dari lengkap.

## Rencana Perbaikan

### 1. Tambah Form Edit Project Lengkap di Tab "Manage Projects"

Ketika tombol Edit diklik pada sebuah proyek, akan muncul form edit inline (mirip form "New Project") yang berisi **semua field** proyek:

**Data Master:**
- Project Code, Name, Client, Manager, Category, Location
- Start Date, End Date
- Budget, Spent
- Status, Phase, Progress
- Map coordinates (lat/long)

**Media:**
- Image URL (foto proyek)
- Video URL
- CCTV embed link

**Deskripsi:**
- Description / scope

Form ini akan melakukan `UPDATE` ke tabel `projects` menggunakan Supabase SDK.

### 2. Perbaiki Tab "Structural Update" → Gabungkan ke "Manage Projects"

Hapus tab "Structural Update" yang redundan. Semua editing data master cukup dilakukan di tab "Manage Projects" dengan form edit lengkap.

Tab yang tersisa:
- **Regular Update** — weekly progress, work items, risk (untuk admin & team)
- **Manage Projects** — full CRUD semua field proyek (admin only)
- **Addendum** — contract addendum management (admin only)

### 3. File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/DataEntry.tsx` | Tambah form edit lengkap dengan semua field proyek termasuk media URLs; hapus tab structural; perbaiki tombol Edit agar membuka form edit inline |

### Detail Teknis

- State `editProjectId` sudah ada, akan digunakan untuk toggle form edit
- Form edit akan pre-populate semua field dari data proyek yang dipilih
- Handler `handleUpdateProject` akan melakukan `supabase.from("projects").update({...allFields}).eq("id", editProjectId)`
- Tidak perlu migrasi database karena semua kolom sudah ada (image_url, video_url, cctv_url, description, category, dll)

