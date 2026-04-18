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
import { CommandCenter } from "./modes/CommandCenter";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

// ─── Metrics and Data Fallbacks ──────────────────────────────────────────────────

interface RemediationFinding { id: string; title: string; severity: 'critical' | 'high' | 'medium' | 'low'; srcIp: string; timestamp: number }

const ZERO_METRICS = { posture_score: 0, posture_delta: 0, active_campaigns: 0, critical_campaigns: 0, events_per_second: 0, connectors_total: 0, connectors_online: 0, analyst_accuracy: 0 };

export default function DashboardPage() {
 const { data: apiMetrics } = useSWR("metrics", api.getMetrics, { refreshInterval: 5000 });
 const { data: apiFindingsResponse } = useSWR("/api/proxy/api/v1/findings", (url) => fetch(url).then(r => r.json()), { refreshInterval: 30000 });

 const [maximizedWidget, setMaximizedWidget] = useState<'map' | 'telemetry' | null>(null);
 const [liveFeed, setLiveFeed] = useState<any[]>([]);
 const [threatMapData, setThreatMapData] = useState<any[]>([]);

 const { lastEvent, eventsRate: contextEventsRate } = useEventStream();
 const lastFeedUpdate = React.useRef(0);
 
 useEffect(() => {
 const event = lastEvent as any;
 if (!event) return;
 const now = Date.now();
 if (now - lastFeedUpdate.current < 200) return;
 lastFeedUpdate.current = now;
 if (event.event_id) {
 setLiveFeed(prev => [event, ...prev].slice(0, 30));
 if (event.severity === 'critical' || event.severity === 'high') {
 const newThreat = {
 id: `ev-${Date.now()}`,
 from: [(Math.random() - 0.5) * 360, (Math.random() - 0.5) * 140],
 to: [-77.03, 38.89],
 severity: event.severity
 };
 setThreatMapData(prev => [newThreat, ...prev].slice(0, 10));
 }
 }
 }, [lastEvent]);

 const metrics = apiMetrics || ZERO_METRICS;
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
 : [];

 return (
 <div className="relative w-full h-[calc(100vh-3.5rem)] overflow-hidden bg-transparent flex flex-col p-4 md:p-6 gap-4">
 <AmbientBackground variant="threatmap" />
 
 <CommandCenter 
 metrics={metrics}
 findings={findings}
 threatMapData={threatMapData}
 liveFeed={liveFeed}
 setMaximizedWidget={setMaximizedWidget}
 maximizedWidget={maximizedWidget}
 eventsRate={contextEventsRate}
 />

 {/* Maximized Modals */}
 <AnimatePresence>
 {maximizedWidget === 'telemetry' && (
 <motion.div 
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-8 flex flex-col"
 >
 <PanelCard className="flex-1 flex flex-col overflow-hidden relative max-w-5xl mx-auto w-full">
 <div className="p-4 border-b border-ng-outline-dim/40 bg-ng-mid shrink-0 flex items-center justify-between">
 <span className="text-xs font-mono tracking-widest text-ng-muted font-bold">TELEMETRY FEED (EXPANDED)</span>
 <div className="flex items-center gap-4">
 <div className="flex items-center gap-1.5 text-[10px] font-mono text-ng-cyan border border-ng-cyan/50/30 bg-ng-cyan-bright/10 px-2 py-0.5">
 <div className="w-2 h-2 bg-ng-cyan-bright animate-pulse-fast" /> LIVE
 </div>
 <button onClick={() => setMaximizedWidget(null)} className="text-ng-muted hover:text-ng-on transition-colors bg-ng-base border border-ng-outline-dim/40 p-2 rounded-none">
 <X className="w-5 h-5" />
 </button>
 </div>
 </div>
 <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3 bg-ng-base">
 <StaggerChildren staggerDelay={0.05}>
 {liveFeed.map((item, i) => (
 <motion.div key={`${item.timestamp}-${i}`} className="p-4 border border-ng-outline-dim/40 hover:bg-ng-mid transition-colors group flex items-start gap-4 rounded-none">
 <div className={`w-3 h-3 mt-1 shrink-0 rounded-none ${
 String(item.severity).toLowerCase() === 'critical' ? 'bg-ng-error shadow-[0_0_8px_var(--ng-error)]' : 
 String(item.severity).toLowerCase() === 'high' ? 'bg-ng-magenta' : 
 'bg-ng-lime'
 }`} />
 <div className="flex-1">
 <div className="flex items-center gap-4 mb-2 border-b border-ng-outline-dim/40/50 pb-2">
 <span className={`text-xs uppercase font-bold tracking-widest ${
 String(item.severity).toLowerCase() === 'critical' ? 'text-ng-error' : 
 String(item.severity).toLowerCase() === 'high' ? 'text-ng-magenta' : 
 'text-ng-lime'
 }`}>
 [{item.action || 'LOG'}]
 </span>
 <span className="text-xs font-mono text-ng-muted">SRC: {item.source_type || 'NET'}</span>
 <span className="text-xs font-mono text-ng-muted ml-auto bg-ng-mid px-2 py-1 rounded">
 {new Date(item.timestamp || Date.now()).toISOString().split('T')[1].slice(0, 8)}
 </span>
 </div>
 <div className="text-[13px] font-mono text-ng-on">
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
 <div className="absolute top-6 left-6 z-10 flex items-center gap-4 bg-ng-base backdrop-blur-md border border-ng-outline-dim/40 p-4 ">
 <h2 className="font-headline tracking-widest uppercase text-sm text-ng-muted font-mono tracking-widest font-bold">GLOBAL THREAT TOPOLOGY <span className="text-ng-cyan">(EXPANDED)</span></h2>
 </div>
 <button onClick={() => setMaximizedWidget(null)} className="absolute top-6 right-6 z-20 text-ng-muted hover:text-ng-on transition-colors bg-ng-base/90 border border-ng-outline-dim/40 p-3 rounded-none hover:bg-ng-mid ">
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

