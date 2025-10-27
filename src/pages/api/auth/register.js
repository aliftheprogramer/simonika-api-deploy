import jwt from 'jsonwebtoken';
import mongoConnect from '@/lib/mongoConnect';
import User from '@/models/User';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method tidak diizinkan' });
  }

  try {
    await mongoConnect();

    const { name, username, password } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }

    // Cek apakah username sudah dipakai
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username sudah digunakan.' });
    }

    // Buat user baru
    const user = new User({ name, username, password });
    await user.save();

    // Buat token JWT
    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

    return res.status(201).json({
      message: 'Registrasi berhasil',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
      },
      token,
    });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan server', error: error.message });
  }
}
