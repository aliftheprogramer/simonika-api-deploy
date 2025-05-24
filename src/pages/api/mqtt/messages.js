// src/pages/api/mqtt/messages.js
import runMiddleware, { cors } from '@/lib/cors';
import { getReceivedMessages } from '@/lib/mqttClient';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);
  res.status(200).json(getReceivedMessages());
}
