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
    if (s === "critical") return "#ff3f5b";
    if (s === "high") return "#ffaa00";
    return "#00d4c8";
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
            className="relative overflow-hidden rounded-lg cursor-pointer mb-2.5 transition-all duration-200 hover:-translate-y-[1px] hover:brightness-110"
            style={{
                background: selected ? "#0e1e35" : "#0a1628",
                border: `1px solid ${selected ? color : "#1a2e4a"}`,
                borderLeft: `3px solid ${color}`,
                boxShadow: selected ? `0 0 20px ${color}20` : "none",
            }}
        >
            {/* Critical pulse edge */}
            {isCritical && (
                <div
                    className="absolute top-0 right-0 bottom-0 w-0.5 animate-sf-blink"
                    style={{ background: `linear-gradient(180deg, transparent, #ff3f5b, transparent)` }}
                />
            )}

            <div className="p-3.5">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-space text-sf-text-muted shrink-0">{campaign.id}</span>
                            <Chip label={campaign.severity.toUpperCase()} color={color} />
                            <Chip label={campaign.stage} color={color} />
                        </div>
                        <div className="text-[13px] font-semibold text-sf-text-primary leading-tight">
                            {campaign.title}
                        </div>
                        <div className="text-[11px] text-sf-text-secondary mt-1.5 leading-relaxed">
                            {campaign.description}
                        </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-baseline sm:items-end justify-between sm:justify-start w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
                        <div className="text-[22px] font-condensed font-bold leading-none" style={{ color }}>
                            {campaign.confidence}%
                        </div>
                        <div className="text-[9px] text-sf-text-muted mt-0.5 ml-2 sm:ml-0">confidence</div>
                    </div>
                </div>

                {/* Tool chips + event count */}
                <div className="flex gap-1.5 mt-2.5 flex-wrap items-center">
                    {campaign.tools.map((t) => (
                        <Chip key={t} label={t} color="#7a9ab8" />
                    ))}
                    <div className="ml-auto text-[10px] text-sf-text-muted">
                        {campaign.events.toLocaleString()} events · {campaign.firstSeen}
                    </div>
                </div>

                {/* Kill-chain stage dots */}
                <div className="flex items-center mt-2 gap-0">
                    {campaign.stages.map((s, i) => (
                        <div key={s} className="flex items-center flex-1">
                            <div className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className="w-2.5 h-2.5 rounded-full transition-all"
                                    style={{
                                        background: i <= campaign.currentStage ? (i === campaign.currentStage ? "#ff3f5b" : "#00d4c8") : "#1a2e4a",
                                        border: `2px solid ${i <= campaign.currentStage ? (i === campaign.currentStage ? "#ff3f5b" : "#00d4c8") : "#3d5a78"}`,
                                        boxShadow: i === campaign.currentStage ? "0 0 12px #ff3f5b" : i < campaign.currentStage ? "0 0 6px rgba(0,212,200,0.4)" : "none",
                                    }}
                                />
                                <span
                                    className="text-[9px] text-center max-w-[64px] leading-tight font-space"
                                    style={{ color: i <= campaign.currentStage ? (i === campaign.currentStage ? "#ff3f5b" : "#00d4c8") : "#3d5a78" }}
                                >
                                    {s}
                                </span>
                            </div>
                            {i < campaign.stages.length - 1 && (
                                <div
                                    className="h-px flex-1 mb-3.5"
                                    style={{ background: i < campaign.currentStage ? "linear-gradient(90deg, #00d4c8, rgba(0,212,200,0.4))" : "#1a2e4a" }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
