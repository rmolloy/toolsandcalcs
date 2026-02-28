export function renderTryPanel(recipes, massOnly, show) {
    const panel = document.getElementById("try_panel");
    const structuralCard = document.getElementById("try_card_structural");
    const reversibleCard = document.getElementById("try_card_reversible");
    const listStructural = document.getElementById("try_list_structural");
    const listReversible = document.getElementById("try_list_reversible");
    if (!panel || !structuralCard || !reversibleCard || !listStructural || !listReversible)
        return;
    if (!show) {
        panel.hidden = true;
        structuralCard.hidden = true;
        reversibleCard.hidden = true;
        listStructural.innerHTML = "";
        listReversible.innerHTML = "";
        return;
    }
    panel.hidden = false;
    structuralCard.hidden = !recipes.length;
    reversibleCard.hidden = !massOnly.length;
    listStructural.innerHTML = recipes.map((r) => `<li>${r}</li>`).join("");
    listReversible.innerHTML = massOnly.map((r) => `<li>${r}</li>`).join("");
}
