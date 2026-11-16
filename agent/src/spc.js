// Pure SPC statistics and rule checks. No AI here: numbers are computed in
// code so the model only has to explain them, never calculate them.

const PARAMS = ['thickness', 'weight', 'coating'];

function round(value, digits = 3) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function limitsFor(sku, param) {
  return {
    label: sku[`${param}_label`] || param,
    lcl: Number(sku[`${param}_lcl`]),
    lwl: Number(sku[`${param}_lwl`]),
    target: Number(sku[`${param}_target`]),
    uwl: Number(sku[`${param}_uwl`]),
    ucl: Number(sku[`${param}_ucl`]),
  };
}

function classify(value, l) {
  if (value < l.lcl || value > l.ucl) return 'out_of_control';
  if (value < l.lwl || value > l.uwl) return 'warning';
  return 'in_control';
}

// Rules, checked oldest -> newest. These are the classic Western Electric style
// run rules adapted to this app's warning/control limits:
//   R1  a point outside the control limits (LCL/UCL)
//   R2  2 of 3 consecutive points outside the same warning limit
//   R3  7 consecutive points on the same side of the target (process shifted)
//   R4  6 consecutive points steadily rising or falling (drift / trend)
function checkRules(values, l) {
  const findings = [];
  values.forEach((v, i) => {
    if (v < l.lcl || v > l.ucl) {
      findings.push({ rule: 'R1', index: i, message: `reading ${v} is outside the control limits (${l.lcl}-${l.ucl})` });
    }
  });

  for (let i = 2; i < values.length; i += 1) {
    const window = values.slice(i - 2, i + 1);
    const above = window.filter((v) => v > l.uwl).length;
    const below = window.filter((v) => v < l.lwl).length;
    if (above >= 2) findings.push({ rule: 'R2', index: i, message: '2 of 3 consecutive readings above the upper warning limit' });
    if (below >= 2) findings.push({ rule: 'R2', index: i, message: '2 of 3 consecutive readings below the lower warning limit' });
  }

  let side = 0;
  let run = 0;
  values.forEach((v, i) => {
    const s = Math.sign(v - l.target);
    run = s !== 0 && s === side ? run + 1 : (s === 0 ? 0 : 1);
    side = s;
    if (run === 7) {
      findings.push({ rule: 'R3', index: i, message: `7 consecutive readings ${s > 0 ? 'above' : 'below'} target: the process mean has likely shifted` });
    }
  });

  let up = 1;
  let down = 1;
  for (let i = 1; i < values.length; i += 1) {
    up = values[i] > values[i - 1] ? up + 1 : 1;
    down = values[i] < values[i - 1] ? down + 1 : 1;
    if (up === 6) findings.push({ rule: 'R4', index: i, message: '6 consecutive readings steadily increasing: likely drift' });
    if (down === 6) findings.push({ rule: 'R4', index: i, message: '6 consecutive readings steadily decreasing: likely drift' });
  }

  return findings;
}

function summarize(values, l) {
  const n = values.length;
  if (n === 0) return { count: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1)) : null;
  const statuses = values.map((v) => classify(v, l));
  return {
    count: n,
    latest: values[n - 1],
    latest_status: statuses[n - 1],
    mean: round(mean),
    std_dev: round(sd),
    mean_offset_from_target: round(mean - l.target),
    min: Math.min(...values),
    max: Math.max(...values),
    warnings: statuses.filter((s) => s === 'warning').length,
    out_of_control: statuses.filter((s) => s === 'out_of_control').length,
  };
}

// measurements: newest first (as the API returns them); sku: one product row.
function analyze(measurements, sku) {
  const ordered = [...measurements].reverse();
  const result = {};
  for (const param of PARAMS) {
    const l = limitsFor(sku, param);
    const values = ordered
      .map((m) => m[`${param}_value`])
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map(Number);
    const findings = checkRules(values, l);
    result[param] = {
      label: l.label,
      limits: { lcl: l.lcl, lwl: l.lwl, target: l.target, uwl: l.uwl, ucl: l.ucl },
      summary: summarize(values, l),
      rule_violations: findings,
      verdict: findings.some((f) => f.rule === 'R1') ? 'out_of_control'
        : findings.length > 0 ? 'unstable_pattern'
          : values.length === 0 ? 'no_data' : 'stable',
    };
  }
  return result;
}

module.exports = { analyze, checkRules, classify, summarize, limitsFor, PARAMS };
