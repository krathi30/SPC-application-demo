const test = require('node:test');
const assert = require('node:assert');
const { skus, assertLimitOrder } = require('../src/seeds/seedData');

test('every demo SKU has limits in order LCL <= LWL <= Target <= UWL <= UCL', () => {
  for (const sku of skus) assert.doesNotThrow(() => assertLimitOrder(sku), sku.product_code);
});

test('demo SKU limits are symmetric with control limits at twice the warning distance', () => {
  for (const sku of skus) {
    for (const p of ['thickness', 'weight', 'coating']) {
      const t = sku[`${p}_target`];
      const w = sku[`${p}_uwl`] - t;
      assert.ok(Math.abs((t - sku[`${p}_lwl`]) - w) < 1e-9, `${sku.product_code} ${p} warning not symmetric`);
      assert.ok(Math.abs((sku[`${p}_ucl`] - t) - 2 * w) < 1e-9, `${sku.product_code} ${p} UCL not 2w`);
      assert.ok(Math.abs((t - sku[`${p}_lcl`]) - 2 * w) < 1e-9, `${sku.product_code} ${p} LCL not 2w`);
    }
  }
});

test('limits out of order are rejected', () => {
  const bad = { ...skus[0], weight_lwl: skus[0].weight_target + 1 };
  assert.throws(() => assertLimitOrder(bad), /out of order/);
});
