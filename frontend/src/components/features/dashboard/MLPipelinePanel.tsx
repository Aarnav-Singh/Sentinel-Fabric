"use client";

import { StreamBar } from "@/components/ui/StreamBar";

const STREAMS = [
 { id: 1, abbr: "SUP", desc: "Known attack patterns", color: "var(--ng-cyan-bright)" },
 { id: 2, abbr: "VAE", desc: "Anomaly from normal", color: "var(--ng-cyan)" },
 { id: 3, abbr: "ONL", desc: "Per-tenant baseline", color: "var(--ng-magenta)" },
 { id: 4, abbr: "SEQ", desc: "Multi-step patterns", color: "var(--ng-lime)" },
 { id: 5, abbr: "EVA", desc: "Anti-detection signals", color: "var(--ng-error)" },
];

interface MLPipelinePanelProps {
 scores: number[]; // 5 scores, 0–1
 metaScore: number; // 0–1
}

export function MLPipelinePanel({ scores, metaScore }: MLPipelinePanelProps) {
 const metaColor = metaScore > 0.8 ? "var(--ng-error)" : metaScore > 0.6 ? "var(--ng-magenta)" : "var(--ng-cyan-bright)";

 return (
 <div className="border-b border-ng-outline-dim/40" style={{ padding: "16px 16px 14px" }}>
 <div className="text-[11px] font-space text-ng-muted tracking-widest uppercase mb-3.5">
 5-Stream ML Pipeline
 </div>

 {STREAMS.map((stream, i) => (
 <StreamBar
 key={stream.id}
 abbr={stream.abbr}
 description={stream.desc}
 score={scores[i] ?? 0}
 color={stream.color}
 />
 ))}

 {/* Meta-Learner output */}
 <div
 className="mt-3.5 "
 style={{
 padding: "10px 12px",
 background: "rgba(0,212,200,0.06)",
 border: "1px solid rgba(0,212,200,0.2)",
 }}
 >
 <div className="flex justify-between items-center">
 <div>
 <div className="text-[10px] font-space text-ng-cyan tracking-wider">
 META-LEARNER OUTPUT
 </div>
 <div className="text-[11px] text-ng-muted mt-0.5">Ensemble threat score</div>
 </div>
 <div className="text-[28px] font-condensed font-extrabold leading-none" style={{ color: metaColor }}>
 {Math.round(metaScore * 100)}
 </div>
 </div>
 <div className="h-1.5 bg-ng-outline-dim/30 mt-2 overflow-hidden">
 <div
 className="h-full transition-all duration-500 ease-out"
 style={{
 width: `${metaScore * 100}%`,
 background: `linear-gradient(90deg, var(--ng-cyan-bright), ${metaColor})`,
 boxShadow: "0 0 10px rgba(0,212,200,0.5)",
 }}
 />
 </div>
 </div>
 </div>
 );
}
