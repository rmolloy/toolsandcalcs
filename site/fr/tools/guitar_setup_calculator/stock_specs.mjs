const STOCK_SPEC_FAMILIES = [
  {
    profileId: "electric",
    reliefText: ".008 – .010″",
    actionAtFret12Mm: [1.6, 2],
    nutActionMm: [0.38, 0.48],
  },
  {
    profileId: "four_string_bass",
    draft: true,
    reliefText: ".010 – .014″",
    actionAtFret12Mm: [2, 3],
    nutActionMm: [0.5, 0.7],
  },
  {
    profileId: "steel_string",
    reliefText: ".010 – .012″",
    actionAtFret12Mm: [2, 2.5],
    nutActionMm: [0.48, 0.56],
  },
  {
    profileId: "classical",
    actionAtFret12Mm: [2.5, 3],
  },
];

export function createStockSpecs({ document, lengthUnits, messages, onSelectProfile, onMeasure }) {
  const cardHost = document.getElementById("stock_spec_cards");
  const measureButton = document.getElementById("stock_specs_measure");

  function render(selectedProfileId) {
    cardHost.innerHTML = STOCK_SPEC_FAMILIES.map((family) => {
      const familyMessages = messages.families[family.profileId];
      return `
      <button type="button" class="stock-spec-card" data-stock-profile="${family.profileId}"
        aria-pressed="${String(family.profileId === selectedProfileId)}">
        <span class="stock-spec-title">${familyMessages.label}${family.draft
          ? `<em class="stock-spec-draft">${messages.draft}</em>`
          : ""}${family.profileId === selectedProfileId
          ? `<em class="stock-spec-selected">${messages.selected}</em>`
          : ""}</span>
        <span class="stock-spec-row"><span>${messages.relief}</span><span>${family.reliefText ?? familyMessages.reliefText}</span></span>
        <span class="stock-spec-row"><span>${messages.actionAtFret12}</span><span>${rangeText(family.actionAtFret12Mm)}</span></span>
        <span class="stock-spec-row"><span>${messages.actionAtNut}</span><span>${familyMessages.nutActionText ?? rangeText(family.nutActionMm)}</span></span>
        <span class="stock-spec-note">${familyMessages.note}</span>
      </button>
    `;
    }).join("");
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
