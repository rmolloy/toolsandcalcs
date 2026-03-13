(function attachToolFooters() {
  function toolFooterHtmlBuild() {
    return [
      "<div>© 2025 Rick Molloy. All rights reserved.</div>",
      "<div>Licensed for educational use only. No redistribution without written consent.</div>",
      "<div>Tools provided by Rick Molloy • <a href=\"/\">ToneLab</a></div>",
    ].join("");
  }

  function toolFooterPopulate(footer) {
    footer.innerHTML = toolFooterHtmlBuild();
  }

  function toolFootersAttach() {
    const footers = document.querySelectorAll("footer[data-tool-footer]");
    footers.forEach(toolFooterPopulate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", toolFootersAttach);
    return;
  }

  toolFootersAttach();
})(typeof window !== "undefined" ? window : globalThis);
