## Pool (Kolam)

Model `Pool` menyimpan konfigurasi kolam/sistem pengairan.

### Skema / Fields

- `namaKolam` (string) — nama kolam. Required, unik.
- `device` (ObjectId | null) — referensi ke Device yang terhubung (jika ada).
- `activeKolam` (boolean) — penanda kolam aktif (terintegrasi dengan device). Secara otomatis true jika `device` terisi, false jika tidak.
- `kedalamanTotal` (number) — kedalaman total kolam. Required, min 0.
- `levelMinimum` (number) — level minimal yang diizinkan. Required, min 0.
- `levelMaksimum` (number) — level maksimal yang diizinkan. Required, min 0.
- `targetLevelNormal` (number) — target level normal; required; harus berada di antara `levelMinimum` dan `levelMaksimum`.

### Contoh dokumen

```json
{
	"namaKolam": "Kolam A",
	"device": "6512c4...", 
	"activeKolam": true,
	"kedalamanTotal": 200,
	"levelMinimum": 20,
	"levelMaksimum": 180,
	"targetLevelNormal": 100
}
```

### Validasi penting
- Ada pre-save hook yang memastikan `targetLevelNormal` berada di antara `levelMinimum` dan `levelMaksimum`.
- `activeKolam` akan otomatis diset berdasarkan ada/tidaknya `device` yang ter-assign.

### Endpoint (ringkasan)
- Wajib autentikasi untuk operasi tulis (POST/PUT/DELETE)

- GET /api/pool
	- Daftar semua pool (termasuk field `device` ter-populate jika ada)
	- Server juga menambahkan `lastMessage` bila tersedia, diambil dari buffer pesan MQTT terakhir berdasarkan `device.deviceId` atau `device.metadata.serial`.

- POST /api/pool
	- Buat pool baru. Body: { namaKolam, kedalamanTotal, levelMinimum, levelMaksimum, targetLevelNormal, deviceId? }
	- Jika `deviceId` diberikan: server akan mengaitkan device ke pool (jika device belum ter-assign), dan `activeKolam` otomatis true.

- GET /api/pool/:id
	- Detail pool (device ter-populate)

- PUT /api/pool/:id
	- Update pool. Untuk assign/unassign device gunakan `deviceId` di body.
		- Assign: { deviceId: "<DeviceObjectId>" }
		- Unassign: { deviceId: null }
	- Server menjaga konsistensi dua arah: `pool.device` dan `device.pool`.

- DELETE /api/pool/:id
	- Hapus pool. Jika ada device ter-assign, server akan melepaskan link pada `device.pool` terlebih dahulu.

### Endpoint khusus: link/unlink device ke pool

- POST /api/pool/device
	- Body: { "poolId": "<PoolObjectId>", "deviceId": "<DeviceObjectId or deviceId string>" }
	- Assign device ke pool. Validasi konflik: jika pool sudah punya device lain atau device sudah ter-assign ke pool lain, akan ditolak (409).
	- Response: { message, pool } — `pool` sudah ter-populate field `device` dan `activeKolam` otomatis true.

- DELETE /api/pool/device
	- Body: { "poolId": "<PoolObjectId>" }
	- Unassign device dari pool (jika ada). `activeKolam` otomatis menjadi false.
	- Response: { message, pool }

