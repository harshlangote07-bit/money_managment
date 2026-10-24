'use strict';
const http = require('node:http');
const { generatePaths } = require('./engines/pathEngine');
const { saveActivePlan, getActivePlan } = require('./storage/planStore');
const PORT = Number(process.env.PORT || 3000);
function send(res, status, body) { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }); res.end(JSON.stringify(body)); }
function readBody(req) { return new Promise((resolve, reject) => { let data = ''; req.on('data', c => { data += c; if (data.length > 5_000_000) reject(new Error('Request body too large')); }); req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('Request body must be valid JSON')); } }); req.on('error', reject); }); }
const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  try {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, service: 'path-engine', version: '2.0.0' });
    if (req.method === 'POST' && req.url === '/api/paths/generate') return send(res, 200, generatePaths(await readBody(req)));
    if (req.method === 'POST' && req.url === '/api/paths/activate') {
      const body = await readBody(req);
      if (!body.input || !body.strategy) return send(res, 400, { error: 'Provide input and strategy' });
      const result = generatePaths(body.input);
      const selected = result.paths.find(p => p.strategy === body.strategy);
      if (!selected) return send(res, 404, { error: 'Strategy did not produce a distinct path; choose one of the returned path strategies.' });
      if (!selected.metrics.feasible && body.allowInfeasible !== true) return send(res, 409, { error: 'Selected path violates hard constraints. Set allowInfeasible=true only to save it explicitly as a best-effort compromise.', path: selected });
      return send(res, 200, { activePlan: saveActivePlan(selected, body.input) });
    }
    if (req.method === 'GET' && req.url === '/api/paths/active') return send(res, 200, { activePlan: getActivePlan() });
    return send(res, 404, { error: 'Not found' });
  } catch (e) {
    return send(res, e.name === 'ValidationError' ? 400 : 500, { error: e.message, details: e.details || undefined });
  }
});
server.listen(PORT, () => console.log(`Path Engine API listening on http://localhost:${PORT}`));
