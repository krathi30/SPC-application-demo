// Runs every question in evals/questions.json through the agent and scores it.
// Compare models by changing LLM_MODEL and re-running.
// Usage: BACKEND_URL=http://localhost:8088 LLM_API_KEY=... LLM_MODEL=... node scripts/run-evals.js
const fs = require('fs');
const path = require('path');
const { runAgent } = require('../src/agent');
const { config } = require('../src/llm');

const cases = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'evals', 'questions.json'), 'utf8'));
const DELAY_MS = parseInt(process.env.EVAL_DELAY_MS || '4000', 10); // stay under free-tier rate limits

(async () => {
  let passed = 0;
  const rows = [];
  for (const c of cases) {
    const started = Date.now();
    let result;
    try {
      result = await runAgent([{ role: 'user', content: c.question }]);
    } catch (err) {
      result = { answer: `ERROR: ${err.message}`, tools_used: [] };
    }
    const used = result.tools_used.map((t) => t.tool);
    const text = result.answer.toLowerCase().replace(/[\u2018\u2019]/g, "'");
    const toolsOk = c.expect_tools.every((t) => used.includes(t));
    const anyOk = !c.expect_any || c.expect_any.some((s) => text.includes(s.toLowerCase()));
    const allOk = !c.expect_all || c.expect_all.every((s) => text.includes(s.toLowerCase()));
    const ok = toolsOk && anyOk && allOk && !result.answer.startsWith('ERROR');
    if (ok) passed += 1;
    rows.push({ id: c.id, ok, seconds: ((Date.now() - started) / 1000).toFixed(1), tools: used.join(',') || '-', answer: result.answer.replace(/\s+/g, ' ').slice(0, 160) });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.id.padEnd(15)} ${rows.at(-1).seconds}s  tools=${rows.at(-1).tools}\n      ${rows.at(-1).answer}`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  console.log(`\nModel ${config.model}: ${passed}/${cases.length} passed`);
})();
