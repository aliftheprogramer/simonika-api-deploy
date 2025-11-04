## WebSocket Realtime Streaming

Endpoint WebSocket ini menyiarkan pesan MQTT yang diterima server secara realtime ke semua klien yang terhubung. Cocok untuk chart/live dashboard tanpa polling.

---

### Endpoint

- Local dev: `ws://localhost:3000/api/ws`
- Production: `wss://<your-domain>/api/ws`

Filter opsional via query:

- `?deviceId=00e5b570` — hanya kirim pesan untuk device tersebut (cocok dengan topik `devices/{deviceId}/data` atau `payload.deviceId`/`payload.id`).

Contoh:

- `ws://localhost:3000/api/ws?deviceId=00e5b570`

---

### Bentuk pesan yang dikirim server

Server akan mengirim pesan JSON ke klien dengan struktur berikut:

- Saat terkoneksi:

```json
{ "type": "hello", "ok": true }
```

- Saat ada pesan MQTT baru (stream realtime):

```json
{
	"type": "mqtt",
	"topic": "devices/00e5b570/data",
	"payload": "{\"distance\":123,\"timestamp\":\"2025-11-05T04:10:00.000Z\"}",
	"timestamp": "2025-11-05T04:10:00.123Z"
}
```

Keterangan:
- `payload` adalah string persis seperti yang diterima dari broker. Parse di sisi klien jika perlu:

```js
const obj = JSON.parse(message.payload);
```

---

### Mengubah filter dari klien

Selain query `?deviceId=...`, Anda juga bisa mengatur filter secara dinamis setelah terkoneksi dengan mengirim pesan JSON:

```json
{ "action": "filter", "deviceId": "00e5b570" }
```

Server akan membalas ACK:

```json
{ "type": "ack", "filterDeviceId": "00e5b570" }
```

Untuk menonaktifkan filter dan menerima semua pesan:

```json
{ "action": "filter", "deviceId": null }
```

---

### Contoh penggunaan

#### 1) Postman (atau Insomnia)

1. Buat koneksi WebSocket baru.
2. Masukkan URL, contoh: `ws://localhost:3000/api/ws?deviceId=00e5b570`.
3. Klik Connect. Anda akan menerima `{"type":"hello","ok":true}`.
4. Jika perlu ubah filter, kirim pesan:

```json
{ "action": "filter", "deviceId": "00e5b570" }
```

5. Saat device publish ke `devices/00e5b570/data`, Anda akan menerima event `{ type: "mqtt", ... }`.

#### 2) Browser (frontend)

```html
<script>
	const url = `ws://${location.host}/api/ws?deviceId=00e5b570`;
	const ws = new WebSocket(url);

	ws.onopen = () => console.log('WS open');
	ws.onmessage = (ev) => {
		try {
			const msg = JSON.parse(ev.data);
			if (msg.type === 'mqtt') {
				const data = JSON.parse(msg.payload); // jika payload JSON
				console.log('distance =', data.distance, 'at', msg.timestamp);
			}
		} catch (e) {
			console.warn('WS parse error', e);
		}
	};

	// Ubah filter runtime
	function setFilter(deviceId) {
		ws.send(JSON.stringify({ action: 'filter', deviceId }));
	}
	// setFilter(null) untuk semua pesan
</script>
```

#### 3) Node.js (server/worker)

```js
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/api/ws?deviceId=00e5b570');

ws.on('open', () => console.log('opened'));
ws.on('message', (buf) => {
	const msg = JSON.parse(buf.toString());
	if (msg.type === 'mqtt') {
		try {
			const payload = JSON.parse(msg.payload);
			console.log('MQTT realtime:', payload);
		} catch {
			console.log('MQTT realtime (raw):', msg.payload);
		}
	}
});
```

---

### Backfill + realtime (untuk chart)

Pola umum untuk chart:
1. Saat halaman dibuka, ambil riwayat singkat via HTTP:
	 - `GET /api/mqtt/history?deviceId=00e5b570&limit=10` — berisi `{ topic, payload, timestamp, parsedPayload }`.
2. Render chart dari history tersebut.
3. Buka WebSocket `ws://.../api/ws?deviceId=00e5b570` untuk menerima data baru dan append ke chart.

Dengan cara ini, chart langsung terisi 10 titik awal, lalu lanjut realtime tanpa polling.

---

### Hubungan dengan topik subscribe MQTT

Server hanya bisa menyiarkan pesan yang memang diterima dari broker. Pastikan topik langganan sesuai:

- Cek status: `GET /api/mqtt/status` → lihat `subscribed_topic`.
- Ubah topik runtime: `POST /api/mqtt/subscribe` body `{ "topic": "devices/+/data" }`.

Jika Anda hanya butuh device tertentu: `devices/00e5b570/data`. Jika butuh banyak device: `devices/+/data`.

---

### Reconnection & reliability tips

- Implementasikan auto-reconnect di klien (exponential backoff):

```js
function connectWS(url, onMsg) {
	let retry = 0;
	let ws;
	const open = () => {
		ws = new WebSocket(url);
		ws.onopen = () => { retry = 0; };
		ws.onmessage = (e) => onMsg(JSON.parse(e.data));
		ws.onclose = () => {
			const delay = Math.min(30000, 1000 * Math.pow(2, retry++));
			setTimeout(open, delay);
		};
		ws.onerror = () => ws.close();
	};
	open();
	return () => ws?.close();
}
```

- WebSocket tidak terpengaruh CORS seperti HTTP, tetapi jika berada di balik proxy/CDN pastikan upgrade `Connection: Upgrade` dan `Upgrade: websocket` didukung.

---

### Keamanan

Saat ini endpoint WS tidak mewajibkan autentikasi. Jika API Anda terekspos publik:
- Pertimbangkan menambahkan auth (token/JWT di query/header) dan validasi di handler.
- Batasi rate atau jumlah koneksi jika perlu.
- Filter `deviceId` mencegah broadcast data yang tidak relevan ke semua klien.

---

### Troubleshooting

- Tidak ada pesan masuk:
	- Cek `/api/mqtt/status` apakah `connected: true` dan `subscribed_topic` benar.
	- Uji publish manual (atau gunakan `/api/mqtt/publish`) ke topik yang sama.
	- Pastikan `deviceId` benar (cocok dengan `devices/{deviceId}/data` atau `payload.deviceId`).

- Dapat `200 WebSocket server is ready` saat HTTP GET:
	- Itu respons inisialisasi route. Untuk realtime, gunakan klien WebSocket (ws/wss), bukan HTTP biasa.

- Payload tidak bisa di-parse JSON:
	- Beberapa device publish angka/string polos. Gunakan payload apa adanya atau convert manual.

- Error ENOENT di Next dev (Turbopack), mis. `pages-manifest.json` atau `_buildManifest.js.tmp`:
	- Ini bug/ketidakcocokan saat WS + dev bundler tertentu.
	- Solusi: jalankan dev tanpa Turbopack `npm run dev:webpack`, atau gunakan mode produksi `npm run build && npm start` saat menguji WS.

---

Dok ini melengkapi `docs/mqtt.md` (history/last/messages). Gunakan history untuk backfill singkat, lalu WS untuk realtime.

