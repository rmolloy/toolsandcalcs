// The reader compiles with no Node types, but it bundles shared scripts from
// tools/common that publish a CommonJS export when `module` is present.
declare var module: { exports: unknown } | undefined;
