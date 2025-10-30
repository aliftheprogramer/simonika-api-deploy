// src/pages/api/pool/index.js
// Primary handler for /api/pool (list, create) — consolidated from pool/pool.js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import Pool from '@/models/Pool';
import { authenticate } from '@/lib/auth';

export default async function handler(req, res) {
	await runMiddleware(req, res, cors);

	if (req.method === 'GET') {
		// List pools
		try {
			await mongoConnect();
			const pools = await Pool.find().sort({ createdAt: -1 });
			return res.status(200).json(pools);
		} catch (err) {
			console.error('GET /api/pool Error:', err);
			return res.status(500).json({ message: 'Server error', error: err.message });
		}
	}

	if (req.method === 'POST') {
		// Create pool (requires auth)
		const user = await authenticate(req, res);
		if (!user) return; // authenticate already sent response

		try {
			await mongoConnect();
			const { namaKolam, kedalamanTotal, levelMinimum, levelMaksimum, targetLevelNormal } = req.body;
			if (!namaKolam || kedalamanTotal == null || levelMinimum == null || levelMaksimum == null || targetLevelNormal == null) {
				return res.status(400).json({ message: 'All fields are required.' });
			}

			const pool = new Pool({ namaKolam, kedalamanTotal, levelMinimum, levelMaksimum, targetLevelNormal });
			await pool.save();
			return res.status(201).json(pool);
		} catch (err) {
			console.error('POST /api/pool Error:', err);
			return res.status(500).json({ message: 'Server error', error: err.message });
		}
	}

	return res.status(405).json({ message: 'Method not allowed' });
}

