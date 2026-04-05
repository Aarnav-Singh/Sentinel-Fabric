"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Terminal, X, Share2, ShieldAlert, Activity } from 'lucide-react';
import { useEventStream } from "@/contexts/EventStreamContext";
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedNumber, PanelCard } from '@/components/ui/MotionWrappers';
import { DataGrid } from '@/components/ui/DataGrid';

interface LogEvent { id: string; timestamp: string; level: "INFO" | "CRITICAL" | "WARN"; message: string; meta: { key: string, value: string }[]; rawJson: any; }

const DEMO_LOGS: LogEvent[] = [
    {
        id: "EV-001",
        timestamp: "14:02:44.921",
        level: "INFO",
        message: "POST /api/v2/auth/validate HTTP/1.1 - Origin: 192.168.1.44 - UserAgent: Mozilla/5.0...",
        meta: [{ key: "source", value: "external" }, { key: "cluster", value: "node-04" }],
        rawJson: { "timestamp": "2023-10-27T14:02:44Z", "event_id": 488218, "source": { "ip": "192.168.1.44", "port": 443 }, "payload": "Auth request validated." }
    },
];

function canonicalToLogEvent(event: Record<string, unknown>): LogEvent {
    const severity = (event.severity as string || "info").toLowerCase();
    const metaScore = event.ml_scores && typeof event.ml_scores === "object" ? (event.ml_scores as Record<string, number>).meta_score ?? 0 : 0;
    const level: "INFO" | "CRITICAL" | "WARN" = severity === "critical" || metaScore > 0.8 ? "CRITICAL" : severity === "high" || metaScore > 0.5 ? "WARN" : "INFO";

    const ts = event.timestamp ? new Date(event.timestamp as string) : new Date();
    const timeStr = ts.toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });

    const meta: { key: string; value: string }[] = [];
    if (event.source_type) meta.push({ key: "src", value: String(event.source_type) });
    if (metaScore > 0) meta.push({ key: "scr", value: metaScore.toFixed(2) });
    if (event.campaign_id) meta.push({ key: "cid", value: String(event.campaign_id) });
    const label = event.ml_scores && typeof event.ml_scores === "object" ? (event.ml_scores as Record<string, string>).ensemble_label : undefined;
    if (label && label !== "benign") meta.push({ key: "lbl", value: String(label) });

    return {
        id: String(event.event_id || `EV-${Date.now()}`),
        timestamp: timeStr,
        level,
        message: String(event.message || `${event.action || "unknown"} from ${event.source_type || "unknown"}`),
        meta,
        rawJson: event,
    };
}

