// src/pages/api/pool/device.js
// Dedicated endpoint to link/unlink a device to a pool without restructuring dynamic routes.
// - POST: link device to pool -> body: { poolId, deviceId }
// - DELETE: unlink device from pool -> body: { poolId }
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import { authenticate } from '@/lib/auth';
import Pool from '@/models/Pool';
import Device from '@/models/Device';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  // Require auth for modifying links
  const user = await authenticate(req, res);
  if (!user) return; // authenticate already handled response

  try {
    await mongoConnect();

    if (req.method === 'POST') {
      const { poolId, deviceId } = req.body || {};
      if (!poolId || !deviceId) {
        return res.status(400).json({ message: 'poolId and deviceId are required' });
      }

      const pool = await Pool.findById(poolId);
      if (!pool) return res.status(404).json({ message: 'Pool not found' });

      // Find device by _id first; if not found, try by deviceId string
      let device = null;
      if (deviceId.match && deviceId.match(/^[a-f\d]{24}$/i)) {
        device = await Device.findById(deviceId);
      }
      if (!device) {
        device = await Device.findOne({ deviceId });
      }
      if (!device) return res.status(404).json({ message: 'Device not found' });

      // Conflict checks with auto-repair for inconsistent data
      if (pool.device && pool.device.toString() !== device._id.toString()) {
        return res.status(409).json({ message: 'Pool already has a device assigned' });
      }
      if (device.pool && device.pool.toString() !== pool._id.toString()) {
        // Check if the referenced other pool truly has this device linked
        const otherPool = await Pool.findById(device.pool);
        const consistent = !!(otherPool && otherPool.device && otherPool.device.toString() === device._id.toString());
        if (consistent) {
          return res.status(409).json({ message: 'Device already assigned to another pool' });
        }
        // Inconsistent state: device points to a pool that doesn't point back -> repair by clearing device.pool
        device.pool = null;
        await device.save();
      }

      // Idempotent assignment
      pool.device = device._id;
      await pool.save(); // pre-save will set activeKolam
      device.pool = pool._id;
      await device.save();

      const populated = await Pool.findById(pool._id).populate('device');
      return res.status(200).json({ message: 'Device linked to pool', pool: populated });
    }

    if (req.method === 'DELETE') {
      const { poolId } = req.body || {};
      if (!poolId) return res.status(400).json({ message: 'poolId is required' });

      const pool = await Pool.findById(poolId);
      if (!pool) return res.status(404).json({ message: 'Pool not found' });

      if (!pool.device) {
        return res.status(200).json({ message: 'Pool has no device linked', pool });
      }

      const device = await Device.findById(pool.device);
      if (device) {
        device.pool = null;
        await device.save();
      }

      pool.device = null;
      await pool.save(); // activeKolam auto-updates

      const populated = await Pool.findById(pool._id).populate('device');
      return res.status(200).json({ message: 'Device unlinked from pool', pool: populated });
    }

    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('/api/pool/device Error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
}
