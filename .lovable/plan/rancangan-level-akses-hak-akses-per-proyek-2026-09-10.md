# Rancangan Level Akses & Hak Akses per Proyek

Dokumen ini hanya rancangan (flow, algoritma, logika). Belum ada perubahan yang diterapkan.

## Kondisi saat ini (hasil pengecekan)

- Halaman login masih ada di `/login`, tetapi semua rute terbuka: `ProtectedRoute` meloloskan siapa pun dan `AuthContext` memaksa setiap pengunjung menjadi `admin`.
- "Level" yang ada sekarang hanyalah tombol demo (Level 1/2/3) yang mengubah tampilan, bukan keamanan. Level 2 saat ini menampilkan Project Summary + Overview Eksekutif; Level 3 hanya Overview.
- Data izin sudah tersedia di database: tabel peran pengguna, tabel profil (status pending/active/disabled), dan tabel penugasan pengguna ke proyek (satu pengguna bisa banyak proyek).
- Halaman Account Manager sudah bisa menyetujui pengguna, memberi peran, dan mencentang proyek yang boleh diakses. Jadi pondasi penugasan proyek sudah ada dan tinggal dihidupkan.

## Definisi level yang diusulkan

| Level | Nama | Isi menu | Siapa |
|---|---|---|---|
| 1 | Full | Semua halaman (Overview, Eksekutif, Schedule, Cost, Finance, Risk, Reporting, Data Entry, Activity Log, War Room, Account Manager, User Guide) | Admin saja |
| 2 | Operasional | Project Summary, Data Entry, Activity Log | Pengguna terdaftar (non-admin) |
| 3 | Publik | Overview (tanpa angka rupiah, tanpa plan, status netral) | Tamu / pengguna belum di-assign |

Aturan pokok:
- Admin: akses semua level dan semua proyek.
- Non-admin: maksimal Level 2, dan hanya untuk proyek yang di-assign admin.
- Belum login / belum disetujui / belum punya proyek: Level 3 saja.

## Logika hak akses proyek

```text
projectScope(user):
  if user.role == admin        -> SEMUA proyek
  else if user.assignedIds > 0 -> hanya proyek pada assignedIds
  else                         -> kosong (jatuh ke Level 3)

canView(user, projectId)  = projectId ∈ projectScope(user)
canEdit(user, projectId)  = canView(user, projectId) AND user.status == active
```

Contoh sesuai permintaan:
- User A di-assign Proyek 1, 2, 3 -> di Level 2 melihat & CRUD 3 proyek itu; proyek lain tidak muncul sama sekali (bukan disabled, tapi hilang dari daftar, dropdown, dan grafik agregat).
- User B di-assign Proyek 1, 2 -> hanya 2 proyek itu.

## Alur pengguna

```text
Buka web
  |
  +-- belum login  -> Level 3 (Overview publik) + tombol Login
  |
  +-- login berhasil
        |
        +-- status pending/disabled -> halaman "Menunggu persetujuan"
        |
        +-- role admin              -> Level 1, semua proyek
        |
        +-- non-admin, punya proyek -> Level 2, proyek terbatas
        |
        +-- non-admin, tanpa proyek -> Level 3 + pesan "belum ada proyek yang di-assign"
```

Alur admin menambah pengguna:
```text
User daftar -> status pending
Admin buka Account Manager -> Approve -> pilih peran -> centang proyek -> simpan
User login ulang -> langsung melihat hanya proyek miliknya
```

## Algoritma penerapan (3 lapis)

1. **Lapis menu** — daftar menu sidebar dihitung dari level efektif; menu di luar level tidak dirender.
2. **Lapis rute** — setiap rute punya level minimum. Jika level pengguna tidak memenuhi, diarahkan ke halaman terbaik yang boleh (Level 2 -> Project Summary, Level 3 -> Overview). Rute detail proyek juga memeriksa apakah id proyek ada di scope; jika tidak, tampil "Proyek tidak tersedia".
3. **Lapis data** — semua hook pembaca proyek menyaring hasil dengan `projectScope`, sehingga tabel, dropdown Data Entry, Activity Log, dan grafik gabungan otomatis hanya memuat proyek yang diizinkan. Ditambah aturan di database agar penyaringan tidak bisa dilewati dari sisi peramban.

Level efektif dihitung sekali di satu tempat:
```text
effectiveLevel(user):
  if !user                  -> 3
  if user.role == admin     -> 1 (boleh turun manual ke 2/3 untuk demo)
  if scope.length > 0       -> 2
  else                      -> 3
```

## Catatan teknis

- Ganti `DemoLevelContext` menjadi `AccessContext` yang menurunkan `level`, `scope` (daftar id proyek), `canEdit`, dan helper `filterProjects()`. Level switcher tetap ada tapi hanya aktif untuk admin dan tidak boleh menaikkan level di atas hak asli.
- `ProtectedRoute` diisi kembali: parameter `minLevel` dan opsional `requireProject`.
- Sumber kebenaran penugasan: tabel penugasan pengguna-proyek (multi proyek), bukan kolom proyek tunggal di profil; kolom lama hanya dipertahankan untuk kompatibilitas.
- Keamanan sisi database: aturan baris untuk tabel proyek dan tabel turunannya berdasarkan "admin, atau proyek ada di daftar penugasan pengguna". Ini perlu login aktif kembali, karena saat ini akses publik penuh.
- Konsekuensi yang perlu disepakati: menghidupkan aturan ini berarti web tidak lagi bisa dipakai tanpa login kecuali halaman Overview publik.

## Urutan pengerjaan saat nanti disetujui

1. Aktifkan kembali login + halaman menunggu persetujuan.
2. Buat `AccessContext` dan hitung level efektif + scope proyek.
3. Terapkan penyaringan menu, rute, dan data.
4. Rapikan Account Manager (assign proyek wajib untuk non-admin).
5. Terakhir, kunci aturan akses di database dan uji dengan 3 akun contoh (admin, User A, User B).
