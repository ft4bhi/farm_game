"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { loader } from "@monaco-editor/react";
import * as monacoNs from "monaco-editor";
import { toError } from "@/utils/toError";

// Bundle Monaco locally (no CDN needed) so the game works offline. Next/webpack
// bundles the worker entry in ../workers/editorWorker.js into a single
// self-contained worker chunk, and every Monaco worker label is routed to it.
if (typeof window !== "undefined") {
  /**
   * Create the Monaco editor worker, guarding against raw DOM events.
   *
   * NOTE: the `new Worker(new URL("../workers/editorWorker.js", import.meta.url),
   * { type: "module" })` call MUST stay a single literal expression. Webpack's
   * parser only treats that exact shape as a *worker* to bundle; assigning the
   * URL to a variable first makes it downgrade the file to a plain asset whose
   * bare imports do not resolve at runtime. The returned worker is wrapped in a
   * Proxy so that, should the worker ever fail to load, Monaco receives a real
   * `Error` instead of a raw DOM event (which its error handler would otherwise
   * rethrow as the cryptic "[object Event]").
   */
  function protectMonacoWorker(): Worker {
    const worker = new Worker(
      new URL("../workers/editorWorker.js", import.meta.url),
      { type: "module" },
    );
    const rawAddEventListener = worker.addEventListener.bind(worker);
    const rawRemoveEventListener = worker.removeEventListener.bind(worker);
    const errorListeners = new Set<EventListener>();

    worker.addEventListener("error", (event) => {
      const normalized = toError(
        event,
        "Monaco web worker failed to load",
      ) as unknown as Event;
      for (const listener of errorListeners) {
        try {
          listener.call(worker, normalized);
        } catch {
          // A listener throwing must not prevent the remaining ones running.
        }
      }
    });

    return new Proxy(worker, {
      get(target, prop) {
        if (prop === "addEventListener") {
          return (
            type: string,
            listener: EventListener | null,
            options?: boolean | AddEventListenerOptions,
          ) => {
            if (type === "error") {
              if (listener) errorListeners.add(listener);
              return;
            }
            return rawAddEventListener(
              type,
              listener as EventListener,
              options,
            );
          };
        }
        if (prop === "removeEventListener") {
          return (
            type: string,
            listener: EventListener | null,
            options?: boolean | EventListenerOptions,
          ) => {
            if (type === "error") {
              if (listener) errorListeners.delete(listener);
              return;
            }
            return rawRemoveEventListener(type, listener as EventListener, options);
          };
        }
        // Use the raw worker as the receiver so WebIDL accessors (e.g. the
        // onmessage / onmessageerror event-handler attributes) pass their
        // brand check instead of throwing "Illegal invocation" against the
        // Proxy.
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
      set(target, prop, value) {
        return Reflect.set(target, prop, value, target);
      },
    });
  }

  (window as unknown as {
    MonacoEnvironment?: {
      getWorker: (moduleId: string, label: string) => Worker;
    };
  }).MonacoEnvironment = {
    getWorker: (_moduleId: string, _label: string) => protectMonacoWorker(),
  };
  loader.config({ monaco: monacoNs });
}

export interface CodeMirrorStyleProps {
  value: string;
  onChange: (value: string) => void;
  currentLine: number | null;
  errorLine: number | null;
  errorMessage: string | null;
}

interface SuggestionItem {
  display: string;
  kind: "Function" | "Constant" | "Keyword";
  detail: string;
  insertText: string;
}

let completionRegistered = false;

function registerCompletions(monaco: typeof monacoNs): void {
  if (completionRegistered) return;
  completionRegistered = true;

  const items: SuggestionItem[] = [
    { display: "move", kind: "Function", detail: "move(direction)", insertText: "move(${1:North})" },
    { display: "plant", kind: "Function", detail: "plant(crop)", insertText: "plant(${1:Carrot})" },
    { display: "water", kind: "Function", detail: "water()", insertText: "water()" },
    { display: "harvest", kind: "Function", detail: "harvest()", insertText: "harvest()" },
    { display: "can_harvest", kind: "Function", detail: "can_harvest()", insertText: "can_harvest()" },
    { display: "get_ground_type", kind: "Function", detail: "get_ground_type()", insertText: "get_ground_type()" },
    { display: "get_entity_type", kind: "Function", detail: "get_entity_type()", insertText: "get_entity_type()" },
    { display: "get_position_x", kind: "Function", detail: "get_position_x()", insertText: "get_position_x()" },
    { display: "get_position_y", kind: "Function", detail: "get_position_y()", insertText: "get_position_y()" },
    { display: "get_world_width", kind: "Function", detail: "get_world_width()", insertText: "get_world_width()" },
    { display: "get_world_height", kind: "Function", detail: "get_world_height()", insertText: "get_world_height()" },
    { display: "range", kind: "Function", detail: "range(n)", insertText: "range(${1:n})" },
    { display: "def", kind: "Keyword", detail: "define a function", insertText: "def ${1:name}():$0" },
    { display: "for", kind: "Keyword", detail: "for loop", insertText: "for ${1:i} in range(${2:5}):$0" },
    { display: "while", kind: "Keyword", detail: "while loop", insertText: "while ${1:condition}:$0" },
    { display: "if", kind: "Keyword", detail: "if statement", insertText: "if ${1:condition}:$0" },
    { display: "else", kind: "Keyword", detail: "else", insertText: "else:" },
    { display: "elif", kind: "Keyword", detail: "else if", insertText: "elif ${1:condition}:" },
    { display: "return", kind: "Keyword", detail: "return", insertText: "return ${1:value}" },
    { display: "in", kind: "Keyword", detail: "in", insertText: "in" },
    { display: "and", kind: "Keyword", detail: "and", insertText: "and" },
    { display: "or", kind: "Keyword", detail: "or", insertText: "or" },
    { display: "not", kind: "Keyword", detail: "not", insertText: "not " },
    { display: "True", kind: "Constant", detail: "boolean", insertText: "True" },
    { display: "False", kind: "Constant", detail: "boolean", insertText: "False" },
    { display: "None", kind: "Constant", detail: "no value", insertText: "None" },
    { display: "North", kind: "Constant", detail: "direction", insertText: "North" },
    { display: "South", kind: "Constant", detail: "direction", insertText: "South" },
    { display: "East", kind: "Constant", detail: "direction", insertText: "East" },
    { display: "West", kind: "Constant", detail: "direction", insertText: "West" },
    { display: "Grass", kind: "Constant", detail: "tile", insertText: "Grass" },
    { display: "Soil", kind: "Constant", detail: "tile", insertText: "Soil" },
    { display: "Water", kind: "Constant", detail: "tile", insertText: "Water" },
    { display: "Rock", kind: "Constant", detail: "tile", insertText: "Rock" },
    { display: "Tree", kind: "Constant", detail: "tile", insertText: "Tree" },
    { display: "Carrot", kind: "Constant", detail: "crop", insertText: "Carrot" },
  ];

  monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );
      return {
        suggestions: items.map((item) => ({
          label: item.display,
          kind:
            item.kind === "Function"
              ? monaco.languages.CompletionItemKind.Function
              : item.kind === "Keyword"
                ? monaco.languages.CompletionItemKind.Keyword
                : monaco.languages.CompletionItemKind.Constant,
          detail: item.detail,
          insertText: item.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        })),
      };
    },
  });
}

