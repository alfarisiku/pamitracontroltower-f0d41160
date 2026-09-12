# Perbaikan Akses: Admin Terkunci di Level Terbatas

## Apa yang ditemukan (hasil pengecekan)

- Akun admin di database memang berperan **admin** dan berstatus aktif, jadi haknya benar.
- Masalahnya ada pada pilihan level tampilan: begitu tombol Level 2 atau Level 3 pernah ditekan (atau alamat halaman pernah berisi `?level=`), pilihan itu tersimpan dan terus terbawa ke halaman berikutnya. Akibatnya admin tetap melihat menu terbatas dan halaman Level 1 melempar balik ke Overview, walaupun sudah login sebagai admin.
- Kekhawatiran untuk akun lain terbukti: tiga akun lain (Director, Proyek 1, Palaran User) **belum punya satu pun proyek yang ditugaskan**, sehingga sistem otomatis menurunkan mereka ke tampilan publik. Satu akun juga masih berstatus menunggu persetujuan.

## Yang akan diperbaiki

1. **Pilihan level tidak lagi "nyangkut".**
   Setiap kali halaman dibuka/berpindah atau akun berganti, tampilan kembali ke level tertinggi yang menjadi hak akun tersebut. Admin selalu kembali ke akses penuh.

2. **Tombol Level hanya untuk admin.**
   Pengguna lain tidak melihat tombol ini sama sekali. Untuk admin, tombol tetap ada sebagai alat peraga, plus tombol "Kembali ke akses penuh" yang langsung mengembalikan ke Level 1.

3. **Menu samping ikut hak akun, bukan sisa pilihan lama.**
   Menu dihitung dari level efektif yang sudah diperbaiki, sehingga admin selalu melihat seluruh menu.

4. **Director diperlakukan sebagai pengguna biasa** (sesuai keputusan): aksesnya Level 2 dan hanya untuk proyek yang ditugaskan admin.

5. **Pengguna aktif tanpa proyek** tetap bisa membuka halaman Overview publik, dengan pesan jelas di layar: "Akun Anda belum diberi proyek. Hubungi administrator." — tidak lagi membingungkan seolah aplikasi rusak.

6. **Penugasan proyek dipermudah di Account Manager**: saat menyetujui pengguna non-admin, ditampilkan peringatan bila belum ada proyek yang dicentang, dan daftar akun yang belum punya proyek diberi tanda.

## Pemeriksaan setelah perbaikan

Diuji langsung di aplikasi: masuk sebagai admin, pindah ke Level 2 lalu Level 3, kembali ke Level 1, dan buka ulang beberapa halaman untuk memastikan menu penuh tetap muncul. Juga diuji akun non-admin dengan dan tanpa proyek.

## Catatan teknis

- `AccessContext`: hapus variabel modul `lastLevel` yang membuat pilihan bertahan lintas halaman; `chosen` direset ke `maxLevel` saat `user`/`role`/`maxLevel` berubah dan saat `?level=` tidak ada di URL. `setLevel` hanya boleh dipanggil admin.
- `Sidebar`, `Index`, `ProjectSummary`, `ProjectDetail`, `ProjectOverviewModal` tetap memakai `useDemoLevel` (alias `useAccess`) — tidak perlu diubah selain memastikan nilai level yang masuk sudah benar.
- `LevelSwitcher`: render hanya bila `isAdmin`, tambah aksi reset ke `maxLevel` dan bersihkan parameter `level` dari URL.
- Banner "belum ada proyek" ditampilkan di `Index` bila `user && !isAdmin && assignedProjectIds.length === 0 && profile.status === 'active'`.
- Tidak ada perubahan struktur database pada langkah ini; penguncian aturan baris (RLS) tetap ditunda seperti rencana sebelumnya.
