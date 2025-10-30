## Devices (IoT Device Onboarding)

This document describes the Device model and the API endpoints to manage IoT devices (ESP). The project implements admin-side device CRUD and optional pool assignment (1 device per pool).

Model (Device)

- `deviceId` (string, unique) — identifier used by the device as MQTT username and in topics
- `name` (string) — friendly name
- `secretHash` (string, stored hashed) — hashed device credential (do not expose)
- `pool` (ObjectId | null) — reference to `Pool` model if assigned
- `status` (enum) — `active` or `disabled`
- `lastSeen` (Date) — last time a message was received from device
- `metadata` (object) — arbitrary device metadata

Security

- When creating a device the server generates a plain token and returns it in the response; the token is shown only once and stored hashed in the DB.
- Use the returned token as the device password when connecting to MQTT (username = `deviceId`, password = `<token>`).

Endpoints

- GET /api/device
  - Description: List all devices (requires authentication)
- POST /api/device
  - Description: Create a device (requires authentication)
  - Body: { deviceId: string, name?: string, poolId?: string, metadata?: object }
  - Success: 201 { device: <deviceobj>, credential: { token: '<plain-token>' } }
  - Notes: If `poolId` provided, the device will be assigned to that pool (server checks pool exists and is not already assigned).
- GET /api/device/:id
  - Description: Get device details by database id (requires authentication)
- PUT /api/device/:id
  - Description: Update device. To assign/unassign pool include `poolId` in the body.
  - Body example for assigning: { poolId: '<poolObjectId>' }
  - Body example for unassigning: { poolId: null }
- DELETE /api/device/:id
  - Description: Delete a device (requires authentication). If it is assigned to a pool, the pool will be unassigned.

Usage examples (curl)

Create device (admin):

```bash
curl -X POST https://your-server/api/device \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"esp-001","name":"ESP Sensor 1","poolId":"<poolId>"}'
```

Response (201):

```json
{
  "device": { "_id": "...", "deviceId": "esp-001", "name": "ESP Sensor 1", "pool": { ... } },
  "credential": { "token": "<plain-token-shown-once>" }
}
```

Device-side (ESP) quick guide

- Use `deviceId` as MQTT username.
- Use the `token` from the create response as MQTT password.
- Publish telemetry to `devices/{deviceId}/data`.

Provisioning notes

- Currently the server implements admin-driven provisioning (create device in Next.js). For automated device-initiated provisioning we can add a separate endpoint (e.g. `/api/device/provision`) where device requests a token with a factory key; ask if you want this implemented.

What "serial" means

- The `serial` field in provisioning payloads is a device identifier (metadata) used for bookkeeping, mapping, or audit. It is NOT the Arduino IDE "Serial" console output — it's an identity string you can obtain or assign to the hardware.
- Common sources for `serial`:
  - Chip / hardware ID (recommended for quick POC): use the MCU's chip id or MAC (ESP8266 `ESP.getChipId()`, ESP32 `ESP.getEfuseMac()` / MAC address). This is always available on the device.
  - Manufacturing serial / QR printed on the device: a human-readable code printed in factory and scanned during setup.
  - Server-generated serial: generated at production time and printed on labels (best control for large runs).
  - Firmware-embedded constant: a value baked into firmware (simpler but less flexible).

- How it's used:
  - Stored in `Device.metadata.serial` for audit and lookup.
  - Optional: server can map `serial` &rarr; `pool` during provisioning if you maintain a production mapping table.
  - Not used as the main authentication secret — `factoryCode`/token handles that.

Examples (get chip id from device)

ESP32 (Arduino):

```cpp
String getDeviceSerial() {
  uint64_t mac = ESP.getEfuseMac();
  char buf[17];
  sprintf(buf, "%04llx%08llx", (mac >> 32) & 0xffff, mac & 0xffffffff);
  return String(buf);
}
```

ESP8266 (Arduino):

```cpp
String getDeviceSerial() {
  uint32_t id = ESP.getChipId();
  char buf[9];
  sprintf(buf, "%08x", id);
  return String(buf);
}
```

Note: choose the source that fits your workflow — for quick tests use the chip ID, for production use printed/managed serials or server-generated codes.

Next steps / improvements

- Add device-initiated provisioning endpoint (recommended for scale).
- Support token rotation and one-time display warnings in a frontend UI.
- Enforce broker ACLs so devices can only publish/subscribe to their allowed topics.

Example requests (JSON)

1) Create device (POST /api/device)

Request body:

```json
{
  "deviceId": "esp-001",
  "name": "ESP Sensor 1",
  "poolId": "64f0a1b2c3d4e5f678901234",
  "metadata": { "location": "Kolam A", "model": "Wemos D1" }
}
```

Successful response (201):

```json
{
  "device": {
    "_id": "64f1a2b3c4d5e6f789012345",
    "deviceId": "esp-001",
    "name": "ESP Sensor 1",
    "pool": {
      "_id": "64f0a1b2c3d4e5f678901234",
      "namaKolam": "Kolam A"
    },
    "status": "active",
    "metadata": { "location": "Kolam A", "model": "Wemos D1" }
  },
  "credential": {
    "token": "b2f5d5c3a1e4f6..."
  }
}
```

