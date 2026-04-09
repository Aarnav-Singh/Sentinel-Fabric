"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Activity, Terminal, Zap, Cpu, Maximize2 } from "lucide-react";
import { PanelCard } from "@/components/ui/MotionWrappers";
import { DataGrid } from "@/components/ui/DataGrid";
import { MitreHeatmap } from "@/components/features/compliance/MitreHeatmap";
import { DashboardModeProps } from './types';
import { Badge } from '@/components/ui/Badge';

// ── CodeMirror 6 ──────────────────────────────────────────────────────────────
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';

// ── UQL Editor ────────────────────────────────────────────────────────────────

interface UQLEditorProps {
    value: string;
    onChange: (v: string) => void;
    onRun: () => void;
}

function UQLEditor({ value, onChange, onRun }: UQLEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);

    const runRef = useRef(onRun);
    runRef.current = onRun;

    useEffect(() => {
        if (!containerRef.current) return;

        const runCmd = ({ state }: { state: EditorState }) => {
            runRef.current();
            return true;
        };

        const state = EditorState.create({
            doc: value,
            extensions: [
                oneDark,
                sql(),                    // enables UQL keyword highlighting via SQL grammar
                history(),
                keymap.of([
                    ...defaultKeymap,
                    ...historyKeymap,
                    { key: 'Mod-Enter', run: runCmd },   // Ctrl/Cmd+Enter → run query
                    { key: 'Shift-Enter', run: runCmd },
                ]),
                cmPlaceholder('UQL: ml_score > 0.8 AND tactic = "Lateral Movement" | source = "crowdstrike" LAST 1h'),
                EditorView.updateListener.of(update => {
                    if (update.docChanged) {
                        onChange(update.state.doc.toString());
                    }
                }),
                EditorView.theme({
                    '&': { background: 'transparent', height: '100%' },
                    '.cm-content': { fontFamily: 'monospace', fontSize: '12px', padding: '8px 0' },
                    '.cm-line': { padding: '0 8px' },
                    '.cm-gutters': { display: 'none' },
                    '.cm-focused': { outline: 'none' },
                    '.cm-scroller': { overflow: 'hidden' },
                }),
                EditorView.lineWrapping,
            ],
        });

        viewRef.current = new EditorView({ state, parent: containerRef.current });
        return () => { viewRef.current?.destroy(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            ref={containerRef}
            className="flex-1 h-full font-mono text-sm focus-within:outline-none"
            style={{ minWidth: 0 }}
        />
    );
}

// ── HunterMode Component ───────────────────────────────────────────────────────

export function HunterMode({ liveFeed, eventsRate, setMaximizedWidget }: DashboardModeProps) {
    const [query, setQuery] = useState('');
    const [similarityQuery, setSimilarityQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [queryError, setQueryError] = useState<string | null>(null);

    const handleRunQuery = useCallback(async () => {
        if (!query.trim()) return;
        setIsRunning(true);
        setQueryError(null);
        try {
            const res = await fetch('/api/proxy/api/v1/hunt/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setResults(data.results ?? []);
        } catch (err: any) {
            setQueryError(err.message ?? 'Query failed');
        } finally {
            setIsRunning(false);
        }
    }, [query]);

    return (
        <div className="flex flex-col gap-4 h-full w-full relative">
            {/* ── Top bar: UQL Editor + EPS counter ─────────────────────── */}
            <div className="flex gap-4 shrink-0">
                <PanelCard className="flex-1 p-0 flex items-stretch border-sf-accent/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-r border-sf-border shrink-0">
                        <Terminal className="w-4 h-4 text-sf-accent" />
                        <span className="text-[9px] font-mono tracking-widest text-sf-muted uppercase">UQL</span>
                    </div>
                    <div className="flex-1 flex items-center overflow-hidden">
                        <UQLEditor value={query} onChange={setQuery} onRun={handleRunQuery} />
                    </div>
                    <button
                        onClick={handleRunQuery}
                        disabled={isRunning || !query.trim()}
                        className="px-4 flex items-center gap-2 bg-sf-accent/10 hover:bg-sf-accent/20 border-l border-sf-border text-sf-accent text-[10px] font-mono tracking-widest uppercase transition-colors disabled:opacity-40 shrink-0"
                    >
                        {isRunning ? (
                            <span className="sf-shimmer w-12 h-3 block" />
                        ) : (
                            <><Zap className="w-3 h-3" /> RUN</>
                        )}
                    </button>
                </PanelCard>

                <PanelCard className="p-4 flex items-center justify-center min-w-[180px]">
                    <div className="flex items-center gap-3">
                        <Activity className="w-5 h-5 text-sf-accent" />
                        <span className="text-2xl font-mono text-sf-text">
                            {eventsRate} <span className="text-xs text-sf-muted">EPS</span>
                        </span>
                    </div>
                </PanelCard>
            </div>

            {/* ── Similarity search bar ──────────────────────────────────── */}
            <PanelCard className="shrink-0 p-2 flex items-center gap-3 border-sf-accent/10">
                <Search className="w-3.5 h-3.5 text-sf-muted shrink-0 ml-1" />
                <input
                    type="text"
                    className="flex-1 bg-transparent border-none text-sf-text font-mono text-xs focus:outline-none placeholder:text-sf-muted/40"
                    placeholder="Semantic similarity search (Qdrant): describe an entity, e.g. 'lateral movement via PSExec'"
                    value={similarityQuery}
                    onChange={e => setSimilarityQuery(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && similarityQuery.trim()) {
                            setQuery(`semantic_search("${similarityQuery.trim()}")`);
                            setTimeout(handleRunQuery, 50);
                        }
                    }}
                />
                <span className="text-[9px] font-mono text-sf-muted/50 shrink-0 pr-1">↵ to search</span>
            </PanelCard>

            {queryError && (
                <div className="shrink-0 bg-sf-critical/10 border border-sf-critical/30 px-3 py-2 text-sf-critical text-[10px] font-mono">
                    ERROR: {queryError}
                </div>
            )}

            {/* ── Main content area ──────────────────────────────────────── */}
            <div className="flex-1 flex gap-4 min-h-0">
                {/* MITRE heatmap */}
                <PanelCard className="flex-1 relative overflow-hidden flex flex-col p-4 bg-sf-bg">
                    <div className="mb-4 shrink-0 flex justify-between items-center">
                        <h2 className="text-[10px] text-sf-muted font-mono tracking-widest uppercase">
                            MITRE ATT&CK Enterprise Coverage
                        </h2>
                        <button 
                            onClick={() => setMaximizedWidget('map')} 
                            className="text-sf-muted hover:text-white transition-colors bg-sf-bg/80 backdrop-blur border border-sf-border p-1.5 rounded hover:bg-sf-surface"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <div className="flex-1 w-full overflow-hidden relative">
                        <MitreHeatmap />
                    </div>
                </PanelCard>

                {/* Query results / live feed */}
                <PanelCard className="w-[400px] flex flex-col overflow-hidden hidden xl:flex relative">
                    <div className="p-3 border-b border-sf-border bg-sf-surface shrink-0 flex items-center justify-between">
                        <div className="flex items-center">
                            <Cpu className="w-3.5 h-3.5 text-sf-muted mr-2" />
                            <span className="text-[10px] font-mono tracking-widest text-sf-muted uppercase">
                                {results.length > 0 ? `QUERY RESULTS (${results.length})` : 'REAL-TIME FEED'}
                            </span>
                        </div>
                        {results.length > 0 && (
                            <button
                                onClick={() => setResults([])}
                                className="text-[9px] font-mono text-sf-muted/60 hover:text-sf-muted transition-colors"
                            >
                                CLEAR
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto w-full">
                        <DataGrid
                            data={results.length > 0 ? results.slice(0, 200) : liveFeed.slice(0, 50)}
                            rowKey="id"
                            columns={[
                                {
                                    header: 'TIME',
                                    key: 'timestamp',
                                    render: (val) => (
                                        <span className="font-mono text-[9px] text-sf-muted">
                                            {val ? new Date(val).toISOString().split('T')[1].slice(0, 8) : '--'}
                                        </span>
                                    ),
                                },
                                {
                                    header: 'SEV',
                                    key: 'severity',
                                    render: (val) => (
                                        <Badge
                                            label={val as string}
                                            severity={(['critical', 'high', 'medium', 'low'].includes(val as string) ? val : 'info') as any}
                                        />
                                    ),
                                },
                                {
                                    header: 'PAYLOAD',
                                    key: 'message',
                                    render: (val, item: any) => (
                                        <span className="font-mono text-[9px] text-sf-text truncate block max-w-[200px]">
                                            {val || item.action || '—'}
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </div>
                </PanelCard>
            </div>
        </div>
    );
}
