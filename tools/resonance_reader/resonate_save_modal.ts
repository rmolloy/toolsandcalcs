import {
  resonanceSubjectDraftDefaultsFromMeasureMode,
  resonanceSubjectSubtypeOptionsRead,
  resonanceSubjectTypeOptionsRead,
} from "./resonate_subject_taxonomy.js";

export async function openConnectedResonanceSaveModal(args: {
  measureMode: unknown;
  notebookName: string;
  subjects: any[];
}): Promise<null | { subject: Record<string, any>; event: Record<string, any> }> {
  return await new Promise((resolve) => {
    const defaults = resonanceSubjectDraftDefaultsFromMeasureMode(args.measureMode);
    const modal = resonanceSaveModalElementBuild(args, defaults);
    const closeWith = (result: null | { subject: Record<string, any>; event: Record<string, any> }) => {
      modal.remove();
      resolve(result);
    };

    document.body.appendChild(modal);
    resonanceSaveModalBindingsAttach(modal, args, defaults, closeWith);
  });
}

function resonanceSaveModalElementBuild(
  args: { measureMode: unknown; notebookName: string; subjects: any[] },
  defaults: { typeKey: string; subtypeKey: string },
): HTMLDivElement {
  const hasSubjects = args.subjects.length > 0;
  const subjectMode = hasSubjects ? "existing" : "new";
  const typeOptions = resonanceSubjectTypeOptionsRead();
  const subtypeOptions = resonanceSubjectSubtypeOptionsRead(defaults.typeKey);
  const subjectOptions = args.subjects.map((subject) => `<option value="${resonanceSaveModalEscapeHtml(subject.subjectId || "")}">${resonanceSaveModalEscapeHtml(subject.displayName || subject.subjectId || "")}</option>`).join("");

  const modal = document.createElement("div");
  modal.className = "save-modal";
  modal.innerHTML = `
    <div class="save-modal__backdrop" data-save-modal-close></div>
    <div class="save-modal__panel" role="dialog" aria-modal="true" aria-label="Save Resonance Capture">
      <header>
        <h2>Save to ${resonanceSaveModalEscapeHtml(args.notebookName || "Notebook")}</h2>
        <button type="button" class="ghost-btn btn-small" data-save-modal-close>Close</button>
      </header>
      <form class="save-modal__form">
        <section class="save-modal__section">
          <h3>Subject</h3>
          <div class="save-modal__toggle-row">
            <label><input type="radio" name="subject_mode" value="existing" ${subjectMode === "existing" ? "checked" : ""} ${hasSubjects ? "" : "disabled"}> Existing</label>
            <label><input type="radio" name="subject_mode" value="new" ${subjectMode === "new" ? "checked" : ""}> New</label>
          </div>
          <div class="save-modal__existing" ${subjectMode === "existing" ? "" : "hidden"}>
            <input type="search" name="subject_filter" placeholder="Filter subjects">
            <select name="subject_id" size="6">${subjectOptions}</select>
          </div>
          <div class="save-modal__new" ${subjectMode === "new" ? "" : "hidden"}>
            <label>Type<select name="type_key">${typeOptions.map((option) => `<option value="${option.key}" ${option.key === defaults.typeKey ? "selected" : ""}>${option.label}</option>`).join("")}</select></label>
            <label>Subtype<select name="subtype_key">${subtypeOptions.map((option) => `<option value="${option.key}" ${option.key === defaults.subtypeKey ? "selected" : ""}>${option.label}</option>`).join("")}</select></label>
            <label>Display Name<input type="text" name="display_name" placeholder="European Spruce Top"></label>
          </div>
        </section>
        <section class="save-modal__section">
          <h3>Event</h3>
          <label>Note<textarea name="event_note" rows="4" placeholder="What changed or what did you test?"></textarea></label>
        </section>
        <section class="save-modal__section">
          <h3>Package</h3>
          <ul class="save-modal__package-list">
            <li><code>state.json</code></li>
            <li><code>source.wav</code></li>
            <li><code>plot.png</code></li>
          </ul>
        </section>
        <p class="save-modal__error" data-save-modal-error hidden></p>
        <footer class="save-modal__footer">
          <button type="submit" class="primary-btn hero-control">Save to Notebook</button>
        </footer>
      </form>
    </div>
  `;
  return modal;
}

