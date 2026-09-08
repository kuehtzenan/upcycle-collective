const { jsonErr } = require('./_utils');

// Thin proxy for Solana JSON-RPC calls (single request or a batch array) so
// the browser never sees the Helius API key — client pages POST their
// JSON-RPC body here instead of hitting Helius directly.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return jsonErr(res, 405, 'POST only');

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
};
