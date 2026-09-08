const { jsonErr } = require('./_utils');

// Thin proxy for Helius's Enhanced Transactions API — same reasoning as
// rpc.js, keeps the API key server-side. GET /api/helius-tx?address=...&limit=100[&before=...]
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return jsonErr(res, 405, 'GET only');

  // Prefer a standalone key; fall back to pulling it out of HELIUS_RPC's
  // ?api-key= query param so one env var can serve both proxies.
  const apiKey = process.env.HELIUS_API_KEY
    || new URL(process.env.HELIUS_RPC || '', 'https://x').searchParams.get('api-key');
  if (!apiKey) return jsonErr(res, 500, 'HELIUS_API_KEY (or HELIUS_RPC with ?api-key=) not set');

  const { address, limit = '100', before } = req.query || {};
  if (!address) return jsonErr(res, 400, 'address query param required');

  let url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&limit=${limit}`;
  if (before) url += `&before=${before}`;

  try {
    const r = await fetch(url);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    jsonErr(res, 502, `Helius proxy failed: ${e.message}`);
  }
};
