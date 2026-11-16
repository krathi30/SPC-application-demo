const fs = require('fs');
const pool = require('../config/database');

const DEMO_LINES = [
  {
    name: 'line_1',
    display_name: 'Aurora 1',
    freezer_count: 4,
    asset_id: 'PLT0417-L1',
    freezers: [
      { freezer_number: 1, pump_count: 1, asset_id: 'PLT0417-L1-FRZ01' },
      { freezer_number: 2, pump_count: 1, asset_id: 'PLT0417-L1-FRZ02' },
      { freezer_number: 3, pump_count: 1, asset_id: 'PLT0417-L1-FRZ03' },
      { freezer_number: 4, pump_count: 1, asset_id: 'PLT0417-L1-FRZ04' },
    ],
  },
  {
    name: 'line_2',
    display_name: 'Aurora 2',
    freezer_count: 2,
    asset_id: 'PLT0417-L2',
    freezers: [
      { freezer_number: 1, pump_count: 2, asset_id: 'PLT0417-L2-FRZ01' },
      { freezer_number: 2, pump_count: 2, asset_id: 'PLT0417-L2-FRZ02' },
    ],
  },
  {
    name: 'line_3',
    display_name: 'Aurora 3',
    freezer_count: 2,
    asset_id: 'PLT0417-L3',
    freezers: [
      { freezer_number: 1, pump_count: 2, asset_id: 'PLT0417-L3-FRZ01' },
      { freezer_number: 2, pump_count: 2, asset_id: 'PLT0417-L3-FRZ02' },
    ],
  },
];

