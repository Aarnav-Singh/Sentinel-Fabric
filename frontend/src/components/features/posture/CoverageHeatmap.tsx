"use client";

import { useState } from "react";

type CoverageState = "covered" | "partial" | "blind";

interface Technique {
 id: string;
 name: string;
 coverage: CoverageState;
 campaignLinked?: boolean;
 tools?: string[];
 fix?: string;
}

interface TacticColumn {
 tactic: string;
 techniques: Technique[];
}

interface CoverageHeatmapProps {
 data: TacticColumn[];
}

const coverageColors: Record<CoverageState, string> = {
 covered: "var(--ng-lime)",
 partial: "var(--ng-magenta)",
 blind: "var(--ng-error)",
};

const coverageBg: Record<CoverageState, string> = {
 covered: "rgba(16, 185, 129, 0.15)", // ng-lime rgb
 partial: "rgba(245, 158, 11, 0.15)", // ng-magenta rgb
 blind: "rgba(239, 68, 68, 0.15)", // ng-error rgb
};

export function CoverageHeatmap({ data }: CoverageHeatmapProps) {
 const [selected, setSelected] = useState<Technique | null>(null);

 return (
 <div className="relative">
 {/* Heatmap grid */}
 <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar">
 {data.map((col) => (
 <div key={col.tactic} className="flex flex-col min-w-[90px]">
 <div className="text-[8px] font-mono text-ng-muted tracking-wider uppercase mb-1.5 text-center px-1 truncate">
 {col.tactic}
 </div>
 <div className="flex flex-col gap-0.5">
 {col.techniques.map((t) => (
 <div
 key={t.id}
 onClick={() => setSelected(t)}
 className="cursor-pointer transition-all hover:scale-105 relative group  hover:shadow-[0_0_10px_rgba(255,255,255,0.1)]"
 title={`${t.id}: ${t.name}`}
 style={{
 background: coverageBg[t.coverage],
 border: `1px solid ${coverageColors[t.coverage]}30`,
 padding: "3px 4px",
 }}
 >
 <span className="text-[7px] font-mono tracking-tighter" style={{ color: coverageColors[t.coverage] }}>
 {t.id}
 </span>
 {t.campaignLinked && (
 <div
 className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full motion-safe:animate-pulse"
 style={{ background: "var(--ng-magenta)", boxShadow: "0 0 4px var(--ng-magenta)" }}
 />
 )}
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>

 {/* Legend */}
 <div className="flex items-center gap-4 mt-3 border-t border-ng-outline-dim/40 pt-2">
 {(["covered", "partial", "blind"] as CoverageState[]).map((state) => (
 <div key={state} className="flex items-center gap-1.5">
 <div className="w-2.5 h-2.5 " style={{ background: coverageBg[state], border: `1px solid ${coverageColors[state]}40` }} />
 <span className="text-[9px] font-mono text-ng-muted capitalize tracking-widest">{state}</span>
 </div>
 ))}
 <div className="flex items-center gap-1.5 ml-2">
 <div className="w-1.5 h-1.5 rounded-full motion-safe:animate-pulse" style={{ background: "var(--ng-magenta)" }} />
 <span className="text-[9px] font-mono text-ng-muted uppercase tracking-widest">Campaign-linked</span>
 </div>
 </div>

 {/* Detail side panel */}
 {selected && (
 <div
 className="absolute top-0 right-0 w-72 rounded-none p-4 animate-sf-fadeIn z-20 backdrop-blur-xl"
 style={{
 background: "rgba(10, 15, 24, 0.95)", // ng-mid rgb
 border: "1px solid var(--ng-outline-dim/30)",
 boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
 }}
 >
 <div className="flex justify-between items-start mb-3">
 <div>
 <div className="text-xs font-mono text-ng-on font-bold">{selected.id}</div>
 <div className="text-[11px] text-ng-muted mt-0.5">{selected.name}</div>
 </div>
 <button
 onClick={() => setSelected(null)}
 className="text-ng-muted hover:text-ng-on p-1 transition-colors text-sm cursor-pointer"
 >
 ✕
 </button>
 </div>
 <div className="flex items-center gap-2 mb-3">
 <span className="text-[9px] font-mono uppercase tracking-wider font-bold" style={{ color: coverageColors[selected.coverage] }}>
 {selected.coverage}
 </span>
 {selected.campaignLinked && (
 <span className="text-[9px] font-mono text-ng-magenta font-bold">⚡ Used in recent campaign</span>
 )}
 </div>
 {selected.tools && selected.tools.length > 0 && (
 <div className="mb-2">
 <div className="text-[9px] text-ng-muted font-mono mb-1 uppercase tracking-widest">COVERING TOOLS</div>
 <div className="text-[11px] text-ng-on">{selected.tools.join(", ")}</div>
 </div>
 )}
 {selected.fix && (
 <div className="p-3 rounded-none mt-2 shadow-inner" style={{ background: "rgba(6, 182, 212, 0.05)", border: "1px solid var(--ng-cyan-bright)" }}>
 <div className="text-[9px] text-ng-cyan font-mono mb-1 uppercase tracking-widest font-bold">RECOMMENDED FIX</div>
 <div className="text-[11px] text-ng-on leading-relaxed">{selected.fix}</div>
 </div>
 )}
 </div>
 )}
 </div>
 );
}
