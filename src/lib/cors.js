// src/lib/cors.js
import Cors from 'cors';

const cors = Cors({
  methods: ['GET', 'HEAD', 'POST'],
  origin: '*',
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
