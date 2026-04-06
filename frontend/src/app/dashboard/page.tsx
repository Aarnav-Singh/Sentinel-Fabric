"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Activity, CheckCircle2, XCircle, Terminal, Maximize2, X } from "lucide-react";
import { api } from "@/lib/api/client";
import { useEventStream } from "@/contexts/EventStreamContext";
import useSWR from "swr";
import { VectorMap } from "@/components/ui/VectorMap";
import { motion, AnimatePresence } from "framer-motion";
import { StaggerChildren, AnimatedNumber, FadeIn, PanelCard } from "@/components/ui/MotionWrappers";
import { Sparkline } from "@/components/ui/Sparkline";
import { DataGrid } from "@/components/ui/DataGrid";
import { DASHBOARD_MODES, DashboardMode } from "@/lib/dashboardModes";
import { CisoMode } from "./modes/CisoMode";
import { AnalystMode } from "./modes/AnalystMode";
import { HunterMode } from "./modes/HunterMode";

// ─── Types & Demos ───────────────────────────────────────────────

interface RemediationFinding { id: string; title: string; severity: 'critical' | 'high' | 'medium' | 'low'; srcIp: string; timestamp: number }

const DEMO_METRICS = { posture_score: 71, posture_delta: 0, active_campaigns: 24, critical_campaigns: 7, events_per_second: 240, connectors_total: 18, connectors_online: 16, analyst_accuracy: 94.5 };
const DEMO_REMEDIATION: RemediationFinding[] = [
    { id: '1', title: 'Suspicious Execution (cmd.exe)', severity: 'critical', srcIp: '198.51.100.14', timestamp: Date.now() - 1000 * 60 * 5 },
    { id: '2', title: 'Unauthorized IAM Role Assigned', severity: 'high', srcIp: '198.51.100.22', timestamp: Date.now() - 1000 * 60 * 12 },
    { id: '3', title: 'Geographic Anomaly (Unknown ASN)', severity: 'medium', srcIp: '198.51.100.41', timestamp: Date.now() - 1000 * 60 * 45 },
    { id: '4', title: 'Unusual Volume of Outbound Traffic', severity: 'critical', srcIp: '198.51.100.8', timestamp: Date.now() - 1000 * 60 * 55 },
];
const DEMO_HISTORY = Array.from({ length: 30 }, (_, i) => 
    62 + Math.round(Math.sin(i * 0.4) * 7 + i * 0.3) + Math.random() * 5
);
const SPARK_CAMPAIGNS = Array.from({ length: 30 }, (_, i) => 10 + Math.round(Math.cos(i * 0.6) * 3 + i * 0.5) + Math.random() * 2);
const SPARK_RATE = Array.from({ length: 30 }, (_, i) => 220 + Math.round(Math.sin(i * 0.8) * 30 + i * 1.5) + Math.random() * 10);

const DEMO_LIVE_FEED = [
    { e: 'Authentication Failed', s: 'IDP', d: 'Blocked', severity: 'medium', timeOffset: 5000 },
    { e: 'Firewall Rule Triggered', s: 'WAN', d: 'Logged', severity: 'low', timeOffset: 12000 },
    { e: 'Suspicious DLL Loaded', s: 'WS-WIN-04', d: 'Alert', severity: 'critical', timeOffset: 25000 },
    { e: 'Network Scan Detected', s: 'DMZ', d: 'Blocked', severity: 'high', timeOffset: 45000 },
];

