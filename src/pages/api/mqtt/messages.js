// src/pages/api/flood/messages.js
import { getReceivedMessages } from '@/lib/mqttClient';

export default function handler(req, res) {
  res.status(200).json(getReceivedMessages());
}
