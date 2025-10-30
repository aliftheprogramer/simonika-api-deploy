// src/pages/api/device/index.js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import Device from '@/models/Device';
import Pool from '@/models/Pool';
import { authenticate } from '@/lib/auth';
import crypto from 'crypto';

// Create, list devices
export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  // preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    // list devices (requires auth)
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      await mongoConnect();
      const devices = await Device.find().select('-secretHash').populate('pool');
      return res.status(200).json(devices);
    } catch (err) {
      console.error('GET /api/device Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  if (req.method === 'POST') {
    // create device (requires auth)
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      await mongoConnect();

      const { deviceId, name, poolId, metadata } = req.body || {};

      if (!deviceId) return res.status(400).json({ message: 'deviceId is required' });

      // check uniqueness
      const exists = await Device.findOne({ deviceId });
      if (exists) return res.status(409).json({ message: 'deviceId already exists' });

      // generate token for device (plain token returned once)
      const token = crypto.randomBytes(24).toString('hex');
      const secretHash = await Device.hashToken(token);

      const device = new Device({ deviceId, name, secretHash, metadata: metadata || {} });

      // if poolId provided, attach (ensure pool exists and not already assigned)
      if (poolId) {
        const pool = await Pool.findById(poolId);
        if (!pool) return res.status(404).json({ message: 'Pool not found' });
        if (pool.device) return res.status(409).json({ message: 'Pool already has a device assigned' });
        device.pool = pool._id;
        pool.device = device._id;
        await pool.save();
      }

      await device.save();

      // return device info (without secretHash) and plain token
      const out = device.toObject();
      delete out.secretHash;

      return res.status(201).json({ device: out, credential: { token } });
    } catch (err) {
      console.error('POST /api/device Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
