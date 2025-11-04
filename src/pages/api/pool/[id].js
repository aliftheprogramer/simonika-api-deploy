// src/pages/api/pool/[id].js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import Pool from '@/models/Pool';
import Device from '@/models/Device';
import { authenticate } from '@/lib/auth';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Pool id is required' });

  await mongoConnect();

  // CORS preflight handling (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    try {
      const pool = await Pool.findById(id).populate('device');
      if (!pool) return res.status(404).json({ message: 'Pool not found' });
      return res.status(200).json(pool);
    } catch (err) {
      console.error('GET /api/pool/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  // update
  if (req.method === 'PUT') {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      const updates = { ...(req.body || {}) };
      const deviceId = Object.prototype.hasOwnProperty.call(updates, 'deviceId') ? updates.deviceId : undefined;
      delete updates.deviceId; // prevent blind overwrite

      let pool = await Pool.findById(id);
      if (!pool) return res.status(404).json({ message: 'Pool not found' });

      // Handle device linking/unlinking if deviceId provided
      if (deviceId !== undefined) {
        if (deviceId === null || deviceId === '') {
          // Unlink device from this pool
          if (pool.device) {
            const oldDevice = await Device.findById(pool.device);
            if (oldDevice) {
              oldDevice.pool = null;
              await oldDevice.save();
            }
          }
          pool.device = null;
        } else {
          const device = await Device.findById(deviceId);
          if (!device) return res.status(404).json({ message: 'Device not found' });
          // prevent assigning device already bound to another pool (with auto-repair for inconsistent data)
          if (device.pool && device.pool.toString() !== pool._id.toString()) {
            const otherPool = await Pool.findById(device.pool);
            const consistent = !!(otherPool && otherPool.device && otherPool.device.toString() === device._id.toString());
            if (consistent) {
              return res.status(409).json({ message: 'Device already assigned to another pool' });
            }
            // Inconsistent state: device points to a pool that doesn't point back -> repair by clearing device.pool
            device.pool = null;
            await device.save();
          }
          // prevent assigning if this pool already has a different device
          if (pool.device && pool.device.toString() !== device._id.toString()) {
            return res.status(409).json({ message: 'Pool already has a device assigned' });
          }
          pool.device = device._id;
          device.pool = pool._id;
          await device.save();
        }
      }

      // Apply other updates to pool
      Object.assign(pool, updates);
      await pool.save(); // pre-save will sync activeKolam

      pool = await pool.populate('device');
      return res.status(200).json(pool);
    } catch (err) {
      console.error('PUT /api/pool/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      const pool = await Pool.findById(id);
      if (!pool) return res.status(404).json({ message: 'Pool not found' });

      // Unlink device if linked
      if (pool.device) {
        const device = await Device.findById(pool.device);
        if (device) {
          device.pool = null;
          await device.save();
        }
      }

      await Pool.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Pool deleted' });
    } catch (err) {
      console.error('DELETE /api/pool/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
