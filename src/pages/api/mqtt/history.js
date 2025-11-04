import runMiddleware, { cors } from '@/lib/cors';
import { initializeMqttClient, getReceivedMessages } from '@/lib/mqttClient';

// GET /api/mqtt/history?deviceId=00e5b570&limit=10
// Returns up to 10 most recent messages for a device
export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ensure mqtt client is active for in-memory buffer
  try {
    initializeMqttClient();
  } catch (err) {
    console.error('Failed to initialize MQTT client in /api/mqtt/history:', err);
  }

  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { deviceId } = req.query || {};
    if (!deviceId) return res.status(400).json({ message: 'deviceId query param is required' });

    // default to 10, cap at 10 even if provided larger
    let limit = 10;
    if (req.query.limit) {
      const n = parseInt(String(req.query.limit), 10);
      if (!Number.isNaN(n) && n > 0) limit = Math.min(n, 10);
    }

    const messages = getReceivedMessages({ deviceId, limit });
    const enriched = messages.map((m) => {
      let parsedPayload = null;
      try {
        parsedPayload = JSON.parse(m.payload);
      } catch (e) {
        const n = Number(m.payload);
        parsedPayload = Number.isNaN(n) ? m.payload : n;
      }
      return { ...m, parsedPayload };
    });
    return res.status(200).json({ deviceId, limit, messages: enriched });
  } catch (err) {
    console.error('GET /api/mqtt/history Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
