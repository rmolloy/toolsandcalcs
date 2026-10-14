# Playwright automation for DOF parity checks

This folder contains a small Playwright script that compares feature presence between:

- `tools/4dof_solver/index.html` (legacy)
- `tools/dof_model/index.html` (modern)

The script is intentionally strict for grouped controls:

- button-like checks pass when any accepted selector is present
- field-group checks pass only when all required selectors for that capability are present

## Run

```bash
cd tools/dof_model/playwright
npm install
PARITY_BASE_URL=http://127.0.0.1:4173 npm run parity
```

Use any static file server rooted at repository root, for example:

```bash
python3 -m http.server 4173
```

If Playwright does not have a browser installed yet, run:

```bash
npx playwright install chromium
```

## Outputs

- `parity-results.json`: machine-readable snapshot with matched and missing selectors
- `feature-parity.md`: markdown report for quick review
