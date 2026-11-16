const path = require('path');
const express = require('express');
const { runAgent } = require('./agent');
const limits = require('./limits');
const { config } = require('./llm');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', parseInt(process.env.TRUST_PROXY_HOPS || '1', 10));
app.use(express.json({ limit: '32kb' }));

const MAX_HISTORY = 10;
const MAX_CHARS = 1000;

// Only plain user/assistant text is accepted from the browser. System and tool
// messages are created by the server only, so a visitor cannot inject them.
function cleanHistory(raw) {
  if (!Array.isArray(raw)) return null;
  const msgs = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_HISTORY);
  if (msgs.length === 0 || msgs[msgs.length - 1].role !== 'user') return null;
  return msgs;
}

app.get('/api/agent/health', (req, res) => {
  res.json({ status: 'ok', model: config.model, key_configured: Boolean(config.apiKey) });
});

app.post('/api/agent/chat', async (req, res) => {
  const history = cleanHistory(req.body && req.body.messages);
  if (!history) return res.status(400).json({ error: 'Send { messages: [...] } ending with a user message.' });

  const allowed = limits.check(req.ip);
  if (!allowed.ok) return res.status(429).json({ error: allowed.reason });

  try {
    const result = await runAgent(history);
    console.log(JSON.stringify({ at: new Date().toISOString(), event: 'chat', model: result.model, tools: result.tools_used.map((t) => t.tool) }));
    res.json(result);
  } catch (err) {
    console.error('Agent error:', err.message);
    const status = err.status === 429 ? 503 : 502;
    res.status(status).json({ error: err.status === 429
      ? 'The free AI model is busy right now. Please try again in a minute.'
      : 'The assistant could not reach the AI model. Please try again.' });
  }
});

app.use('/chat', express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => res.redirect('/chat/'));

if (require.main === module) {
  const port = parseInt(process.env.PORT || '3002', 10);
  const server = app.listen(port, '0.0.0.0', () => console.log(`SPC agent listening on ${port} (model ${config.model})`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

module.exports = { app, cleanHistory };