/** Monaco editor wired up for the FarmScript language. */
export default function MonacoField({
  value,
  onChange,
  currentLine,
  errorLine,
  errorMessage,
}: CodeMirrorStyleProps) {
  const editorRef = useRef<monacoNs.editor.IStandaloneCodeEditor | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const layoutObserver = useRef<ResizeObserver | null>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const decorationIds = useRef<string[]>([]);
  const firstRender = useRef(true);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, [ready]);

  // The editor container is resized by the layout refactor (drag handles,
  // responsive breakpoints), so explicitly relayout Monaco instead of relying
  // only on its internal observer. The instance stays alive across resizes.
  useEffect(() => {
    return () => {
      layoutObserver.current?.disconnect();
      layoutObserver.current = null;
      editorRef.current = null;
    };
  }, []);

  // Current-line highlight + error markers (execution feedback).
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const model = ed.getModel();
    if (!model) return;

    ed.deltaDecorations(decorationIds.current, []);
    decorationIds.current = [];

    const decos: monacoNs.editor.IModelDeltaDecoration[] = [];
    if (currentLine !== null && currentLine >= 1) {
      decos.push({
        range: new monacoNs.Range(currentLine, 1, currentLine, 1),
        options: { isWholeLine: true, className: "ff-current-line", stickiness: 2 },
      });
    }
    if (errorLine !== null && errorLine >= 1) {
      decos.push({
        range: new monacoNs.Range(errorLine, 1, errorLine, 1),
        options: {
          isWholeLine: true,
          className: "ff-error-line",
          glyphMarginClassName: "ff-glyph-error",
          glyphMarginHoverMessage: errorMessage ? [{ value: errorMessage }] : undefined,
        },
      });
    }
    decorationIds.current = ed.deltaDecorations([], decos);

    if (errorLine !== null && errorLine >= 1) {
      monacoNs.editor.setModelMarkers(model, "farmforge", [
        {
          severity: monacoNs.MarkerSeverity.Error,
          message: errorMessage ?? "Runtime error",
          startLineNumber: errorLine,
          startColumn: 1,
          endLineNumber: errorLine,
          endColumn: 1,
        },
      ]);
    } else {
      monacoNs.editor.setModelMarkers(model, "farmforge", []);
    }
  }, [currentLine, errorLine, errorMessage]);

  if (timedOut) {
    return (
      <div className="monaco-host" ref={hostRef}>
        <textarea
          className="editor-fallback"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label="Program editor"
        />
      </div>
    );
  }

  return (
    <div className="monaco-host" ref={hostRef}>
      <Editor
        height="100%"
        defaultLanguage="python"
        theme="vs-dark"
        value={value}
        onChange={(next) => onChange(next ?? "")}
        onMount={(editor, monaco) => {
          editorRef.current = editor;
          registerCompletions(monaco);
          setReady(true);
          if (firstRender.current) {
            firstRender.current = false;
          }
          requestAnimationFrame(() => editor.layout());
          const host = hostRef.current;
          if (host && typeof ResizeObserver !== "undefined") {
            layoutObserver.current = new ResizeObserver(() => editor.layout());
            layoutObserver.current.observe(host);
          }
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily:
            'ui-monospace, "Cascadia Code", Menlo, Consolas, monospace',
          wordWrap: "on",
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          lineNumbers: "on",
          renderLineHighlight: "all",
          glyphMargin: true,
          scrollbar: { verticalScrollbarSize: 8 },
        }}
        loading={<div className="editor-fallback" />}
      />
    </div>
  );
}