"use client";

import { useRef, useEffect, useCallback } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  label?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  className = "",
  minHeight = "120px",
  label,
}: RichTextEditorProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const isInternalRef = useRef(false);

  const decodeHtmlEntities = (input: string) => {
    // Utilise le parser natif du navigateur pour décoder proprement les entités.
    const textarea = document.createElement("textarea");
    textarea.innerHTML = input;
    return textarea.value;
  };

  const syncFromValue = useCallback(() => {
    if (!elRef.current) return;
    let raw = (value || "").trim();
    if (!raw) {
      if (!isInternalRef.current) elRef.current.innerHTML = "";
      return;
    }
    // Certaines descriptions reviennent encodées (&lt;p&gt;...).
    // Sans décodage, l'éditeur les ré-encode et affiche "du code".
    if ((raw.includes("&lt;") || raw.includes("&gt;")) && !raw.includes("<")) {
      const decoded = decodeHtmlEntities(raw);
      if (decoded && decoded.includes("<")) raw = decoded;
    }
    if (raw.includes("&lt;br") && !raw.includes("<br>")) {
      raw = raw.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
    }
    const valueAsHtml = raw.startsWith("<")
      ? raw
      : (() => {
          const PLACEHOLDER = "\u0000";
          let s = raw.replace(/\n/g, PLACEHOLDER);
          s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          return s.replace(new RegExp(PLACEHOLDER, "g"), "<br>");
        })();
    if (elRef.current.innerHTML !== valueAsHtml && !isInternalRef.current) {
      elRef.current.innerHTML = valueAsHtml;
    }
  }, [value]);

  useEffect(() => {
    syncFromValue();
  }, [syncFromValue]);

  const handleInput = () => {
    if (!elRef.current) return;
    isInternalRef.current = true;
    onChange(elRef.current.innerHTML);
    isInternalRef.current = false;
  };

  const runCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    elRef.current?.focus();
    handleInput();
  };

  return (
    <div className={`rich-text-editor ${className}`}>
      {label && <span className="block text-sm font-medium mb-1">{label}</span>}
      <div className="flex flex-wrap gap-1 p-1 border border-black/15 rounded-t-lg border-b-0 bg-gray-50">
        <button
          type="button"
          onClick={() => runCmd("bold")}
          className="p-1.5 rounded hover:bg-gray-200 font-bold text-sm"
          title="Gras"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => runCmd("italic")}
          className="p-1.5 rounded hover:bg-gray-200 italic text-sm"
          title="Italique"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => runCmd("underline")}
          className="p-1.5 rounded hover:bg-gray-200 underline text-sm"
          title="Souligné"
        >
          U
        </button>
      </div>
      <div
        ref={elRef}
        contentEditable
        data-placeholder={placeholder}
        onInput={handleInput}
        className="min-w-0 rounded-b-lg border border-black/15 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-gray-400"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
}