function resonanceSaveModalBindingsAttach(
  modal: HTMLElement,
  args: { measureMode: unknown; subjects: any[] },
  defaults: { typeKey: string; subtypeKey: string },
  closeWith: (result: null | { subject: Record<string, any>; event: Record<string, any> }) => void,
): void {
  modal.querySelectorAll<HTMLElement>("[data-save-modal-close]").forEach((element) => {
    element.addEventListener("click", () => closeWith(null));
  });

  const form = modal.querySelector("form");
  const typeSelect = modal.querySelector<HTMLSelectElement>('select[name="type_key"]');
  const subtypeSelect = modal.querySelector<HTMLSelectElement>('select[name="subtype_key"]');
  const filterInput = modal.querySelector<HTMLInputElement>('input[name="subject_filter"]');
  const subjectSelect = modal.querySelector<HTMLSelectElement>('select[name="subject_id"]');
  const existingPanel = modal.querySelector<HTMLElement>(".save-modal__existing");
  const newPanel = modal.querySelector<HTMLElement>(".save-modal__new");
  const error = modal.querySelector<HTMLElement>("[data-save-modal-error]");

  modal.querySelectorAll<HTMLInputElement>('input[name="subject_mode"]').forEach((radio) => {
    radio.addEventListener("change", () => resonanceSaveModalSubjectModeRender(modal, radio.value));
  });
  typeSelect?.addEventListener("change", () => resonanceSaveModalSubtypeOptionsRender(subtypeSelect, typeSelect.value, ""));
  filterInput?.addEventListener("input", () => resonanceSaveModalSubjectFilterRender(subjectSelect, args.subjects, filterInput.value));
  resonanceSaveModalSubtypeOptionsRender(subtypeSelect, defaults.typeKey, defaults.subtypeKey);
  resonanceSaveModalSubjectFilterRender(subjectSelect, args.subjects, "");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const subjectMode = modal.querySelector<HTMLInputElement>('input[name="subject_mode"]:checked')?.value || "new";
    const note = (modal.querySelector<HTMLTextAreaElement>('textarea[name="event_note"]')?.value || "").trim();
    const subject = subjectMode === "existing"
      ? resonanceExistingSubjectSelectionBuild(subjectSelect?.value || "")
      : resonanceNewSubjectSelectionBuild(modal);

    if (!subject) {
      resonanceSaveModalErrorRender(error, "Choose a subject or enter a display name.");
      return;
    }

    resonanceSaveModalErrorRender(error, "");
    closeWith({
      subject,
      event: {
        note,
        capturedAt: new Date().toISOString(),
        measureMode: args.measureMode,
      },
    });
  });

  if (existingPanel && newPanel) {
    resonanceSaveModalSubjectModeRender(modal, args.subjects.length > 0 ? "existing" : "new");
  }
}

function resonanceExistingSubjectSelectionBuild(subjectId: string): Record<string, any> | null {
  return subjectId ? { subjectId } : null;
}

function resonanceNewSubjectSelectionBuild(modal: HTMLElement): Record<string, any> | null {
  const displayName = (modal.querySelector<HTMLInputElement>('input[name="display_name"]')?.value || "").trim();
  if (displayName === "") {
    return null;
  }

  return {
    newSubject: {
      typeKey: modal.querySelector<HTMLSelectElement>('select[name="type_key"]')?.value || "GENERIC",
      subtypeKey: modal.querySelector<HTMLSelectElement>('select[name="subtype_key"]')?.value || "",
      displayName,
    },
  };
}

function resonanceSaveModalSubjectModeRender(modal: HTMLElement, mode: string): void {
  modal.querySelector<HTMLElement>(".save-modal__existing")!.hidden = mode !== "existing";
  modal.querySelector<HTMLElement>(".save-modal__new")!.hidden = mode !== "new";
}

function resonanceSaveModalSubtypeOptionsRender(
  subtypeSelect: HTMLSelectElement | null,
  typeKey: string,
  selectedKey: string,
): void {
  if (!subtypeSelect) {
    return;
  }

  subtypeSelect.innerHTML = resonanceSubjectSubtypeOptionsRead(typeKey)
    .map((option) => `<option value="${option.key}" ${option.key === selectedKey ? "selected" : ""}>${option.label}</option>`)
    .join("");
}

function resonanceSaveModalSubjectFilterRender(
  subjectSelect: HTMLSelectElement | null,
  subjects: any[],
  filterText: string,
): void {
  if (!subjectSelect) {
    return;
  }

  const needle = filterText.trim().toLowerCase();
  const filtered = subjects.filter((subject) => String(subject.displayName || "").toLowerCase().includes(needle));
  subjectSelect.innerHTML = filtered
    .map((subject) => `<option value="${resonanceSaveModalEscapeHtml(subject.subjectId || "")}">${resonanceSaveModalEscapeHtml(subject.displayName || subject.subjectId || "")}</option>`)
    .join("");
}

function resonanceSaveModalErrorRender(error: HTMLElement | null, message: string): void {
  if (!error) {
    return;
  }

  error.hidden = message === "";
  error.textContent = message;
}

function resonanceSaveModalEscapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
