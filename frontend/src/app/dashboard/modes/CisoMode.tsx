"use client";

import React from 'react';
import { ShieldAlert, Activity, CheckCircle2, XCircle, Terminal, Maximize2, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { StaggerChildren, AnimatedNumber, PanelCard } from "@/components/ui/MotionWrappers";
import { RealSparkline } from "@/components/ui/RealSparkline";
import { VectorMap } from "@/components/ui/VectorMap";
import { DashboardModeProps } from './types';

export function CisoMode({ metrics, threatMapData, setMaximizedWidget }: DashboardModeProps) {
 return (
 <div className="flex flex-col gap-6 h-full w-full relative">
 <div className="z-10 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
 <PanelCard className="p-4 md:p-6 flex flex-col gap-4 relative overflow-hidden group border-ng-lime/30">
 <div className="flex items-center justify-between text-ng-muted text-[10px] font-mono tracking-widest z-10">
 <span className="flex items-center gap-2 text-ng-lime"><ShieldAlert className="w-4 h-4" /> POSTURE</span>
 </div>
 <div className="text-3xl font-mono text-ng-on z-10 mt-1">
 <AnimatedNumber value={Math.round(metrics.posture_score)} /><span className="text-lg text-ng-muted">/100</span>
 </div>
 <div className="h-6 w-full mt-1 opacity-40 z-10">
 <RealSparkline source="posture" width={300} height={24} />
 </div>
 </PanelCard>

 <PanelCard className="p-4 md:p-6 flex flex-col gap-4 relative overflow-hidden group border-ng-error/30">
 <div className="flex items-center justify-between text-ng-muted text-[10px] font-mono tracking-widest z-10">
 <span className="flex items-center gap-2 text-ng-error"><XCircle className="w-4 h-4 animate-pulse-fast" /> CRITICAL</span>
 </div>
 <div className="text-3xl font-mono text-ng-error z-10 mt-1">
 <AnimatedNumber value={metrics.critical_campaigns} />
 </div>
 <div className="h-6 w-full mt-1 opacity-40 z-10">
 <RealSparkline source="eps" width={300} height={24} />
 </div>
 </PanelCard>

 <PanelCard className="p-4 md:p-6 flex flex-col gap-4 relative overflow-hidden group border-ng-magenta/30">
 <div className="flex items-center justify-between text-ng-muted text-[10px] font-mono tracking-widest z-10">
 <span className="flex items-center gap-2 text-ng-magenta"><Activity className="w-4 h-4" /> ACTIVE</span>
 </div>
 <div className="text-3xl font-mono text-ng-magenta z-10 mt-1">
 <AnimatedNumber value={metrics.active_campaigns} />
 </div>
 <div className="h-6 w-full mt-1 opacity-40 z-10">
 <RealSparkline source="campaigns" width={300} height={24} />
 </div>
 </PanelCard>
 </div>

 <div className="flex-1 flex gap-4 min-h-0">
 <PanelCard className="flex-1 relative overflow-hidden flex flex-col">
 <div className="absolute top-4 left-4 z-10">
 <h2 className="font-headline tracking-widest uppercase text-xs text-ng-muted font-mono tracking-widest bg-ng-base border border-ng-outline-dim/40 px-3 py-1">GLOBAL THREAT TOPOLOGY</h2>
 </div>
 <div className="absolute top-4 right-4 z-10 flex gap-2">
 <button onClick={() => setMaximizedWidget('map')} className="text-ng-muted hover:text-ng-on transition-colors bg-ng-base/80 backdrop-blur border border-ng-outline-dim/40 p-2 rounded-none hover:bg-ng-mid">
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
