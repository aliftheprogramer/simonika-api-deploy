import runMiddleware, { cors } from '@/lib/cors';
import { initializeMqttClient, getReceivedMessages } from '@/lib/mqttClient';

// GET /api/mqtt/last?deviceId=00e5b570&limit=1&field=distance
export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  // preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  // make sure mqtt client initialized (so in-memory buffer is available)
  try {
    initializeMqttClient();
  } catch (err) {
    console.error('Failed to init MQTT client in /api/mqtt/last:', err.message || err);
  }

  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { deviceId, limit = '1', field } = req.query || {};
    if (!deviceId) return res.status(400).json({ message: 'deviceId query param is required' });

    const parsedLimit = parseInt(limit, 10) || 1;
    const msgs = getReceivedMessages({ deviceId, limit: parsedLimit });

    if (!msgs || msgs.length === 0) {
      return res.status(200).json({ messages: [], last: null });
    }

    const last = msgs[msgs.length - 1];

    // try to parse payload as JSON; if not JSON, try to coerce to number when appropriate
    let parsedPayload = null;
    try {
      parsedPayload = JSON.parse(last.payload);
    } catch (e) {
      // not JSON — try numeric
      const n = Number(last.payload);
      parsedPayload = Number.isNaN(n) ? last.payload : n;
    }

    // if user requested a specific field and payload is object, pick it
    let fieldValue = undefined;
    if (field) {
      if (parsedPayload && typeof parsedPayload === 'object') {
        fieldValue = parsedPayload[field] !== undefined ? parsedPayload[field] : null;
      } else {
        // if payload is scalar and field requested, return payload as-is
        fieldValue = parsedPayload;
      }
    }

    return res.status(200).json({ messages: msgs, last, parsedPayload, fieldValue });
  } catch (err) {
    console.error('GET /api/mqtt/last Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
