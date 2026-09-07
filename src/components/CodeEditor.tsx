"use client";

import MonacoField from "@/components/MonacoField";

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  currentLine: number | null;
  errorLine: number | null;
  errorMessage: string | null;
}

/** Thin wrapper around the Monaco field so GameShell stays tidy. */
export default function CodeEditor(props: CodeEditorProps) {
  return <MonacoField {...props} />;
}