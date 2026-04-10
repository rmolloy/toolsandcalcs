(function attachToolFooters(globalScope) {
  function toolFooterHtmlBuild(privacyHref = "") {
    return [
      "<div>© 2025 Rick Molloy. All rights reserved.</div>",
      "<div>Licensed for educational use only. No redistribution without written consent.</div>",
      toolFooterLinksHtmlBuild(privacyHref),
    ].join("");
  }

  function toolFooterLinksHtmlBuild(privacyHref) {
    if (!privacyHref) {
      return "<div>Tools provided by Rick Molloy • <a href=\"/\">The Lab at Rick Molloy Guitars</a></div>";
    }

    return `<div>Tools provided by Rick Molloy • <a href="/">The Lab at Rick Molloy Guitars</a> • <a href="${privacyHref}">Privacy Policy</a></div>`;
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
