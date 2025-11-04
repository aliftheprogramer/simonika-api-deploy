## MQTT API

Dokumentasi endpoint terkait status & operasi MQTT.

### GET /api/mqtt/status
- Method: GET

- Success Response (200):

```json
{
	"connected": true,
	"broker_host": "mqtt.example.com",
}
## MQTT API

Dokumentasi singkat untuk endpoint terkait status dan operasi MQTT yang tersedia di server.

---

### GET /api/mqtt/status

- Method: GET

- Success Response (200):

```json
{
	"connected": true,
	"broker_host": "mqtt.example.com",
	"broker_port": 8883,
	"subscribed_topic": "devices/+/data",
	"client_id": "nextjs_backend_ab12cd34"
}
```

Fields:
- connected: boolean — apakah klien MQTT saat ini terhubung ke broker
- broker_host / broker_port: diambil dari environment variables
- subscribed_topic: topik langganan yang dipakai oleh server
- client_id: client id MQTT yang dibuat saat inisialisasi

---

### Change subscription at runtime: `POST /api/mqtt/subscribe`

- Deskripsi: Mengganti topik langganan MQTT yang dipakai server tanpa perlu merestart Next.js.
- Endpoint(s):
	- GET `/api/mqtt/subscribe` — kembalikan topik yang sedang dipakai
	- POST `/api/mqtt/subscribe` — ubah topik yang dipakai (body JSON `{ "topic": "devices/+/data" }`)

Contoh POST (ubah topik ke `devices/+/data`):

```json
{ "topic": "devices/+/data" }
```

Response sukses (200) contoh:

```json
{ "oldTopic": "devices/wokwi_esp8266/data", "newTopic": "devices/+/data", "success": true }
```

Catatan keamanan: endpoint ini saat ini tidak memaksa autentikasi — jika project Anda terekspos publik, tambahkan pemeriksaan authentication/authorization sebelum mengizinkan perubahan topik.

---

### GET /api/mqtt/messages

- Deskripsi: Mengembalikan daftar pesan MQTT yang terakhir diterima (disimpan di memori oleh server).
- Method: GET

- Query parameters (opsional):
	- deviceId (string) — filter pesan hanya untuk device tertentu (cari dari topik `devices/{deviceId}/data` atau dari payload JSON)
	- limit (integer) — jumlah pesan terakhir yang dikembalikan

- Success Response (200) contoh:

```json
{
	"messages": [
		{ "topic": "devices/wokwi_esp8266/data", "payload": "{...}", "timestamp": "2025-10-30T12:00:00.000Z" },
		{ "topic": "devices/wokwi_esp8266/data", "payload": "{...}", "timestamp": "2025-10-30T11:59:50.000Z" }
	]
}
```

Catatan:

---

### GET /api/mqtt/history

- Deskripsi: Mengembalikan riwayat pesan terakhir untuk device tertentu (maksimum 10 pesan).
- Method: GET

- Query parameters:
	- deviceId (string) — wajib
	- limit (integer, opsional) — default 10, dibatasi maksimum 10

- Contoh request:

```
GET /api/mqtt/history?deviceId=00e5b570
```

- Response (200) contoh:

```json
{
	"deviceId": "00e5b570",
	"limit": 10,
	"messages": [
		{ "topic": "devices/00e5b570/data", "payload": "{\"distance\":123}", "timestamp": 1730793512345 },
		{ "topic": "devices/00e5b570/data", "payload": "{\"distance\":122}", "timestamp": 1730793509345 }
	]
}
```

Catatan:
- Data diambil dari buffer in-memory server, sehingga hanya berisi pesan yang diterima sejak server aktif.
- Gunakan endpoint ini jika Anda butuh lebih dari 1 pesan terakhir (lihat juga `/api/mqtt/last` untuk 1 pesan).
- Server menyimpan pesan terakhir ke array `receivedMessages` (default buffer kecil, mis. 10 pesan). Setiap item berformat `{ topic, payload, timestamp }` — `payload` bertipe string (payload asli yang diterima dari broker).

Filtering per device (contoh HTTP / Postman):

- Semua pesan terbaru: GET /api/mqtt/messages
- Pesan untuk device tertentu: GET /api/mqtt/messages?deviceId=esp-3ef3a462
- Pesan terakhir 1 untuk device tertentu: GET /api/mqtt/messages?deviceId=esp-3ef3a462&limit=1

Response (200) contoh untuk satu device:

```json
{
	"messages": [
		{
			"topic": "devices/esp-3ef3a462/data",
			"payload": "{\"token\":\"...\",\"waterLevel\":12.5,\"distance\":25.3,\"timestamp\":\"2025-10-31T07:12:34.123Z\"}",
			"timestamp": "2025-10-31T07:12:34.123Z"
		}
	]
}
```

Contoh langkah singkat (Postman):

1. Method: GET
2. URL: `{{simonika_base_url_api}}/api/mqtt/messages`
3. Params: tambahkan `deviceId` = `esp-3ef3a462` dan/atau `limit` = `1`
4. Tekan Send — lihat response body di tab Response.

Contoh skrip Postman (Tests) untuk menyimpan field `waterLevel` / `distance` dari pesan terbaru ke environment variables:

```javascript
const res = pm.response.json();
const msgs = res.messages || [];
if (msgs.length > 0) {
	try {
		const payload = JSON.parse(msgs[msgs.length - 1].payload);
		if (payload.waterLevel !== undefined) pm.environment.set('last_waterLevel', payload.waterLevel);
		if (payload.distance !== undefined) pm.environment.set('last_distance', payload.distance);
		pm.environment.set('last_msg_ts', msgs[msgs.length - 1].timestamp);
	} catch (e) {
		console.log('Payload not JSON or parse error', e);
	}
}
```

Troubleshooting singkat:

- Response kosong: periksa log server untuk memastikan server menampilkan pesan seperti `[MQTT] Connected to broker` dan `Subscribed to`.
- Tidak ada pesan untuk device tertentu: pastikan device mem-publish ke topik `devices/{deviceId}/data`.
- Payload bukan JSON: server menyimpan payload sebagai string — parsing JSON dilakukan di klien atau endpoint tambahan.

---

## Cara lengkap: dapatkan pesan untuk topik devices/{deviceId}/data (contoh: devices/00e5b570/data)

Jika Anda ingin memastikan response di Postman sama persis dengan apa yang muncul di broker (topik dan payload untuk `devices/00e5b570/data`), ikuti langkah-langkah ini.

1) Pastikan server subscribe mencakup topik device

- Periksa file `.env` / `.env.local` pada project Anda. Cari key `MQTT_SUBSCRIBE_TOPIC`.
- Untuk menerima semua topik gunakan wildcard `#` atau `devices/+/data` untuk hanya topik device:

