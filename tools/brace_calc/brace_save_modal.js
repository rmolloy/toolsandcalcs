(function (globalScope) {
  function openConnectedBraceSaveModal(args) {
    return new Promise(function (resolve) {
      var modal = buildBraceSaveModal(args || {});
      document.body.appendChild(modal);
      attachBraceSaveModalBindings(modal, args || {}, function (result) {
        modal.remove();
        resolve(result);
      });
    });
  }

  function buildBraceSaveModal(args) {
    var subjects = Array.isArray(args.subjects) ? args.subjects : [];
    var hasSubjects = subjects.length > 0;
    var subjectMode = hasSubjects ? "existing" : "new";
    var subjectOptions = buildBraceSubjectOptions(subjects);
    var modal = document.createElement("div");
    modal.className = "save-modal";
    modal.innerHTML = `
      <div class="save-modal__backdrop" data-save-modal-close></div>
      <div class="save-modal__panel" role="dialog" aria-modal="true" aria-label="Save Brace Layout">
        <header>
          <h2>Save to ${escapeBraceSaveHtml(args.notebookName || "Notebook")}</h2>
          <button type="button" class="ghost-btn btn-small" data-save-modal-close>Close</button>
        </header>
        <form class="save-modal__form">
          <section class="save-modal__section">
            <h3>Subject</h3>
            <div class="save-modal__toggle-row">
              <label><input type="radio" name="subject_mode" value="existing" ${subjectMode === "existing" ? "checked" : ""}${hasSubjects ? "" : " disabled"}> Existing</label>
              <label><input type="radio" name="subject_mode" value="new" ${subjectMode === "new" ? "checked" : ""}> New</label>
            </div>
            <div class="save-modal__existing"${subjectMode === "existing" ? "" : " hidden"}>
              <input type="search" name="subject_filter" placeholder="Filter subjects">
              <select name="subject_id" size="6">${subjectOptions}</select>
            </div>
            <div class="save-modal__new"${subjectMode === "new" ? "" : " hidden"}>
              <label>Display Name<input type="text" name="display_name" placeholder="${escapeBraceSaveHtml(args.defaultDisplayName || "Brace Stock")}"></label>
            </div>
          </section>
          <section class="save-modal__section">
            <h3>Event</h3>
            <label>Note<textarea name="event_note" rows="4" placeholder="What did you change in the brace layout?"></textarea></label>
          </section>
          <section class="save-modal__section">
            <h3>Package</h3>
            <ul class="save-modal__package-list"><li><code>state.json</code></li></ul>
          </section>
          <p class="save-modal__error" data-save-modal-error hidden></p>
          <footer class="save-modal__footer"><button type="submit" class="primary-btn hero-control">Save to Notebook</button></footer>
        </form>
      </div>`;
    return modal;
  }

  function attachBraceSaveModalBindings(modal, args, closeWith) {
    modal.querySelectorAll("[data-save-modal-close]").forEach(function (element) {
      element.addEventListener("click", function () {
        closeWith(null);
      });
    });

    modal.querySelectorAll('input[name="subject_mode"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        renderBraceSaveModalMode(modal, radio.value);
      });
    });

    var filterInput = modal.querySelector('input[name="subject_filter"]');
    var subjectSelect = modal.querySelector('select[name="subject_id"]');
    if (filterInput && subjectSelect) {
      filterInput.addEventListener("input", function () {
        renderBraceSaveModalFilter(subjectSelect, args.subjects || [], filterInput.value);
      });
      renderBraceSaveModalFilter(subjectSelect, args.subjects || [], "");
    }

    var form = modal.querySelector("form");
    var error = modal.querySelector("[data-save-modal-error]");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var subjectMode = modal.querySelector('input[name="subject_mode"]:checked').value || "new";
      var subject = subjectMode === "existing"
        ? readExistingBraceSubjectSelection(subjectSelect && subjectSelect.value)
        : readNewBraceSubjectSelection(modal);

      if (!subject) {
        renderBraceSaveModalError(error, "Choose a subject or enter a display name.");
        return;
      }

      renderBraceSaveModalError(error, "");
      closeWith({
        subject: subject,
        event: {
          note: String(modal.querySelector('textarea[name="event_note"]').value || "").trim(),
          capturedAt: new Date().toISOString(),
        },
      });
    });

    renderBraceSaveModalMode(modal, hasExistingBraceSubjects(args.subjects) ? "existing" : "new");
  }

  function hasExistingBraceSubjects(subjects) {
    return Array.isArray(subjects) && subjects.length > 0;
  }

  function buildBraceSubjectOptions(subjects) {
    return subjects.map(function (subject) {
      return '<option value="' + escapeBraceSaveHtml(subject.subjectId || "") + '">' +
        escapeBraceSaveHtml(subject.displayName || subject.subjectId || "") +
        "</option>";
    }).join("");
  }

  function readExistingBraceSubjectSelection(subjectId) {
    return subjectId ? { subjectId: subjectId } : null;
  }

  function readNewBraceSubjectSelection(modal) {
    var displayName = String(modal.querySelector('input[name="display_name"]').value || "").trim();

    if (!displayName) {
      return null;
    }

    return {
      newSubject: {
        typeKey: "MATERIAL",
        subtypeKey: "BRACE_STOCK",
        displayName: displayName,
      },
    };
  }

  function renderBraceSaveModalMode(modal, mode) {
    modal.querySelector(".save-modal__existing").hidden = mode !== "existing";
    modal.querySelector(".save-modal__new").hidden = mode !== "new";
  }

  function renderBraceSaveModalFilter(subjectSelect, subjects, filterText) {
    var needle = String(filterText || "").trim().toLowerCase();
    var filtered = (subjects || []).filter(function (subject) {
      return String(subject.displayName || "").toLowerCase().includes(needle);
    });
    subjectSelect.innerHTML = buildBraceSubjectOptions(filtered);
  }

  function renderBraceSaveModalError(error, message) {
    if (!error) {
      return;
    }

    error.hidden = !message;
    error.textContent = message;
  }

  function escapeBraceSaveHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var api = {
    openConnectedBraceSaveModal: openConnectedBraceSaveModal,
  };

  globalScope.BraceSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