Note: store the returned token securely — it is shown only once.

2) List devices (GET /api/device)

No request body. Response example:

```json
[
  {
    "_id": "64f1a2b3c4d5e6f789012345",
    "deviceId": "esp-001",
    "name": "ESP Sensor 1",
    "pool": {
      "_id": "64f0a1b2c3d4e5f678901234",
      "namaKolam": "Kolam A"
    },
    "status": "active",
    "metadata": { "location": "Kolam A", "model": "Wemos D1" }
  }
]
```

3) Assign/unassign device to pool (PUT /api/device/:id)

Assign example (body):

```json
{
  "poolId": "64f0a1b2c3d4e5f678901234"
}
```

Unassign example (body):

```json
{
  "poolId": null
}
```

Successful response will return the updated device object (without secretHash).

4) Regenerate token (pattern)

Currently there is no dedicated endpoint for rotating tokens. A simple pattern is:

- Create a new token on the server, store its hash replacing the old one, and return the new token to the admin. The device must be reconfigured with the new token.

5) Device MQTT payload example (publish to `devices/{deviceId}/data`)

```json
{
  "token": "b2f5d5c3a1e4f6...",
  "waterLevel": 12.5,
  "temperature": 26.3,
  "humidity": 70,
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

Server will verify the `token` (compare hash) and, if valid, process and store readings (e.g., into `Flood` model) and update device `lastSeen`.

Headers required for admin endpoints

All admin endpoints require the Authorization header:

```
Authorization: Bearer <ADMIN_JWT>

Additional endpoints (device-facing)

- POST /api/device/provision — device can request provisioning. Body: { serial?, factoryCode, requestedPoolId?, deviceId? }
  - Requires `DEVICE_FACTORY_KEY` in server env to match `factoryCode`.
  - Returns: { deviceId, token, poolId }

- POST /api/device/config — device fetches its assigned config. Body: { deviceId, token }
  - Returns: { device, pool }

Example: provision device (device calls this on first boot):

```json
POST /api/device/provision
{
  "serial": "SN-001",
  "factoryCode": "your-factory-key",
  "requestedPoolId": "64f0a1b2c3d4e5f678901234"
}
```

Response (201):

```json
{
  "deviceId": "esp-7f3a9c1b",
  "token": "b2f5d5c3a1e4f6...",
  "poolId": "64f0a1b2c3d4e5f678901234"
}
```

Example: device fetch config:

```json
POST /api/device/config
{
  "deviceId": "esp-7f3a9c1b",
  "token": "b2f5d5c3a1e4f6..."
}
```

Response (200):

```json
{
  "device": { "_id": "...", "deviceId": "esp-7f3a9c1b", "name": "SN-001", "pool": { ... } },
  "pool": { "_id": "64f0a1b2c3d4e5f678901234", "namaKolam": "Kolam A" }
}
```

Environment variables

Add these to your `.env` / deployment environment:

- `MONGODB_URI` — MongoDB connection string (already required by the project)
- `JWT_SECRET`, `JWT_EXPIRES_IN` — for admin JWT auth
- `DEVICE_FACTORY_KEY` — secret factory key used by `/api/device/provision` to authenticate device-initiated provisioning

MQTT topics and ACL recommendations

- Telemetry (device -> server): `devices/{deviceId}/data`
- Commands (server -> device): `devices/{deviceId}/cmd` or `pools/{poolId}/cmd`

Recommendations:
- Configure broker ACLs so each device can only publish to `devices/{deviceId}/data` and subscribe to its `devices/{deviceId}/cmd` topic.
- Use TLS (mqtts) and strong device tokens.

Token rotation (recommended pattern)

This project doesn't include a dedicated token-rotation endpoint yet. Recommended pattern:

1. Admin requests token rotation for a device (new token generated server-side).
2. Server stores the new token hash and returns the new plaintext token to admin.
3. Admin (or device) updates the device with the new token.
4. Old token is revoked (replaced by the hash in DB).

Example (planned):

```bash
curl -X POST https://your-server/api/device/<deviceId>/rotate-token \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

The server would return `{ token: '<new-plaintext-token>' }` and save only its hash.

Arduino / ESP quick example (device-initiated provisioning + MQTT connect)

This is a minimal sketch outline to show the flow (not production-ready):

```cpp
// Pseudocode sketch
// 1) Connect to WiFi
// 2) POST /api/device/provision { serial, factoryCode }
// 3) Save returned deviceId + token in LittleFS or EEPROM
// 4) Connect to MQTT with username=deviceId and password=token

// Use Arduino HTTP and MQTT libraries (ESP8266WiFi, ESP8266HTTPClient, PubSubClient)

// On boot: if no token stored -> provision; otherwise -> connect MQTT
```

Planned improvements

- Add token rotation API and UI.
- Add a lightweight admin UI page to create devices and display the one-time token.
- Add broker automation to create per-device credentials (if broker provides API).

```

