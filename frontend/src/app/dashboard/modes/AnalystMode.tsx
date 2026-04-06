"use client";

import React from 'react';
import { ShieldAlert, Activity, CheckCircle2, XCircle, Terminal, Maximize2 } from "lucide-react";
import { motion } from "framer-motion";
import { StaggerChildren, AnimatedNumber, PanelCard } from "@/components/ui/MotionWrappers";
import { Sparkline } from "@/components/ui/Sparkline";
import { DataGrid } from "@/components/ui/DataGrid";
import { VectorMap } from "@/components/ui/VectorMap";
import { DashboardModeProps } from './types';

const DEMO_HISTORY = Array.from({ length: 30 }, (_, i) => 62 + Math.round(Math.sin(i * 0.4) * 7 + i * 0.3) + Math.random() * 5);
const SPARK_CAMPAIGNS = Array.from({ length: 30 }, (_, i) => 10 + Math.round(Math.cos(i * 0.6) * 3 + i * 0.5) + Math.random() * 2);
const SPARK_RATE = Array.from({ length: 30 }, (_, i) => 220 + Math.round(Math.sin(i * 0.8) * 30 + i * 1.5) + Math.random() * 10);

export function AnalystMode({ metrics, findings, threatMapData, liveFeed, setMaximizedWidget, eventsRate }: DashboardModeProps) {
    return (
        <div className="flex flex-col gap-4 h-full w-full relative">
            <div className="z-10 grid grid-cols-2 md:grid-cols-5 gap-2 xl:gap-4 shrink-0">
                <PanelCard className="p-3 pt-5 flex flex-col gap-2 relative overflow-hidden group">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 text-sf-safe" /> POSTURE SCORE</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sf-safe">+2.4%</span>
                        </div>
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
                        <div className="flex items-center gap-2">
                            <span className="text-sf-critical bg-sf-critical/10 px-1 inline-block border border-sf-critical/20">ACT</span>
                        </div>
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
                        <AnimatedNumber value={eventsRate} />
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
                <PanelCard className="flex-1 relative overflow-hidden flex flex-col">
                    <div className="absolute top-3 left-3 z-10">
                        <h2 className="text-[10px] text-sf-muted font-mono tracking-widest bg-sf-bg border border-sf-border px-2 py-0.5">GLOBAL THREAT TOPOLOGY</h2>
                    </div>
                    <div className="absolute top-3 right-3 z-10 flex gap-2">
                        <button onClick={() => setMaximizedWidget('map')} className="text-sf-muted hover:text-white transition-colors bg-sf-bg/80 backdrop-blur border border-sf-border p-1.5 rounded hover:bg-sf-surface">
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="flex-1 w-full relative min-h-[200px]">
                        <VectorMap threats={threatMapData} />
                    </div>
                    
                    <div className="mt-auto shrink-0 bg-sf-bg border-t border-sf-border p-2 z-10 w-full relative">
                         <div className="flex items-center justify-between mb-2 px-1">
                             <span className="text-[10px] font-mono text-sf-muted uppercase tracking-widest">ACTIVE FINDINGS MATRIX</span>
                         </div>
                         <DataGrid
                            data={findings.slice(0, 4)}
                            rowKey="id"
                            columns={[
                                { header: "SEV", key: "severity", render: (val) => (<div className={`w-2 h-2 ${val === 'critical' ? 'bg-sf-critical' : val === 'high' ? 'bg-sf-warning' : 'bg-sf-safe'}`} />) },
                                { header: "THREAT VECTOR", key: "title", render: (val) => <span className="truncate block max-w-[200px] xl:max-w-xs">{val}</span> },
                                { header: "SOURCE", key: "srcIp", align: "right" }
                            ]}
                         />
                    </div>
                </PanelCard>

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
                                <motion.div key={`${item.timestamp}-${i}`} className="p-2 border border-transparent hover:border-sf-border hover:bg-sf-surface transition-colors cursor-pointer group">
                                    <div className="flex items-start justify-between text-[10px] font-mono mb-1">
                                        <span className={`uppercase font-bold ${String(item.severity).toLowerCase() === 'critical' ? 'text-sf-critical' : String(item.severity).toLowerCase() === 'high' ? 'text-sf-warning' : 'text-sf-safe'}`}>
                                            [{item.action || 'LOG'}]
                                        </span>
                                        <span className="text-sf-muted" suppressHydrationWarning>{new Date(item.timestamp || Date.now()).toISOString().split('T')[1].slice(0, 8)}</span>
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
        </div>
    );
}
