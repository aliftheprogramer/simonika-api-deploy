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
    // Create a WS server that upgrades only for path `/api/ws`
    const { Server } = require('ws');
    const wss = new Server({ noServer: true, perMessageDeflate: false });
    res.socket.server.wss = wss;

    // Broadcast helper with per-client filtering
    const broadcast = (msg) => {
      wss.clients.forEach((client) => {
        if (client.readyState !== 1) return; // OPEN
        if (client.filterDeviceId) {
          const did = client.filterDeviceId;
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

    // Simple heartbeat to keep connections alive and detect dead sockets
    wss.on('connection', (ws) => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
    });
    if (!res.socket.server._wsHeartbeat) {
      const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
          if (ws.isAlive === false) return ws.terminate();
          ws.isAlive = false;
          try { ws.ping(); } catch {}
        });
      }, 30000);
      res.socket.server._wsHeartbeat = interval;
    }

    // Handle HTTP -> WS upgrade only for /api/ws (attach once)
    if (!res.socket.server._wsUpgradeAttached) {
      res.socket.server.on('upgrade', (request, socket, head) => {
        try {
          const url = new URL(request.url, 'http://localhost');
          if (url.pathname !== '/api/ws') return; // ignore other upgrades

          wss.handleUpgrade(request, socket, head, (ws) => {
            // Initialize client filter from query
            const deviceId = url.searchParams.get('deviceId');
            ws.filterDeviceId = deviceId || null;

            wss.emit('connection', ws, request);
          });
        } catch (e) {
          try { socket.destroy(); } catch {}
        }
      });
      res.socket.server._wsUpgradeAttached = true;
    }

    // Per-connection behavior
    wss.on('connection', (ws) => {
      try { ws.send(JSON.stringify({ type: 'hello', ok: true })); } catch {}
      ws.on('error', () => { /* swallow per-connection errors to avoid crashing */ });

      ws.on('message', (buf) => {
        try {
          const data = JSON.parse(buf.toString());
          if (data && data.action === 'filter') {
            ws.filterDeviceId = data.deviceId || null;
            ws.send(JSON.stringify({ type: 'ack', filterDeviceId: ws.filterDeviceId || null }));
          }
        } catch {}
      });
    });
  }

  // For normal HTTP request, just acknowledge readiness
  res.status(200).end('WebSocket server is ready');
}
