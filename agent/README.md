# SPC Agent

A small, read-only AI assistant that runs as its own service beside the SPC app.
Open it at `/chat/`.

## How it works

```
browser ──► nginx ──► agent (this service) ──► AI model (OpenAI-compatible API)
                          │
                          └──► SPC backend API (read-only tools)
```

1. The browser sends the question (plus the last few messages).
2. The agent sends it to the model together with a list of **tools** it may use.
3. If the model asks for a tool, the agent runs it against the SPC API and sends
   the result back. This repeats (max 5 steps) until the model answers in text.

The model never touches the database, and every tool is read-only. Statistics and
SPC rule checks are computed in code (`src/spc.js`); the model only explains them.

| Tool | What it does |
|------|--------------|
| `list_lines` | Lines and freezer counts |
| `get_active_orders` | What is running on each line |
| `get_product_limits` | LCL/LWL/target/UWL/UCL for a product |
| `analyze_line` | Stats + rule checks R1-R4 on recent readings |
| `get_recent_measurements` | Raw latest readings |

Rules: **R1** point outside control limits, **R2** 2 of 3 outside a warning limit,
**R3** 7 in a row on one side of target (shift), **R4** 6 in a row rising/falling (drift).

## Settings (in the repo-root `.env`)

| Variable | Default | Meaning |
|----------|---------|---------|
| `LLM_BASE_URL` | `https://openrouter.ai/api/v1` | Any OpenAI-compatible API |
| `LLM_API_KEY` | (none) | Your key. Never commit it. |
| `LLM_MODEL` | `openrouter/free` (compose: `nvidia/nemotron-3.5-lightning:free`) | Model id; swap without code changes |
| `LLM_FALLBACK_MODELS` | (none; compose: `openrouter/free`) | Comma-separated backups tried in order (OpenRouter only) |
| `AGENT_DAILY_LIMIT` | 40 | Questions per day, all visitors |
| `AGENT_PER_MINUTE` | 6 | Questions per minute, per visitor |

## Developing

```bash
cd agent && npm install && npm test          # unit + loop tests, no key needed
APP_URL=http://localhost node scripts/seed-demo-readings.js   # demo readings
BACKEND_URL=http://localhost LLM_API_KEY=... LLM_MODEL=... npm run evals
```

`npm run evals` asks the 10 questions in `evals/questions.json` and scores the
answers, so different models can be compared on the same test.
