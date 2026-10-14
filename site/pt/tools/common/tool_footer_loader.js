(function attachToolFooters(globalScope) {
  // localized-runtime-messages:start
  const toolFooterMessages = Object.freeze({
    educationalLicense: "Licenciado apenas para uso educacional. É proibida a redistribuição sem consentimento por escrito.",
    labLinkLabel: "O Laboratório da Rick Molloy Guitars",
    privacyLinkLabel: "Política de Privacidade",
    rights: "© 2025 Rick Molloy. Todos os direitos reservados.",
    toolsProvidedBy: "Ferramentas fornecidas por Rick Molloy",
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
