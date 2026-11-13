import { modeTargetHandlersBindOnce } from "./resonate_mode_cards_interactions.js?rev=7157ade1c3cc";
import { modeCardsHtmlBuild } from "./resonate_mode_cards_render.js?rev=7157ade1c3cc";
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
