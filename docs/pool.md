## Pool (Kolam)

Model `Pool` menyimpan konfigurasi kolam/sistem pengairan.

### Skema / Fields

- `namaKolam` (string) — nama kolam. Required, unik.
- `kedalamanTotal` (number) — kedalaman total kolam. Required, min 0.
- `levelMinimum` (number) — level minimal yang diizinkan. Required, min 0.
- `levelMaksimum` (number) — level maksimal yang diizinkan. Required, min 0.
- `targetLevelNormal` (number) — target level normal; required; harus berada di antara `levelMinimum` dan `levelMaksimum`.

### Contoh dokumen

```json
{
	"namaKolam": "Kolam A",
	"kedalamanTotal": 200,
	"levelMinimum": 20,
	"levelMaksimum": 180,
	"targetLevelNormal": 100
}
```

### Validasi penting
- Ada pre-save hook yang memastikan `targetLevelNormal` berada di antara `levelMinimum` dan `levelMaksimum`.

### Endpoint (catatan)
- wajib autentikasi
- Implementasi endpoint CRUD untuk Pool tidak ada di `src/pages/api` saat ini. Rekomendasi endpoint:
	- POST /api/pools — buat konfigurasi kolam baru
	- GET /api/pools — daftar konfigurasi kolam
	- GET /api/pools/:id — detail kolam
	- PUT /api/pools/:id — update konfigurasi
	- DELETE /api/pools/:id — hapus konfigurasi

