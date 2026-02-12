export function renderTryPanel(recipes: string[], massOnly: string[], show: boolean) {
  const panel = document.getElementById("try_panel");
  const structuralCard = document.getElementById("try_card_structural");
  const reversibleCard = document.getElementById("try_card_reversible");
  const listStructural = document.getElementById("try_list_structural");
  const listReversible = document.getElementById("try_list_reversible");
  if (!panel || !structuralCard || !reversibleCard || !listStructural || !listReversible) return;
  if (!show) {
    (panel as any).hidden = true;
    (structuralCard as any).hidden = true;
    (reversibleCard as any).hidden = true;
    listStructural.innerHTML = "";
    listReversible.innerHTML = "";
    return;
  }
  (panel as any).hidden = false;
  (structuralCard as any).hidden = !recipes.length;
  (reversibleCard as any).hidden = !massOnly.length;
  listStructural.innerHTML = recipes.map((r) => `<li>${r}</li>`).join("");
  listReversible.innerHTML = massOnly.map((r) => `<li>${r}</li>`).join("");
}
