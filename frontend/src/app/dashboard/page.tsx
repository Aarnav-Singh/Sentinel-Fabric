"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, Activity, CheckCircle2, XCircle, Terminal } from "lucide-react";
import { api } from "@/lib/api/client";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import useSWR from "swr";
import { VectorMap } from "@/components/ui/VectorMap";
import { motion } from "framer-motion";
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

const DEMO_LIVE_FEED = [
    { e: 'Authentication Failed', s: 'IDP', d: 'Blocked', severity: 'medium', timeOffset: 5000 },
    { e: 'Firewall Rule Triggered', s: 'WAN', d: 'Logged', severity: 'low', timeOffset: 12000 },
    { e: 'Suspicious DLL Loaded', s: 'WS-WIN-04', d: 'Alert', severity: 'critical', timeOffset: 25000 },
    { e: 'Network Scan Detected', s: 'DMZ', d: 'Blocked', severity: 'high', timeOffset: 45000 },
];

export default function DashboardPage() {
    
    // 1. Polled REST Metrics
    const { data: apiMetrics } = useSWR("metrics", api.getMetrics, { refreshInterval: 5000 });
    const { data: apiCampaigns } = useSWR("campaigns", api.getCampaigns, { refreshInterval: 30000 });

    // 2. Local State fallbacks & Live Array
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

    // 4. SSE WebSockets for live events (throttled to 5 updates/sec max)
    const lastFeedUpdate = React.useRef(0);
    useLiveEvents({ 
        onEvent: (event: any) => {
            if (event.ml_scores && typeof event.ml_scores === "object" && (event.ml_scores as any).meta_score > 0) {
                setLocalMetrics(prev => ({ ...prev, events_per_second: prev.events_per_second + 1 }));
            }
            const now = Date.now();
            if (now - lastFeedUpdate.current < 200) return; // max 5 updates/sec
            lastFeedUpdate.current = now;
            if (event.message || event.event_type) {
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
        }
    });

    // 5. Data Resolution
    const metrics = apiMetrics || localMetrics;
    const findings: RemediationFinding[] = apiCampaigns?.length 
        ? apiCampaigns.map((c: any) => ({ id: c.id, title: c.name, severity: c.severity, srcIp: '10.0.0.1', timestamp: Date.now() })) 
        : DEMO_REMEDIATION;

    return (
        <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-sf-bg flex flex-col gap-4">
            
            {/* KPI MATRIX (Top Row) */}
            <div className="z-10 grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
                <PanelCard className="p-3 flex flex-col gap-2 relative overflow-hidden group">
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

                <PanelCard className="p-3 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-sf-warning" /> CAMPAIGNS</span>
                    </div>
                    <div className="text-2xl font-mono text-sf-text z-10 mt-1">
                        <AnimatedNumber value={metrics.active_campaigns} />
                    </div>
                    <div className="h-4 w-full mt-1 opacity-50 z-10">
                        <Sparkline data={[4, 6, 8, 12, 10, 15, 20, 24]} width={200} height={16} color="var(--sf-warning)" />
                    </div>
                </PanelCard>

                <PanelCard className="p-3 flex flex-col gap-2 relative overflow-hidden group border-[var(--sf-critical)]/30">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5 text-sf-critical animate-pulse-fast" /> CRITICAL</span>
                        <span className="text-sf-critical bg-sf-critical/10 px-1 inline-block border border-sf-critical/20">ACT</span>
                    </div>
                    <div className="text-2xl font-mono text-sf-critical z-10 mt-1">
                        <AnimatedNumber value={metrics.critical_campaigns} />
                    </div>
                </PanelCard>

                <PanelCard className="p-3 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-sf-accent" /> EVENT RATE</span>
                    </div>
                    <div className="text-2xl font-mono text-sf-text z-10 mt-1">
                        <AnimatedNumber value={metrics.events_per_second || 240} />
                    </div>
                    <div className="h-4 w-full mt-1 opacity-50 z-10">
                        <Sparkline data={[200, 210, 240, 220, 260, 240, 300, 280]} width={200} height={16} color="var(--sf-accent)" />
                    </div>
                </PanelCard>

                <PanelCard className="p-3 flex flex-col gap-2 relative overflow-hidden group">
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
                    <div className="flex-1 w-full relative">
                        <VectorMap threats={threatMapData} />
                    </div>
                    
                    {/* Embedded Findings Matrix over map */}
                    <div className="absolute bottom-3 right-3 left-3 z-10 bg-sf-bg border border-sf-border p-2">
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
                <PanelCard className="w-80 flex flex-col overflow-hidden hidden xl:flex">
                    <div className="p-3 border-b border-sf-border bg-sf-surface shrink-0 flex items-center justify-between">
                        <span className="text-[10px] font-mono tracking-widest text-sf-muted">TELEMETRY FEED</span>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-sf-accent border border-sf-accent/30 bg-sf-accent/10 px-1.5 py-0.5">
                            <div className="w-1.5 h-1.5 bg-sf-accent animate-pulse-fast" /> LIVE
                        </div>
                    </div>
                    
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
                                        {item.message || item.event_type || 'Unknown Event'}
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
            
        </div>
    );
}
