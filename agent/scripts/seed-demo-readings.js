// Creates demo production orders and readings through the public API, exactly
// as an operator would, with three deliberate stories for the agent to find:
//   Line 1: stable           Line 2: slice weight drifting upward (not yet red)
//   Line 3: one coating reading out of control
// Usage: APP_URL=http://localhost:8088 node scripts/seed-demo-readings.js
const crypto = require('crypto');

const APP_URL = (process.env.APP_URL || 'http://localhost:8088').replace(/\/$/, '');
const N = 20;

async function call(path, options = {}) {
  const res = await fetch(`${APP_URL}/api${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path}: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

// Small deterministic noise so runs are repeatable.
let seed = 42;
const noise = (scale) => { seed = (seed * 16807) % 2147483647; return ((seed / 2147483647) - 0.5) * 2 * scale; };
const r2 = (v) => Math.round(v * 100) / 100;

const stories = [
  { line: 1, product: 1, gen: (s, i) => ({ t: s.thickness_target + noise(0.04), w: s.weight_target + noise(0.8), c: s.coating_target + noise(0.5) }) },
  { line: 2, product: 3, gen: (s, i) => ({ t: s.thickness_target + noise(0.04), w: s.weight_target - 1.2 + i * 0.15 + noise(0.05), c: s.coating_target + noise(0.5) }) },
  { line: 3, product: 5, gen: (s, i) => ({ t: s.thickness_target + noise(0.04), w: s.weight_target + noise(0.8), c: i === N - 2 ? s.coating_ucl + 0.6 : s.coating_target + noise(0.5) }) },
];

(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const skus = await call('/skus');
  const active = await call('/production-orders/active');
  for (const story of stories) {
    const sku = skus.find((s) => s.id === story.product);
    const num = (k) => Number(sku[k]);
    const s = { thickness_target: num('thickness_target'), weight_target: num('weight_target'), coating_target: num('coating_target'), coating_ucl: num('coating_ucl') };
    let order = active.find((o) => o.line_id === story.line);
    if (!order) {
      order = await call('/production-orders', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ line_id: story.line, sku_id: sku.id, best_buy_code: `LOT-${story.line}${today.replace(/-/g, '')}`, shift: 'A', shift_date: today, po_number: `PO-DEMO-${story.line}00` }),
      });
    }
    for (let i = 0; i < N; i += 1) {
      const v = story.gen(s, i);
      const form = new FormData();
      Object.entries({
        sku_id: sku.id, line_id: story.line, freezer_number: 1, operator_initials: 'DM',
        thickness_value: r2(v.t), weight_value: r2(v.w), coating_value: r2(v.c),
        shift: 'A', shift_date: today, production_order_id: order.id, client_id: crypto.randomUUID(),
      }).forEach(([k, val]) => form.append(k, String(val)));
      await call('/measurements', { method: 'POST', body: form });
    }
    console.log(`Line ${story.line}: ${sku.product_name}, ${N} readings`);
  }
})().catch((err) => { console.error(err.message); process.exit(1); });
