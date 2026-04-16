"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    ShieldAlert, Activity, CheckCircle2, XCircle, Terminal, 
    Maximize2, Zap, Cpu, Search, LayoutGrid, ListFilter, Target, 
    Database, Network
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StaggerChildren, AnimatedNumber, PanelCard } from "@/components/ui/MotionWrappers";
import { RealSparkline } from "@/components/ui/RealSparkline";
import { DataGrid } from "@/components/ui/DataGrid";
import { VectorMap } from "@/components/ui/VectorMap";
import { MitreHeatmap } from "@/components/features/compliance/MitreHeatmap";
import { Badge } from '@/components/ui/Badge';
import { DashboardModeProps } from './types';

// -- CodeMirror Imports for UQL Editor --
import { EditorView, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { sql } from '@codemirror/lang-sql';

const umbrixTheme = EditorView.theme({
  "&": { backgroundColor: "var(--sf-bg)", color: "var(--sf-text)", fontSize: "12px" },
  ".cm-gutters": { backgroundColor: "var(--sf-surface)", color: "var(--sf-muted)", border: "none", borderRight: "1px solid var(--sf-border)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--sf-surface) 40%, transparent)" },
  ".cm-cursor": { borderLeftColor: "var(--sf-accent)" },
}, { dark: true });

function UQLEditor({ value, onChange, onRun }: { value: string, onChange: (v: string) => void, onRun: () => void }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const runRef = useRef(onRun);
    runRef.current = onRun;

    useEffect(() => {
        if (!containerRef.current) return;
        const state = EditorState.create({
            doc: value,
            extensions: [
                umbrixTheme, sql(), history(),
                keymap.of([...defaultKeymap, ...historyKeymap, { key: 'Mod-Enter', run: () => { runRef.current(); return true; } }]),
                cmPlaceholder('UQL: ml_score > 0.8 AND tactic = "Lateral Movement" | source = "crowdstrike"'),
                EditorView.updateListener.of(update => { if (update.docChanged) onChange(update.state.doc.toString()); }),
                EditorView.theme({
                    '&': { background: 'transparent', height: '100%' },
                    '.cm-content': { fontFamily: 'monospace', fontSize: '12px' },
                    '.cm-gutters': { display: 'none' },
                    '.cm-focused': { outline: 'none' },
                }),
                EditorView.lineWrapping,
            ],
        });
        viewRef.current = new EditorView({ state, parent: containerRef.current });
        return () => viewRef.current?.destroy();
    }, []);
    return <div ref={containerRef} className="flex-1 h-full min-w-0" />;
}

export function CommandCenter({ metrics, findings, threatMapData, liveFeed, setMaximizedWidget, eventsRate }: DashboardModeProps) {
    const [activeTab, setActiveTab] = useState<'threats' | 'hunt' | 'coverage'>('threats');
    const [uqlQuery, setUqlQuery] = useState('');
    const [huntResults, setHuntResults] = useState<any[]>([]);
    const [isHunting, setIsHunting] = useState(false);

    const handleRunHunt = useCallback(async () => {
        if (!uqlQuery.trim()) return;
        setIsHunting(true);
        try {
            const res = await fetch('/api/proxy/api/v1/hunt/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: uqlQuery }),
            });
            const data = await res.json();
            setHuntResults(data.results ?? []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsHunting(false);
        }
    }, [uqlQuery]);

    return (
        <div className="flex flex-col gap-4 h-full w-full relative">
            
            {/* KPI Header */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                <PanelCard className="p-4 flex flex-col gap-1 border-sf-safe/20">
                    <span className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-sf-safe uppercase">
                        <ShieldAlert className="w-3.5 h-3.5" /> Posture Score
                    </span>
                    <div className="flex items-end gap-2">
                        <span className="text-2xl font-mono text-sf-text"><AnimatedNumber value={Math.round(metrics.posture_score)} /></span>
                        <span className="text-xs text-sf-muted mb-1">/100</span>
                    </div>
                    <RealSparkline source="posture" width={120} height={12} />
                </PanelCard>

                <PanelCard className="p-4 flex flex-col gap-1 border-sf-critical/20">
                    <span className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-sf-critical uppercase">
                        <XCircle className="w-3.5 h-3.5 animate-pulse-fast" /> Critical Risks
                    </span>
                    <div className="text-2xl font-mono text-sf-critical"><AnimatedNumber value={metrics.critical_campaigns} /></div>
                    <RealSparkline source="eps" width={120} height={12} />
                </PanelCard>

                <PanelCard className="p-4 flex flex-col gap-1 border-sf-warning/20">
                    <span className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-sf-warning uppercase">
                        <Activity className="w-3.5 h-3.5" /> Active Campaigns
                    </span>
                    <div className="text-2xl font-mono text-sf-warning"><AnimatedNumber value={metrics.active_campaigns} /></div>
                    <RealSparkline source="campaigns" width={120} height={12} />
                </PanelCard>

                <PanelCard className="p-4 flex flex-col gap-1">
                    <span className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-sf-accent uppercase">
                        <Terminal className="w-3.5 h-3.5" /> Event Rate
                    </span>
                    <div className="text-2xl font-mono text-sf-text">{eventsRate} <span className="text-xs text-sf-muted">EPS</span></div>
                    <RealSparkline source="eps" width={120} height={12} />
                </PanelCard>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex gap-4 min-h-0">
                
                {/* Left Column: Map + Workbench */}
                <div className="flex-[2] flex flex-col gap-4 min-w-0 overflow-hidden">
                    
                    {/* Top: Map */}
                    <PanelCard className="flex-[3] relative overflow-hidden flex flex-col">
                        <div className="absolute top-3 left-3 z-10">
                            <h2 className="text-[10px] text-sf-muted font-mono tracking-widest bg-sf-bg/80 backdrop-blur border border-sf-border px-3 py-1">GLOBAL THREAT TOPOLOGY</h2>
                        </div>
                        <div className="absolute top-3 right-3 z-10">
                            <button onClick={() => setMaximizedWidget('map')} className="text-sf-muted hover:text-white transition-colors bg-sf-bg/80 backdrop-blur border border-sf-border p-2 rounded-none hover:bg-sf-surface">
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 w-full relative">
                            <VectorMap threats={threatMapData} />
                        </div>
                    </PanelCard>

                    {/* Bottom: Workbench (Tabs) */}
                    <PanelCard className="flex-[2] flex flex-col overflow-hidden">
                        <div className="flex items-center border-b border-sf-border bg-sf-surface shrink-0">
                            <button 
                                onClick={() => setActiveTab('threats')}
                                className={`px-4 py-2.5 text-[10px] font-mono tracking-widest uppercase flex items-center gap-2 border-r border-sf-border transition-colors
                                ${activeTab === 'threats' ? 'bg-sf-bg text-sf-accent border-t-2 border-t-sf-accent' : 'text-sf-muted hover:text-sf-text hover:bg-sf-bg/50'}`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" /> Threats
                            </button>
                            <button 
                                onClick={() => setActiveTab('hunt')}
                                className={`px-4 py-2.5 text-[10px] font-mono tracking-widest uppercase flex items-center gap-2 border-r border-sf-border transition-colors
                                ${activeTab === 'hunt' ? 'bg-sf-bg text-sf-accent border-t-2 border-t-sf-accent' : 'text-sf-muted hover:text-sf-text hover:bg-sf-bg/50'}`}
                            >
                                <Search className="w-3.5 h-3.5" /> Hunt
                            </button>
                            <button 
                                onClick={() => setActiveTab('coverage')}
                                className={`px-4 py-2.5 text-[10px] font-mono tracking-widest uppercase flex items-center gap-2 border-r border-sf-border transition-colors
                                ${activeTab === 'coverage' ? 'bg-sf-bg text-sf-accent border-t-2 border-t-sf-accent' : 'text-sf-muted hover:text-sf-text hover:bg-sf-bg/50'}`}
                            >
                                <Network className="w-3.5 h-3.5" /> Coverage
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            <AnimatePresence mode="wait">
                                {activeTab === 'threats' && (
                                    <motion.div key="threats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                                        <DataGrid
                                            data={findings}
                                            rowKey="id"
                                            columns={[
                                                { header: "SEV", key: "severity", render: (val) => (<div className={`w-2 h-2 ${val === 'critical' ? 'bg-sf-critical' : val === 'high' ? 'bg-sf-warning' : 'bg-sf-safe'}`} />) },
                                                { header: "THREAT VECTOR", key: "title", render: (val) => <span className="truncate block max-w-sm">{val}</span> },
                                                { header: "SOURCE", key: "srcIp", align: "right" }
                                            ]}
                                        />
                                    </motion.div>
                                )}
                                {activeTab === 'hunt' && (
                                    <motion.div key="hunt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                                        <div className="shrink-0 flex items-stretch border-b border-sf-border bg-sf-bg">
                                            <UQLEditor value={uqlQuery} onChange={setUqlQuery} onRun={handleRunHunt} />
                                            <button 
                                                onClick={handleRunHunt}
                                                className="px-6 bg-sf-accent/10 hover:bg-sf-accent/20 border-l border-sf-border text-sf-accent text-[10px] font-mono tracking-widest uppercase transition-colors"
                                            >
                                                {isHunting ? "..." : "RUN"}
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            <DataGrid 
                                                data={huntResults.length > 0 ? huntResults : liveFeed.slice(0, 10)} 
                                                rowKey="id" 
                                                columns={[
                                                    { header: "TIME", key: "timestamp", render: (val) => <span className="text-[10px] font-mono text-sf-muted">{val ? new Date(val).toISOString().split('T')[1].slice(0, 8) : '--'}</span> },
                                                    { header: "SEV", key: "severity", render: (val) => <Badge label={val as string} severity={val as any} /> },
                                                    { header: "MESSAGE", key: "message", render: (val) => <span className="text-[10px] font-mono truncate block max-w-xs">{val || 'System Log'}</span> }
                                                ]}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                                {activeTab === 'coverage' && (
                                    <motion.div key="coverage" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4 overflow-hidden">
                                        <MitreHeatmap />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </PanelCard>
                </div>

                {/* Right Column: Telemetry Feed */}
                <PanelCard className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="p-3 border-b border-sf-border bg-sf-surface shrink-0 flex items-center justify-between">
                        <span className="text-[10px] font-mono tracking-widest text-sf-muted uppercase">TELEMETRY_STREAM</span>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-sf-accent border border-sf-accent/30 bg-sf-accent/10 px-1.5 py-0.5">
                            <div className="w-1.5 h-1.5 bg-sf-accent animate-pulse-fast" /> LIVE
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        <StaggerChildren staggerDelay={0.03}>
                            {liveFeed.map((item, i) => (
                                <motion.div key={`${item.timestamp}-${i}`} className="p-2 border border-transparent hover:border-sf-border hover:bg-sf-surface/50 transition-colors group cursor-pointer">
                                    <div className="flex items-start justify-between text-[9px] font-mono mb-1">
                                        <span className={`uppercase font-bold ${String(item.severity).toLowerCase() === 'critical' ? 'text-sf-critical' : String(item.severity).toLowerCase() === 'high' ? 'text-sf-warning' : 'text-sf-safe'}`}>
                                            [{item.action || 'LOG'}]
                                        </span>
                                        <span className="text-sf-muted">{new Date(item.timestamp || Date.now()).toISOString().split('T')[1].slice(0, 8)}</span>
                                    </div>
                                    <div className="text-[11px] font-mono text-sf-text leading-tight truncate">
                                        {item.message || (item.source_type && `Event from ${item.source_type}`) || 'Activity observed'}
                                    </div>
                                    <div className="text-[9px] font-mono text-sf-muted mt-1 uppercase tracking-tight">SRC: {item.source_type || 'NET_01'}</div>
                                </motion.div>
                            ))}
                        </StaggerChildren>
                    </div>
                </PanelCard>
            </div>
        </div>
    );
}
