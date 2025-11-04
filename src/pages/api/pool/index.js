// src/pages/api/pool/index.js
// Primary handler for /api/pool (list, create) — consolidated from pool/pool.js
import runMiddleware, { cors } from '@/lib/cors';
import mongoConnect from '@/lib/mongoConnect';
import Pool from '@/models/Pool';
import Device from '@/models/Device';
import { authenticate } from '@/lib/auth';
import { initializeMqttClient, getReceivedMessages } from '@/lib/mqttClient';

export default async function handler(req, res) {
	await runMiddleware(req, res, cors);

		// Handle CORS preflight requests explicitly so serverless platforms
		// (like Vercel) don't hit the default 405 path when browsers send OPTIONS.
		if (req.method === 'OPTIONS') {
			return res.status(204).end();
		}

	if (req.method === 'GET') {
		// List pools
		try {
			await mongoConnect();
			// ensure mqtt client is initialized so in-memory buffer is ready
			try { initializeMqttClient(); } catch {}

			const pools = await Pool.find().populate('device').sort({ createdAt: -1 });

			// Attach last MQTT message per pool's device if available
			const enriched = await Promise.all(
				pools.map(async (p) => {
					const obj = p.toObject();
					let lastMessage = null;
					if (obj.device) {
						const candidates = [];
						if (obj.device.deviceId) candidates.push(obj.device.deviceId);
						if (obj.device.metadata && obj.device.metadata.serial) candidates.push(obj.device.metadata.serial);
						for (const candidate of candidates) {
							if (!candidate) continue;
							const msgs = getReceivedMessages({ deviceId: String(candidate), limit: 1 });
							if (msgs && msgs.length) {
								lastMessage = msgs[msgs.length - 1];
								break;
							}
						}
					}
					return { ...obj, lastMessage };
				})
			);

			return res.status(200).json(enriched);
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
			const { namaKolam, kedalamanTotal, levelMinimum, levelMaksimum, targetLevelNormal, deviceId } = req.body || {};
			if (!namaKolam || kedalamanTotal == null || levelMinimum == null || levelMaksimum == null || targetLevelNormal == null) {
				return res.status(400).json({ message: 'All fields are required.' });
			}

			const pool = new Pool({ namaKolam, kedalamanTotal, levelMinimum, levelMaksimum, targetLevelNormal });

			// Optional device linking on create
			if (deviceId) {
				const device = await Device.findById(deviceId);
				if (!device) return res.status(404).json({ message: 'Device not found' });
				if (device.pool) return res.status(409).json({ message: 'Device already assigned to a pool' });
				// Ensure pool doesn't already have a device (it won't, just created)
				pool.device = device._id;
				// pre-save hook will set activeKolam accordingly
				await pool.save();
				device.pool = pool._id;
				await device.save();
				return res.status(201).json(await pool.populate('device'));
			}

			await pool.save();
			return res.status(201).json(pool);
		} catch (err) {
			console.error('POST /api/pool Error:', err);
			return res.status(500).json({ message: 'Server error', error: err.message });
		}
	}

	return res.status(405).json({ message: 'Method not allowed' });
}

