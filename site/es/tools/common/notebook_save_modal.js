"use strict";
// The Save to Notebook dialog, shared by every tool that saves a capture.
//
// It is the notebook entry the builder is about to write, editable in place:
// the subject as a heading (click to change or create), the title, one line
// for what was heard with descriptor pills, the numbers as they will appear
// in the notebook, the files as a footnote, and Cancel beside Save.
(() => {
    // localized-runtime-messages:start
    const notebookSaveMessages = Object.freeze({
        locale: "es",
        asKind: "como {kind}",
        benchSubject: "Banco: {kind}",
        cancel: "Cancelar",
        changeSubject: "Cambiar elemento",
        chooseSubject: "Elige un elemento",
        createSubject: "Crear «{name}»",
        descriptorBloom: "apertura",
        descriptorBright: "brillante",
        descriptorDead: "muerto",
        descriptorDiesEarly: "se apaga pronto",
        descriptorDull: "apagado",
        descriptorEven: "equilibrado",
        descriptorHollow: "hueco",
        descriptorLongRing: "resonancia larga",
        descriptorRinging: "resonante",
        descriptorShortRing: "resonancia corta",
        descriptorSings: "canta",
        descriptorStiff: "rígido",
        descriptorTight: "firme",
        descriptorWarm: "cálido",
        descriptorWobble: "fluctuante",
        descriptorWoody: "amaderado",
        dialogLabel: "Guardar en el cuaderno",
        entryTitle: "Título de la entrada",
        findOrCreateSubject: "Buscar o crear un elemento",
        heard: "Escuchado",
        heardPlaceholder: "Una línea, antes de los números",
        instrument: "Instrumento",
        nameExample: "Ponle un nombre, por ejemplo {example}",
        newSubjectKind: "Nuevo elemento: {kind} · puedes cambiarle el nombre cuando quieras",
        nothingInNotebook: "Aún no hay nada en el cuaderno",
        notebook: "Cuaderno",
        provenanceCalculated: "calculado",
        provenanceDefault: "predeterminado",
        provenanceMeasured: "medido",
        provenanceModeled: "modelado",
        save: "Guardar",
        saveToSubject: "Guardar en {subject}",
        savedState: "Estado guardado",
        subjectRequired: "Elige un elemento o crea uno.",
        subject: "Elemento",
        subtypeBraceStock: "Madera para varetas",
        subtypeGeneral: "General",
        subtypePlateStock: "Madera para tapa o fondo",
        subtype: "Subtipo",
        toNotebook: "En {notebookName}",
        typeAssembly: "Conjunto",
        typeAssemblies: "Conjuntos",
        typeBlank: "Pieza en bruto",
        typeBlanks: "Piezas en bruto",
        typeBrace: "Vareta",
        typeBraces: "Varetas",
        typeFixture: "Accesorio",
        typeFixtures: "Accesorios",
        typeGeneric: "Genérico",
        typeGenerics: "Genéricos",
        typeGuitar: "Guitarra",
        typeGuitars: "Guitarras",
        typeInstrument: "Instrumento",
        typeInstruments: "Instrumentos",
        typeJig: "Plantilla",
        typeJigs: "Plantillas",
        typeMaterial: "Material",
        typeMaterials: "Materiales",
        typePart: "Pieza",
        typeParts: "Piezas",
        typePlate: "Placa",
        typePlates: "Placas",
        typeSetupComponent: "Componente de ajuste",
        typeSetupComponents: "Componentes de ajuste",
        type: "Tipo",
        whatYouHeard: "Lo que escuchaste",
    });
    // localized-runtime-messages:end
    void notebookSaveMessages;
    const SUBJECT_TYPE_OPTIONS = [
        subjectTypeOption("GUITAR", notebookSaveMessages.typeGuitar, notebookSaveMessages.typeGuitars),
        subjectTypeOption("MATERIAL", notebookSaveMessages.typeMaterial, notebookSaveMessages.typeMaterials, [
            { key: "PLATE_STOCK", label: notebookSaveMessages.subtypePlateStock },
            { key: "BRACE_STOCK", label: notebookSaveMessages.subtypeBraceStock },
        ]),
        subjectTypeOption("BLANK", notebookSaveMessages.typeBlank, notebookSaveMessages.typeBlanks),
        subjectTypeOption("PART", notebookSaveMessages.typePart, notebookSaveMessages.typeParts),
        subjectTypeOption("PLATE", notebookSaveMessages.typePlate, notebookSaveMessages.typePlates),
        subjectTypeOption("BRACE", notebookSaveMessages.typeBrace, notebookSaveMessages.typeBraces),
        subjectTypeOption("ASSEMBLY", notebookSaveMessages.typeAssembly, notebookSaveMessages.typeAssemblies),
        subjectTypeOption("INSTRUMENT", notebookSaveMessages.typeInstrument, notebookSaveMessages.typeInstruments),
        subjectTypeOption("SETUP_COMPONENT", notebookSaveMessages.typeSetupComponent, notebookSaveMessages.typeSetupComponents),
        subjectTypeOption("JIG", notebookSaveMessages.typeJig, notebookSaveMessages.typeJigs),
        subjectTypeOption("FIXTURE", notebookSaveMessages.typeFixture, notebookSaveMessages.typeFixtures),
        subjectTypeOption("GENERIC", notebookSaveMessages.typeGeneric, notebookSaveMessages.typeGenerics),
    ];
    const GENERAL_SUBTYPE_OPTIONS = [{ key: "", label: notebookSaveMessages.subtypeGeneral }];
    const PROVENANCE_LABELS = {
        measured: notebookSaveMessages.provenanceMeasured,
        modeled: notebookSaveMessages.provenanceModeled,
        calculated: notebookSaveMessages.provenanceCalculated,
        default: notebookSaveMessages.provenanceDefault,
    };
    const LISTENING_DESCRIPTOR_SETS = {
        instrument: [
            listeningDescriptor("bloom", notebookSaveMessages.descriptorBloom),
            listeningDescriptor("sings", notebookSaveMessages.descriptorSings),
            listeningDescriptor("even", notebookSaveMessages.descriptorEven),
            listeningDescriptor("warm", notebookSaveMessages.descriptorWarm),
            listeningDescriptor("tight", notebookSaveMessages.descriptorTight),
            listeningDescriptor("stiff", notebookSaveMessages.descriptorStiff),
            listeningDescriptor("hollow", notebookSaveMessages.descriptorHollow),
            listeningDescriptor("wobble", notebookSaveMessages.descriptorWobble),
            listeningDescriptor("dies early", notebookSaveMessages.descriptorDiesEarly),
        ],
        stock: [
            listeningDescriptor("bright", notebookSaveMessages.descriptorBright),
            listeningDescriptor("ringing", notebookSaveMessages.descriptorRinging),
            listeningDescriptor("long ring", notebookSaveMessages.descriptorLongRing),
            listeningDescriptor("woody", notebookSaveMessages.descriptorWoody),
            listeningDescriptor("dull", notebookSaveMessages.descriptorDull),
            listeningDescriptor("dead", notebookSaveMessages.descriptorDead),
            listeningDescriptor("short ring", notebookSaveMessages.descriptorShortRing),
        ],
    };
    const LAST_SUBJECT_STORAGE_KEY = "tonelab.notebook.lastSubjectId";
    function subjectTypeOption(key, label, groupLabel, subtypes) {
        return {
            key,
            label,
            groupLabel,
            subtypes: subtypes || [{ key: "", label: notebookSaveMessages.subtypeGeneral }],
        };
    }
    function listeningDescriptor(value, label) {
        return { value, label };
    }
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
        const dialogLabel = String(source.dialogLabel || notebookSaveMessages.dialogLabel);
        return {
            dialogLabel,
            title: String(source.title || titleDefaultFromDialogLabel(dialogLabel)),
            summary: summaryRowsResolve(source.summary),
            listening: listeningSettingsResolve(source.listening, String(newSubject.typeKey || "GUITAR")),
            notebookName: String(source.notebookName || notebookSaveMessages.notebook),
            subjects: Array.isArray(source.subjects) ? source.subjects.filter((subject) => subject && typeof subject === "object") : [],
            defaultSubjectId: String(source.defaultSubjectId || ""),
            packageFiles: Array.isArray(source.packageFiles) && source.packageFiles.length ? source.packageFiles : ["state.json"],
            newSubject: {
                typeKey: String(newSubject.typeKey || "GUITAR"),
                subtypeKey: String(newSubject.subtypeKey || ""),
                displayNamePlaceholder: String(newSubject.displayNamePlaceholder || notebookSaveMessages.instrument),
                typeChoice: Boolean(newSubject.typeChoice),
            },
            eventExtras: source.eventExtras || {},
        };
    }
    function titleDefaultFromDialogLabel(dialogLabel) {
        if (dialogLabel === notebookSaveMessages.dialogLabel)
            return notebookSaveMessages.savedState;
        const stripped = dialogLabel.replace(/^save\s+(to\s+)?/i, "").trim();
        return stripped && stripped.toLowerCase() !== "notebook" ? stripped : notebookSaveMessages.savedState;
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
        const custom = Array.isArray(source.descriptors)
            ? source.descriptors
                .map((item) => String(item).trim())
                .filter(Boolean)
                .map((item) => listeningDescriptor(item, item))
            : [];
        const descriptorSet = source.descriptorSet || listeningDescriptorSetForSubjectType(subjectTypeKey);
        return { descriptors: custom.length ? custom : notebookListeningDescriptorOptionsRead(descriptorSet) };
    }
    function listeningDescriptorSetForSubjectType(subjectTypeKey) {
        return String(subjectTypeKey || "").trim().toUpperCase() === "MATERIAL" ? "stock" : "instrument";
    }
    function provenanceResolve(value) {
        const label = String(value || "").trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(PROVENANCE_LABELS, label) ? label : "";
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
        return formatNotebookSaveMessage(notebookSaveMessages.benchSubject, {
            kind: subjectKindLabelBuild(typeKey, subtypeKey).toLowerCase(),
        });
    }
    function lastSubjectIdRead() {
        var _a;
        try {
            return String(((_a = globalThis.localStorage) === null || _a === void 0 ? void 0 : _a.getItem(LAST_SUBJECT_STORAGE_KEY)) || "");
        }
        catch {
            return "";
        }
    }
    function lastSubjectIdWrite(subjectId) {
        var _a;
        try {
            (_a = globalThis.localStorage) === null || _a === void 0 ? void 0 : _a.setItem(LAST_SUBJECT_STORAGE_KEY, subjectId);
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
          <span class="save-modal__kicker-to">${escapeHtml(formatNotebookSaveMessage(notebookSaveMessages.toNotebook, { notebookName: settings.notebookName }))}</span>
          <time class="save-modal__kicker-when" datetime="${escapeHtml(new Date().toISOString())}">${escapeHtml(whenLabelBuild(new Date()))}</time>
        </div>
        ${subjectMarkupBuild(settings)}
        <input type="text" name="event_summary" class="save-modal__title" value="${escapeHtml(settings.title)}" aria-label="${escapeHtml(notebookSaveMessages.entryTitle)}" autocomplete="off">
        ${listeningMarkupBuild(settings)}
        ${summaryMarkupBuild(settings)}
        <p class="save-modal__files">${settings.packageFiles.map((file) => escapeHtml(file)).join(" · ")}</p>
        <p class="save-modal__error" data-save-modal-error hidden></p>
        <footer class="save-modal__footer">
          <button type="button" class="ghost-btn" data-save-modal-close>${escapeHtml(notebookSaveMessages.cancel)}</button>
          <button type="submit" class="primary-btn hero-control" data-save-modal-submit>${escapeHtml(notebookSaveMessages.save)}</button>
        </footer>
      </form>`;
    }
    function whenLabelBuild(date) {
        try {
            return date.toLocaleString(notebookSaveMessages.locale, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
        }
        catch {
            return date.toISOString();
        }
    }
    function subjectMarkupBuild(settings) {
        return `
        <div class="save-modal__subject" data-save-modal-picker>
          <button type="button" class="save-modal__subject-name" data-save-modal-subject aria-haspopup="listbox" aria-expanded="false" title="${escapeHtml(notebookSaveMessages.changeSubject)}"></button>
          <span class="save-modal__subject-kind" data-save-modal-subject-kind></span>
          <div class="save-modal__menu" data-save-modal-menu hidden>
            <input type="search" name="subject_filter" placeholder="${escapeHtml(subjectFilterPlaceholderBuild(settings))}" aria-label="${escapeHtml(notebookSaveMessages.findOrCreateSubject)}" autocomplete="off">
            <div class="save-modal__options" role="listbox" data-save-modal-options>${subjectOptionsMarkupBuild(settings.subjects)}</div>
            <div class="save-modal__create" data-save-modal-create-row hidden>
              <button type="button" class="save-modal__option save-modal__option--create" data-save-modal-create>${escapeHtml(formatNotebookSaveMessage(notebookSaveMessages.createSubject, { name: "" }))}</button>
              ${settings.newSubject.typeChoice ? subjectTypeChoiceMarkupBuild(settings.newSubject) : `<span class="save-modal__create-kind">${escapeHtml(formatNotebookSaveMessage(notebookSaveMessages.asKind, { kind: subjectKindLabelBuild(settings.newSubject.typeKey, settings.newSubject.subtypeKey).toLowerCase() }))}</span>`}
            </div>
          </div>
        </div>`;
    }
    function subjectFilterPlaceholderBuild(settings) {
        return settings.subjects.length
            ? notebookSaveMessages.findOrCreateSubject
            : formatNotebookSaveMessage(notebookSaveMessages.nameExample, {
                example: settings.newSubject.displayNamePlaceholder,
            });
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
        return String((subject === null || subject === void 0 ? void 0 : subject.displayName) || (subject === null || subject === void 0 ? void 0 : subject.subjectId) || "");
    }
    function subjectGroupLabelBuild(subject) {
        const typeKey = String(subject.typeKey || "").trim().toUpperCase();
        if (!typeKey)
            return "";
        const type = SUBJECT_TYPE_OPTIONS.find((option) => option.key === typeKey);
        return type ? type.groupLabel : typeKey.charAt(0) + typeKey.slice(1).toLowerCase().replace(/_/g, " ");
    }
    function subjectKindLabelBuild(typeKey, subtypeKey) {
        const type = SUBJECT_TYPE_OPTIONS.find((option) => option.key === String(typeKey || "").toUpperCase());
        const subtype = type === null || type === void 0 ? void 0 : type.subtypes.find((option) => option.key === String(subtypeKey || "").toUpperCase() && option.key);
        return subtype ? `${subtype.label}` : type ? type.label : notebookSaveMessages.subject;
    }
    function subjectTypeChoiceMarkupBuild(newSubject) {
        return `
              <span class="save-modal__create-kind">as</span>
              <select name="type_key" aria-label="${escapeHtml(notebookSaveMessages.type)}">${selectOptionsMarkupBuild(notebookSubjectTypeOptionsRead(), newSubject.typeKey)}</select>
              <select name="subtype_key" aria-label="${escapeHtml(notebookSaveMessages.subtype)}">${selectOptionsMarkupBuild(notebookSubjectSubtypeOptionsRead(newSubject.typeKey), newSubject.subtypeKey)}</select>`;
    }
    function listeningMarkupBuild(settings) {
        return `
        <div class="save-modal__listening">
          <label class="save-modal__heard"><span class="save-modal__heard-label">${escapeHtml(notebookSaveMessages.heard)}</span><input type="text" name="heard_note" placeholder="${escapeHtml(notebookSaveMessages.heardPlaceholder)}" autocomplete="off"></label>
          <div class="save-modal__pills" role="group" aria-label="${escapeHtml(notebookSaveMessages.whatYouHeard)}">${settings.listening.descriptors.map(listeningPillMarkupBuild).join("")}</div>
        </div>`;
    }
    function listeningPillMarkupBuild(descriptor) {
        return `<button type="button" class="save-modal__pill" name="heard_descriptor" value="${escapeHtml(descriptor.value)}" aria-pressed="false">${escapeHtml(descriptor.label)}</button>`;
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
            ? `<span class="save-modal__provenance save-modal__provenance--${escapeHtml(row.provenance)}">${escapeHtml(PROVENANCE_LABELS[row.provenance])}</span>`
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
        const create = modal.querySelector("[data-save-modal-create]");
        if (createRow)
            createRow.hidden = !needle || exactMatch;
        if (create) {
            create.textContent = formatNotebookSaveMessage(notebookSaveMessages.createSubject, {
                name: String(text || "").trim(),
            });
        }
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
            trigger.textContent = name ? `${name} ▾` : `${notebookSaveMessages.chooseSubject} ▾`;
        if (kind)
            kind.textContent = subjectChoiceKindBuild(settings, picker.choice);
        if (submit) {
            submit.textContent = name
                ? formatNotebookSaveMessage(notebookSaveMessages.saveToSubject, { subject: subjectShortNameBuild(name) })
                : notebookSaveMessages.save;
        }
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
            return settings.subjects.length ? "" : notebookSaveMessages.nothingInNotebook;
        if ("newSubject" in choice) {
            return formatNotebookSaveMessage(notebookSaveMessages.newSubjectKind, {
                kind: subjectKindLabelBuild(choice.newSubject.typeKey, choice.newSubject.subtypeKey).toLowerCase(),
            });
        }
        const subject = settings.subjects.find((item) => String(item.subjectId || "") === choice.subjectId);
        return subject ? subjectKindLabelBuild(String(subject.typeKey || ""), String(subject.subtypeKey || "")).replace(new RegExp(`^${escapeRegExp(notebookSaveMessages.subject)}$`), "") : "";
    }
    function subjectShortNameBuild(name) {
        const short = name.replace(/\s*\(.*\)\s*$/, "").trim() || name;
        return short.length > 28 ? `${short.slice(0, 27).trim()}…` : short;
    }
    function submitBindingAttach(modal, settings, picker, closeWith) {
        const form = modal.querySelector("form");
        const error = modal.querySelector("[data-save-modal-error]");
        form === null || form === void 0 ? void 0 : form.addEventListener("submit", (event) => {
            event.preventDefault();
            if (!picker.choice) {
                errorRender(error, notebookSaveMessages.subjectRequired);
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
        return notebookListeningDescriptorOptionsRead(descriptorSet).map((descriptor) => descriptor.label);
    }
    function notebookListeningDescriptorOptionsRead(descriptorSet) {
        const key = String(descriptorSet || "instrument").trim().toLowerCase();
        return (LISTENING_DESCRIPTOR_SETS[key] || LISTENING_DESCRIPTOR_SETS.instrument)
            .map((descriptor) => ({ ...descriptor }));
    }
    function escapeHtml(value) {
        return String(value !== null && value !== void 0 ? value : "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }
    function escapeRegExp(value) {
        return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    function formatNotebookSaveMessage(template, values) {
        return Object.entries(values).reduce((message, [key, value]) => message.split(`{${key}}`).join(value), template);
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
