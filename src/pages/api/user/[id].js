// src/pages/api/user/[id].js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import User from '@/models/User';
import { authenticate } from '@/lib/auth';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  const { id } = req.query;
  if (!id) return res.status(400).json({ message: 'User id is required' });

  await mongoConnect();

  if (req.method === 'GET') {
    try {
      const user = await User.findById(id).select('-password');
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json(user);
    } catch (err) {
      console.error('GET /api/user/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  // Update user (only the user themself)
  if (req.method === 'PUT') {
    const authUser = await authenticate(req, res);
    if (!authUser) return;
    if (authUser._id.toString() !== id) return res.status(403).json({ message: 'Forbidden' });

    try {
      const updates = req.body || {};
      // prevent updating restricted fields
      delete updates.password; // password should be changed via a dedicated endpoint

      const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).select('-password');
      if (!user) return res.status(404).json({ message: 'User not found' });
      return res.status(200).json(user);
    } catch (err) {
      console.error('PUT /api/user/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const authUser = await authenticate(req, res);
    if (!authUser) return;
    if (authUser._id.toString() !== id) return res.status(403).json({ message: 'Forbidden' });

    try {
      await User.findByIdAndDelete(id);
      return res.status(200).json({ message: 'User deleted' });
    } catch (err) {
      console.error('DELETE /api/user/[id] Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
