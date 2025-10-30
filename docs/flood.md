## Flood (Data Banjir / Device Data)

Model `Flood` merepresentasikan data yang datang dari perangkat (device) yang memantau level air dan parameter lain.

### Skema / Fields

- `deviceId` (string) — id perangkat. Required.
- `waterLevel` (number) — level air / kedalaman. Required.
- `temperature` (number) — suhu (opsional).
- `humidity` (number) — kelembapan (opsional).
- `timestamp` (Date) — waktu data; default: now.
- `location` (object) — { lat, lng } — koordinat (opsional).
- `status` (string) — enum: `normal` | `alert` | `critical` (default `normal`).

### Contoh dokumen

```json
{
	"deviceId": "device-001",
	"waterLevel": 12.5,
	"temperature": 26.3,
	"humidity": 70,
	"timestamp": "2025-10-30T12:00:00.000Z",
	"location": { "lat": -6.200000, "lng": 106.816666 },
	"status": "normal"
}
```

### Endpoint (catatan)
- wajib autentikasi
- Saat ini tidak ada endpoint CRUD Flood di folder `src/pages/api` pada implementasi sekarang. Namun biasanya REST API untuk model ini akan mencakup:
	- POST /api/flood — terima data dari device (simpan ke DB)
	- GET /api/flood — daftar data (dengan filter per device / rentang waktu)
	- GET /api/flood/:id — ambil satu rekaman
	- DELETE /api/flood/:id — hapus rekaman

### Rekomendasi keamanan & validasi
- Verifikasi source/perangkat saat menerima data (mis. shared key atau token) jika data berasal dari device publik.
- Batasi ukuran dan rate input; sanitasi dan validasi numeric untuk `waterLevel`.