export default function RawEventsPage() {
    const [selectedLog, setSelectedLog] = useState<LogEvent | null>(null);
    const [liveEvents, setLiveEvents] = useState<LogEvent[]>([]);
    const { lastEvent, eventsRate: eps } = useEventStream();

    useEffect(() => {
        fetch('/api/proxy/api/v1/events/recent?limit=50')
            .then(r => r.json())
            .then(data => {
                if (data.events && Array.isArray(data.events)) {
                    setLiveEvents(data.events.map((e: any) => canonicalToLogEvent(e)));
                }
            })
            .catch(err => console.error("Failed to load recent events", err));
    }, []);

    useEffect(() => {
        if (lastEvent) {
            setLiveEvents(prev => [canonicalToLogEvent(lastEvent), ...prev].slice(0, 150));
        }
    }, [lastEvent]);
    const allLogs = liveEvents.length > 0 ? liveEvents : DEMO_LOGS;

    return (
        <div className="flex-1 overflow-hidden p-6 bg-sf-bg flex flex-col min-h-0">
            <div className="flex flex-col gap-4 w-full h-full max-w-[1600px] mx-auto min-h-0">
                {/* Header Metrics */}
                <div className="flex gap-4 shrink-0">
                     <PanelCard className="flex flex-col p-4 w-64">
                         <div className="text-[10px] text-sf-muted font-mono tracking-widest uppercase mb-1 flex items-center gap-2">
                             <Activity className="w-3 h-3 text-sf-accent" /> Events / Sec
                         </div>
                         <div className="text-3xl font-mono text-sf-text mt-1">
                             <AnimatedNumber value={eps > 0 ? eps : 0} />
                         </div>
                     </PanelCard>
                      <PanelCard className="flex flex-col p-4 w-64">
                         <div className="text-[10px] text-sf-muted font-mono tracking-widest uppercase mb-1">
                             Buffer Size
                         </div>
                         <div className="text-3xl font-mono text-sf-text mt-1">
                             <AnimatedNumber value={liveEvents.length || 0} />
                         </div>
                     </PanelCard>
                      <div className="flex-1 flex items-center justify-end px-4">
                           <div className="flex items-center gap-2 border border-sf-border bg-sf-surface px-3 py-1.5">
                                <span className={`flex size-1.5 bg-${liveEvents.length > 0 ? 'sf-accent animate-pulse-fast' : 'sf-disabled'} rounded-none`} />
                                <span className="text-[10px] font-mono uppercase tracking-widest text-sf-muted">
                                    {liveEvents.length > 0 ? 'STREAM ACTIVE' : 'AWAITING DATA'}
                                </span>
                           </div>
                      </div>
                </div>

                {/* Raw Events DataGrid */}
                <PanelCard className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="px-4 py-2 border-b border-sf-border bg-sf-surface shrink-0 flex items-center">
                        <Terminal className="w-3 h-3 text-sf-muted mr-2" />
                        <h2 className="text-[10px] font-mono tracking-widest text-sf-muted uppercase">Live Event Stream</h2>
                    </div>
                    <div className="flex-1 overflow-auto p-2">
                         <DataGrid 
                            data={allLogs}
                            rowKey="id"
                            onRowClick={(row) => setSelectedLog(row)}
                            columns={[
                                {
                                    header: "TIME",
                                    key: "timestamp",
                                    render: (val) => <span className="font-mono text-[10px] text-sf-muted">{val}</span>
                                },
                                {
                                    header: "LVL",
                                    key: "level",
                                    render: (val) => {
                                        const colorClass = val === 'CRITICAL' ? 'bg-sf-critical text-sf-bg' : val === 'WARN' ? 'bg-sf-warning text-sf-bg' : 'bg-sf-surface text-sf-text border border-sf-border';
                                        return <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 ${colorClass}`}>{val}</span>;
                                    }
                                },
                                {
                                    header: "MESSAGE",
                                    key: "message",
                                    render: (val) => <span className="font-mono text-[10px] text-sf-text truncate block max-w-2xl">{val}</span>
                                },
                                {
                                    header: "META",
                                    key: "meta",
                                    align: "right",
                                    render: (val: any[]) => (
                                        <div className="flex flex-wrap justify-end gap-1">
                                            {val.map((m, i) => (
                                                <span key={i} className="text-[9px] font-mono uppercase tracking-widest text-sf-muted border border-sf-border px-1">
                                                    <span className="text-sf-accent/70">{m.key}:</span>{m.value}
                                                </span>
                                            ))}
                                        </div>
                                    )
                                }
                            ]}
                         />
                    </div>
                </PanelCard>
            </div>

            {/* Modal */}
            <AnimatePresence>
            {selectedLog && (
                <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.99 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-x-8 md:inset-x-32 top-16 bottom-16 z-50 flex flex-col bg-sf-bg border border-sf-border shadow-2xl"
                >
                    <div className="flex justify-between items-center px-4 py-3 border-b border-sf-border bg-sf-surface">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-sf-accent" />
                            <h4 className="text-sf-text text-[11px] font-mono uppercase tracking-widest">Payload Inspector</h4>
                            <span className="text-[10px] font-mono text-sf-muted ml-2">{selectedLog.id}</span>
                        </div>
                        <button onClick={() => setSelectedLog(null)} className="text-sf-muted hover:text-sf-text transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="px-4 py-3 border-b border-sf-border bg-sf-surface/50">
                        <div className="font-mono text-[11px] text-sf-text whitespace-pre-wrap break-words leading-relaxed select-text">
                            {selectedLog.message}
                        </div>
                    </div>

                    <div className="flex-1 bg-black p-4 font-mono text-[11px] leading-relaxed overflow-auto custom-scrollbar select-text">
                        <pre className="text-sf-safe/80 whitespace-pre-wrap break-all">
                            {JSON.stringify(selectedLog.rawJson, null, 2)}
                        </pre>
                    </div>

                    <div className="p-3 flex gap-3 border-t border-sf-border bg-sf-surface">
                        <button className="flex-1 bg-sf-surface hover:bg-sf-bg border border-sf-border text-sf-text font-mono font-bold text-[10px] py-2 flex items-center justify-center gap-2 transition-all">
                            <Share2 className="w-3 h-3" /> EXPORT JSON
                        </button>
                        <button className="flex-[2] bg-sf-text hover:bg-sf-text/90 text-sf-bg border border-sf-text font-mono font-bold text-[10px] py-2 flex items-center justify-center gap-2 transition-all">
                            <ShieldAlert className="w-3 h-3" /> CORRELATE THREAT
                        </button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            <AnimatePresence>
            {selectedLog && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
                    onClick={() => setSelectedLog(null)}
                />
            )}
            </AnimatePresence>
        </div>
    );
}
