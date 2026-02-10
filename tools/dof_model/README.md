# DOF Model Tool

## What it is
The DOF Model tool is a direct, causality-first interface to the shared 4‑DOF solver. Instead of measuring FFTs, it exposes the physical parameters (mass, stiffness, damping, area, and environment) that drive the model and plots the resulting frequency response. The goal is to make the model editable by hand, with the plot acting as the primary interface.

## What it does today
- Renders a Plotly frequency response using the shared 4‑DOF solver output.
- Shows editable cards for Air (Helmholtz), Top, Back, Sides, and an always‑visible Environment card.
- Supports 1–4 DOF order via tabs; cards hide when the order excludes them.
- Uses Resonance Reader defaults and converts mass units (grams in UI → kg in solver).
- Derives air density / speed of sound from altitude + temperature.

## Roadmap (prioritized)
1. **Draggable Air/Top/Back thumbs on plot (solve on release)**
   - Add Air/Top/Back handles on the response curve.
   - Drag end triggers a target solve and re-renders.
   - No continuous solve during drag (naive approach).

2. **What‑If model overlay**
   - Solid line = current model, dashed line = what‑if.
   - What‑if solves use the same structural tweak set as Resonance recipes.
   - Clear Fixed/What‑If state (toggle or tabs).

3. **Card hierarchy + inline editing**
   - Emphasize mode readout (frequency/Q) and demote raw inputs.
   - Only show full input controls when the user edits.

4. **Plot visual alignment with Resonance Reader**
   - Match grid/labels/legend conventions.
   - Hide Sides trace by default.

5. **Bounds + guardrails**
   - Apply FIT_BOUNDS for solve adjustments.
   - Add min/max constraints on inputs.

6. **Data polish + persistence**
   - Normalize units in all fields (g/kg, m², m³).
   - Optional local state persistence for user sessions.

## Technical deviations from intent (known issues)
- **FFT pipeline not used**: The tool currently renders only from solver state (as intended), but does not yet support measurement overlays.
- **What‑If not implemented**: The dashed overlay and fixed/what‑if state are placeholders.
- **Thumb interactions missing**: Plot thumbs and target solve are not wired yet.
- **Sides trace still available**: Current plotting includes sides (thin dashed); intent is to hide it by default.
- **Q is not explicit**: The solver uses damping coefficients; Q must be derived if shown in UI.

## File locations
- UI: `tools/dof_model/index.html`
- Styles: `tools/dof_model/styles.css` (inherits from `tools/resonance_reader/styles.css`)
- Logic: `tools/dof_model/main.ts` → `tools/dof_model/main.js`
