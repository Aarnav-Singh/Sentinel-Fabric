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
    covered: "#00e676",
    partial: "#ffaa00",
    blind: "#ff3f5b",
};

const coverageBg: Record<CoverageState, string> = {
    covered: "rgba(0,230,118,0.15)",
    partial: "rgba(255,170,0,0.15)",
    blind: "rgba(255,63,91,0.15)",
};

export function CoverageHeatmap({ data }: CoverageHeatmapProps) {
    const [selected, setSelected] = useState<Technique | null>(null);

    return (
        <div className="relative">
            {/* Heatmap grid */}
            <div className="flex gap-1 overflow-x-auto pb-2">
                {data.map((col) => (
                    <div key={col.tactic} className="flex flex-col min-w-[90px]">
                        <div className="text-[8px] font-space text-sf-text-muted tracking-wider uppercase mb-1.5 text-center px-1 truncate">
                            {col.tactic}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {col.techniques.map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => setSelected(t)}
                                    className="cursor-pointer rounded-sm transition-all hover:scale-105 relative group"
                                    title={`${t.id}: ${t.name}`}
                                    style={{
                                        background: coverageBg[t.coverage],
                                        border: `1px solid ${coverageColors[t.coverage]}30`,
                                        padding: "3px 4px",
                                    }}
                                >
                                    <span className="text-[7px] font-space" style={{ color: coverageColors[t.coverage] }}>
                                        {t.id}
                                    </span>
                                    {t.campaignLinked && (
                                        <div
                                            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                                            style={{ background: "#ffaa00", boxShadow: "0 0 4px #ffaa00" }}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 border-t border-sf-border pt-2">
                {(["covered", "partial", "blind"] as CoverageState[]).map((state) => (
                    <div key={state} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: coverageBg[state], border: `1px solid ${coverageColors[state]}40` }} />
                        <span className="text-[9px] font-space text-sf-text-muted capitalize">{state}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5 ml-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#ffaa00" }} />
                    <span className="text-[9px] font-space text-sf-text-muted">Campaign-linked</span>
                </div>
            </div>

            {/* Detail side panel */}
            {selected && (
                <div
                    className="absolute top-0 right-0 w-72 rounded-lg p-4 animate-sf-fadeIn z-20"
                    style={{
                        background: "#0a1628",
                        border: "1px solid #1e3a5f",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                >
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="text-xs font-space text-sf-text-primary font-bold">{selected.id}</div>
                            <div className="text-[11px] text-sf-text-secondary mt-0.5">{selected.name}</div>
                        </div>
                        <button
                            onClick={() => setSelected(null)}
                            className="text-sf-text-muted hover:text-sf-text-secondary text-sm cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[9px] font-space uppercase tracking-wider" style={{ color: coverageColors[selected.coverage] }}>
                            {selected.coverage}
                        </span>
                        {selected.campaignLinked && (
                            <span className="text-[9px] font-space text-sf-amber">⚡ Used in recent campaign</span>
                        )}
                    </div>
                    {selected.tools && selected.tools.length > 0 && (
                        <div className="mb-2">
                            <div className="text-[9px] text-sf-text-muted font-space mb-1">COVERING TOOLS</div>
                            <div className="text-[11px] text-sf-text-secondary">{selected.tools.join(", ")}</div>
                        </div>
                    )}
                    {selected.fix && (
                        <div className="p-2 rounded-md mt-2" style={{ background: "rgba(0,212,200,0.05)", border: "1px solid rgba(0,212,200,0.15)" }}>
                            <div className="text-[9px] text-sf-teal font-space mb-1">RECOMMENDED FIX</div>
                            <div className="text-[11px] text-sf-text-secondary leading-relaxed">{selected.fix}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
