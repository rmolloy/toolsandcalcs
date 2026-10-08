"use strict";
// The Save to Notebook dialog, shared by every tool that saves a capture.
//
// It is the notebook entry the builder is about to write, editable in place:
// the subject as a heading (click to change or create), the title, one line
// for what was heard with descriptor pills, the numbers as they will appear
// in the notebook, the files as a footnote, and Cancel beside Save.
(() => {
    const SUBJECT_TYPE_OPTIONS = [
        { key: "GUITAR", label: "Guitar", subtypes: [{ key: "", label: "General" }] },
        { key: "MATERIAL", label: "Material", subtypes: [{ key: "PLATE_STOCK", label: "Plate Stock" }, { key: "BRACE_STOCK", label: "Brace Stock" }] },
        { key: "BLANK", label: "Blank", subtypes: [{ key: "", label: "General" }] },
        { key: "PART", label: "Part", subtypes: [{ key: "", label: "General" }] },
        { key: "PLATE", label: "Plate", subtypes: [{ key: "", label: "General" }] },
        { key: "BRACE", label: "Brace", subtypes: [{ key: "", label: "General" }] },
        { key: "ASSEMBLY", label: "Assembly", subtypes: [{ key: "", label: "General" }] },
        { key: "INSTRUMENT", label: "Instrument", subtypes: [{ key: "", label: "General" }] },
        { key: "SETUP_COMPONENT", label: "Setup Component", subtypes: [{ key: "", label: "General" }] },
        { key: "JIG", label: "Jig", subtypes: [{ key: "", label: "General" }] },
        { key: "FIXTURE", label: "Fixture", subtypes: [{ key: "", label: "General" }] },
        { key: "GENERIC", label: "Generic", subtypes: [{ key: "", label: "General" }] },
    ];
    const GENERAL_SUBTYPE_OPTIONS = [{ key: "", label: "General" }];
    const PROVENANCE_LABELS = ["measured", "modeled", "calculated", "default"];
    const LISTENING_DESCRIPTOR_SETS = {
        instrument: ["bloom", "sings", "even", "warm", "tight", "stiff", "hollow", "wobble", "dies early"],
        stock: ["bright", "ringing", "long ring", "woody", "dull", "dead", "short ring"],
    };
    const SUBJECT_REQUIRED_MESSAGE = "Choose a subject or create one.";
    const LAST_SUBJECT_STORAGE_KEY = "tonelab.notebook.lastSubjectId";
    function openNotebookSaveModal(args) {
        const settings = notebookSaveModalSettingsResolve(args);
        return new Promise((resolve) => {
            const modal = notebookSaveModalElementBuild(settings);
            document.body.appendChild(modal);
            const picker = { choice: subjectChoiceDefaultResolve(settings), open: false };
            const detach = notebookSaveModalBindingsAttach(modal, settings, picker, (result) => {
                detach();
                modal.remove();
                resolve(result);
            });
            subjectRender(modal, settings, picker);
        });
    }
    function notebookSaveModalSettingsResolve(args) {
        const source = args || {};
        const newSubject = source.newSubject || {};
        const dialogLabel = String(source.dialogLabel || "Save to Notebook");
        return {
            dialogLabel,
            title: String(source.title || titleDefaultFromDialogLabel(dialogLabel)),
            summary: summaryRowsResolve(source.summary),
            listening: listeningSettingsResolve(source.listening, String(newSubject.typeKey || "GUITAR")),
            notebookName: String(source.notebookName || "Notebook"),
            subjects: Array.isArray(source.subjects) ? source.subjects.filter((subject) => subject && typeof subject === "object") : [],
            defaultSubjectId: String(source.defaultSubjectId || ""),
            packageFiles: Array.isArray(source.packageFiles) && source.packageFiles.length ? source.packageFiles : ["state.json"],
            newSubject: {
                typeKey: String(newSubject.typeKey || "GUITAR"),
                subtypeKey: String(newSubject.subtypeKey || ""),
                displayNamePlaceholder: String(newSubject.displayNamePlaceholder || "Instrument"),
                typeChoice: Boolean(newSubject.typeChoice),
            },
            eventExtras: source.eventExtras || {},
        };
    }
    function titleDefaultFromDialogLabel(dialogLabel) {
        const stripped = dialogLabel.replace(/^save\s+(to\s+)?/i, "").trim();
        return stripped && stripped.toLowerCase() !== "notebook" ? stripped : "Saved state";
    }
    function summaryRowsResolve(rows) {
        if (!Array.isArray(rows))
            return [];
        return rows
            .filter((row) => row && String(row.label || "").trim() && String(row.value || "").trim())
            .map((row) => ({
            label: String(row.label).trim(),
            value: String(row.value).trim(),
            provenance: provenanceResolve(row.provenance),
        }));
    }
    function listeningSettingsResolve(value, subjectTypeKey) {
        const source = value || {};
        const custom = Array.isArray(source.descriptors) ? source.descriptors.map((item) => String(item).trim()).filter(Boolean) : [];
        const descriptorSet = source.descriptorSet || listeningDescriptorSetForSubjectType(subjectTypeKey);
        return { descriptors: custom.length ? custom : notebookListeningDescriptorsRead(descriptorSet) };
    }
    function listeningDescriptorSetForSubjectType(subjectTypeKey) {
        return String(subjectTypeKey || "").trim().toUpperCase() === "MATERIAL" ? "stock" : "instrument";
    }
    function provenanceResolve(value) {
        const label = String(value || "").trim().toLowerCase();
        return PROVENANCE_LABELS.includes(label) ? label : "";
    }
    // ---- default subject ----
    //
    // The dialog never opens without a subject. In order: the subject the tool
    // asked for; the one the builder saved to last, if it is the kind this tool
    // saves (a plate tap should not land on last week's guitar); the first
    // listed subject of that kind; and finally the Bench default for the kind,
    // reused when it already exists and created otherwise. "Bench guitar" is a
    // real subject with a provisional name: renaming it in the Notebook later
    // carries every entry along.
    function subjectChoiceDefaultResolve(settings) {
        const explicit = subjectByIdFind(settings.subjects, settings.defaultSubjectId);
        if (explicit)
            return { subjectId: String(explicit.subjectId) };
        const ofKind = settings.subjects.filter((subject) => subjectMatchesKind(subject, settings.newSubject));
        const remembered = subjectByIdFind(ofKind, lastSubjectIdRead());
        if (remembered)
            return { subjectId: String(remembered.subjectId) };
        if (ofKind.length)
            return { subjectId: String(ofKind[0].subjectId) };
        return benchSubjectChoiceBuild(settings);
    }
    function subjectByIdFind(subjects, subjectId) {
        const wanted = String(subjectId || "").trim();
        return wanted ? subjects.find((subject) => String(subject.subjectId || "") === wanted) : undefined;
    }
    // A subject with no recorded type is treated as belonging to every kind, so
    // older notebooks that never stored one keep a sensible default.
    function subjectMatchesKind(subject, kind) {
        if (!String(subject.subjectId || "").trim())
            return false;
        const typeKey = String(subject.typeKey || "").trim().toUpperCase();
        if (!typeKey)
            return true;
        if (typeKey !== kind.typeKey.toUpperCase())
            return false;
        const wantedSubtype = String(kind.subtypeKey || "").trim().toUpperCase();
        return !wantedSubtype || String(subject.subtypeKey || "").trim().toUpperCase() === wantedSubtype;
    }
    function benchSubjectChoiceBuild(settings) {
        const displayName = benchSubjectNameBuild(settings.newSubject.typeKey, settings.newSubject.subtypeKey);
        const existing = settings.subjects.find((subject) => subjectLabelBuild(subject).trim().toLowerCase() === displayName.toLowerCase() && String(subject.subjectId || "").trim());
        if (existing)
            return { subjectId: String(existing.subjectId) };
        return { newSubject: { typeKey: settings.newSubject.typeKey, subtypeKey: settings.newSubject.subtypeKey, displayName } };
    }
    function benchSubjectNameBuild(typeKey, subtypeKey) {
        return `Bench ${subjectKindLabelBuild(typeKey, subtypeKey).toLowerCase()}`;
    }
    function lastSubjectIdRead() {
        try {
            return String(globalThis.localStorage?.getItem(LAST_SUBJECT_STORAGE_KEY) || "");
        }
        catch {
            return "";
        }
    }
    function lastSubjectIdWrite(subjectId) {
        try {
            globalThis.localStorage?.setItem(LAST_SUBJECT_STORAGE_KEY, subjectId);
        }
        catch {
            // Storage may be unavailable; the default simply falls back to the first subject.
        }
    }
    // ---- markup ----
    function notebookSaveModalElementBuild(settings) {
        const modal = document.createElement("div");
        modal.className = "save-modal save-modal--entry";
        modal.innerHTML = notebookSaveModalMarkupBuild(settings);
        return modal;
    }
    function notebookSaveModalMarkupBuild(settings) {
        return `
      <div class="save-modal__backdrop" data-save-modal-close></div>
      <form class="save-modal__panel save-modal__entry" role="dialog" aria-modal="true" aria-label="${escapeHtml(settings.dialogLabel)}">
        <div class="save-modal__kicker">
          <span class="save-modal__kicker-to">To ${escapeHtml(settings.notebookName)}</span>
          <time class="save-modal__kicker-when" datetime="${escapeHtml(new Date().toISOString())}">${escapeHtml(whenLabelBuild(new Date()))}</time>
        </div>
        ${subjectMarkupBuild(settings)}
        <input type="text" name="event_summary" class="save-modal__title" value="${escapeHtml(settings.title)}" aria-label="Entry title" autocomplete="off">
        ${listeningMarkupBuild(settings)}
        ${summaryMarkupBuild(settings)}
        <p class="save-modal__files">${settings.packageFiles.map((file) => escapeHtml(file)).join(" · ")}</p>
        <p class="save-modal__error" data-save-modal-error hidden></p>
        <footer class="save-modal__footer">
          <button type="button" class="ghost-btn" data-save-modal-close>Cancel</button>
          <button type="submit" class="primary-btn hero-control" data-save-modal-submit>Save</button>
        </footer>
      </form>`;
    }
    function whenLabelBuild(date) {
        try {
            return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
        }
        catch {
            return date.toISOString();
        }
    }
    function subjectMarkupBuild(settings) {
        return `
        <div class="save-modal__subject" data-save-modal-picker>
          <button type="button" class="save-modal__subject-name" data-save-modal-subject aria-haspopup="listbox" aria-expanded="false" title="Change subject"></button>
          <span class="save-modal__subject-kind" data-save-modal-subject-kind></span>
          <div class="save-modal__menu" data-save-modal-menu hidden>
            <input type="search" name="subject_filter" placeholder="${escapeHtml(subjectFilterPlaceholderBuild(settings))}" aria-label="Find or create a subject" autocomplete="off">
            <div class="save-modal__options" role="listbox" data-save-modal-options>${subjectOptionsMarkupBuild(settings.subjects)}</div>
            <div class="save-modal__create" data-save-modal-create-row hidden>
              <button type="button" class="save-modal__option save-modal__option--create" data-save-modal-create>Create “<span data-save-modal-create-name></span>”</button>
              ${settings.newSubject.typeChoice ? subjectTypeChoiceMarkupBuild(settings.newSubject) : `<span class="save-modal__create-kind">as ${escapeHtml(subjectKindLabelBuild(settings.newSubject.typeKey, settings.newSubject.subtypeKey).toLowerCase())}</span>`}
            </div>
          </div>
        </div>`;
    }
    function subjectFilterPlaceholderBuild(settings) {
        return settings.subjects.length
            ? "Find or create a subject"
            : `Name it, for example ${settings.newSubject.displayNamePlaceholder}`;
    }
    function subjectOptionsMarkupBuild(subjects) {
        const groups = new Map();
        subjects.forEach((subject) => {
            const kind = subjectGroupLabelBuild(subject);
            if (!groups.has(kind))
                groups.set(kind, []);
            groups.get(kind).push(subject);
        });
        return Array.from(groups.entries())
            .map(([kind, members]) => `<div class="save-modal__group" data-save-modal-group>${groups.size > 1 || kind ? `<div class="save-modal__group-label">${escapeHtml(kind)}</div>` : ""}${members.map(subjectOptionMarkupBuild).join("")}</div>`)
            .join("");
    }
    function subjectOptionMarkupBuild(subject) {
        const id = String(subject.subjectId || "");
        const label = subjectLabelBuild(subject);
        return `<button type="button" role="option" class="save-modal__option" data-save-modal-option data-subject-id="${escapeHtml(id)}" data-subject-label="${escapeHtml(label.toLowerCase())}">${escapeHtml(label)}</button>`;
    }
    function subjectLabelBuild(subject) {
        return String(subject?.displayName || subject?.subjectId || "");
    }
    function subjectGroupLabelBuild(subject) {
        const typeKey = String(subject.typeKey || "").trim().toUpperCase();
        if (!typeKey)
            return "";
        const type = SUBJECT_TYPE_OPTIONS.find((option) => option.key === typeKey);
        return type ? `${type.label}s` : typeKey.charAt(0) + typeKey.slice(1).toLowerCase().replace(/_/g, " ");
    }
    function subjectKindLabelBuild(typeKey, subtypeKey) {
        const type = SUBJECT_TYPE_OPTIONS.find((option) => option.key === String(typeKey || "").toUpperCase());
        const subtype = type?.subtypes.find((option) => option.key === String(subtypeKey || "").toUpperCase() && option.key);
        return subtype ? `${subtype.label}` : type ? type.label : "Subject";
    }
    function subjectTypeChoiceMarkupBuild(newSubject) {
        return `
              <span class="save-modal__create-kind">as</span>
              <select name="type_key" aria-label="Type">${selectOptionsMarkupBuild(notebookSubjectTypeOptionsRead(), newSubject.typeKey)}</select>
              <select name="subtype_key" aria-label="Subtype">${selectOptionsMarkupBuild(notebookSubjectSubtypeOptionsRead(newSubject.typeKey), newSubject.subtypeKey)}</select>`;
    }
    function listeningMarkupBuild(settings) {
        return `
        <div class="save-modal__listening">
          <label class="save-modal__heard"><span class="save-modal__heard-label">Heard</span><input type="text" name="heard_note" placeholder="One line, before the numbers" autocomplete="off"></label>
          <div class="save-modal__pills" role="group" aria-label="What you heard">${settings.listening.descriptors.map(listeningPillMarkupBuild).join("")}</div>
        </div>`;
    }
    function listeningPillMarkupBuild(descriptor) {
        return `<button type="button" class="save-modal__pill" name="heard_descriptor" value="${escapeHtml(descriptor)}" aria-pressed="false">${escapeHtml(descriptor)}</button>`;
    }
    function summaryMarkupBuild(settings) {
        if (!settings.summary.length)
            return "";
        return `
        <dl class="save-modal__summary">${settings.summary.map(summaryRowMarkupBuild).join("")}</dl>`;
    }
    // Provenance is printed only when it has something to say: a measured value
    // is the expectation, a modeled, calculated or default one is worth a word.
    function summaryRowMarkupBuild(row) {
        const provenance = row.provenance && row.provenance !== "measured"
            ? `<span class="save-modal__provenance save-modal__provenance--${escapeHtml(row.provenance)}">${escapeHtml(row.provenance)}</span>`
            : "";
        return `<div class="save-modal__summary-row"><dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd>${provenance}</div>`;
    }
    // ---- behaviour ----
    function notebookSaveModalBindingsAttach(modal, settings, picker, closeWith) {
        closeBindingsAttach(modal, closeWith);
        pillBindingsAttach(modal);
        subjectTypeBindingsAttach(modal, settings);
        const detachPicker = pickerBindingsAttach(modal, settings, picker);
        submitBindingAttach(modal, settings, picker, closeWith);
        return detachPicker;
    }
    function closeBindingsAttach(modal, closeWith) {
        modal.querySelectorAll("[data-save-modal-close]").forEach((element) => {
            element.addEventListener("click", () => closeWith(null));
        });
    }
    function pillBindingsAttach(modal) {
        modal.querySelectorAll(".save-modal__pill").forEach((pill) => {
            pill.addEventListener("click", () => {
                pill.setAttribute("aria-pressed", pill.getAttribute("aria-pressed") === "true" ? "false" : "true");
            });
        });
    }
    function subjectTypeBindingsAttach(modal, settings) {
        if (!settings.newSubject.typeChoice)
            return;
        const typeSelect = modal.querySelector('select[name="type_key"]');
        const subtypeSelect = modal.querySelector('select[name="subtype_key"]');
        if (!typeSelect || !subtypeSelect)
            return;
        typeSelect.addEventListener("change", () => subtypeOptionsRender(subtypeSelect, typeSelect.value, ""));
    }
    function pickerBindingsAttach(modal, settings, picker) {
        const trigger = modal.querySelector("[data-save-modal-subject]");
        const filter = modal.querySelector('input[name="subject_filter"]');
        const create = modal.querySelector("[data-save-modal-create]");
        if (!trigger || !filter || !create)
            return () => { };
        trigger.addEventListener("click", () => pickerToggle(modal, settings, picker, !picker.open));
        filter.addEventListener("input", () => pickerFilterRender(modal, filter.value));
        filter.addEventListener("keydown", (event) => pickerKeydownHandle(event, modal, settings, picker));
        create.addEventListener("click", () => subjectCreateChoose(modal, settings, picker));
        modal.querySelectorAll("[data-save-modal-option]").forEach((option) => {
            option.addEventListener("click", () => subjectChoose(modal, settings, picker, { subjectId: String(option.dataset.subjectId || "") }));
        });
        const outsideClick = (event) => {
            if (!picker.open)
                return;
            const target = event.target;
            const pickerElement = modal.querySelector("[data-save-modal-picker]");
            if (pickerElement && target && !pickerElement.contains(target))
                pickerToggle(modal, settings, picker, false);
        };
        modal.addEventListener("click", outsideClick);
        return () => modal.removeEventListener("click", outsideClick);
    }
    function pickerKeydownHandle(event, modal, settings, picker) {
        if (event.key === "Escape") {
            event.preventDefault();
            pickerToggle(modal, settings, picker, false);
            return;
        }
        if (event.key !== "Enter")
            return;
        event.preventDefault();
        const visible = pickerVisibleOptionsRead(modal);
        if (visible.length === 1) {
            subjectChoose(modal, settings, picker, { subjectId: String(visible[0].dataset.subjectId || "") });
            return;
        }
        if (pickerCreateAvailable(modal))
            subjectCreateChoose(modal, settings, picker);
    }
    function pickerToggle(modal, settings, picker, open) {
        picker.open = open;
        const menu = modal.querySelector("[data-save-modal-menu]");
        const trigger = modal.querySelector("[data-save-modal-subject]");
        const filter = modal.querySelector('input[name="subject_filter"]');
        if (menu)
            menu.hidden = !open;
        if (trigger)
            trigger.setAttribute("aria-expanded", open ? "true" : "false");
        if (open && filter) {
            filter.value = "";
            pickerFilterRender(modal, "");
            filter.focus();
        }
    }
    function pickerFilterRender(modal, text) {
        const needle = String(text || "").trim().toLowerCase();
        let exactMatch = false;
        modal.querySelectorAll("[data-save-modal-option]").forEach((option) => {
            const label = String(option.dataset.subjectLabel || "");
            const hit = !needle || label.includes(needle);
            option.hidden = !hit;
            if (hit && label === needle)
                exactMatch = true;
        });
        modal.querySelectorAll("[data-save-modal-group]").forEach((group) => {
            group.hidden = !group.querySelector("[data-save-modal-option]:not([hidden])");
        });
        const createRow = modal.querySelector("[data-save-modal-create-row]");
        const createName = modal.querySelector("[data-save-modal-create-name]");
        if (createRow)
            createRow.hidden = !needle || exactMatch;
        if (createName)
            createName.textContent = String(text || "").trim();
    }
    function pickerVisibleOptionsRead(modal) {
        return Array.from(modal.querySelectorAll("[data-save-modal-option]")).filter((option) => !option.hidden);
    }
    function pickerCreateAvailable(modal) {
        const createRow = modal.querySelector("[data-save-modal-create-row]");
        return Boolean(createRow && !createRow.hidden);
    }
    function subjectChoose(modal, settings, picker, choice) {
        picker.choice = choice;
        pickerToggle(modal, settings, picker, false);
        subjectRender(modal, settings, picker);
        errorRender(modal.querySelector("[data-save-modal-error]"), "");
    }
    function subjectCreateChoose(modal, settings, picker) {
        const displayName = fieldValueRead(modal, 'input[name="subject_filter"]').trim();
        if (!displayName)
            return;
        subjectChoose(modal, settings, picker, {
            newSubject: {
                typeKey: newSubjectTypeKeyRead(modal, settings),
                subtypeKey: newSubjectSubtypeKeyRead(modal, settings),
                displayName,
            },
        });
    }
    function subjectRender(modal, settings, picker) {
        const trigger = modal.querySelector("[data-save-modal-subject]");
        const kind = modal.querySelector("[data-save-modal-subject-kind]");
        const submit = modal.querySelector("[data-save-modal-submit]");
        const name = subjectChoiceNameBuild(settings, picker.choice);
        if (trigger)
            trigger.textContent = name ? `${name} ▾` : "Choose a subject ▾";
        if (kind)
            kind.textContent = subjectChoiceKindBuild(settings, picker.choice);
        if (submit)
            submit.textContent = name ? `Save to ${subjectShortNameBuild(name)}` : "Save";
    }
    function subjectChoiceNameBuild(settings, choice) {
        if (!choice)
            return "";
        if ("newSubject" in choice)
            return choice.newSubject.displayName;
        return subjectLabelBuild(settings.subjects.find((subject) => String(subject.subjectId || "") === choice.subjectId));
    }
    function subjectChoiceKindBuild(settings, choice) {
        if (!choice)
            return settings.subjects.length ? "" : "Nothing in the notebook yet";
        if ("newSubject" in choice)
            return `New ${subjectKindLabelBuild(choice.newSubject.typeKey, choice.newSubject.subtypeKey).toLowerCase()} · rename any time`;
        const subject = settings.subjects.find((item) => String(item.subjectId || "") === choice.subjectId);
        return subject ? subjectKindLabelBuild(String(subject.typeKey || ""), String(subject.subtypeKey || "")).replace(/^Subject$/, "") : "";
    }
    function subjectShortNameBuild(name) {
        const short = name.replace(/\s*\(.*\)\s*$/, "").trim() || name;
        return short.length > 28 ? `${short.slice(0, 27).trim()}…` : short;
    }
    function submitBindingAttach(modal, settings, picker, closeWith) {
        const form = modal.querySelector("form");
        const error = modal.querySelector("[data-save-modal-error]");
        form?.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!picker.choice) {
                errorRender(error, SUBJECT_REQUIRED_MESSAGE);
                pickerToggle(modal, settings, picker, true);
                return;
            }
            errorRender(error, "");
            if ("subjectId" in picker.choice)
                lastSubjectIdWrite(picker.choice.subjectId);
            closeWith({ subject: picker.choice, event: eventRead(modal, settings) });
        });
    }
    function newSubjectTypeKeyRead(modal, settings) {
        if (!settings.newSubject.typeChoice)
            return settings.newSubject.typeKey;
        return fieldValueRead(modal, 'select[name="type_key"]') || "GENERIC";
    }
    function newSubjectSubtypeKeyRead(modal, settings) {
        if (!settings.newSubject.typeChoice)
            return settings.newSubject.subtypeKey;
        return fieldValueRead(modal, 'select[name="subtype_key"]');
    }
    function eventRead(modal, settings) {
        return {
            summary: fieldValueRead(modal, 'input[name="event_summary"]').trim() || settings.title,
            note: "",
            capturedAt: new Date().toISOString(),
            ...heardRead(modal),
            ...settings.eventExtras,
        };
    }
    function heardRead(modal) {
        const descriptors = [];
        modal.querySelectorAll('.save-modal__pill[aria-pressed="true"]').forEach((pill) => {
            const value = String(pill.value || "").trim();
            if (value)
                descriptors.push(value);
        });
        const note = fieldValueRead(modal, 'input[name="heard_note"]').trim();
        if (!descriptors.length && !note)
            return {};
        return { heard: { descriptors, note } };
    }
    function fieldValueRead(modal, selector) {
        const field = modal.querySelector(selector);
        return String((field && field.value) || "");
    }
    function subtypeOptionsRender(subtypeSelect, typeKey, selectedKey) {
        subtypeSelect.innerHTML = selectOptionsMarkupBuild(notebookSubjectSubtypeOptionsRead(typeKey), selectedKey);
    }
    function errorRender(error, message) {
        if (!error)
            return;
        error.hidden = !message;
        error.textContent = message;
    }
    function selectOptionsMarkupBuild(options, selectedKey) {
        return options
            .map((option) => `<option value="${escapeHtml(option.key)}" ${option.key === selectedKey ? "selected" : ""}>${escapeHtml(option.label)}</option>`)
            .join("");
    }
    function notebookSubjectTypeOptionsRead() {
        return SUBJECT_TYPE_OPTIONS.map((option) => ({
            ...option,
            subtypes: option.subtypes.map((subtype) => ({ ...subtype })),
        }));
    }
    function notebookSubjectSubtypeOptionsRead(typeKey) {
        const match = notebookSubjectTypeOptionsRead().find((option) => option.key === typeKey);
        return match ? match.subtypes : GENERAL_SUBTYPE_OPTIONS.map((subtype) => ({ ...subtype }));
    }
    function notebookListeningDescriptorsRead(descriptorSet) {
        const key = String(descriptorSet || "instrument").trim().toLowerCase();
        return [...(LISTENING_DESCRIPTOR_SETS[key] || LISTENING_DESCRIPTOR_SETS.instrument)];
    }
    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
    const CommonNotebookSaveModal = {
        openNotebookSaveModal,
        notebookSubjectTypeOptionsRead,
        notebookSubjectSubtypeOptionsRead,
        notebookListeningDescriptorsRead,
    };
    const globalScope = typeof globalThis !== "undefined"
        ? globalThis
        : typeof window !== "undefined"
            ? window
            : undefined;
    if (globalScope) {
        globalScope.CommonNotebookSaveModal = CommonNotebookSaveModal;
    }
    if (typeof module !== "undefined" && module.exports) {
        module.exports = CommonNotebookSaveModal;
    }
})();
