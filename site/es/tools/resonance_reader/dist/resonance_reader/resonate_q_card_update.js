import { modeBehaviorHtmlBuild } from "./resonate_mode_cards_render.js?rev=6e6ab0f635c5";
export function refreshModeCardQValues(modes) {
    document.getElementById("mode_grid")?.querySelectorAll(".mode-card[data-mode]")
        .forEach((card) => refreshRenderedCardQ(card, modes.find((mode) => mode.key === card.dataset.mode)));
}
function refreshRenderedCardQ(card, mode) {
    const region = card.querySelector(".mode-behavior");
    if (region && mode)
        region.innerHTML = modeBehaviorHtmlBuild(mode);
}
