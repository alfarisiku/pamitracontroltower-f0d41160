# Tampilan awal dan pembaruan Kontrak

## Hasil yang akan dibuat
- Halaman awal memakai tampilan publik untuk semua pengunjung; setelah login, isi utamanya tetap sama tetapi menu samping sesuai hak akun muncul.
- Alias proyek dihapus dari formulir dan tampilan publik. Daftar proyek publik menampilkan kode proyek bersama nama proyek.
- Status Kontrak `Pending` diganti menjadi `On Progress`, termasuk penyelarasan data lama.
- Kontrak memiliki kolom Notes untuk mencatat posisi atau perkembangan dokumen, dapat ditambah dan diedit dari Data Entry.
- Project Detail → Kontrak menampilkan Notes dan tautan dokumen.
- Popup singkat proyek menampilkan bagian Kontrak selain foto mingguan/video/CCTV, lengkap dengan status, Notes, dan tautan dokumen.

## Teknis
- Tambahkan kolom `notes` pada data Kontrak melalui migrasi database, pertahankan kebijakan akses yang sudah ada, dan ubah nilai status lama `pending` menjadi `on_progress`.
- Perbarui tipe data, formulir CRUD, tabel detail, serta query popup tanpa mengubah alur akses proyek.
- Verifikasi kompilasi, lalu uji halaman awal dan popup proyek pada tampilan desktop.
