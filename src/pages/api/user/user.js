// src/pages/api/user/user.js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import User from '@/models/User';
import { authenticate } from '@/lib/auth';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === 'GET') {
    // list users (requires auth)
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      await mongoConnect();
      const users = await User.find().select('-password').sort({ createdAt: -1 });
      return res.status(200).json(users);
    } catch (err) {
      console.error('GET /api/user Error:', err);
      return res.status(500).json({ message: 'Server error', error: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
