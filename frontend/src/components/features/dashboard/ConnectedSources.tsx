"use client";

interface ConnectedSourcesProps {
 tools?: string[];
}

const DEFAULT_TOOLS = ["Suricata", "Sysmon", "Zeek", "Palo Alto", "Win Event", "Vector"];

export function ConnectedSources({ tools = DEFAULT_TOOLS }: ConnectedSourcesProps) {
 return (
 <div className="border-t border-ng-outline-dim/40 bg-ng-mid-alt" style={{ padding: "10px 16px" }}>
 <div className="text-[9px] text-ng-muted font-space tracking-wider mb-2">
 CONNECTED SOURCES
 </div>
 <div className="flex gap-1.5 flex-wrap">
 {tools.map((tool) => (
 <div
 key={tool}
 className="text-[9px] font-space px-1.5 py-0.5"
 style={{
 color: "var(--ng-lime)",
 background: "rgba(0,230,118,0.08)",
 border: "1px solid rgba(0,230,118,0.2)",
 }}
 >
 ● {tool}
 </div>
 ))}
 </div>
 </div>
 );
}
