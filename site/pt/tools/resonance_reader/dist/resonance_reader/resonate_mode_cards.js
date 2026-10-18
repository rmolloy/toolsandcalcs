import { modeTargetHandlersBindOnce } from "./resonate_mode_cards_interactions.js?rev=1d7203985d25";
import { modeCardsHtmlBuild } from "./resonate_mode_cards_render.js?rev=1d7203985d25";
export function renderModes(modes, deps) {
    const grid = modeGridElementGet();
    if (!grid)
        return;
    modeTargetHandlersBindOnce(grid, modes, deps, renderModes);
    const editingKey = deps.state.editingTargetKey;
    grid.innerHTML = modeCardsHtmlBuild(modes, deps, editingKey);
}
function modeGridElementGet() {
    return document.getElementById("mode_grid");
}