// Demo catalogue for the fictional Northwind Creamery Company, Aurora Department. These are NOT real
// products or specifications.
//
// How the limits are laid out (same convention the app uses everywhere):
//   LCL < LWL < Target < UWL < UCL, symmetric around the target, with the
//   control limits twice as far from target as the warning limits:
//     LWL/UWL = target -/+ w      (outside -> "warning", amber)
//     LCL/UCL = target -/+ 2w     (outside -> "out of control", red)
//
// To run a real site, keep the real catalogue OUT of Git: put it in a JSON file
// ({ "lines": [...], "skus": [...] }, same shape as below) on the server and
// point SEED_FILE at it.
const DEMO_SKUS = [
  {
    product_name: 'Aurora Vanilla Classic Bars',
    product_code: '90001001',
    cr_code: 'CR-7101_1',
    sort_order: 1,
    startup_cup_weight_target: 112.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 19.8, thickness_lcl: 19.6, thickness_lwl: 19.7, thickness_uwl: 19.9, thickness_ucl: 20.0,
    weight_label: 'Slice Weight',
    weight_target: 60.0, weight_lcl: 56.0, weight_lwl: 58.0, weight_uwl: 62.0, weight_ucl: 64.0,
    coating_label: 'Coating Weight',
    coating_target: 22.5, coating_lcl: 20.1, coating_lwl: 21.3, coating_uwl: 23.7, coating_ucl: 24.9,
  },
  {
    product_name: 'Aurora Toffee Crunch Bars',
    product_code: '90001002',
    cr_code: 'CR-7102_1',
    sort_order: 2,
    startup_cup_weight_target: 109.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.5, thickness_lcl: 17.3, thickness_lwl: 17.4, thickness_uwl: 17.6, thickness_ucl: 17.7,
    weight_label: 'Slice Weight',
    weight_target: 51.0, weight_lcl: 47.0, weight_lwl: 49.0, weight_uwl: 53.0, weight_ucl: 55.0,
    coating_label: 'Coating Weight w/Inclusion',
    coating_target: 20.0, coating_lcl: 17.4, coating_lwl: 18.7, coating_uwl: 21.3, coating_ucl: 22.6,
  },
  {
    product_name: 'Aurora Crispy Rice Bars',
    product_code: '90001003',
    cr_code: 'CR-7103_1',
    sort_order: 3,
    startup_cup_weight_target: 112.5,
    thickness_label: 'Slice Thickness',
    thickness_target: 18.4, thickness_lcl: 18.2, thickness_lwl: 18.3, thickness_uwl: 18.5, thickness_ucl: 18.6,
    weight_label: 'Slice Weight',
    weight_target: 56.0, weight_lcl: 52.0, weight_lwl: 54.0, weight_uwl: 58.0, weight_ucl: 60.0,
    coating_label: 'Coating Weight w/Crisp Rice',
    coating_target: 24.0, coating_lcl: 21.6, coating_lwl: 22.8, coating_uwl: 25.2, coating_ucl: 26.4,
  },
  {
    product_name: 'Aurora Peanut Butter Swirl Bars',
    product_code: '90001004',
    cr_code: 'CR-7104_1',
    sort_order: 4,
    startup_cup_weight_target: 110.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.3, thickness_lcl: 17.1, thickness_lwl: 17.2, thickness_uwl: 17.4, thickness_ucl: 17.5,
    weight_label: 'Slice Weight w/ Variegate',
    weight_target: 49.5, weight_lcl: 46.5, weight_lwl: 48.0, weight_uwl: 51.0, weight_ucl: 52.5,
    coating_label: 'Coating Weight',
    coating_target: 17.5, coating_lcl: 16.3, coating_lwl: 16.9, coating_uwl: 18.1, coating_ucl: 18.7,
  },
  {
    product_name: 'Aurora Dark Chocolate Bars',
    product_code: '90001005',
    cr_code: 'CR-7105_1',
    sort_order: 5,
    startup_cup_weight_target: 112.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 19.4, thickness_lcl: 19.2, thickness_lwl: 19.3, thickness_uwl: 19.5, thickness_ucl: 19.6,
    weight_label: 'Slice Weight',
    weight_target: 61.0, weight_lcl: 57.0, weight_lwl: 59.0, weight_uwl: 63.0, weight_ucl: 65.0,
    coating_label: 'Coating Weight',
    coating_target: 22.8, coating_lcl: 20.4, coating_lwl: 21.6, coating_uwl: 24.0, coating_ucl: 25.2,
  },
  {
    product_name: 'Aurora Double Chocolate Bars',
    product_code: '90001006',
    cr_code: 'CR-7106_1',
    sort_order: 6,
    startup_cup_weight_target: 112.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 19.9, thickness_lcl: 19.7, thickness_lwl: 19.8, thickness_uwl: 20.0, thickness_ucl: 20.1,
    weight_label: 'Slice Weight',
    weight_target: 63.0, weight_lcl: 59.0, weight_lwl: 61.0, weight_uwl: 65.0, weight_ucl: 67.0,
    coating_label: 'Coating Weight',
    coating_target: 23.4, coating_lcl: 21.0, coating_lwl: 22.2, coating_uwl: 24.6, coating_ucl: 25.8,
  },
  {
    product_name: 'Aurora No Sugar Added Crispy Bars',
    product_code: '90001007',
    cr_code: 'CR-7107_1',
    sort_order: 7,
    startup_cup_weight_target: 112.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.6, thickness_lcl: 17.4, thickness_lwl: 17.5, thickness_uwl: 17.7, thickness_ucl: 17.8,
    weight_label: 'Slice Weight',
    weight_target: 56.4, weight_lcl: 52.4, weight_lwl: 54.4, weight_uwl: 58.4, weight_ucl: 60.4,
    coating_label: 'Coating Weight w/Crisp Rice',
    coating_target: 15.8, coating_lcl: 13.4, coating_lwl: 14.6, coating_uwl: 17.0, coating_ucl: 18.2,
  },
  {
    product_name: 'Aurora Light Vanilla Bars',
    product_code: '90001008',
    cr_code: 'CR-7108_1',
    sort_order: 8,
    startup_cup_weight_target: 112.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 18.1, thickness_lcl: 17.9, thickness_lwl: 18.0, thickness_uwl: 18.2, thickness_ucl: 18.3,
    weight_label: 'Slice Weight',
    weight_target: 55.8, weight_lcl: 51.8, weight_lwl: 53.8, weight_uwl: 57.8, weight_ucl: 59.8,
    coating_label: 'Coating Weight',
    coating_target: 18.4, coating_lcl: 16.0, coating_lwl: 17.2, coating_uwl: 19.6, coating_ucl: 20.8,
  },
  {
    product_name: 'Aurora Peanut Butter Cup Bars',
    product_code: '90001009',
    cr_code: 'CR-7109_1',
    sort_order: 9,
    startup_cup_weight_target: 110.5,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.5, thickness_lcl: 17.3, thickness_lwl: 17.4, thickness_uwl: 17.6, thickness_ucl: 17.7,
    weight_label: 'Slice Weight w/ Variegate',
    weight_target: 58.6, weight_lcl: 54.6, weight_lwl: 56.6, weight_uwl: 60.6, weight_ucl: 62.6,
    coating_label: 'Coating Weight',
    coating_target: 18.6, coating_lcl: 16.2, coating_lwl: 17.4, coating_uwl: 19.8, coating_ucl: 21.0,
  },
  {
    product_name: 'Aurora Classic Multipack Bars',
    product_code: '90001010',
    cr_code: 'CR-7110_1',
    sort_order: 10,
    startup_cup_weight_target: 112.0,
    thickness_label: 'Slice Thickness',
    thickness_target: 19.5, thickness_lcl: 19.3, thickness_lwl: 19.4, thickness_uwl: 19.6, thickness_ucl: 19.7,
    weight_label: 'Slice Weight',
    weight_target: 61.5, weight_lcl: 57.5, weight_lwl: 59.5, weight_uwl: 63.5, weight_ucl: 65.5,
    coating_label: 'Coating Weight',
    coating_target: 22.6, coating_lcl: 20.2, coating_lwl: 21.4, coating_uwl: 23.8, coating_ucl: 25.0,
  },
  {
    product_name: 'Aurora Mint Chip Bars',
    product_code: '90001011',
    cr_code: 'CR-7111_1',
    sort_order: 11,
    startup_cup_weight_target: 111.5,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.9, thickness_lcl: 17.6, thickness_lwl: 17.75, thickness_uwl: 18.05, thickness_ucl: 18.2,
    weight_label: 'Slice Weight',
    weight_target: 54.9, weight_lcl: 52.1, weight_lwl: 53.5, weight_uwl: 56.3, weight_ucl: 57.7,
    coating_label: 'Coating Weight',
    coating_target: 21.0, coating_lcl: 18.6, coating_lwl: 19.8, coating_uwl: 22.2, coating_ucl: 23.4,
  },
  {
    product_name: 'Aurora Cookies & Cream Bars',
    product_code: '90001012',
    cr_code: 'CR-7112_1',
    sort_order: 12,
    startup_cup_weight_target: 111.5,
    thickness_label: 'Slice Thickness',
    thickness_target: 17.0, thickness_lcl: 16.8, thickness_lwl: 16.9, thickness_uwl: 17.1, thickness_ucl: 17.2,
    weight_label: 'Slice Weight',
    weight_target: 52.0, weight_lcl: 49.2, weight_lwl: 50.6, weight_uwl: 53.4, weight_ucl: 54.8,
    coating_label: 'Coating Weight',
    coating_target: 21.6, coating_lcl: 19.2, coating_lwl: 20.4, coating_uwl: 22.8, coating_ucl: 24.0,
  },
];

