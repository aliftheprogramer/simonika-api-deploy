// src/pages/api/device/[id].js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import Device from '@/models/Device';
import Pool from '@/models/Pool';
import { authenticate } from '@/lib/auth';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  // preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Device id is required' });

  await mongoConnect();

  if (req.method === 'GET') {
    try {
      const device = await Device.findById(id).select('-secretHash').populate('pool');
      if (!device) return res.status(404).json({ message: 'Device not found' });
      return res.status(200).json(device);
    } catch (err) {
      console.error('GET /api/device/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  if (req.method === 'PUT') {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      const updates = req.body || {};

      // handle pool reassignment explicitly
      if (updates.poolId !== undefined) {
        const pool = updates.poolId ? await Pool.findById(updates.poolId) : null;
        if (updates.poolId && !pool) return res.status(404).json({ message: 'Pool not found' });

        const device = await Device.findById(id);
        if (!device) return res.status(404).json({ message: 'Device not found' });

        // if assigning to a pool, ensure pool not already taken
        if (pool) {
          if (pool.device && pool.device.toString() !== device._id.toString()) {
            return res.status(409).json({ message: 'Pool already has a different device assigned' });
          }
          pool.device = device._id;
          device.pool = pool._id;
          await pool.save();
        } else {
          // unassign: clear previous pool.device
          if (device.pool) {
            const prev = await Pool.findById(device.pool);
            if (prev) {
              prev.device = undefined;
              await prev.save();
            }
          }
          device.pool = null;
        }

        // apply other updates except poolId
        delete updates.poolId;
        Object.assign(device, updates);
        await device.save();
        const out = device.toObject();
        delete out.secretHash;
        return res.status(200).json(out);
      }

      // normal updates (name, status, metadata)
      const device = await Device.findByIdAndUpdate(id, updates, { new: true }).select('-secretHash');
      if (!device) return res.status(404).json({ message: 'Device not found' });
      return res.status(200).json(device);
    } catch (err) {
      console.error('PUT /api/device/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      const device = await Device.findById(id);
      if (!device) return res.status(404).json({ message: 'Device not found' });

      // clear pool assignment if present
      if (device.pool) {
        const pool = await Pool.findById(device.pool);
        if (pool) {
          pool.device = undefined;
          await pool.save();
        }
      }

      await Device.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Device deleted' });
    } catch (err) {
      console.error('DELETE /api/device/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
