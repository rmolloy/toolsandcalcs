import { modeTargetHandlersBindOnce } from "./resonate_mode_cards_interactions.js?rev=a9c4c0145336";
import { modeCardsHtmlBuild } from "./resonate_mode_cards_render.js?rev=a9c4c0145336";
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
