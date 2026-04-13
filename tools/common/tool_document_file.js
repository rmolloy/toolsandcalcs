(function (globalScope) {
  async function readJsonDocumentFromFile(file) {
    var text = await readTextDocumentFromFile(file);
    return JSON.parse(text);
  }

  async function readTextDocumentFromFile(file) {
    if (!file || typeof file.text !== "function") {
      throw new Error("Document file is unavailable.");
    }

    return await file.text();
  }

  var api = {
    readJsonDocumentFromFile: readJsonDocumentFromFile,
    readTextDocumentFromFile: readTextDocumentFromFile,
  };

  globalScope.CommonToolDocumentFile = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
