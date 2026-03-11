"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertCircle, Target, ShieldCheck, Activity } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type LiveEvent } from "@/lib/api/client";
import { useLiveEvents } from "@/hooks/useLiveEvents";

// Fallback data when backend is unreachable
const FALLBACK_EVENTS = [
    { event_id: "1", timestamp: new Date(Date.now() - 30_000).toISOString(), source_type: "suricata", severity: "critical", message: "Attack campaign escalating: CobaltStrike activity detected", action: "alert", meta_score: 0.92 },
    { event_id: "2", timestamp: new Date(Date.now() - 120_000).toISOString(), source_type: "ml", severity: "high", message: "Adversarial signature blocked by ML guardrail", action: "block", meta_score: 0.78 },
    { event_id: "3", timestamp: new Date(Date.now() - 900_000).toISOString(), source_type: "system", severity: "info", message: "Policy update pushed to 14 endpoints", action: "allow", meta_score: 0.1 },
    { event_id: "4", timestamp: new Date(Date.now() - 3_600_000).toISOString(), source_type: "analyst", severity: "info", message: "Analyst J.D concluded investigation FND-874", action: "allow", meta_score: 0.0 },
];

function severityToType(severity: string): string {
    switch (severity) {
        case "critical": return "critical";
        case "high": return "high";
        case "medium": return "high";
        case "info": return "info";
        default: return "info";
    }
}

function timeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? "s" : ""} ago`;
}

export function ActivityFeed() {
    const queryClient = useQueryClient();

    const { data: events } = useQuery({
        queryKey: ["recentEvents"],
        queryFn: () => api.getRecentEvents(20),
        placeholderData: FALLBACK_EVENTS,
    });

    // Prepend new SSE events to the list
    const handleLiveEvent = useCallback(
        (event: Record<string, unknown>) => {
            queryClient.setQueryData<LiveEvent[]>(["recentEvents"], (old) => {
                const liveEvent = event as unknown as LiveEvent;
                return [liveEvent, ...(old ?? [])].slice(0, 50);
            });
        },
        [queryClient]
    );

    useLiveEvents({ onEvent: handleLiveEvent });

    const displayEvents = events ?? FALLBACK_EVENTS;

    const getIcon = (type: string) => {
        switch (type) {
            case 'critical': return <AlertCircle className="w-4 h-4 text-brand-orange" />;
            case 'high': return <Target className="w-4 h-4 text-orange-400" />;
            case 'success': return <ShieldCheck className="w-4 h-4 text-green-500" />;
            default: return <Activity className="w-4 h-4 text-text-muted" />;
        }
    };

    return (
        <div className="flex-1 overflow-y-auto hidden-scrollbar space-y-3">
            {displayEvents.map((evt) => {
                const type = severityToType(evt.severity);
                return (
                    <div key={evt.event_id} className="p-3 bg-surface-elevated/50 rounded-lg border border-surface-border/50 flex gap-3 text-sm transition-colors hover:bg-surface-elevated group">
                        <div className="pt-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                            {getIcon(type)}
                        </div>
                        <div className="flex-1">
                            <p className={`font-medium ${['critical', 'high'].includes(type) ? 'text-text-primary' : 'text-text-secondary'}`}>
                                {evt.message}
                            </p>
                            <div className="flex gap-3 items-center mt-1.5">
                                <span className="text-xs text-text-muted font-mono">{timeAgo(evt.timestamp)}</span>
                                {evt.meta_score > 0.5 && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">
                                        {(evt.meta_score * 100).toFixed(0)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
