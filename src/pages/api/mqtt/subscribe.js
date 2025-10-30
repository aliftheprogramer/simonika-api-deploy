// src/pages/api/mqtt/subscribe.js
import runMiddleware, { cors } from '@/lib/cors';
import { initializeMqttClient, setSubscribeTopic, getCurrentSubscribeTopic } from '@/lib/mqttClient';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === 'GET') {
    return res.status(200).json({ subscribed_topic: getCurrentSubscribeTopic() });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    // allow topic in body or query for simplicity
    const topic = (body.topic || req.query.topic || '').toString();

    if (!topic) {
      return res.status(400).json({ error: 'topic is required in body or query' });
    }

    try {
      // ensure client exists (will subscribe on connect to current topic)
      initializeMqttClient();
      const result = await setSubscribeTopic(topic);
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      console.error('[API] Failed to set subscribe topic', err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end('Method Not Allowed');
}
