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
    
    const { data: apiMetrics } = useSWR("metrics", api.getMetrics, { refreshInterval: 5000 });
    const { data: apiFindingsResponse } = useSWR("/api/proxy/api/v1/findings", (url) => fetch(url).then(r => r.json()), { refreshInterval: 30000 });

    // 2. Local State fallbacks & Live Array
    const [maximizedWidget, setMaximizedWidget] = useState<'map' | 'telemetry' | null>(null);
    const [localMetrics, setLocalMetrics] = useState(DEMO_METRICS);
    const [liveFeed, setLiveFeed] = useState<any[]>(DEMO_LIVE_FEED.map(x => ({ message: x.e, source_type: x.s, action: x.d, severity: x.severity, timestamp: Date.now() - x.timeOffset })));
    const [threatMapData, setThreatMapData] = useState<any[]>([]);

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

    return (
        <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-sf-bg flex flex-col gap-4">
            
            {/* KPI MATRIX (Top Row) */}
            <div className="z-10 grid grid-cols-2 md:grid-cols-5 gap-2 xl:gap-4 shrink-0">
                <PanelCard className="p-3 pt-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-sf-safe" /> POSTURE SCORE</span>
                        <span className="text-sf-safe">+2.4%</span>
                    </div>
                    <div className="text-2xl font-mono text-sf-text z-10 mt-1">
                        <AnimatedNumber value={Math.round(metrics.posture_score)} /><span className="text-sm text-sf-muted">/100</span>
                    </div>
                    <div className="h-4 w-full mt-1 opacity-50 z-10">
                        <Sparkline data={DEMO_HISTORY} width={200} height={16} color="var(--sf-safe)" />
                    </div>
                </PanelCard>

                <PanelCard className="p-3 pt-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-sf-warning" /> CAMPAIGNS</span>
                    </div>
                    <div className="text-2xl font-mono text-sf-text z-10 mt-1">
                        <AnimatedNumber value={metrics.active_campaigns} />
                    </div>
                    <div className="h-4 w-full mt-1 opacity-50 z-10">
                        <Sparkline data={SPARK_CAMPAIGNS} width={200} height={16} color="var(--sf-warning)" />
                    </div>
                </PanelCard>

                <PanelCard className="p-3 pt-5 flex flex-col gap-2 relative overflow-hidden group border-[var(--sf-critical)]/30">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-sf-critical animate-pulse-fast" /> CRITICAL</span>
                        <span className="text-sf-critical bg-sf-critical/10 px-1 inline-block border border-sf-critical/20">ACT</span>
                    </div>
                    <div className="text-2xl font-mono text-sf-critical z-10 mt-1">
                        <AnimatedNumber value={metrics.critical_campaigns} />
                    </div>
                </PanelCard>

                <PanelCard className="p-3 pt-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-sf-accent" /> EVENT RATE</span>
                    </div>
                    <div className="text-2xl font-mono text-sf-text z-10 mt-1">
                        <AnimatedNumber value={contextEventsRate} />
                    </div>
                    <div className="h-4 w-full mt-1 opacity-50 z-10">
                        <Sparkline data={SPARK_RATE} width={200} height={16} color="var(--sf-accent)" />
                    </div>
                </PanelCard>

                <PanelCard className="p-3 pt-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sf-safe" /> ASSETS</span>
                    </div>
                    <div className="text-2xl font-mono text-sf-text z-10 mt-1">
                        <AnimatedNumber value={metrics.connectors_online} /><span className="text-sm text-sf-muted">/{metrics.connectors_total}</span>
                    </div>
                </PanelCard>
            </div>

            {/* MAIN CANVAS - Split Layout */}
            <div className="flex-1 flex gap-4 min-h-0">
                
                {/* Vector Map Container */}
                <PanelCard className="flex-1 relative overflow-hidden flex flex-col">
                    <div className="absolute top-3 left-3 z-10">
                        <h2 className="text-[10px] text-sf-muted font-mono tracking-widest bg-sf-bg border border-sf-border px-2 py-0.5">GLOBAL THREAT TOPOLOGY</h2>
                    </div>
                    <div className="absolute top-3 right-3 z-10 flex gap-2">
                        <button onClick={() => setMaximizedWidget('map')} className="text-sf-muted hover:text-white transition-colors bg-sf-bg/80 backdrop-blur border border-sf-border p-1.5 rounded hover:bg-sf-surface">
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="flex-1 w-full relative min-h-[300px]">
                        <VectorMap threats={threatMapData} />
                    </div>
                    
                    {/* Embedded Findings Matrix over map */}
                    <div className="mt-auto shrink-0 bg-sf-bg border-t border-sf-border p-2 z-10 w-full relative opacity-95">
                         <div className="flex items-center justify-between mb-2 px-1">
                             <span className="text-[10px] font-mono text-sf-muted uppercase tracking-widest">ACTIVE FINDINGS MATRIX</span>
                         </div>
                         <DataGrid
                            data={findings.slice(0, 4)}
                            rowKey="id"
                            columns={[
                                { 
                                    header: "SEV", 
                                    key: "severity", 
                                    render: (val) => (
                                        <div className={`w-2 h-2 ${val === 'critical' ? 'bg-sf-critical' : val === 'high' ? 'bg-sf-warning' : 'bg-sf-safe'}`} />
                                    )
                                },
                                { header: "THREAT VECTOR", key: "title", render: (val) => <span className="truncate block max-w-[200px] xl:max-w-xs">{val}</span> },
                                { header: "SOURCE", key: "srcIp", align: "right" }
                            ]}
                         />
                    </div>
                </PanelCard>

                {/* Live Telemetry Feed Sidebar (Right) */}
                <PanelCard className="w-80 flex flex-col overflow-hidden hidden xl:flex relative">
                    <div className="p-3 border-b border-sf-border bg-sf-surface shrink-0 flex items-center justify-between">
                        <span className="text-[10px] font-mono tracking-widest text-sf-muted">TELEMETRY FEED</span>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-sf-accent border border-sf-accent/30 bg-sf-accent/10 px-1.5 py-0.5">
                            <div className="w-1.5 h-1.5 bg-sf-accent animate-pulse-fast" /> LIVE
                        </div>
                    </div>
                    <button onClick={() => setMaximizedWidget('telemetry')} className="absolute top-2.5 right-16 z-10 text-sf-muted hover:text-white transition-colors p-1 rounded hover:bg-white/10">
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        <StaggerChildren staggerDelay={0.05}>
                            {liveFeed.map((item, i) => (
                                <motion.div
                                    key={`${item.timestamp}-${i}`}
                                    className="p-2 border border-transparent hover:border-sf-border hover:bg-sf-surface transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between text-[10px] font-mono mb-1">
                                        <span className={`uppercase font-bold ${
                                            String(item.severity).toLowerCase() === 'critical' ? 'text-sf-critical' : 
                                            String(item.severity).toLowerCase() === 'high' ? 'text-sf-warning' : 
                                            'text-sf-safe'
                                        }`}>
                                            [{item.action || 'LOG'}]
                                        </span>
                                        <span className="text-sf-muted" suppressHydrationWarning>
                                            {new Date(item.timestamp || Date.now()).toISOString().split('T')[1].slice(0, 8)}
                                        </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-sf-text leading-tight truncate group-hover:text-sf-accent transition-colors">
                                        {item.message || (item.source_type && `New event observed from ${item.source_type}`) || 'Background Activity'}
                                    </div>
                                    <div className="flex gap-2 mt-1 text-[9px] font-mono text-sf-muted">
                                        <span>SRC: {item.source_type || 'NET'}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </StaggerChildren>
                    </div>
                </PanelCard>
            </div>
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
