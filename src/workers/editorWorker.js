// Web worker entry for Monaco's editor worker.
//
// Loading Monaco's own "esm/vs/editor/editor.worker.js" file directly (via
// `new Worker(new URL("monaco-editor/..."))`) makes Next/webpack emit it as a
// plain asset whose bare relative imports do not resolve at runtime, so the
// worker fails to start and Monaco throws a raw DOM Event that surfaces as
// "[object Event]". Importing the worker through this local entry and
// constructing it with the inline `new Worker(new URL(...))` pattern (see
// MonacoField.tsx) makes webpack bundle the worker AND all of Monaco's worker
// dependencies into a single self-contained chunk that loads reliably.
import "monaco-editor/esm/vs/editor/editor.worker.js";