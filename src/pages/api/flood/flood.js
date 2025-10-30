// src/pages/api/flood/flood.js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import Flood from '@/models/Flood';
import { authenticate } from '@/lib/auth';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === 'POST') {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      await mongoConnect();
      const { deviceId, waterLevel, temperature, humidity, timestamp, location, status } = req.body;
      if (!deviceId || waterLevel == null) return res.status(400).json({ message: 'deviceId and waterLevel are required' });

      const doc = new Flood({ deviceId, waterLevel, temperature, humidity, timestamp, location, status });
      await doc.save();
      return res.status(201).json(doc);
    } catch (err) {
      console.error('POST /api/flood Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  if (req.method === 'GET') {
    try {
      await mongoConnect();
      const records = await Flood.find().sort({ timestamp: -1 }).limit(100);
      return res.status(200).json(records);
    } catch (err) {
      console.error('GET /api/flood Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
