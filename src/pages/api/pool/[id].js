// src/pages/api/pool/[id].js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import Pool from '@/models/Pool';
import { authenticate } from '@/lib/auth';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'Pool id is required' });

  await mongoConnect();

  if (req.method === 'GET') {
    try {
      const pool = await Pool.findById(id);
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
      const updates = req.body || {};
      const pool = await Pool.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
      if (!pool) return res.status(404).json({ message: 'Pool not found' });
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
      const pool = await Pool.findByIdAndDelete(id);
      if (!pool) return res.status(404).json({ message: 'Pool not found' });
      return res.status(200).json({ message: 'Pool deleted' });
    } catch (err) {
      console.error('DELETE /api/pool/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
