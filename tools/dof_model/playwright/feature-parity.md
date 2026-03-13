# 4DOF Solver -> DOF Model feature parity (Playwright snapshot)

Base URL: `http://127.0.0.1:4173`

| Feature | Legacy (4dof_solver) | Modern (dof_model) | Status |
|---|---:|---:|---|
| Fit My Guitar primary action | ✅ | ✅ | Parity |
| Solve Targets action | ✅ | ✅ | Parity |
| What-If compare toggle | ✅ | ✅ | Parity |
| Reset What-If button | ✅ | ✅ | Parity |
| Modal target fields | ✅ | ✅ | Parity |
| Plate mass/stiffness target fields | ✅ | ✅ | Parity |
| Body information fields | ✅ | ❌ | Missing in modern |
| Recipe restriction checkbox | ✅ | ✅ | Parity |
| What-If recipe summary panel | ✅ | ✅ | Parity |
| Draggable mode thumbs on plot | ❌ | ❌ | Missing in both |

## Gaps to close before retiring legacy solver
- Body information fields
  Expected selectors: `#fit_volume_air`, `#fit_area_hole_diam`