```env
MQTT_SUBSCRIBE_TOPIC=#
```

- Setelah mengubah .env, restart Next.js dev server agar perubahan diterapkan:

```bash
# (opsional) bersihkan cache Next
rm -rf .next
npm run dev
```

Periksa log server. Anda harus melihat baris seperti:

```
[MQTT] Connecting to broker URL: mqtts://11190e...:8883
[MQTT] Connected to broker
[MQTT] Subscribed to #
```

2) Gunakan endpoint khusus yang sudah disediakan: `/api/mqtt/last`

- Endpoint baru: GET /api/mqtt/last
- Query params:
	- `deviceId` (wajib) — contoh `00e5b570`
	- `limit` (opsional) — jumlah pesan terakhir (default 1)
	- `field` (opsional) — nama field yang ingin diambil dari payload parsed JSON

Contoh (Postman):

GET {{simonika_base_url_api}}/api/mqtt/last?deviceId=00e5b570

Contoh response (200):

```json
{
	"messages": [
		{
			"topic": "devices/00e5b570/data",
			"payload": "{\"serial\":\"00e5b570\",\"waterLevel\":0,\"distance\":100.00,\"timestamp\":3040070}",
			"timestamp": "2025-10-31T07:00:00.000Z"
		}
	],
	"last": {
		"topic": "devices/00e5b570/data",
		"payload": "...",
		"timestamp": "2025-10-31T07:00:00.000Z"
	},
	"parsedPayload": {
		"serial": "00e5b570",
		"waterLevel": 0,
		"distance": 100,
		"timestamp": 3040070
	},
	"fieldValue": null
}
```

- Jika Anda hanya ingin satu field, mis. `distance`:

GET {{simonika_base_url_api}}/api/mqtt/last?deviceId=00e5b570&field=distance

Response akan berisi `fieldValue: 100` (jika payload JSON dan ada field tersebut).

3) Jika server masih mengembalikan topik berbeda (mis. `devices/wokwi_esp8266/data`)

