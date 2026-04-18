"use client";

import { Chip } from "@/components/ui/Chip";

export interface Campaign {
 id: string;
 title: string;
 severity: "critical" | "high" | "medium" | "low";
 stage: string;
 stages: string[];
 currentStage: number;
 tools: string[];
 events: number;
 firstSeen: string;
 recommendation: string;
 confidence: number;
 mitre: string[];
 description: string;
 active?: boolean;
}

function severityColor(s: string): string {
 if (s === "critical") return "var(--ng-error)";
 if (s === "high") return "var(--ng-magenta)";
 return "var(--ng-cyan-bright)";
}

interface CampaignCardProps {
 campaign: Campaign;
 selected?: boolean;
 onClick?: () => void;
}

export function CampaignCard({ campaign, selected = false, onClick }: CampaignCardProps) {
 const color = severityColor(campaign.severity);
 const isCritical = campaign.severity === "critical";

 return (
 <div
 onClick={onClick}
 className="relative overflow-hidden rounded-none cursor-pointer mb-2.5 transition-all duration-200 hover:-translate-y-[1px] hover:brightness-110"
 style={{
 background: selected ? "var(--ng-base)" : "var(--ng-base)",
 border: `1px solid ${selected ? color : "var(--ng-base)"}`,
 borderLeft: `3px solid ${color}`,
 boxShadow: selected ? `0 0 20px ${color}20` : "none",
 }}
 >
 {/* Critical pulse edge */}
 {isCritical && (
 <div
 className="absolute top-0 right-0 bottom-0 w-0.5 animate-sf-blink"
 style={{ background: `linear-gradient(180deg, transparent, var(--ng-error), transparent)` }}
 />
 )}

 <div className="p-3.5">
 {/* Header row */}
 <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
 <div className="flex-1 min-w-0 w-full">
 <div className="flex items-center gap-2 mb-1 flex-wrap">
 <span className="text-[10px] font-space text-ng-muted shrink-0">{campaign.id}</span>
 <Chip label={campaign.severity.toUpperCase()} color={color} />
 <Chip label={campaign.stage} color={color} />
 </div>
 <div className="text-[13px] font-semibold text-ng-on leading-tight">
 {campaign.title}
 </div>
 <div className="text-[11px] text-ng-muted mt-1.5 leading-relaxed">
 {campaign.description}
 </div>
 </div>
 <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-start w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
 <div className="text-[22px] font-condensed font-bold leading-none" style={{ color }}>
 {campaign.confidence}%
 </div>
 <div className="text-[9px] text-ng-muted mt-0.5 ml-2 sm:ml-0">confidence</div>
 </div>
 </div>

 {/* Tool chips + event count */}
 <div className="flex gap-1.5 mt-2.5 flex-wrap items-center">
 {campaign.tools.map((t) => (
 <Chip key={t} label={t} color="var(--ng-base)" />
 ))}
 <div className="ml-auto text-[10px] text-ng-muted">
 {campaign.events.toLocaleString()} events Â· {campaign.firstSeen}
 </div>
 </div>

 {/* Kill-chain stage dots */}
 <div className="flex items-center mt-2 gap-0">
 {campaign.stages.map((s, i) => (
 <div key={s} className="flex items-center flex-1">
 <div className="flex-1 flex flex-col items-center gap-1">
 <div
 className="w-2.5 h-2.5 rounded-none transition-all"
 style={{
 background: i <= campaign.currentStage ? (i === campaign.currentStage ? "var(--ng-error)" : "var(--ng-cyan-bright)") : "var(--ng-base)",
 border: `2px solid ${i <= campaign.currentStage ? (i === campaign.currentStage ? "var(--ng-error)" : "var(--ng-cyan-bright)") : "var(--ng-base)"}`,
 boxShadow: i === campaign.currentStage ? "0 0 12px var(--ng-error)" : i < campaign.currentStage ? "0 0 6px rgba(0,212,200,0.4)" : "none",
 }}
 />
 <span
 className="text-[9px] text-center max-w-[64px] leading-tight font-space"
 style={{ color: i <= campaign.currentStage ? (i === campaign.currentStage ? "var(--ng-error)" : "var(--ng-cyan-bright)") : "var(--ng-base)" }}
 >
 {s}
 </span>
 </div>
 {i < campaign.stages.length - 1 && (
 <div
 className="h-px flex-1 mb-3.5"
 style={{ background: i < campaign.currentStage ? "linear-gradient(90deg, var(--ng-cyan-bright), rgba(0,212,200,0.4))" : "var(--ng-base)" }}
 />
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}

