const STOCK_SPEC_FAMILIES = [
  {
    profileId: "electric",
    label: "Electric",
    reliefText: ".008 – .010″",
    actionAtFret12Mm: [1.6, 2],
    nutActionMm: [0.38, 0.48],
    note: "Balance the tremolo before setting action.",
  },
  {
    profileId: "four_string_bass",
    label: "Bass",
    draft: true,
    reliefText: ".010 – .014″",
    actionAtFret12Mm: [2, 3],
    nutActionMm: [0.5, 0.7],
    note: "Longer scale — relief reads farther up the neck.",
  },
  {
    profileId: "steel_string",
    label: "Steel-string",
    reliefText: ".010 – .012″",
    actionAtFret12Mm: [2, 2.5],
    nutActionMm: [0.48, 0.56],
    note: "Slide or heavy attack: run the high side.",
  },
  {
    profileId: "classical",
    label: "Classical",
    reliefText: "flat — usually no rod",
    actionAtFret12Mm: [2.5, 3],
    nutActionText: "higher — set by feel",
    note: "Tie-block break angle matters as much as height.",
  },
];

export function createStockSpecs({ document, lengthUnits, onSelectProfile, onMeasure }) {
  const cardHost = document.getElementById("stock_spec_cards");
  const measureButton = document.getElementById("stock_specs_measure");

  function render(selectedProfileId) {
    cardHost.innerHTML = STOCK_SPEC_FAMILIES.map((family) => `
      <button type="button" class="stock-spec-card" data-stock-profile="${family.profileId}"
        aria-pressed="${String(family.profileId === selectedProfileId)}">
        <span class="stock-spec-title">${family.label}${family.draft
          ? '<em class="stock-spec-draft">Draft — confirm</em>'
          : ""}${family.profileId === selectedProfileId
          ? '<em class="stock-spec-selected">Selected</em>'
          : ""}</span>
        <span class="stock-spec-row"><span>Relief</span><span>${family.reliefText}</span></span>
        <span class="stock-spec-row"><span>Action @ 12th fret</span><span>${rangeText(family.actionAtFret12Mm)}</span></span>
        <span class="stock-spec-row"><span>Action at nut</span><span>${family.nutActionText ?? rangeText(family.nutActionMm)}</span></span>
        <span class="stock-spec-note">${family.note}</span>
      </button>
    `).join("");
    cardHost.querySelectorAll("[data-stock-profile]").forEach((card) => {
      card.addEventListener("click", () => onSelectProfile(card.dataset.stockProfile));
    });
  }

  function rangeText([lowMm, highMm]) {
    const low = lengthUnits.format(lowMm).replace(` ${lengthUnits.label()}`, "");
    return `${low} – ${lengthUnits.format(highMm)}`;
  }

  measureButton.addEventListener("click", onMeasure);

  return { render };
}
