(function (globalScope) {
  const SESSION_NAMESPACE = "tonelab.per-tab-tool-session";
  const RESET_CONFIRMATION_KEY = `${SESSION_NAMESPACE}.reload-reset-confirmed`;
  const RESET_CONFIRMATION_HANDLED_KEY = "__tonelabPerTabSessionResetHandled";

  function perTabToolSessionCreate(options) {
    const toolId = perTabToolSessionToolIdRead(options);
    const version = perTabToolSessionVersionRead(options);
    const storage = perTabToolSessionStorageRead(globalScope);
    const hasStoredState = perTabToolSessionStateRead(storage, toolId, version) !== null;

    if (perTabToolSessionResetConfirmedConsume(globalScope, storage)) {
      perTabToolSessionStateClear(storage, toolId, version);
    } else if (hasStoredState && perTabToolSessionReloaded(globalScope) && !perTabToolSessionResetHandledRead(globalScope)) {
      perTabToolSessionResetConfirmationShow(globalScope, storage, toolId, version);
    }

    return {
      read() {
        return perTabToolSessionStateRead(storage, toolId, version);
      },
      write(state) {
        return perTabToolSessionStateWrite(storage, toolId, version, state);
      },
      clear() {
        return perTabToolSessionStateClear(storage, toolId, version);
      },
    };
  }

  function perTabToolSessionToolIdRead(options) {
    const toolId = String(options?.toolId || "").trim();
    if (!toolId) {
      throw new Error("A per-tab tool session requires a toolId.");
    }
    return toolId;
  }

  function perTabToolSessionVersionRead(options) {
    const version = Number(options?.version || 1);
    return Number.isInteger(version) && version > 0 ? version : 1;
  }

  function perTabToolSessionStorageRead(runtime) {
    try {
      return runtime?.sessionStorage || null;
    } catch (_error) {
      return null;
    }
  }

  function perTabToolSessionReloaded(runtime) {
    const navigation = runtime?.performance?.getEntriesByType?.("navigation")?.[0];
    if (navigation?.type) {
      return navigation.type === "reload";
    }
    return runtime?.performance?.navigation?.type === 1;
  }

  function perTabToolSessionResetConfirmedConsume(runtime, storage) {
    if (perTabToolSessionResetHandledRead(runtime) || !storage) {
      return false;
    }
    try {
      const confirmed = storage.getItem(RESET_CONFIRMATION_KEY) === "true";
      storage.removeItem(RESET_CONFIRMATION_KEY);
      if (confirmed) {
        perTabToolSessionResetHandledWrite(runtime);
      }
      return confirmed;
    } catch (_error) {
      return false;
    }
  }

  function perTabToolSessionResetHandledRead(runtime) {
    return runtime?.[RESET_CONFIRMATION_HANDLED_KEY] === true;
  }

  function perTabToolSessionResetHandledWrite(runtime) {
    if (!runtime) return;
    runtime[RESET_CONFIRMATION_HANDLED_KEY] = true;
  }

  function perTabToolSessionResetConfirmationShow(runtime, storage, toolId, version) {
    const document = runtime?.document;
    if (!document || document.getElementById("per_tab_session_reset_confirmation")) {
      return;
    }
    const appendConfirmation = () => {
      if (document.getElementById("per_tab_session_reset_confirmation")) {
        return;
      }
      const confirmation = document.createElement("section");
      const message = document.createElement("p");
      const keepButton = document.createElement("button");
      const resetButton = document.createElement("button");
      confirmation.id = "per_tab_session_reset_confirmation";
      confirmation.className = "per-tab-session-reset-confirmation";
      confirmation.setAttribute("role", "alertdialog");
      confirmation.setAttribute("aria-modal", "true");
      confirmation.setAttribute("aria-label", "Reset temporary data");
      message.textContent = "Reset temporary data for this page?";
      keepButton.type = "button";
      keepButton.textContent = "Keep data";
      resetButton.type = "button";
      resetButton.textContent = "Reset data";
      keepButton.addEventListener("click", () => {
        perTabToolSessionResetHandledWrite(runtime);
        confirmation.remove();
      });
      resetButton.addEventListener("click", () => {
        confirmation.remove();
        perTabToolSessionResetHandledWrite(runtime);
        perTabToolSessionStateClear(storage, toolId, version);
        perTabToolSessionResetConfirmedWrite(storage);
        runtime.location.reload();
      });
      confirmation.append(message, keepButton, resetButton);
      document.body.append(confirmation);
    };
    if (document.body) {
      appendConfirmation();
      return;
    }
    document.addEventListener("DOMContentLoaded", appendConfirmation, { once: true });
  }

  function perTabToolSessionResetConfirmedWrite(storage) {
    if (!storage) {
      return;
    }
    try {
      storage.setItem(RESET_CONFIRMATION_KEY, "true");
    } catch (_error) {
      return;
    }
  }

  function perTabToolSessionStorageKeyBuild(toolId, version) {
    return `${SESSION_NAMESPACE}.v${version}.${toolId}`;
  }

  function perTabToolSessionStateRead(storage, toolId, version) {
    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(perTabToolSessionStorageKeyBuild(toolId, version));
      return perTabToolSessionStateParse(raw, version);
    } catch (_error) {
      return null;
    }
  }

  function perTabToolSessionStateWrite(storage, toolId, version, state) {
    if (!storage) {
      return false;
    }

    try {
      storage.setItem(
        perTabToolSessionStorageKeyBuild(toolId, version),
        JSON.stringify({ version, state }),
      );
      return true;
    } catch (_error) {
      return false;
    }
  }

  function perTabToolSessionStateClear(storage, toolId, version) {
    if (!storage) {
      return false;
    }

    try {
      storage.removeItem(perTabToolSessionStorageKeyBuild(toolId, version));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function perTabToolSessionStateParse(raw, version) {
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.version !== version || !Object.prototype.hasOwnProperty.call(parsed, "state")) {
        return null;
      }
      return parsed.state;
    } catch (_error) {
      return null;
    }
  }

  const api = {
    perTabToolSessionCreate,
    perTabToolSessionStorageKeyBuild,
  };

  globalScope.PerTabToolSession = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
