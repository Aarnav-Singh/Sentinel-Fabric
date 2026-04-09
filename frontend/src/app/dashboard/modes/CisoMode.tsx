"use client";

import React from 'react';
import { ShieldAlert, Activity, CheckCircle2, XCircle, Terminal, Maximize2, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { StaggerChildren, AnimatedNumber, PanelCard } from "@/components/ui/MotionWrappers";
import { Sparkline } from "@/components/ui/Sparkline";
import { VectorMap } from "@/components/ui/VectorMap";
import { DashboardModeProps } from './types';

const DEMO_HISTORY = Array.from({ length: 30 }, (_, i) => 62 + Math.round(Math.sin(i * 0.4) * 7 + i * 0.3) + Math.random() * 5);
const SPARK_CAMPAIGNS = Array.from({ length: 30 }, (_, i) => 10 + Math.round(Math.cos(i * 0.6) * 3 + i * 0.5) + Math.random() * 2);

export function CisoMode({ metrics, threatMapData, setMaximizedWidget }: DashboardModeProps) {
    return (
        <div className="flex flex-col gap-6 h-full w-full relative">
            <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                <PanelCard className="p-4 md:p-6 flex flex-col gap-4 relative overflow-hidden group border-sf-safe/30">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-2 text-sf-safe"><ShieldAlert className="w-4 h-4" /> POSTURE</span>
                    </div>
                    <div className="text-3xl font-mono text-sf-text z-10 mt-1">
                        <AnimatedNumber value={Math.round(metrics.posture_score)} /><span className="text-lg text-sf-muted">/100</span>
                    </div>
                    <div className="h-6 w-full mt-1 opacity-40 z-10">
                        <Sparkline data={[...DEMO_HISTORY].reverse().map(v => v + Math.random())} width={300} height={24} color="var(--sf-safe)" />
                    </div>
                </PanelCard>

                <PanelCard className="p-4 md:p-6 flex flex-col gap-4 relative overflow-hidden group border-sf-critical/30">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-2 text-sf-critical"><XCircle className="w-4 h-4 animate-pulse-fast" /> CRITICAL</span>
                    </div>
                    <div className="text-3xl font-mono text-sf-critical z-10 mt-1">
                        <AnimatedNumber value={metrics.critical_campaigns} />
                    </div>
                    <div className="h-6 w-full mt-1 opacity-40 z-10">
                        <Sparkline data={Array.from({length: 20}, () => Math.random() * 10)} width={300} height={24} color="var(--sf-critical)" />
                    </div>
                </PanelCard>

                <PanelCard className="p-4 md:p-6 flex flex-col gap-4 relative overflow-hidden group border-sf-warning/30">
                    <div className="flex items-center justify-between text-sf-muted text-[10px] font-mono tracking-widest z-10">
                        <span className="flex items-center gap-2 text-sf-warning"><Activity className="w-4 h-4" /> ACTIVE</span>
                    </div>
                    <div className="text-3xl font-mono text-sf-warning z-10 mt-1">
                        <AnimatedNumber value={metrics.active_campaigns} />
                    </div>
                    <div className="h-6 w-full mt-1 opacity-40 z-10">
                        <Sparkline data={[...SPARK_CAMPAIGNS].map(v => v + Math.random())} width={300} height={24} color="var(--sf-warning)" />
                    </div>
                </PanelCard>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                <PanelCard className="flex-1 relative overflow-hidden flex flex-col">
                    <div className="absolute top-4 left-4 z-10">
                        <h2 className="text-xs text-sf-muted font-mono tracking-widest bg-sf-bg border border-sf-border px-3 py-1">GLOBAL THREAT TOPOLOGY</h2>
                    </div>
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <button onClick={() => setMaximizedWidget('map')} className="text-sf-muted hover:text-white transition-colors bg-sf-bg/80 backdrop-blur border border-sf-border p-2 rounded hover:bg-sf-surface">
                            <Maximize2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 w-full relative min-h-[300px]">
                        <VectorMap threats={threatMapData} />
                    </div>
                </PanelCard>
            </div>
        </div>
    );
}