- Pastikan device yang Anda lihat di broker benar-benar mem-publish ke `devices/00e5b570/data`. Di broker UI (atau mqtt client lainnya) perhatikan topik pesan.
- Jika device mem-publish ke topik lain (mis. `devices/wokwi_esp8266/data`), server hanya akan menyimpan pesan itu — ubah firmware/device config agar publish ke `devices/{deviceId}/data`.

4) Cara cepat melakukan publish test (dari mesin yang punya akses ke broker)

- Contoh menggunakan `mosquitto_pub` (sesuaikan host, port, TLS dan kredensial broker):

```bash
mosquitto_pub -h 11190e... -p 8883 -t "devices/00e5b570/data" -m '{"serial":"00e5b570","waterLevel":0,"distance":100,"timestamp":"2025-10-31T07:00:00Z"}' -u banjir -P 'Classmild1' --tls-version tlsv1.2
```

- Setelah publish, panggil endpoint:

```bash
curl "http://localhost:3000/api/mqtt/last?deviceId=00e5b570"
```

5) Perbedaan payload string vs JSON

- Jika payload device hanya berupa angka (mis. `70`) dan bukan JSON, `parsedPayload` akan berisi angka (70) dan `fieldValue` tidak relevan.
- Jika payload adalah JSON string, `parsedPayload` akan berisi objek parsed dan Anda bisa mengambil field dengan `field` query param.

6) Contoh skrip Postman (Tests) — ambil `distance` dan simpan ke environment variable

```javascript
const res = pm.response.json();
if (res && res.fieldValue !== undefined && res.fieldValue !== null) {
	pm.environment.set('last_distance', res.fieldValue);
} else if (res && res.parsedPayload && res.parsedPayload.distance !== undefined) {
	pm.environment.set('last_distance', res.parsedPayload.distance);
}
pm.environment.set('last_msg_ts', res.last ? res.last.timestamp : null);
```

7) Troubleshooting cepat

- Server tidak menerima pesan untuk topic yang benar:
	- Pastikan `MQTT_SUBSCRIBE_TOPIC` memungkinkan topik itu (`#` atau `devices/+/data`).
	- Restart server after changing env.
- Endpoint `/api/mqtt/last` mengembalikan kosong:
	- Pastikan device sudah mem-publish sejak server di-start (buffer memori hanya menyimpan pesan yang diterima saat server aktif).
	- Jika Anda butuh history, aktifkan persistensi (simpan ke MongoDB) — saya bisa bantu implementasinya.

---

Dengan langkah di atas Anda seharusnya bisa mendapatkan pesan yang sama di Postman seperti yang terlihat di broker untuk topik `devices/00e5b570/data`.

---

### POST /api/mqtt/publish

- Deskripsi: Mempublish pesan ke broker MQTT melalui client yang sudah diinisialisasi oleh server.
- Method: POST
- Headers: `Content-Type: application/json`

- Body (JSON) contoh:

```json
{
	"topic": "express/outbox",
	"message": { "foo": "bar" }
}
```

- Penjelasan:
	- `topic`: string — topik MQTT yang dituju.
	- `message`: string | object — jika object akan di-JSON.stringify sebelum publish.

- Success Response (200) contoh:

```json
{ "topic": "express/outbox", "payload": "{\"foo\":\"bar\"}", "status": "Published successfully" }
```

- Error responses:
	- 400: jika `topic` atau `message` tidak ada
		- { "error": "Topic and message are required." }
	- 503: jika client MQTT belum terhubung
		- { "error": "MQTT client not connected." }
	- 500: jika publish gagal (detail error pada `details`)

- Catatan:
	- Endpoint publish biasanya memerlukan autentikasi (lihat implementasi).
	- `message` dapat berupa objek — server akan melakukan JSON.stringify sebelum publish.

---

### Next steps / opsi tambahan

- Parsed output: jika Anda ingin agar endpoint mengembalikan payload yang sudah diparsing (mis. hanya field `distance`), saya dapat menambahkan parameter `format=parsed` atau endpoint terpisah `/api/mqtt/messages/last?deviceId=...&field=distance`.
- Persistensi: jika Anda membutuhkan penyimpanan data agar tidak hilang saat restart, saya dapat menambahkan ingestion ke model `Flood` (simpan ke MongoDB) dengan validasi token.

---

Dokumentasi ini difokuskan untuk penggunaan cepat via Postman dan test/debug device telemetry.

