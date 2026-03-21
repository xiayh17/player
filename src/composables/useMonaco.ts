import * as monaco from "monaco-editor"
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker"
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker"
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker"
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"

function resolveWorkerKind(moduleId: string, label: string): "json" | "css" | "html" | "ts" | "editor" {
  const normalizedLabel = (label || "").toLowerCase()
  const normalizedModuleId = (moduleId || "").toLowerCase()
  const hint = `${normalizedModuleId} ${normalizedLabel}`

  if (normalizedLabel === "json" || hint.includes("/json/")) {
    return "json"
  }
  if (
    normalizedLabel === "css"
    || normalizedLabel === "scss"
    || normalizedLabel === "less"
    || hint.includes("/css/")
  ) {
    return "css"
  }
  if (
    normalizedLabel === "html"
    || normalizedLabel === "handlebars"
    || normalizedLabel === "razor"
    || hint.includes("/html/")
  ) {
    return "html"
  }
  if (
    normalizedLabel === "typescript"
    || normalizedLabel === "javascript"
    || hint.includes("/typescript/")
    || hint.includes("/javascript/")
    || hint.includes("/tsworker")
  ) {
    return "ts"
  }
  return "editor"
}

self.MonacoEnvironment = {
  getWorker(moduleId: unknown, label: string) {
    const workerKind = resolveWorkerKind(String(moduleId ?? ""), label)

    if (workerKind === "json") {
      return new jsonWorker()
    }
    if (workerKind === "css") {
      return new cssWorker()
    }
    if (workerKind === "html") {
      return new htmlWorker()
    }
    if (workerKind === "ts") {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

export const AIMD_LIGHT_THEME: monaco.editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "delimiter.bracket.aimd", foreground: "2563eb" },
    { token: "keyword.aimd", foreground: "2563eb", fontStyle: "bold" },
    { token: "type.aimd", foreground: "7c3aed" },
    { token: "variable.aimd", foreground: "059669" },
    { token: "keyword.md", foreground: "1e40af" },
    { token: "string.code", foreground: "be185d" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#1a1a2e",
    "editor.lineHighlightBackground": "#f5f7fa",
    "editorLineNumber.foreground": "#999999",
    "editor.selectionBackground": "#b4d7ff",
  },
}

export const AIMD_DARK_THEME: monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "delimiter.bracket.aimd", foreground: "60a5fa" },
    { token: "keyword.aimd", foreground: "60a5fa", fontStyle: "bold" },
    { token: "type.aimd", foreground: "a78bfa" },
    { token: "variable.aimd", foreground: "34d399" },
    { token: "keyword.md", foreground: "93c5fd" },
    { token: "string.code", foreground: "f472b6" },
  ],
  colors: {
    "editor.background": "#1e1e2e",
    "editor.foreground": "#e0e0e0",
    "editor.lineHighlightBackground": "#2a2a3e",
    "editorLineNumber.foreground": "#666666",
    "editor.selectionBackground": "#3b5998",
  },
}

export function registerAIMDLanguage() {
  const AIMD_LANGUAGE_ID = "aimd"

  if (monaco.languages.getLanguages().some((lang) => lang.id === AIMD_LANGUAGE_ID)) {
    return
  }

  monaco.languages.register({ id: AIMD_LANGUAGE_ID })

  monaco.languages.setMonarchTokensProvider(AIMD_LANGUAGE_ID, {
    tokenizer: {
      root: [
        [/^\#\s.*$/, "keyword.md"],
        [/^\#\#\s.*$/, "keyword.md"],
        [/^\#\#\#\s.*$/, "keyword.md"],
        [/^\*\*.*?\*\*$/, "keyword.md"],
        [/^\*.*?\*$/, "keyword.md"],
        [/```[\s\S]*?```/, "string.code"],
        [/\{\{[^}]+\}\}/, "delimiter.bracket.aimd"],
        [/\{\{(var|step|check|quiz|var_table|ref_var|ref_step)/, "keyword.aimd"],
        [/\|/, "delimiter.bracket.aimd"],
        [/\b(str|int|float|bool|choice|multiple|blank|open)\b/, "type.aimd"],
        [/"[^"]*"/, "string.code"],
      ],
    },
  })

  monaco.languages.setLanguageConfiguration(AIMD_LANGUAGE_ID, {
    brackets: [
      ["{{", "}}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{{", close: "}}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ],
  })

  monaco.languages.registerCompletionItemProvider(AIMD_LANGUAGE_ID, {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions: monaco.languages.CompletionItem[] = [
        {
          label: "{{var|}}",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "{{var|${1:name}: ${2:type}}}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert a variable field",
          range,
        },
        {
          label: "{{step|}}",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "{{step|${1:step-id}}}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert a step field",
          range,
        },
        {
          label: "{{check|}}",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "{{check|${1:check-id}}}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert a check field",
          range,
        },
        {
          label: "{{quiz|}}",
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: "{{quiz|${1:quiz-id}: ${2|type: choice}}}",
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: "Insert a quiz field",
          range,
        },
      ]

      return { suggestions }
    },
  })

  monaco.editor.defineTheme("aimd-light", AIMD_LIGHT_THEME)
  monaco.editor.defineTheme("aimd-dark", AIMD_DARK_THEME)
}

export function initMonaco() {
  registerAIMDLanguage()
}

export { monaco }
