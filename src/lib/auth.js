import jwt from 'jsonwebtoken';
import mongoConnect from '@/lib/mongoConnect';
import User from '@/models/User';

export async function authenticate(req, res) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization token required' });
    return null;
  }

  // ensure JWT secret present
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set in environment');
    res.status(500).json({ message: 'Server misconfiguration: JWT_SECRET is not set' });
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await mongoConnect();
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return null;
    }
    return user;
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token', error: err.message });
    return null;
  }
}

export default authenticate;
