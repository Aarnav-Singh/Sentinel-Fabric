"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface SyntaxHighlightedJsonProps {
  data: unknown;
  className?: string;
}

function JsonNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (value === null) return <span className="text-sf-muted">null</span>;
  if (typeof value === "boolean")
    return <span className={value ? "text-sf-safe" : "text-sf-critical"}>{String(value)}</span>;
  if (typeof value === "number") return <span className="text-sf-warning">{value}</span>;
  if (typeof value === "string") return <span className="text-sf-safe">"{value}"</span>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-sf-muted">[]</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(c => !c)} className="text-sf-muted hover:text-sf-text">
          {collapsed ? "▶ " : "▼ "}
        </button>
        {collapsed ? (
          <span className="text-sf-muted">[{value.length} items]</span>
        ) : (
          <>
            {"["}
            <div className="ml-4">
              {value.map((v, i) => (
                <div key={i}><JsonNode value={v} depth={depth + 1} />{i < value.length - 1 ? "," : ""}</div>
              ))}
            </div>
            {"]"}
          </>
        )}
      </span>
    );
  }

  if (typeof value === "object") {
    const keys = Object.keys(value as object);
    if (keys.length === 0) return <span className="text-sf-muted">{"{}"}</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(c => !c)} className="text-sf-muted hover:text-sf-text">
          {collapsed ? "▶ " : "▼ "}
        </button>
        {collapsed ? (
          <span className="text-sf-muted">{"{"}{keys.length} keys{"}"}</span>
        ) : (
          <>
            {"{"}
            <div className="ml-4">
              {keys.map((k, i) => (
                <div key={k}>
                  <span className="text-sf-accent">"{k}"</span>
                  <span className="text-sf-muted">: </span>
                  <JsonNode value={(value as any)[k]} depth={depth + 1} />
                  {i < keys.length - 1 ? "," : ""}
                </div>
              ))}
            </div>
            {"}"}
          </>
        )}
      </span>
    );
  }

  return <span className="text-sf-text">{String(value)}</span>;
}

export function SyntaxHighlightedJson({ data, className = "" }: SyntaxHighlightedJsonProps) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`relative group ${className}`}>
      <button
        onClick={copy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-sf-muted hover:text-sf-text"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-sf-safe" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <pre className="text-[11px] font-mono leading-5 whitespace-pre-wrap break-all p-3 bg-sf-bg border border-sf-border overflow-auto">
        <JsonNode value={data} />
      </pre>
    </div>
  );
}
