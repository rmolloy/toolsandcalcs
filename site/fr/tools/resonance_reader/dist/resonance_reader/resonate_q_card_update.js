import { modeBehaviorHtmlBuild } from "./resonate_mode_cards_render.js?rev=3d07b6bb6d26";
export function refreshModeCardQValues(modes) {
    document.getElementById("mode_grid")?.querySelectorAll(".mode-card[data-mode]")
        .forEach((card) => refreshRenderedCardQ(card, modes.find((mode) => mode.key === card.dataset.mode)));
}
function refreshRenderedCardQ(card, mode) {
    const region = card.querySelector(".mode-behavior");
    if (region && mode)
        region.innerHTML = modeBehaviorHtmlBuild(mode);
}