function loadCatalog() {
  if (!process.env.SEED_FILE) {
    return { lines: DEMO_LINES, skus: DEMO_SKUS };
  }
  const catalog = JSON.parse(fs.readFileSync(process.env.SEED_FILE, 'utf8'));
  if (!Array.isArray(catalog.lines) || !Array.isArray(catalog.skus)) {
    throw new Error(`SEED_FILE ${process.env.SEED_FILE} must contain "lines" and "skus" arrays`);
  }
  return catalog;
}

const { lines, skus } = loadCatalog();

const LIMIT_PARAMS = ['thickness', 'weight', 'coating'];

// Every SKU must satisfy LCL <= LWL <= Target <= UWL <= UCL for each parameter;
// a typo here would silently mark good product as out of control.
function assertLimitOrder(sku) {
  for (const param of LIMIT_PARAMS) {
    const values = ['lcl', 'lwl', 'target', 'uwl', 'ucl'].map((k) => Number(sku[`${param}_${k}`]));
    const ordered = values.every((value, i) => Number.isFinite(value) && (i === 0 || values[i - 1] <= value));
    if (!ordered) {
      throw new Error(`SKU ${sku.product_code} has ${param} limits out of order (LCL, LWL, Target, UWL, UCL = ${values.join(', ')})`);
    }
  }
}

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Seed lines
    for (const line of lines) {
      const lineResult = await client.query(
        `INSERT INTO lines (name, display_name, freezer_count, asset_id, active)
         VALUES ($1, $2, $3, $4, true)
         ON CONFLICT (name) DO UPDATE
         SET display_name = $2,
             freezer_count = $3,
             asset_id = $4,
             active = true
         RETURNING id`,
        [line.name, line.display_name, line.freezer_count, line.asset_id || null]
      );

      const lineId = lineResult.rows[0].id;

      for (const freezer of line.freezers) {
        await client.query(
          `INSERT INTO line_freezers (line_id, freezer_number, pump_count, asset_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (line_id, freezer_number) DO UPDATE
           SET pump_count = EXCLUDED.pump_count,
               asset_id = EXCLUDED.asset_id`,
          [
            lineId,
            freezer.freezer_number,
            freezer.pump_count,
            freezer.asset_id || null,
          ]
        );
      }
    }

    // Seed SKUs
    skus.forEach(assertLimitOrder);
    for (const sku of skus) {
      await client.query(
        `INSERT INTO skus (
          product_name, product_code, cr_code, startup_cup_weight_target, sort_order,
          thickness_label, thickness_target, thickness_lcl, thickness_lwl, thickness_uwl, thickness_ucl,
          weight_label, weight_target, weight_lcl, weight_lwl, weight_uwl, weight_ucl,
          coating_label, coating_target, coating_lcl, coating_lwl, coating_uwl, coating_ucl
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        ON CONFLICT (product_code) DO UPDATE SET
          product_name=$1, cr_code=$3, startup_cup_weight_target=$4, sort_order=$5,
          thickness_label=$6, thickness_target=$7, thickness_lcl=$8, thickness_lwl=$9, thickness_uwl=$10, thickness_ucl=$11,
          weight_label=$12, weight_target=$13, weight_lcl=$14, weight_lwl=$15, weight_uwl=$16, weight_ucl=$17,
          coating_label=$18, coating_target=$19, coating_lcl=$20, coating_lwl=$21, coating_uwl=$22, coating_ucl=$23`,
        [
          sku.product_name, sku.product_code, sku.cr_code, sku.startup_cup_weight_target, sku.sort_order,
          sku.thickness_label, sku.thickness_target, sku.thickness_lcl, sku.thickness_lwl, sku.thickness_uwl, sku.thickness_ucl,
          sku.weight_label, sku.weight_target, sku.weight_lcl, sku.weight_lwl, sku.weight_uwl, sku.weight_ucl,
          sku.coating_label, sku.coating_target, sku.coating_lcl, sku.coating_lwl, sku.coating_uwl, sku.coating_ucl,
        ]
      );
    }

    await client.query('COMMIT');
    console.log(`Seeded ${lines.length} lines and ${skus.length} SKUs successfully`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  seed().then(() => pool.end()).then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seed, skus, lines, assertLimitOrder };
