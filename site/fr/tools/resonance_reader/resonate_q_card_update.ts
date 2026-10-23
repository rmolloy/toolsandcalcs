import { modeBehaviorHtmlBuild } from "./resonate_mode_cards_render.js";
import type { ModeCard } from "./resonate_types.js";

export function refreshModeCardQValues(modes: ModeCard[]) {
  document.getElementById("mode_grid")?.querySelectorAll<HTMLElement>(".mode-card[data-mode]")
    .forEach((card) => refreshRenderedCardQ(card, modes.find((mode) => mode.key === card.dataset.mode)));
}

function refreshRenderedCardQ(card: HTMLElement, mode: ModeCard | undefined) {
  const region = card.querySelector<HTMLElement>(".mode-behavior");
  if (region && mode) region.innerHTML = modeBehaviorHtmlBuild(mode);
}
