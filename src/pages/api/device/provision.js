// src/pages/api/device/provision.js
import mongoConnect from '@/lib/mongoConnect';
import Device from '@/models/Device';
import Pool from '@/models/Pool';
import crypto from 'crypto';

// Device provisioning endpoint (device-initiated)
// Body: { serial?: string, factoryCode: string, requestedPoolId?: string, deviceId?: string }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await mongoConnect();

    const { serial, factoryCode, requestedPoolId, deviceId: requestedDeviceId } = req.body || {};

    if (!factoryCode || factoryCode !== process.env.DEVICE_FACTORY_KEY) {
      return res.status(403).json({ message: 'Invalid factory code' });
    }

    // generate deviceId if not provided
    const deviceId = requestedDeviceId || `esp-${crypto.randomBytes(4).toString('hex')}`;

    // check uniqueness
    const exists = await Device.findOne({ deviceId });
    if (exists) return res.status(409).json({ message: 'deviceId already exists' });

    // create token
    const token = crypto.randomBytes(24).toString('hex');
    const secretHash = await Device.hashToken(token);

    const device = new Device({ deviceId, name: serial || deviceId, secretHash, metadata: { serial } });

    // optional pool assignment
    if (requestedPoolId) {
      const pool = await Pool.findById(requestedPoolId);
      if (!pool) return res.status(404).json({ message: 'Pool not found' });
      if (pool.device) return res.status(409).json({ message: 'Pool already has a device assigned' });
      device.pool = pool._id;
      pool.device = device._id;
      await pool.save();
    }

    await device.save();

    return res.status(201).json({ deviceId: device.deviceId, token, poolId: device.pool || null });
  } catch (err) {
    console.error('POST /api/device/provision Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
