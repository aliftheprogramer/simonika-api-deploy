## MQTT API

Dokumentasi endpoint terkait status & operasi MQTT.

### GET /api/mqtt/status

- Deskripsi: Mengembalikan status koneksi MQTT beserta konfigurasi broker yang dipakai.
- Method: GET
- Headers: tidak diperlukan khusus (CORS sudah di-handle pada server)

- Success Response (200):

```json
{
	"connected": true,
	"broker_host": "mqtt.example.com",
	"broker_port": 8883,
	"subscribed_topic": "devices/wokwi_esp8266/data",
	"client_id": "nextjs_backend_ab12cd34"
}
```

Field:
- connected: boolean — apakah klien MQTT saat ini terhubung ke broker
- broker_host / broker_port: sumber dari environment variables
- subscribed_topic: topik langganan yang dipakai
- client_id: client id MQTT yang dibuat saat inisialisasi

### GET /api/mqtt/messages

- Deskripsi: Mengembalikan daftar pesan MQTT yang terakhir diterima (disimpan di memori).
- Method: GET

- Success Response (200):

```json
[
	{ "topic": "devices/wokwi_esp8266/data", "payload": "{...}", "timestamp": "2025-10-30T12:00:00.000Z" },
	{ "topic": "devices/wokwi_esp8266/data", "payload": "{...}", "timestamp": "2025-10-30T11:59:50.000Z" }
]
```

Catatan:
- Implementasi menyimpan pesan terakhir (ke array `receivedMessages`) dan hanya menyimpan hingga 10 pesan terakhir.
- Setiap item berformat: `{ topic, payload, timestamp }` — `payload` bertipe string (payload asli yang diterima dari broker).

### POST /api/mqtt/publish

- Deskripsi: Mempublish pesan ke broker MQTT melalui client yang sudah diinisialisasi.
- Method: POST
- Headers: `Content-Type: application/json`

- Body (JSON):

```json
{
	"topic": "express/outbox",
	"message": { "foo": "bar" }
}
```

- Penjelasan:
	- `topic`: (string) topik MQTT yang dituju.
	- `message`: (string | object) jika object akan di-JSON.stringify sebelum publish.

- Success Response (200):

```json
{ "topic": "express/outbox", "payload": "{\"foo\":\"bar\"}", "status": "Published successfully" }
```

- Error responses:
	- 400: jika `topic` atau `message` tidak ada
		- { "error": "Topic and message are required." }
	- 503: jika client MQTT belum terhubung
		- { "error": "MQTT client not connected." }
	- 500: jika publish gagal (detail error pada `details`)

Catatan:
- wajib autentikasi
- `message` dapat berupa objek — server akan melakukan JSON.stringify sebelum publish.

