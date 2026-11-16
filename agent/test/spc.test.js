const test = require('node:test');
const assert = require('node:assert');
const { analyze, checkRules } = require('../src/spc');

const L = { lcl: 56, lwl: 58, target: 60, uwl: 62, ucl: 64 };
const rules = (vals) => checkRules(vals, L).map((f) => f.rule);

test('stable readings raise no rules', () => {
  assert.deepStrictEqual(rules([60, 60.5, 59.6, 60.2, 59.9, 60.1, 59.8]), []);
});
test('R1: a point beyond a control limit', () => {
  assert.ok(rules([60, 65]).includes('R1'));
  assert.ok(rules([60, 55.9]).includes('R1'));
});
test('R2: 2 of 3 above the upper warning limit', () => {
  assert.ok(rules([62.5, 60, 63]).includes('R2'));
});
test('R3: 7 in a row above target', () => {
  assert.ok(rules([60.5, 60.2, 60.9, 60.1, 60.4, 60.3, 60.6]).includes('R3'));
  assert.ok(!rules([60.5, 60.2, 60.9, 59.1, 60.4, 60.3, 60.6]).includes('R3'));
});
test('R4: 6 in a row increasing', () => {
  assert.ok(rules([59, 59.2, 59.5, 59.9, 60.3, 60.8]).includes('R4'));
});
test('analyze orders newest-first API data and summarizes', () => {
  const sku = { weight_label: 'Slice Weight', weight_lcl: 56, weight_lwl: 58, weight_target: 60, weight_uwl: 62, weight_ucl: 64,
    thickness_lcl: 1, thickness_lwl: 2, thickness_target: 3, thickness_uwl: 4, thickness_ucl: 5,
    coating_lcl: 1, coating_lwl: 2, coating_target: 3, coating_uwl: 4, coating_ucl: 5 };
  const newestFirst = [{ weight_value: '65' }, { weight_value: '60' }];
  const r = analyze(newestFirst, sku).weight;
  assert.strictEqual(r.summary.latest, 65);
  assert.strictEqual(r.summary.latest_status, 'out_of_control');
  assert.strictEqual(r.verdict, 'out_of_control');
});
