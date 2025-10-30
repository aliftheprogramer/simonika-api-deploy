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

Next steps / improvements

- Add device-initiated provisioning endpoint (recommended for scale).
- Support token rotation and one-time display warnings in a frontend UI.
- Enforce broker ACLs so devices can only publish/subscribe to their allowed topics.
