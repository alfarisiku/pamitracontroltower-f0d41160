## Jawaban singkat

### 1. "Purchase Order" di tab Finance (Project Detail)
Bagian itu adalah tabel PO yang menampilkan komitmen pembelian per proyek (vendor, nilai PO, tanggal, status bayar, penalty). Datanya sama persis dengan yang ada di **tab Procurement** dan di **Data Entry → Procurement / PO**, jadi memang **redundan** di tab Finance.

Sesuai arahan Anda sebelumnya bahwa Finance module fokus ke **Cash Flow (Plan vs Actual)** saja dan PO dipisah, blok ini sebaiknya dihapus dari tab Finance.

### 2. "Progress Update" di Data Entry
Tab ini adalah form update mingguan cepat untuk 1 proyek terpilih. Isinya 5 blok:

| Blok | Fungsi |
|---|---|
| **Weekly Progress Update** | Set Progress %, Status (on-track/at-risk/delayed/completed), dan Phase (E/P/C/Commissioning) proyek |
| **Work Item Progress** | Update qty completed / qty total per work item → auto-hitung progress & status; tambah/hapus work item cepat |
| **Update TKDN** | Ubah persentase TKDN proyek |
| **Cost Summary (Editable)** | Edit Contract Value, Budget, RAP, Actual Spent + lihat variance & margin target |
| **Weekly Photo (via PhotoGallery)** | Upload foto mingguan dengan caption & week label |

Ada tumpang tindih dengan tab lain yang lebih detail: WBS (Full CRUD), Weekly Photos, Finance (Cash Flow), dan bagian Cost Summary duplikat dengan Manage Projects.

---

## Rencana perubahan

### A. Hapus blok Purchase Orders dari tab Finance di Project Detail
- File: `src/pages/ProjectDetail.tsx` (sekitar baris 427–~500)
- Hapus section `{/* Purchase Orders */}` beserta tabel PO-nya
- Hapus import/hook yang jadi tidak terpakai (`usePurchaseOrders`, `Receipt` icon) jika hanya dipakai di section itu
- PO tetap bisa dikelola & dilihat di tab **Procurement** dan di **Data Entry → Procurement / PO** — tidak ada data yang hilang

### B. Rapikan tab "Progress Update" di Data Entry
Tujuan: hilangkan duplikasi, jadikan tab ini murni **quick weekly update** satu proyek.

Perubahan di `src/components/data-entry/RegularUpdateTab.tsx`:
1. **Pertahankan**: Weekly Progress Update, Work Item Progress (update qty), TKDN, dan Weekly Photo shortcut
2. **Hapus**: blok "Cost Summary (Editable)" — sudah ada di tab **Manage Projects** dan tab **Finance**
3. **Hapus**: bagian "Add New Work Item" (form dengan id `wi-code`, `wi-name`, dll) — sudah lengkap di tab **WBS (Full CRUD)**
4. Rename label tab di `DataEntry.tsx` dari "Progress Update" → **"Quick Weekly Update"** biar jelas bedanya dengan tab-tab detail lain
5. Tambahkan keterangan singkat di header tab: "Update cepat progress mingguan proyek. Untuk edit WBS lengkap gunakan tab WBS, untuk finansial gunakan tab Finance/Manage Projects."

### C. Tidak ada perubahan database
Semua data (PO, cost, work items) tetap ada — hanya UI yang dirapikan.

---

Konfirmasi apakah setuju dengan rencana ini (hapus PO dari Finance tab + rapikan Progress Update), atau ada bagian yang mau dipertahankan?