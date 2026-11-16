// Minimal client for any OpenAI-compatible chat API (OpenRouter, OpenAI,
// a local Ollama, ...). Switching provider or model = changing env vars.
const config = {
  baseUrl: (process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, ''),
  apiKey: process.env.LLM_API_KEY || '',
  model: process.env.LLM_MODEL || 'openrouter/free',
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '700', 10),
  timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '60000', 10),
};

async function chat(messages, tools) {
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      'X-Title': 'SPC Demo Agent',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: config.maxTokens,
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `Model API returned ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const choice = body.choices && body.choices[0];
  if (!choice) throw new Error('Model API returned no answer');
  return { message: choice.message, model: body.model || config.model, usage: body.usage || null };
}

module.exports = { chat, config };
