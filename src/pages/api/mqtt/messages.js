import runMiddleware, { cors } from '@/lib/cors';
import { initializeMqttClient, getReceivedMessages } from '@/lib/mqttClient';

// GET /api/mqtt/messages?deviceId=esp-123&limit=10
export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  // ensure mqtt client is active
  try {
    initializeMqttClient();
  } catch (err) {
    console.error('Failed to initialize MQTT client:', err);
  }

  if (req.method === 'GET') {
    try {
      const { deviceId, limit } = req.query || {};
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const messages = getReceivedMessages({ deviceId, limit: parsedLimit });
      return res.status(200).json({ messages });
    } catch (err) {
      console.error('GET /api/mqtt/messages Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
