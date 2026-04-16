"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Terminal, X, Share2, ShieldAlert, Activity, Search, ChevronDown, ChevronUp, Loader2, Crosshair, History, Wand2 } from 'lucide-react';
import { useEventStream } from "@/contexts/EventStreamContext";
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedNumber, PanelCard } from '@/components/ui/MotionWrappers';
import { DataGrid } from '@/components/ui/DataGrid';
import { VirtualDataGrid } from '@/components/ui/VirtualDataGrid';
import { EntityLink } from '@/components/ui/EntityLink';
import { MlScoreBadge } from '@/components/ui/MlScoreBadge';
import { DataFreshness } from '@/components/ui/DataFreshness';
import { QuickActions } from '@/components/features/actions/QuickActions';
import { Badge } from '@/components/ui/Badge';
import { AttackTimeline } from '@/components/features/investigation/AttackTimeline';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { SyntaxHighlightedJson } from '@/components/ui/SyntaxHighlightedJson';

// ── UQL Threat Hunt Panel ─────────────────────────────────────────────────────

type HuntMode = 'uql' | 'nl';

interface HuntResult {
  uql: string;
  mode: string;
  results: any[];
  qdrant_results: any[];
  result_count: number;
  execution_ms: number;
  errors: string[];
}

interface HuntHistoryItem {
  id: string;
  query_text: string;
  query_mode: string;
  uql_output: string | null;
  result_count: number | null;
  executed_at: string | null;
}

const UQL_PLACEHOLDER = `ml_score > 0.8 and tactic = "lateral-movement"`;
const NL_PLACEHOLDER = `Find lateral movement after credential access within 15 minutes`;

const UQL_SYNTAX_HINTS = [
  `ml_score > 0.8`,
  `tactic = "lateral-movement"`,
  `source_type = "crowdstrike"`,
  `similar("cobalt strike beacon", threshold=0.85)`,
  `sequence on src_ip [tactic = "discovery", tactic = "credential-access"] maxspan=15m`,
];

function HuntPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<HuntMode>('uql');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HuntResult | null>(null);
  const [history, setHistory] = useState<HuntHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  // Load hunt history on open
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/proxy/api/v1/hunt/history/')
      .then(r => r.ok ? r.json() : [])
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [isOpen]);

  // Close history dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const executeHunt = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch('/api/proxy/api/v1/hunt/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), mode, limit: 100 }),
      });
      const data: HuntResult = await resp.json();
      setResult(data);
      // Refresh history
      fetch('/api/proxy/api/v1/hunt/history/')
        .then(r => r.ok ? r.json() : [])
        .then(setHistory)
        .catch(() => {});
    } catch (e) {
      setResult({ uql: query, mode, results: [], qdrant_results: [], result_count: 0, execution_ms: 0, errors: [`Network error: ${e}`] });
    } finally {
      setLoading(false);
    }
  }, [query, mode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      executeHunt();
    }
  };

  return (
    <div className="shrink-0">
      {/* Hunt Toggle Header */}
      <button
        id="hunt-panel-toggle"
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2 border border-sf-border bg-sf-surface hover:bg-sf-bg transition-colors text-left"
      >
        <Crosshair className="w-3.5 h-3.5 text-sf-accent" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-sf-text flex-1">
          Threat Hunt
        </span>
        <span className="text-[9px] font-mono text-sf-muted uppercase tracking-widest">
          {isOpen ? 'COLLAPSE' : 'EXPAND'} · UQL + NL
        </span>
        {isOpen ? <ChevronUp className="w-3 h-3 text-sf-muted" /> : <ChevronDown className="w-3 h-3 text-sf-muted" />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="hunt-panel-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-x border-b border-sf-border bg-sf-bg"
          >
            <div className="p-4 flex flex-col gap-3">
              {/* Mode Tabs + History */}
              <div className="flex items-center gap-3">
                <div className="flex border border-sf-border">
                  <button
                    id="hunt-mode-uql"
                    onClick={() => setMode('uql')}
                    className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest transition-colors ${mode === 'uql' ? 'bg-sf-accent/20 text-sf-accent border-r border-sf-border' : 'text-sf-muted hover:text-sf-text border-r border-sf-border'}`}
                  >
                    UQL
                  </button>
                  <button
                    id="hunt-mode-nl"
                    onClick={() => setMode('nl')}
                    className={`px-3 py-1 text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center gap-1 ${mode === 'nl' ? 'bg-sf-accent/20 text-sf-accent' : 'text-sf-muted hover:text-sf-text'}`}
                  >
                    <Wand2 className="w-2.5 h-2.5" />
                    Natural Language
                  </button>
                </div>

                {/* History Dropdown */}
                <div className="relative" ref={historyRef}>
                  <button
                    id="hunt-history-toggle"
                    onClick={() => setHistoryOpen(v => !v)}
                    className="flex items-center gap-1.5 px-2 py-1 border border-sf-border bg-sf-surface text-sf-muted hover:text-sf-text text-[10px] font-mono uppercase tracking-widest transition-colors"
                  >
                    <History className="w-2.5 h-2.5" />
                    History
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>
                  <AnimatePresence>
                    {historyOpen && history.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 mt-1 w-96 bg-sf-bg border border-sf-border shadow-xl z-50 overflow-hidden"
                      >
                        {history.slice(0, 10).map(item => (
                          <button
                            key={item.id}
                            className="w-full text-left px-3 py-2 hover:bg-sf-surface border-b border-sf-border last:border-b-0 transition-colors"
                            onClick={() => {
                              setQuery(item.query_text);
                              setMode(item.query_mode === 'nl' ? 'nl' : 'uql');
                              setHistoryOpen(false);
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[8px] font-mono uppercase tracking-widest px-1 py-0.5 border ${item.query_mode === 'nl' ? 'border-sf-accent/50 text-sf-accent' : 'border-sf-border text-sf-muted'}`}>
                                {item.query_mode}
                              </span>
                              {item.result_count != null && (
                                <span className="text-[8px] font-mono text-sf-muted">{item.result_count} results</span>
                              )}
                              <span className="text-[8px] font-mono text-sf-muted ml-auto">{item.executed_at?.split('T')[0]}</span>
                            </div>
                            <div className="text-[10px] font-mono text-sf-text truncate">{item.query_text}</div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="ml-auto text-[9px] font-mono text-sf-muted uppercase tracking-widest">
                  {mode === 'uql' ? 'Ctrl+Enter to run' : 'AI translates → UQL → executes'}
                </div>
              </div>

              {/* Query Input */}
              <div className="relative">
                {mode === 'uql' ? (
                  <textarea
                    id="hunt-uql-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={UQL_PLACEHOLDER}
                    rows={2}
                    className="w-full bg-black border border-sf-border text-sf-safe font-mono text-[12px] px-3 py-2 resize-none focus:outline-none focus:border-sf-accent/60 placeholder:text-sf-muted/40 custom-scrollbar"
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}
                    spellCheck={false}
                  />
                ) : (
                  <textarea
                    id="hunt-nl-input"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={NL_PLACEHOLDER}
                    rows={2}
                    className="w-full bg-sf-surface border border-sf-border text-sf-text font-sans text-[12px] px-3 py-2 resize-none focus:outline-none focus:border-sf-accent/60 placeholder:text-sf-muted/40"
                    spellCheck={false}
                  />
                )}
              </div>

              {/* UQL Syntax Hints (UQL mode only) */}
              {mode === 'uql' && (
                <div className="flex gap-1.5 flex-wrap">
                  {UQL_SYNTAX_HINTS.map((hint, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(hint)}
                      className="text-[9px] font-mono text-sf-muted border border-sf-border px-1.5 py-0.5 hover:border-sf-accent/50 hover:text-sf-accent transition-colors"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              )}

              {/* Execute Button */}
              <div className="flex items-center gap-3">
                <button
                  id="hunt-execute-btn"
                  onClick={executeHunt}
                  disabled={loading || !query.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-sf-accent/10 border border-sf-accent/40 text-sf-accent hover:bg-sf-accent/20 font-mono text-[10px] uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> EXECUTING…</>
                  ) : (
                    <><Search className="w-3 h-3" /> EXECUTE HUNT</>
                  )}
                </button>
                {result && (
                  <span className="text-[10px] font-mono text-sf-muted">
                    {result.result_count} results · {result.execution_ms}ms
                    {result.mode === 'nl' && (
                      <span className="ml-2 text-sf-accent">→ <code className="text-sf-safe">{result.uql}</code></span>
                    )}
                  </span>
                )}
              </div>

              {/* Errors */}
              {result?.errors && result.errors.length > 0 && (
                <div className="border border-sf-critical/40 bg-sf-critical/10 px-3 py-2 text-[10px] font-mono text-sf-critical">
                  {result.errors.join(' · ')}
                </div>
              )}

              {/* Results Table */}
              <AnimatePresence>
                {result && result.results.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border border-sf-accent/30 bg-black/30">
                      <div className="px-3 py-1.5 border-b border-sf-border bg-sf-surface flex items-center gap-2">
                        <Crosshair className="w-3 h-3 text-sf-accent" />
                        <span className="text-[9px] font-mono uppercase tracking-widest text-sf-accent">Hunt Results</span>
                        <span className="text-[9px] font-mono text-sf-muted ml-auto">{result.results.length} events</span>
                      </div>
                      <div className="overflow-auto max-h-60 custom-scrollbar">
                        <table className="w-full text-[10px] font-mono">
                          <thead>
                            <tr className="border-b border-sf-border">
                              <th className="text-left px-3 py-1 text-sf-muted uppercase tracking-widest">Time</th>
                              <th className="text-left px-3 py-1 text-sf-muted uppercase tracking-widest">Source</th>
                              <th className="text-left px-3 py-1 text-sf-muted uppercase tracking-widest">Message</th>
                              <th className="text-right px-3 py-1 text-sf-muted uppercase tracking-widest">ML Score</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.results.slice(0, 50).map((row: any, i: number) => (
                              <tr key={i} className="border-b border-sf-border/30 hover:bg-sf-surface/30 transition-colors">
                                <td className="px-3 py-1 text-sf-muted whitespace-nowrap">
                                  {row.timestamp ? new Date(row.timestamp).toLocaleTimeString('en-US', { hour12: false }) : '—'}
                                </td>
                                <td className="px-3 py-1 text-sf-text/70">{row.source_type || '—'}</td>
                                <td className="px-3 py-1 text-sf-text whitespace-pre-wrap leading-relaxed">{row.message || row.action || '—'}</td>
                                <td className="px-3 py-1 text-right">
                                  {row.meta_score != null ? <MlScoreBadge score={row.meta_score} /> : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LogEvent { id: string; timestamp: string; level: "INFO" | "CRITICAL" | "WARN"; message: string; meta: { key: string, value: string }[]; rawJson: any; }

const DEMO_LOGS: LogEvent[] = [
    {
        id: "EV-001",
        timestamp: "14:02:44.921",
        level: "INFO",
        message: "POST /api/v2/auth/validate HTTP/1.1 - Origin: 192.168.1.44 - UserAgent: Mozilla/5.0...",
        meta: [{ key: "source", value: "external" }, { key: "cluster", value: "node-04" }, { key: "scr", value: "0.15" }],
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
    if (event.src_ip) meta.push({ key: "ip", value: String(event.src_ip) });
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
    const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
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
        <div className="flex-1 overflow-hidden p-6 bg-transparent flex flex-col min-h-0 relative">
            <AmbientBackground variant="frequency" />
            <div className="flex flex-col gap-4 w-full h-full max-w-[1600px] mx-auto min-h-0 relative z-10">
                {/* UQL Threat Hunt Panel */}
                <HuntPanel />

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
                           <div className="flex border border-sf-border bg-sf-bg ml-4">
                                <button 
                                    className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors ${viewMode === 'list' ? 'bg-sf-surface text-sf-text' : 'text-sf-muted hover:bg-sf-surface/50 hover:text-sf-text'}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    LIST
                                </button>
                                <button 
                                    className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest transition-colors border-l border-sf-border ${viewMode === 'timeline' ? 'bg-sf-surface text-sf-text' : 'text-sf-muted hover:bg-sf-surface/50 hover:text-sf-text'}`}
                                    onClick={() => setViewMode('timeline')}
                                >
                                    TIMELINE
                                </button>
                           </div>
                      </div>
                </div>

                {/* Raw Events DataGrid */}
                <PanelCard className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="px-4 py-2 border-b border-sf-border bg-sf-surface shrink-0 flex items-center">
                        <Terminal className="w-3 h-3 text-sf-muted mr-2" />
                        <h2 className="text-[10px] font-mono tracking-widest text-sf-muted uppercase flex-1">
                            {viewMode === 'list' ? 'Live Event Stream' : 'Attack Timeline'}
                        </h2>
                        <DataFreshness lastUpdated={lastEvent?.timestamp ? new Date(String(lastEvent.timestamp)).getTime() : Date.now()} showProgressBar={false} />
                    </div>
                    <div className="flex-1 overflow-auto p-2 min-h-[300px]">
                         {viewMode === 'list' ? (
                             <VirtualDataGrid 
                            data={allLogs}
                            rowKey="id"
                            onRowClick={(row) => setSelectedLog(row)}
                            columns={[
                                {
                                    header: "TIME",
                                    key: "timestamp",
                                    width: "90px",
                                    render: (val) => <span className="font-mono text-[10px] text-sf-muted">{val}</span>
                                },
                                {
                                    header: "LVL",
                                    key: "level",
                                    width: "80px",
                                    render: (val) => {
                                        const severityMap: Record<string, "critical" | "high" | "info"> = {
                                            'CRITICAL': 'critical',
                                            'WARN': 'high',
                                            'INFO': 'info'
                                        };
                                        return <Badge label={val as string} severity={severityMap[val as string] || 'info'} />;
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
                                    width: "350px",
                                    render: (val: any[]) => (
                                        <div className="flex flex-wrap justify-end gap-1 items-center">
                                            {val.map((m, i) => (
                                                <span key={i} className="text-[9px] font-mono uppercase tracking-widest text-sf-muted border border-sf-border px-1 flex items-center h-5">
                                                    <span className="text-sf-accent/70 mr-1">{m.key}:</span>
                                                    {m.key === 'scr' ? (
                                                        <MlScoreBadge score={parseFloat(m.value)} />
                                                    ) : (m.key === 'ip' || m.key === 'src_ip' || m.key === 'dst_ip') ? (
                                                        <EntityLink type="ip" value={m.value} className="text-[9px]" />
                                                    ) : (
                                                        m.value
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    )
                                },
                                {
                                    header: "",
                                    key: "meta",
                                    align: "right",
                                    width: "60px",
                                    render: (val: any[], item) => {
                                        const ipMeta = val.find(m => m.key === 'ip' || m.key === 'src_ip' || m.key === 'dst_ip');
                                        if (ipMeta) {
                                            return (
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                                    <QuickActions entityType="ip" entityId={ipMeta.value} />
                                                </div>
                                            );
                                        }
                                        return null;
                                    }
                                }
                            ]}
                         />
                         ) : (
                             <AttackTimeline data={allLogs} />
                         )}
                    </div>
                </PanelCard>
            </div>

            {/* Drawer */}
            <AnimatePresence>
            {selectedLog && (
                <motion.div
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute top-0 right-0 bottom-0 w-full md:w-[600px] z-50 flex flex-col bg-sf-surface shadow-[-20px_0_40px_rgba(0,0,0,0.5)] border-l border-sf-border"
                >
                    <div className="flex justify-between items-center px-4 py-3 border-b border-sf-border bg-sf-surface shrink-0">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-sf-accent" />
                            <h4 className="text-sf-text text-[11px] font-mono uppercase tracking-widest">Payload Inspector</h4>
                            <span className="text-[10px] font-mono text-sf-muted ml-2">{selectedLog.id}</span>
                        </div>
                        <button onClick={() => setSelectedLog(null)} className="text-sf-muted hover:text-sf-text transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="px-4 py-3 border-b border-sf-border bg-sf-bg shrink-0">
                        <div className="font-mono text-[11px] text-sf-text whitespace-pre-wrap break-words leading-relaxed select-text">
                            {selectedLog.message}
                        </div>
                    </div>

                    <div className="flex-1 bg-black p-4 overflow-auto custom-scrollbar relative">
                        <SyntaxHighlightedJson data={selectedLog.rawJson} />
                    </div>

                    <div className="p-3 flex gap-3 border-t border-sf-border bg-sf-surface shrink-0">
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

            {/* Backdrop */}
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
