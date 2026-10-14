(function initBracePageLoader(root, factory) {
  const api = factory();

  if (root) {
    root.BracePageLoader = api;
  }
  if (
    typeof module !== "undefined" &&
    typeof module.exports !== "undefined"
  ) {
    module.exports = api;
  }
})(
  typeof window !== "undefined" ? window : globalThis,
  function bracePageLoaderFactory() {
    const calculatorSources = ["../calculator.js"];
    const runtimeSources = [
      "../../common/tool_document.js",
      "../../common/tool_document_file.js",
      "../../common/per_tab_tool_session.js",
      "../../common/offline_save_surface.js",
    ];
    const braceSources = [
      "brace_save_surface.js",
      "brace_save_target.js",
      "brace-geometry.js",
      "brace-layout-state.js",
      "brace-stock-transfer.js",
      "brace-geometry-ui.js",
    ];

    function installBraceCommonJsShim(runtime) {
      runtime.exports = runtime.exports || {};
      runtime.module = runtime.module || { exports: runtime.exports };
      runtime.require = runtime.require || function requireBraceDependency(name) {
        if (
          name === "../calculator" ||
          name === "./calculator" ||
          name === "../flexural_rigidity/calculator"
        ) {
          return { FlexuralRigidity: runtime.FlexuralRigidity };
        }
        return runtime[name] || {};
      };
    }

    function bracePageLoaderCreate(runtime) {
      const document = runtime.document;

      function appendScript(src, onLoad, onError) {
        const script = document.createElement("script");
        script.src = sourceWithPublishRevision(src);
        script.onload = onLoad;
        script.onerror = onError;
        document.body.appendChild(script);
      }

      function sourceWithPublishRevision(src) {
        const revision = readPublishRevision();
        if (
          !revision ||
          src.includes("?rev=") ||
          /^[a-z][a-z0-9+.-]*:/i.test(src) ||
          src.startsWith("//")
        ) {
          return src;
        }
        return `${src}${src.includes("?") ? "&" : "?"}rev=${encodeURIComponent(revision)}`;
      }

      function readPublishRevision() {
        const asset = document.querySelector('script[src*="?rev="],link[href*="?rev="]');
        const specifier = asset?.getAttribute("src") || asset?.getAttribute("href") || "";
        return specifier.match(/[?&]rev=([^&#]+)/)?.[1] || "";
      }

      function loadSequentialScripts(sources, done) {
        if (!sources.length) {
          done();
          return;
        }
        const [current, ...rest] = sources;
        appendScript(
          current,
          () => loadSequentialScripts(rest, done),
          () => {
            throw new Error("Brace Geometry UI failed to load.");
          },
        );
      }

      function loadCalculatorWithFallback(sources) {
        const [current, ...rest] = sources;
        if (!current) {
          throw new Error("FlexuralRigidity calculator is unavailable.");
        }

        appendScript(
          current,
          () => loadSequentialScripts([
            ...runtimeSources,
            ...readBraceNotebookSources(),
            "brace_save_surface.js",
            ...readBraceNotebookModalSources(),
            ...braceSources.slice(1),
          ], () => {}),
          () => loadCalculatorWithFallback(rest),
        );
      }

      function readBraceNotebookSources() {
        return Array.isArray(runtime.BraceNotebookAssetSources)
          ? runtime.BraceNotebookAssetSources
          : [];
      }

      function readBraceNotebookModalSources() {
        return Array.isArray(runtime.BraceNotebookModalSources)
          ? runtime.BraceNotebookModalSources
          : [];
      }

      return {
        start() {
          installBraceCommonJsShim(runtime);
          loadCalculatorWithFallback(calculatorSources);
        },
      };
    }

    return {
      bracePageLoaderCreate,
      installBraceCommonJsShim,
    };
  },
);
