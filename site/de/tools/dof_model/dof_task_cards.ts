export type DofTaskCardDefinition = {
  key: string;
  label: string;
  alias: string;
  badgeText: string;
  copy?: string;
  fieldIds?: string[];
  optionIds?: string[];
  actionIds?: string[];
  statusId?: string;
  panelIds?: string[];
};

export function buildDofTaskCards(
  documentRef: Document,
  container: HTMLElement,
  cardDefinitions: DofTaskCardDefinition[],
) {
  cardDefinitions.forEach((card) => {
    container.appendChild(buildDofTaskCard(documentRef, card));
  });
}

export function restoreDofFitTaskControls(
  documentRef: Document,
  panel: HTMLElement | null,
  controls: HTMLElement | null,
  cardDefinitions: DofTaskCardDefinition[],
) {
  if (!controls || !panel) return;
  cardDefinitions.forEach((card) => {
    card.fieldIds?.forEach((fieldId) => {
      appendDofTaskCardElement(
        controls,
        documentRef.getElementById(fieldId)?.closest(".dof-fit-field"),
      );
    });
    card.actionIds?.forEach((actionId) => {
      appendDofTaskCardElement(controls, documentRef.getElementById(actionId));
    });
  });
  appendDofTaskCardElement(panel, documentRef.getElementById("fit_status"));
}

export function restoreDofSolveTaskControls(
  documentRef: Document,
  panel: HTMLElement | null,
  actions: HTMLElement | null,
  cardDefinitions: DofTaskCardDefinition[],
) {
  if (!actions || !panel) return;
  cardDefinitions.forEach((card) => {
    card.optionIds?.forEach((optionId) => {
      appendDofTaskCardElement(
        panel,
        documentRef.getElementById(optionId)?.closest(".dof-guided-option"),
      );
    });
    card.actionIds?.forEach((actionId) => {
      appendDofTaskCardElement(actions, documentRef.getElementById(actionId));
    });
    if (card.actionIds?.length) panel.appendChild(actions);
    card.panelIds?.forEach((panelId) => {
      appendDofTaskCardElement(panel, documentRef.getElementById(panelId));
    });
  });
}

export function buildDofTaskCard(
  documentRef: Document,
  card: DofTaskCardDefinition,
) {
  const cardElement = documentRef.createElement("div");
  cardElement.className = `mode-card mode-${card.key}`;

  const title = documentRef.createElement("div");
  title.className = "dof-card-title";
  title.innerHTML = buildDofTaskCardTitle(card);

  const body = documentRef.createElement("div");
  body.className = "task-card-fields";
  appendDofTaskCardCopy(documentRef, body, card.copy);
  appendDofTaskCardFields(documentRef, body, card.fieldIds);
  appendDofTaskCardOptions(documentRef, body, card.optionIds);
  appendDofTaskCardActions(documentRef, body, card.actionIds);
  appendDofTaskCardPanels(documentRef, body, card.panelIds);
  appendDofTaskCardStatus(documentRef, body, card.statusId);

  cardElement.append(title, body);
  return cardElement;
}

function buildDofTaskCardTitle(card: DofTaskCardDefinition) {
  return `<div class="mode-label">${card.label}<span class="mode-label-alias">${card.alias}</span></div><span class="badge">${card.badgeText}</span>`;
}

function appendDofTaskCardCopy(
  documentRef: Document,
  body: HTMLElement,
  copyText: string | undefined,
) {
  if (!copyText) return;
  const copy = documentRef.createElement("p");
  copy.className = "task-card-copy";
  copy.textContent = copyText;
  body.appendChild(copy);
}

function appendDofTaskCardFields(
  documentRef: Document,
  body: HTMLElement,
  fieldIds: string[] | undefined,
) {
  fieldIds?.forEach((fieldId) => {
    appendDofTaskCardElement(
      body,
      documentRef.getElementById(fieldId)?.closest(".dof-fit-field"),
    );
  });
}

function appendDofTaskCardOptions(
  documentRef: Document,
  body: HTMLElement,
  optionIds: string[] | undefined,
) {
  optionIds?.forEach((optionId) => {
    appendDofTaskCardElement(
      body,
      documentRef.getElementById(optionId)?.closest(".dof-guided-option"),
    );
  });
}

function appendDofTaskCardActions(
  documentRef: Document,
  body: HTMLElement,
  actionIds: string[] | undefined,
) {
  if (!actionIds?.length) return;
  const actions = documentRef.createElement("div");
  actions.className = "task-card-actions";
  actionIds.forEach((actionId) => {
    appendDofTaskCardElement(actions, documentRef.getElementById(actionId));
  });
  body.appendChild(actions);
}

function appendDofTaskCardPanels(
  documentRef: Document,
  body: HTMLElement,
  panelIds: string[] | undefined,
) {
  panelIds?.forEach((panelId) => {
    appendDofTaskCardElement(body, documentRef.getElementById(panelId));
  });
}

function appendDofTaskCardStatus(
  documentRef: Document,
  body: HTMLElement,
  statusId: string | undefined,
) {
  if (!statusId) return;
  appendDofTaskCardElement(body, documentRef.getElementById(statusId));
}

function appendDofTaskCardElement(
  parent: HTMLElement,
  element: Element | null | undefined,
) {
  if (element) parent.appendChild(element);
}
