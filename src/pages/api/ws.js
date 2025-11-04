// src/pages/api/ws.js
// WebSocket endpoint for real-time MQTT message streaming
// Connect from frontend with: const ws = new WebSocket(`${origin}/api/ws?deviceId=00e5b570`)

import { onMqttMessage, initializeMqttClient } from '@/lib/mqttClient';

export const config = {
  api: {
    // Disable body parsing (not needed) and keep the Node server available
    bodyParser: false,
  },
};

export default function handler(req, res) {
  // Ensure MQTT client is running so we get events to stream
  try { initializeMqttClient(); } catch {}

  if (!res.socket.server) {
    res.status(500).end('Server not ready');
    return;
  }

  if (!res.socket.server.wss) {
    // Lazy-init a WS server and attach to the underlying HTTP server
    const { Server } = require('ws');
    const wss = new Server({ server: res.socket.server });
    res.socket.server.wss = wss;

    // Broadcast helper with per-client filtering
    const broadcast = (msg) => {
      wss.clients.forEach((client) => {
        if (client.readyState !== 1) return; // OPEN
        // If client set a filter (deviceId), only send matching messages
        if (client.filterDeviceId) {
          const did = client.filterDeviceId;
          // Match based on topic devices/{did}/data or payload JSON deviceId/id
          let match = false;
          const tmatch = msg.topic && msg.topic.match(/^devices\/([^/]+)\/data$/);
          if (tmatch && tmatch[1] === did) match = true;
          if (!match) {
            try {
              const obj = JSON.parse(msg.payload);
              if (obj && (obj.deviceId === did || obj.id === did)) match = true;
            } catch {}
          }
          if (!match) return;
        }
        try { client.send(JSON.stringify({ type: 'mqtt', ...msg })); } catch {}
      });
    };

    // Subscribe once to MQTT messages and broadcast to clients
    res.socket.server._unsubMqtt = onMqttMessage(broadcast);

    wss.on('connection', (ws, request) => {
      // Parse deviceId filter from query string
      try {
        const url = new URL(request.url, 'http://localhost');
        const deviceId = url.searchParams.get('deviceId');
        if (deviceId) ws.filterDeviceId = deviceId;
      } catch {}

      // Send a hello payload
      try { ws.send(JSON.stringify({ type: 'hello', ok: true })); } catch {}

      ws.on('message', (buf) => {
        // Optional: allow client to update filter dynamically via JSON { action: 'filter', deviceId }
        try {
          const data = JSON.parse(buf.toString());
          if (data && data.action === 'filter') {
            ws.filterDeviceId = data.deviceId || null;
            ws.send(JSON.stringify({ type: 'ack', filterDeviceId: ws.filterDeviceId || null }));
          }
        } catch {}
      });

      ws.on('close', () => {
        // Nothing special per-connection; we keep the global MQTT listener
      });
    });
  }

  // Immediately end HTTP request; the upgrade is handled by ws server
  res.status(200).end('WebSocket server is ready');
}
