(function (globalScope) {
  var latestBraceState = [];

  globalScope.addEventListener("braceLayoutChanged", function (event) {
    latestBraceState = readBraceStateFromDetail(event && event.detail);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFlexuralSaveBoot);
  } else {
    initFlexuralSaveBoot();
  }

  function initFlexuralSaveBoot() {
    var saveButton = document.getElementById("save_flexural_state");
    var loadButton = document.getElementById("load_flexural_state");
    var loadFileInput = document.getElementById("load_flexural_state_file");

    if (!saveButton || !loadButton || !loadFileInput) {
      return;
    }

    void initializeFlexuralSaveSurface(saveButton);
    loadButton.title = "Load a saved flexural state JSON file.";

    saveButton.addEventListener("click", function () {
      void saveCurrentFlexuralState();
    });
    loadButton.addEventListener("click", function () {
      loadFileInput.click();
    });
    loadFileInput.addEventListener("change", function () {
      loadFlexuralStateFromFile(loadFileInput);
    });
  }

  async function initializeFlexuralSaveSurface(saveButton) {
    if (await restoreNotebookEventIntoUi()) {
      return;
    }

    var saveSurface = await readFlexuralSaveRunner().readFlexuralSaveSurface();
    saveButton.textContent = saveSurface.label;
    saveButton.title = saveSurface.hint || "";
  }

  async function saveCurrentFlexuralState() {
    await readFlexuralSaveRunner().runFlexuralSaveAction({
      readSnapshot: readCurrentFlexuralSnapshot,
      setStatus: writeFlexuralSaveStatus,
    });
  }

  async function loadFlexuralStateFromFile(loadFileInput) {
    var file = loadFileInput.files && loadFileInput.files[0];

    if (!file) {
      return;
    }

    try {
      applyLoadedFlexuralSnapshot(
        await readFlexuralSaveSurfaceApi().readFlexuralSavePackageFile(file)
      );
    } catch (error) {
      console.error("[FlexuralRigidity] Failed to load save", error);
      window.alert("Unable to load Flexural Rigidity save.");
    } finally {
      loadFileInput.value = "";
    }
  }

  function applyLoadedFlexuralSnapshot(snapshot) {
    writeFlexuralTopInputs(snapshot && snapshot.top || {});
    globalScope.dispatchEvent(new CustomEvent("braceLayoutChanged", {
      detail: {
        top: snapshot && snapshot.top || {},
        braces: snapshot && snapshot.braces || [],
      },
    }));
    dispatchFlexuralTopInputEvents();
  }

  async function restoreNotebookEventIntoUi() {
    var restoreApi = readFlexuralNotebookRestoreApi();

    if (!restoreApi) {
      return false;
    }

    var restored = await restoreApi.restoreFlexuralNotebookEventIntoUi({
      runtime: globalScope,
      applySnapshot: applyLoadedFlexuralSnapshot,
    });

    if (restored) {
      writeFlexuralSaveStatus("Notebook event restored.");
    }

    return restored;
  }

  function readCurrentFlexuralSnapshot() {
    return {
      top: readFlexuralTopInputs(),
      braces: latestBraceState.slice(),
    };
  }

  function writeFlexuralSaveStatus(message) {
    console.info("[FlexuralRigidity] " + message);
  }

  function readFlexuralTopInputs() {
    return {
      span: readFlexuralInputNumber("top_span_input"),
      thickness: readFlexuralInputNumber("top_thickness_input"),
      modulus: readFlexuralInputNumber("top_modulus_input"),
    };
  }

  function writeFlexuralTopInputs(top) {
    writeFlexuralInputValue("top_span_input", top && top.span);
    writeFlexuralInputValue("top_thickness_input", top && top.thickness);
    writeFlexuralInputValue("top_modulus_input", top && top.modulus);
  }

  function readFlexuralInputNumber(id) {
    var element = document.getElementById(id);
    var parsed = Number(element && element.value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function writeFlexuralInputValue(id, value) {
    var element = document.getElementById(id);

    if (!element || !Number.isFinite(Number(value))) {
      return;
    }

    element.value = String(value);
  }

  function dispatchFlexuralTopInputEvents() {
    dispatchFlexuralInputEvent("top_span_input");
    dispatchFlexuralInputEvent("top_thickness_input");
    dispatchFlexuralInputEvent("top_modulus_input");
  }

  function dispatchFlexuralInputEvent(id) {
    var element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function readBraceStateFromDetail(detail) {
    if (Array.isArray(detail)) {
      return detail;
    }

    if (detail && Array.isArray(detail.braces)) {
      return detail.braces;
    }

    return [];
  }

  function readFlexuralSaveSurfaceApi() {
    if (globalScope.FlexuralSaveSurface) {
      return globalScope.FlexuralSaveSurface;
    }

    throw new Error("Flexural save surface is unavailable.");
  }

  function readFlexuralSaveRunner() {
    if (globalScope.FlexuralSaveTarget) {
      return globalScope.FlexuralSaveTarget.flexuralSaveRunnerCreate();
    }

    return {
      readFlexuralSaveSurface: function () {
        return readFlexuralSaveSurfaceApi().readFlexuralSaveSurface();
      },
      runFlexuralSaveAction: function (request) {
        var savePackage = readFlexuralSaveSurfaceApi().buildFlexuralSavePackage(request.readSnapshot());
        readFlexuralSaveSurfaceApi().downloadFlexuralSavePackage({ document: document, URL: URL }, savePackage);
        request.setStatus("JSON package downloaded.");
        return Promise.resolve(true);
      },
    };
  }

  function readFlexuralNotebookRestoreApi() {
    return globalScope.FlexuralNotebookRestore &&
      typeof globalScope.FlexuralNotebookRestore.restoreFlexuralNotebookEventIntoUi === "function"
      ? globalScope.FlexuralNotebookRestore
      : null;
  }
})(typeof window !== "undefined" ? window : globalThis);