export default function DashboardPage() {
    
    const [mode, setMode] = useState<DashboardMode>('analyst');
    const { data: apiMetrics } = useSWR("metrics", api.getMetrics, { refreshInterval: 5000 });
    const { data: apiFindingsResponse } = useSWR("/api/proxy/api/v1/findings", (url) => fetch(url).then(r => r.json()), { refreshInterval: 30000 });

    // 2. Local State fallbacks & Live Array
    const [maximizedWidget, setMaximizedWidget] = useState<'map' | 'telemetry' | null>(null);
    const [localMetrics, setLocalMetrics] = useState(DEMO_METRICS);
    const [lastMetricsUpdate, setLastMetricsUpdate] = useState<number>(Date.now());
    const [liveFeed, setLiveFeed] = useState<any[]>(DEMO_LIVE_FEED.map(x => ({ message: x.e, source_type: x.s, action: x.d, severity: x.severity, timestamp: Date.now() - x.timeOffset })));
    const [threatMapData, setThreatMapData] = useState<any[]>([]);

    useEffect(() => {
        setLastMetricsUpdate(Date.now());
    }, [apiMetrics]);

    useEffect(() => {
        // Generate placeholder map data
        setThreatMapData([
            { id: 't1', from: [37.61, 55.75], to: [-77.03, 38.89], severity: 'high' },
            { id: 't2', from: [116.40, 39.90], to: [-122.41, 37.77], severity: 'critical' },
            { id: 't3', from: [-43.17, -22.90], to: [-0.12, 51.50], severity: 'medium' }
        ]);
    }, []);

    // 4. Consume Shared SSE Context
    const { lastEvent, eventsRate: contextEventsRate } = useEventStream();
    const lastFeedUpdate = React.useRef(0);
    
    useEffect(() => {
        const event = lastEvent as any;
        if (!event) return;
        
        const now = Date.now();
        if (now - lastFeedUpdate.current < 200) return; // max 5 updates/sec
        lastFeedUpdate.current = now;
        if (event.event_id) {
            setLiveFeed(prev => [event, ...prev].slice(0, 30));
            
            // If it's a high severity event, ping the map
            if (event.severity === 'critical' || event.severity === 'high') {
                const newThreat = {
                    id: `ev-${Date.now()}`,
                    from: [(Math.random() - 0.5) * 360, (Math.random() - 0.5) * 140],
                    to: [-77.03, 38.89], // default to US east
                    severity: event.severity
                };
                setThreatMapData(prev => [newThreat, ...prev].slice(0, 10));
            }
        }
    }, [lastEvent]);

    // 5. Data Resolution
    const metrics = apiMetrics || localMetrics;
    
    let apiFindingsData: any[] = [];
    if (apiFindingsResponse) {
        if (Array.isArray(apiFindingsResponse)) apiFindingsData = apiFindingsResponse;
        else if (apiFindingsResponse.findings) apiFindingsData = apiFindingsResponse.findings;
    }
    const findings: RemediationFinding[] = apiFindingsData.length 
        ? apiFindingsData.map((c: any) => ({ 
            id: c.id, 
            title: c.title || c.name || "Unknown Threat Vector", 
            severity: c.severity, 
            srcIp: c.source || c.ip || '10.0.0.1', 
            timestamp: c.created_at ? new Date(c.created_at).getTime() : Date.now() 
          })) 
        : DEMO_REMEDIATION;

    const modeProps = {
        metrics,
        findings,
        threatMapData,
        liveFeed,
        setMaximizedWidget,
        maximizedWidget,
        eventsRate: contextEventsRate
    };

    return (
        <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-sf-bg flex flex-col p-4 md:p-6 gap-4">
            
            {/* Mode Switcher */}
            <div className="flex justify-between items-center shrink-0">
                <div className="flex bg-sf-surface border border-sf-border relative p-1 rounded-sm gap-1 text-[10px] font-mono tracking-widest uppercase">
                    {DASHBOARD_MODES.map(m => (
                        <button
                            key={m.id}
                            onClick={() => setMode(m.id)}
                            className={`px-4 py-1.5 transition-colors relative z-10 ${mode === m.id ? 'text-sf-bg font-bold' : 'text-sf-muted hover:text-sf-text'}`}
                        >
                            {mode === m.id && (
                                <motion.div 
                                    layoutId="modeIndicator" 
                                    className="absolute inset-0 bg-sf-text rounded-[2px] z-[-1]"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mode Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 min-h-0 relative w-full h-full"
                >
                    {mode === 'ciso' && <CisoMode {...modeProps} />}
                    {mode === 'analyst' && <AnalystMode {...modeProps} />}
                    {mode === 'hunter' && <HunterMode {...modeProps} />}
                </motion.div>
            </AnimatePresence>

            {/* Maximized Modals */}
            <AnimatePresence>
                {maximizedWidget === 'telemetry' && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-8 flex flex-col"
                    >
                        <PanelCard className="flex-1 flex flex-col overflow-hidden relative max-w-5xl mx-auto w-full">
                            <div className="p-4 border-b border-sf-border bg-sf-surface shrink-0 flex items-center justify-between">
                                <span className="text-xs font-mono tracking-widest text-sf-muted font-bold">TELEMETRY FEED (EXPANDED)</span>
                                <div className="flex items-center gap-4">
                                     <div className="flex items-center gap-1.5 text-[10px] font-mono text-sf-accent border border-sf-accent/30 bg-sf-accent/10 px-2 py-0.5">
                                         <div className="w-2 h-2 bg-sf-accent animate-pulse-fast" /> LIVE
                                     </div>
                                     <button onClick={() => setMaximizedWidget(null)} className="text-sf-muted hover:text-white transition-colors bg-sf-bg border border-sf-border p-2 rounded">
                                        <X className="w-5 h-5" />
                                     </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 bg-sf-bg">
                                <StaggerChildren staggerDelay={0.05}>
                                    {liveFeed.map((item, i) => (
                                        <motion.div key={`${item.timestamp}-${i}`} className="p-4 border border-sf-border hover:bg-sf-surface transition-colors group flex items-start gap-4 rounded-lg">
                                            <div className={`w-3 h-3 mt-1 shrink-0 rounded-full ${
                                                String(item.severity).toLowerCase() === 'critical' ? 'bg-sf-critical shadow-[0_0_8px_var(--sf-critical)]' : 
                                                String(item.severity).toLowerCase() === 'high' ? 'bg-sf-warning' : 
                                                'bg-sf-safe'
                                            }`} />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-4 mb-2 border-b border-sf-border/50 pb-2">
                                                    <span className={`text-xs uppercase font-bold tracking-widest ${
                                                        String(item.severity).toLowerCase() === 'critical' ? 'text-sf-critical' : 
                                                        String(item.severity).toLowerCase() === 'high' ? 'text-sf-warning' : 
                                                        'text-sf-safe'
                                                    }`}>
                                                        [{item.action || 'LOG'}]
                                                    </span>
                                                    <span className="text-xs font-mono text-sf-muted">SRC: {item.source_type || 'NET'}</span>
                                                    <span className="text-xs font-mono text-sf-muted ml-auto bg-sf-surface px-2 py-1 rounded">
                                                        {new Date(item.timestamp || Date.now()).toISOString().split('T')[1].slice(0, 8)}
                                                    </span>
                                                </div>
                                                <div className="text-[13px] font-mono text-sf-text">
                                                    {item.message || (item.source_type && `New event observed from ${item.source_type}`) || 'Background Activity'}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </StaggerChildren>
                            </div>
                        </PanelCard>
                    </motion.div>
                )}

                {maximizedWidget === 'map' && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 md:p-8 flex flex-col"
                    >
                        <PanelCard className="flex-1 relative overflow-hidden flex flex-col max-w-[1600px] mx-auto w-full">
                            <div className="absolute top-6 left-6 z-10 flex items-center gap-4 bg-sf-bg backdrop-blur-md border border-sf-border p-4 shadow-xl">
                                <h2 className="text-sm text-sf-muted font-mono tracking-widest font-bold">GLOBAL THREAT TOPOLOGY <span className="text-sf-accent">(EXPANDED)</span></h2>
                            </div>
                            <button onClick={() => setMaximizedWidget(null)} className="absolute top-6 right-6 z-20 text-sf-muted hover:text-white transition-colors bg-sf-bg/90 border border-sf-border p-3 rounded-lg hover:bg-sf-surface shadow-xl">
                                <X className="w-6 h-6" />
                            </button>
                            <div className="flex-1 w-full relative">
                                <VectorMap threats={threatMapData} />
                            </div>
                        </PanelCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
