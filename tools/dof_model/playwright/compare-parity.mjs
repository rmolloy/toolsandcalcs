import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';

const baseUrl = process.env.PARITY_BASE_URL || 'http://127.0.0.1:4173';
const pages = {
  legacy: `${baseUrl}/tools/4dof_solver/index.html`,
  modern: `${baseUrl}/tools/dof_model/index.html`,
};

const checks = [
  {
    key: 'fit.button.fit_my_guitar',
    label: 'Fit My Guitar primary action',
    legacy: { any: ['#btn_fit_baseline', 'button:has-text("Fit My Guitar")'] },
    modern: { any: ['#btn_fit_guitar', 'button:has-text("Fit My Guitar")'] },
  },
  {
    key: 'fit.button.solve_targets',
    label: 'Solve Targets action',
    legacy: { any: ['#btn_fit_whatif', 'button:has-text("Solve Targets")'] },
    modern: { any: ['#btn_fit_whatif', 'button:has-text("Solve Targets")'] },
  },
  {
    key: 'fit.toggle.whatif',
    label: 'What-If compare toggle',
    legacy: { any: ['#whatif_toggle'] },
    modern: { any: ['#toggle_overlay'] },
  },
  {
    key: 'fit.button.reset_whatif',
    label: 'Reset What-If button',
    legacy: { any: ['#btn_reset_whatif', 'button:has-text("Reset What-If")'] },
    modern: { any: ['#btn_reset_whatif', 'button:has-text("Reset What-If")'] },
  },
  {
    key: 'fit.form.modal_targets',
    label: 'Modal target fields',
    legacy: { all: ['#fit_freq_1', '#fit_freq_2', '#fit_freq_3'] },
    modern: { all: ['#fit_target_air', '#fit_target_top', '#fit_target_back'] },
  },
  {
    key: 'fit.form.plate_fields',
    label: 'Plate mass/stiffness target fields',
    legacy: { all: ['#fit_mass_top', '#fit_stiffness_top'] },
    modern: { all: ['#fit_target_mass_top', '#fit_target_stiffness_top'] },
  },
  {
    key: 'fit.form.body_fields',
    label: 'Body information fields',
    legacy: { all: ['#fit_volume_air', '#fit_area_hole_diam'] },
    modern: { all: ['#fit_volume_air', '#fit_area_hole_diam'] },
  },
  {
    key: 'fit.option.restrict_recipe',
    label: 'Recipe restriction checkbox',
    legacy: { all: ['#fit_restrict_simple'] },
    modern: { all: ['#fit_restrict_simple'] },
  },
  {
    key: 'fit.summary.whatif_recipe',
    label: 'What-If recipe summary panel',
    legacy: { all: ['#whatif_summary'] },
    modern: { all: ['#whatif_summary'] },
  },
  {
    key: 'plot.draggable_thumbs',
    label: 'Draggable mode thumbs on plot',
    legacy: { any: ['.mode-thumb'] },
    modern: { any: ['.mode-thumb'] },
  },
];

async function evaluateSide(page, probes) {
  const allSelectors = probes.all || [];
  const anySelectors = probes.any || [];

  const matchedAll = [];
  const missingAll = [];
  for (const selector of allSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) matchedAll.push(selector);
    else missingAll.push(selector);
  }

  const matchedAny = [];
  for (const selector of anySelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) matchedAny.push(selector);
  }

  const allSatisfied = missingAll.length === 0;
  const anySatisfied = anySelectors.length === 0 ? true : matchedAny.length > 0;

  return {
    present: allSatisfied && anySatisfied,
    matched: matchedAll.concat(matchedAny),
    missing: missingAll.concat(anySelectors.length && matchedAny.length === 0 ? anySelectors : []),
  };
}

function compareStatus(legacy, modern) {
  if (legacy.present && modern.present) return 'Parity';
  if (legacy.present && !modern.present) return 'Missing in modern';
  if (!legacy.present && modern.present) return 'Modern-only';
  return 'Missing in both';
}

function buildMarkdown(results) {
  const lines = [];
  lines.push('# 4DOF Solver -> DOF Model feature parity (Playwright snapshot)');
  lines.push('');
  lines.push(`Base URL: \`${baseUrl}\``);
  lines.push('');
  lines.push('| Feature | Legacy (4dof_solver) | Modern (dof_model) | Status |');
  lines.push('|---|---:|---:|---|');

  for (const result of results) {
    lines.push(`| ${result.label} | ${result.legacy.present ? '✅' : '❌'} | ${result.modern.present ? '✅' : '❌'} | ${result.status} |`);
  }

  lines.push('');
  lines.push('## Gaps to close before retiring legacy solver');
  for (const result of results) {
    if (result.status === 'Missing in modern') {
      lines.push(`- ${result.label}`);
      if (result.modern.missing.length) {
        lines.push(`  Expected selectors: \`${result.modern.missing.join('`, `')}\``);
      }
    }
  }

  return lines.join('\n');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const legacyPage = await context.newPage();
const modernPage = await context.newPage();

await legacyPage.goto(pages.legacy, { waitUntil: 'domcontentloaded' });
await modernPage.goto(pages.modern, { waitUntil: 'domcontentloaded' });

const results = [];
for (const check of checks) {
  const legacy = await evaluateSide(legacyPage, check.legacy);
  const modern = await evaluateSide(modernPage, check.modern);
  results.push({
    key: check.key,
    label: check.label,
    legacy,
    modern,
    status: compareStatus(legacy, modern),
  });
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  pages,
  checks: results,
};

await writeFile(new URL('./parity-results.json', import.meta.url), JSON.stringify(snapshot, null, 2));
await writeFile(new URL('./feature-parity.md', import.meta.url), buildMarkdown(results));

await browser.close();
console.log('Wrote parity-results.json and feature-parity.md');
