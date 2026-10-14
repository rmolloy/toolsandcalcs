(function attachToolFooters(globalScope) {
  // localized-runtime-messages:start
  const toolFooterMessages = Object.freeze({
    educationalLicense: "Licencia exclusiva para uso educativo. No se permite su redistribución sin consentimiento por escrito.",
    labLinkLabel: "El laboratorio de Rick Molloy Guitars",
    privacyLinkLabel: "Política de privacidad",
    rights: "© 2025 Rick Molloy. Todos los derechos reservados.",
    toolsProvidedBy: "Herramientas proporcionadas por Rick Molloy",
  });
  // localized-runtime-messages:end

  function toolFooterHtmlBuild(privacyHref = "") {
    return [
      `<div>${toolFooterMessages.rights}</div>`,
      `<div>${toolFooterMessages.educationalLicense}</div>`,
      toolFooterLinksHtmlBuild(privacyHref),
    ].join("");
  }

  function toolFooterLinksHtmlBuild(privacyHref) {
    if (!privacyHref) {
      return `<div>${toolFooterMessages.toolsProvidedBy} • <a href="/">${toolFooterMessages.labLinkLabel}</a></div>`;
    }

    return `<div>${toolFooterMessages.toolsProvidedBy} • <a href="/">${toolFooterMessages.labLinkLabel}</a> • <a href="${privacyHref}">${toolFooterMessages.privacyLinkLabel}</a></div>`;
  }

  function toolFooterPopulate(footer) {
    footer.innerHTML = toolFooterHtmlBuild(footer.dataset.toolPrivacyHref || "");
  }

  function toolFootersAttach() {
    const footers = document.querySelectorAll("footer[data-tool-footer]");
    footers.forEach(toolFooterPopulate);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      toolFooterHtmlBuild,
    };
  }

  if (!globalScope.document) {
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", toolFootersAttach);
    return;
  }

  toolFootersAttach();
})(typeof window !== "undefined" ? window : globalThis);
