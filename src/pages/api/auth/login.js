import jwt from 'jsonwebtoken';
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import User from '@/models/User';

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    await mongoConnect();

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password wajib diisi.' });
    }

    // Cari user dan include password
    const user = await User.findOne({ username }).select('+password');
    if (!user) {
      return res.status(400).json({ message: 'User tidak ditemukan.' });
    }

    // Bandingkan password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Password salah.' });
    }

    // Buat JWT token
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

    return res.status(200).json({
      message: 'Login berhasil',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
      },
      token,
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
}
