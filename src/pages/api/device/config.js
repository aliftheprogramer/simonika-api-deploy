// src/pages/api/device/config.js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import Device from '@/models/Device';

// Device config retrieval. Devices call this with JSON body { deviceId, token }
// Returns assigned pool info (if any) and device metadata.
export default async function handler(req, res) {
  await runMiddleware(req, res, cors);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await mongoConnect();
    const { deviceId, token } = req.body || {};
    if (!deviceId || !token) return res.status(400).json({ message: 'deviceId and token required' });

    const device = await Device.findOne({ deviceId }).select('+secretHash').populate('pool');
    if (!device) return res.status(404).json({ message: 'Device not found' });

    const ok = await device.verifyToken(token);
    if (!ok) return res.status(401).json({ message: 'Invalid token' });

    // return non-sensitive device info and pool
    const out = device.toObject();
    delete out.secretHash;
    return res.status(200).json({ device: out, pool: device.pool || null });
  } catch (err) {
    console.error('POST /api/device/config Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
