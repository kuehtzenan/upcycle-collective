const { jsonErr } = require('./_utils');

// Thin server-side proxy for Helius, so the API key never reaches the
// browser. Handles both call shapes client pages need, discriminated by
// HTTP method (kept as one function — Vercel's function-count limit):
//   POST /api/rpc                          → standard Solana JSON-RPC
//                                             (single request or a batch array)
//   GET  /api/rpc?address=...&limit=100     → Helius Enhanced Transactions API
module.exports = async function handler(req, res) {
  if (req.method === 'POST') return proxyJsonRpc(req, res);
  if (req.method === 'GET')  return proxyEnhancedTx(req, res);
  return jsonErr(res, 405, 'GET or POST only');
};

async function proxyJsonRpc(req, res) {
  const rpc = process.env.HELIUS_RPC || 'https://api.devnet.solana.com';
  try {
    const r = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (e) {
    jsonErr(res, 502, `RPC proxy failed: ${e.message}`);
  }
}

async function proxyEnhancedTx(req, res) {
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
}
