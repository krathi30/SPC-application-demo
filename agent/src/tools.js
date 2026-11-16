// Read-only tools the model may call. Each tool calls the SPC app's API over
// the private Docker network. None of them can change data.
const { analyze } = require('./spc');

const BACKEND_URL = (process.env.BACKEND_URL || 'http://backend:3001').replace(/\/$/, '');

async function api(path) {
  const res = await fetch(`${BACKEND_URL}/api${path}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`SPC API ${path} returned ${res.status}`);
  return res.json();
}

async function findLine(line) {
  const lines = await api('/lines');
  const wanted = String(line).trim().toLowerCase();
  const match = lines.find((l) => String(l.id) === wanted
    || l.display_name.toLowerCase() === wanted
    || l.display_name.toLowerCase() === `line ${wanted}`
    || l.name.toLowerCase() === wanted);
  if (!match) throw new Error(`No line called "${line}". Known lines: ${lines.map((l) => l.display_name).join(', ')}`);
  return match;
}

async function findProduct(product) {
  const skus = await api('/skus');
  const wanted = String(product).trim().toLowerCase();
  const match = skus.find((s) => String(s.id) === wanted || s.product_code === wanted)
    || skus.find((s) => s.product_name.toLowerCase() === wanted)
    || skus.find((s) => s.product_name.toLowerCase().includes(wanted));
  if (!match) throw new Error(`No product matching "${product}"`);
  return match;
}

function limitsOf(s) {
  const pick = (p) => ({ label: s[`${p}_label`], lcl: Number(s[`${p}_lcl`]), lwl: Number(s[`${p}_lwl`]), target: Number(s[`${p}_target`]), uwl: Number(s[`${p}_uwl`]), ucl: Number(s[`${p}_ucl`]) });
  return { thickness_mm: pick('thickness'), weight_g: pick('weight'), coating_g: pick('coating') };
}

const tools = {
  list_lines: {
    description: 'List the production lines with their number of freezers.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => (await api('/lines')).map((l) => ({ line: l.display_name, freezers: l.freezer_count })),
  },

  get_active_orders: {
    description: 'List production orders currently running: which product is on which line, PO number, shift and start time.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    run: async () => (await api('/production-orders/active')).map((o) => ({
      order_id: o.id, line: o.line_name, product: o.product_name, product_code: o.product_code,
      po_number: o.po_number, lot_code: o.best_buy_code, shift: o.shift, started_at: o.started_at,
    })),
  },

  get_product_limits: {
    description: 'Get a product\'s target and limits (LCL, LWL, target, UWL, UCL) for slice thickness, slice weight and coating weight.',
    parameters: {
      type: 'object',
      properties: { product: { type: 'string', description: 'Product name (or part of it) or product code' } },
      required: ['product'],
      additionalProperties: false,
    },
    run: async ({ product }) => {
      const s = await findProduct(product);
      return { product: s.product_name, product_code: s.product_code, limits: limitsOf(s) };
    },
  },

  analyze_line: {
    description: 'Analyse recent measurements on a line: summary statistics and SPC rule violations (out-of-control points, warning clusters, shifts, trends) per parameter. Use this to answer whether a line is in control. Statistics are computed in code and are exact.',
    parameters: {
      type: 'object',
      properties: {
        line: { type: 'string', description: 'Line name or number, e.g. "Line 2" or "2"' },
        freezer: { type: 'integer', description: 'Optional freezer number to narrow the analysis' },
        product: { type: 'string', description: 'Optional product; defaults to the product of the active order on that line' },
        last_n: { type: 'integer', description: 'How many recent readings to analyse (5-50, default 25)' },
      },
      required: ['line'],
      additionalProperties: false,
    },
    run: async ({ line, freezer, product, last_n }) => {
      const l = await findLine(line);
      let sku;
      if (product) {
        sku = await findProduct(product);
      } else {
        const active = (await api('/production-orders/active')).find((o) => o.line_id === l.id);
        if (!active) return { line: l.display_name, note: 'No active order on this line; pass a product to analyse past readings.' };
        sku = (await api('/skus')).find((s) => s.id === active.sku_id);
      }
      const n = Math.min(Math.max(parseInt(last_n, 10) || 25, 5), 50);
      const qs = new URLSearchParams({ line_id: l.id, sku_id: sku.id, limit: n });
      if (freezer) qs.set('freezer_number', freezer);
      const measurements = await api(`/measurements?${qs}`);
      return {
        line: l.display_name,
        freezer: freezer || 'all',
        product: sku.product_name,
        readings_analysed: measurements.length,
        oldest: measurements.at(-1)?.recorded_at || null,
        newest: measurements[0]?.recorded_at || null,
        parameters: analyze(measurements, sku),
      };
    },
  },

  get_recent_measurements: {
    description: 'Get the raw latest readings on a line (newest first), including operator initials and any adjustments noted.',
    parameters: {
      type: 'object',
      properties: {
        line: { type: 'string', description: 'Line name or number' },
        freezer: { type: 'integer', description: 'Optional freezer number' },
        limit: { type: 'integer', description: 'Number of readings, 1-20 (default 10)' },
      },
      required: ['line'],
      additionalProperties: false,
    },
    run: async ({ line, freezer, limit }) => {
      const l = await findLine(line);
      const qs = new URLSearchParams({ line_id: l.id, limit: Math.min(Math.max(parseInt(limit, 10) || 10, 1), 20) });
      if (freezer) qs.set('freezer_number', freezer);
      return (await api(`/measurements?${qs}`)).map((m) => ({
        time: m.recorded_at, freezer: m.freezer_number, product: m.product_name,
        thickness: m.thickness_value, weight: m.weight_value, coating: m.coating_value,
        status: m.status_overall, operator: m.operator_initials, adjustments: m.adjustments,
      }));
    },
  },
};

// Tool list in the OpenAI-compatible "tools" format.
const toolSchemas = Object.entries(tools).map(([name, t]) => ({
  type: 'function',
  function: { name, description: t.description, parameters: t.parameters },
}));

async function runTool(name, args) {
  const tool = tools[name];
  if (!tool) return { error: `Unknown tool ${name}` };
  try {
    return await tool.run(args || {});
  } catch (err) {
    return { error: err.message };
  }
}

module.exports = { toolSchemas, runTool, tools };
