// src/lib/cors.js
import Cors from 'cors';

// Use a dynamic origin handler so the server echoes back the request Origin.
// This allows browser clients (including Flutter web) to use the API from any origin
// while still supporting credentials if needed. If you prefer a stricter policy,
// replace the origin function with an allowlist check.
const cors = Cors({
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // echo the request origin (allows cross-origin usage from anywhere)
  origin: (origin, callback) => {
    // allow requests with no origin like server-to-server or mobile clients
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  // allow credentials (cookies, Authorization header) if clients send them
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Kuma-Revision'],
  preflightContinue: false,
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      return result instanceof Error ? reject(result) : resolve(result);
    });
  });
}

export default runMiddleware;
export { cors };
