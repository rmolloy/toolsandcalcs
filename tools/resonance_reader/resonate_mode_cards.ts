import { modeTargetHandlersBindOnce } from "./resonate_mode_cards_interactions.js";
import { modeCardsHtmlBuild, type ModeCardDeps } from "./resonate_mode_cards_render.js";
import type { ModeCard } from "./resonate_types.js";

export function renderModes(modes: ModeCard[], deps: ModeCardDeps) {
  const grid = modeGridElementGet();
  if (!grid) return;
  modeTargetHandlersBindOnce(grid, modes, deps, renderModes);

  const editingKey = deps.state.editingTargetKey as string | null;
  grid.innerHTML = modeCardsHtmlBuild(modes, deps, editingKey);
}

function modeGridElementGet() {
  return document.getElementById("mode_grid");
}
