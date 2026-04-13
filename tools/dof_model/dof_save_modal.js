(function (globalScope) {
  function openConnectedDofSaveModal(args) {
    return new Promise(function (resolve) {
      var modal = buildDofSaveModal(args || {});
      document.body.appendChild(modal);
      attachDofSaveModalBindings(modal, args || {}, function (result) {
        modal.remove();
        resolve(result);
      });
    });
  }

  function buildDofSaveModal(args) {
    var subjects = Array.isArray(args.subjects) ? args.subjects : [];
    var hasSubjects = subjects.length > 0;
    var subjectMode = hasSubjects ? "existing" : "new";
    var subjectOptions = buildDofSubjectOptions(subjects);
    var modal = document.createElement("div");
    modal.className = "save-modal";
    modal.innerHTML = `
      <div class="save-modal__backdrop" data-save-modal-close></div>
      <div class="save-modal__panel" role="dialog" aria-modal="true" aria-label="Save 4DOF Model">
        <header>
          <h2>Save to ${escapeDofSaveHtml(args.notebookName || "Notebook")}</h2>
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
              <label>Display Name<input type="text" name="display_name" placeholder="${escapeDofSaveHtml(args.defaultDisplayName || "Instrument")}"></label>
            </div>
          </section>
          <section class="save-modal__section">
            <h3>Event</h3>
            <label>Note<textarea name="event_note" rows="4" placeholder="What did the model tell you?"></textarea></label>
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

  function attachDofSaveModalBindings(modal, args, closeWith) {
    modal.querySelectorAll("[data-save-modal-close]").forEach(function (element) {
      element.addEventListener("click", function () {
        closeWith(null);
      });
    });

    modal.querySelectorAll('input[name="subject_mode"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        renderDofSaveModalMode(modal, radio.value);
      });
    });

    var filterInput = modal.querySelector('input[name="subject_filter"]');
    var subjectSelect = modal.querySelector('select[name="subject_id"]');
    if (filterInput && subjectSelect) {
      filterInput.addEventListener("input", function () {
        renderDofSaveModalFilter(subjectSelect, args.subjects || [], filterInput.value);
      });
      renderDofSaveModalFilter(subjectSelect, args.subjects || [], "");
    }

    var form = modal.querySelector("form");
    var error = modal.querySelector("[data-save-modal-error]");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var subjectMode = modal.querySelector('input[name="subject_mode"]:checked').value || "new";
      var subject = subjectMode === "existing"
        ? readExistingDofSubjectSelection(subjectSelect && subjectSelect.value)
        : readNewDofSubjectSelection(modal);

      if (!subject) {
        renderDofSaveModalError(error, "Choose a subject or enter a display name.");
        return;
      }

      renderDofSaveModalError(error, "");
      closeWith({
        subject: subject,
        event: {
          note: String(modal.querySelector('textarea[name="event_note"]').value || "").trim(),
          capturedAt: new Date().toISOString(),
        },
      });
    });

    renderDofSaveModalMode(modal, hasExistingDofSubjects(args.subjects) ? "existing" : "new");
  }

  function hasExistingDofSubjects(subjects) {
    return Array.isArray(subjects) && subjects.length > 0;
  }

  function buildDofSubjectOptions(subjects) {
    return subjects.map(function (subject) {
      return '<option value="' + escapeDofSaveHtml(subject.subjectId || "") + '">' +
        escapeDofSaveHtml(subject.displayName || subject.subjectId || "") +
        "</option>";
    }).join("");
  }

  function readExistingDofSubjectSelection(subjectId) {
    return subjectId ? { subjectId: subjectId } : null;
  }

  function readNewDofSubjectSelection(modal) {
    var displayName = String(modal.querySelector('input[name="display_name"]').value || "").trim();

    if (!displayName) {
      return null;
    }

    return {
      newSubject: {
        typeKey: "GUITAR",
        subtypeKey: "",
        displayName: displayName,
      },
    };
  }

  function renderDofSaveModalMode(modal, mode) {
    modal.querySelector(".save-modal__existing").hidden = mode !== "existing";
    modal.querySelector(".save-modal__new").hidden = mode !== "new";
  }

  function renderDofSaveModalFilter(subjectSelect, subjects, filterText) {
    var needle = String(filterText || "").trim().toLowerCase();
    var filtered = (subjects || []).filter(function (subject) {
      return String(subject.displayName || "").toLowerCase().includes(needle);
    });
    subjectSelect.innerHTML = buildDofSubjectOptions(filtered);
  }

  function renderDofSaveModalError(error, message) {
    if (!error) {
      return;
    }

    error.hidden = !message;
    error.textContent = message;
  }

  function escapeDofSaveHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var api = {
    openConnectedDofSaveModal: openConnectedDofSaveModal,
  };

  globalScope.DofSaveModal = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
