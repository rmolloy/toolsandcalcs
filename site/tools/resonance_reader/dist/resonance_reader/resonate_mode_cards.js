import { modeTargetHandlersBindOnce } from "./resonate_mode_cards_interactions.js?rev=aab423209ba9";
import { modeCardsHtmlBuild } from "./resonate_mode_cards_render.js?rev=aab423209ba9";
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
