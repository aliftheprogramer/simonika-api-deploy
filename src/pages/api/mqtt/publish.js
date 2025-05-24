// src/pages/api/mqtt/publish.js
import runMiddleware, { cors } from '@/lib/cors';
import { initializeMqttClient } from '@/lib/mqttClient';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors); // Tambahkan ini

  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { topic, message } = req.body;
  if (!topic || message == null)
    return res.status(400).json({ error: 'Topic and message are required.' });

  const mqttClient = initializeMqttClient();

  if (mqttClient.connected) {
    const payload = typeof message === 'object' ? JSON.stringify(message) : String(message);
    mqttClient.publish(topic, payload, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to publish.', details: err.message });
      }
      return res.status(200).json({ topic, payload, status: 'Published successfully' });
    });
  } else {
    return res.status(503).json({ error: 'MQTT client not connected.' });
  }
}
