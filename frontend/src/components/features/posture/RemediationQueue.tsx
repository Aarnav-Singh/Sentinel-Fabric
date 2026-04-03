"use client";

import { Chip } from "@/components/ui/Chip";

export interface RemediationFinding {
    id: string;
    domain: string;
    title: string;
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    effort: "quick" | "moderate" | "significant";
    linkedCampaigns: string[];
    linkedTechniques: string[];
    status: "open" | "acknowledged" | "resolved";
}

interface RemediationQueueProps {
    findings: RemediationFinding[];
    onAcknowledge?: (id: string) => void;
    onDismiss?: (id: string) => void;
}

const severityColors: Record<string, string> = {
    critical: "var(--sf-critical)",
    high: "var(--sf-warning)",
    medium: "var(--sf-accent)",
    low: "var(--sf-bg)",
};

const effortLabels: Record<string, string> = {
    quick: "~10 min",
    moderate: "~1 hr",
    significant: "1+ days",
};

export function RemediationQueue({ findings, onAcknowledge, onDismiss }: RemediationQueueProps) {
    return (
        <div className="space-y-2">
            {findings.map((f, i) => (
                <div
                    key={f.id}
                    className="sf-card overflow-hidden animate-sf-fadeIn"
                    style={{
                        borderLeft: `3px solid ${severityColors[f.severity]}`,
                        animationDelay: `${i * 0.05}s`,
                        opacity: f.status === "resolved" ? 0.5 : 1,
                    }}
                >
                    <div className="p-3.5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Chip label={f.severity.toUpperCase()} color={severityColors[f.severity]} variant="filled" />
                                    <Chip label={f.domain} color="var(--sf-bg)" />
                                    <span className="text-[9px] font-space text-sf-text-muted">{effortLabels[f.effort]}</span>
                                </div>
                                <div className="text-[12px] font-semibold text-sf-text-primary leading-tight">{f.title}</div>
                            </div>
                            <span className="text-[9px] font-space text-sf-text-muted shrink-0 uppercase">{f.status}</span>
                        </div>

                        <p className="text-[11px] text-sf-text-secondary leading-relaxed mb-2">{f.description}</p>

                        <div className="flex items-center gap-2 flex-wrap">
                            {f.linkedTechniques.map((t) => (
                                <Chip key={t} label={t} color="var(--sf-accent-2)" />
                            ))}
                            {f.linkedCampaigns.map((c) => (
                                <Chip key={c} label={c} color="var(--sf-accent)" />
                            ))}
                            <div className="flex-1" />
                            {f.status === "open" && (
                                <>
                                    <button
                                        onClick={() => onDismiss?.(f.id)}
                                        className="text-[10px] text-sf-text-muted hover:text-sf-text-secondary cursor-pointer transition-colors px-2 py-0.5"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={() => onAcknowledge?.(f.id)}
                                        className="text-[10px] font-bold px-3 py-1 rounded cursor-pointer transition-all"
                                        style={{
                                            background: "rgba(0,212,200,0.15)",
                                            color: "var(--sf-accent)",
                                            border: "1px solid rgba(0,212,200,0.3)",
                                        }}
                                    >
                                        Acknowledge
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
