"use client";

import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
 ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
 ResponsiveContainer, Cell, ZAxis, ReferenceLine,
} from 'recharts';
import { PanelCard } from '@/components/ui/MotionWrappers';
import { Sparkles, Loader2 } from 'lucide-react';

// ── MITRE ATT&CK tactic ordering (left → right on timeline) ───────────────────
const MITRE_TACTIC_ORDER = [
 'Reconnaissance', 'Resource Development', 'Initial Access',
 'Execution', 'Persistence', 'Privilege Escalation',
 'Defense Evasion', 'Credential Access', 'Discovery',
 'Lateral Movement', 'Collection', 'Command and Control',
 'Exfiltration', 'Impact',
];

// ── Severity colors ────────────────────────────────────────────────────────────
const SEV_COLOR: Record<string, string> = {
 CRITICAL: '#ff003c',
 HIGH: '#f97316',
 WARN: '#ffee00',
 INFO: '#00f0ff',
};

// ── Interfaces ─────────────────────────────────────────────────────────────────
interface AttackTimelineProps {
 /** Array of log events from the incident detail page. */
 data: any[];
}

// ── Component ──────────────────────────────────────────────────────────────────
export function AttackTimeline({ data }: AttackTimelineProps) {
 const [aiSummary, setAiSummary] = useState<string | null>(null);
 const [aiLoading, setAiLoading] = useState(false);

 // ── Normalise events into chart points ─────────────────────────────────────
 const chartData = useMemo(() => {
 if (!data || data.length === 0) return [];
 return data.map(event => {
 const ipMeta = event.meta?.find((m: any) =>
 ['ip', 'src_ip', 'dst_ip'].includes(m.key)
 );
 const entity = ipMeta?.value ?? 'System';

 let ts = Date.now();
 if (event.rawJson?.timestamp) {
 ts = new Date(event.rawJson.timestamp).getTime();
 } else if (event.timestamp) {
 ts = new Date().setHours(
 parseInt(event.timestamp.split(':')[0] ?? '0'),
 parseInt(event.timestamp.split(':')[1] ?? '0'),
 parseInt(event.timestamp.split(':')[2] ?? '0'),
 );
 }

 return {
 id: event.id,
 x: ts,
 y: entity,
 level: event.level ?? 'INFO',
 message: event.message ?? '',
 tactic: event.tactic ?? null,
 cep_sequence_id: event.cep_sequence_id ?? null,
 value: 1,
 };
 }).sort((a, b) => a.x - b.x);
 }, [data]);

 const yCategories = useMemo(() =>
 Array.from(new Set(chartData.map(d => d.y))).sort(),
 [chartData],
 );

 // ── Identify distinct tactic transitions for MITRE labels ─────────────────
 const tacticBoundaries = useMemo(() => {
 const seen = new Set<string>();
 const boundaries: Array<{ x: number; tactic: string }> = [];
 for (const pt of chartData) {
 if (pt.tactic && !seen.has(pt.tactic)) {
 seen.add(pt.tactic);
 boundaries.push({ x: pt.x, tactic: pt.tactic });
 }
 }
 return boundaries;
 }, [chartData]);

 // ── CEP sequence groups (for bracket highlighting) ─────────────────────────
 const cepGroups = useMemo(() => {
 const groups: Record<string, typeof chartData> = {};
 for (const pt of chartData) {
 if (pt.cep_sequence_id) {
 (groups[pt.cep_sequence_id] ??= []).push(pt);
 }
 }
 return groups;
 }, [chartData]);

 // ── AI summary ─────────────────────────────────────────────────────────────
 const handleAiSummarize = async () => {
 setAiLoading(true);
 setAiSummary(null);
 try {
 const eventIds = chartData.slice(0, 50).map(p => p.id).filter(Boolean);
 const res = await fetch('/api/proxy/api/v1/narrative/generate', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ event_ids: eventIds, mode: 'timeline_summary' }),
 });
 if (!res.ok) throw new Error(`HTTP ${res.status}`);
 const json = await res.json();
 setAiSummary(json.narrative ?? json.summary ?? 'No summary available.');
 } catch (err: any) {
 setAiSummary(`AI summary unavailable: ${err.message}`);
 } finally {
 setAiLoading(false);
 }
 };

 // ── Tooltip ────────────────────────────────────────────────────────────────
 const CustomTooltip = ({ active, payload }: any) => {
 if (!active || !payload?.length) return null;
 const dp = payload[0].payload;
 return (
 <div className="bg-ng-base border border-ng-outline-dim/40 p-3  max-w-[300px]">
 <div className="font-mono text-[10px] text-ng-muted mb-1 flex justify-between gap-4">
 <span>{new Date(dp.x).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
 <span className={`font-bold ${dp.level === 'CRITICAL' ? 'text-ng-error' : dp.level === 'WARN' ? 'text-[#ffee00]' : 'text-ng-on'}`}>
 {dp.level}
 </span>
 </div>
 {dp.tactic && (
 <div className="font-mono text-[9px] text-ng-cyan mb-1">⚡ {dp.tactic}</div>
 )}
 {dp.cep_sequence_id && (
 <div className="font-mono text-[9px] text-[#f97316] mb-1">🔗 SEQ: {dp.cep_sequence_id.slice(0, 12)}…</div>
 )}
 <div className="font-mono text-[11px] text-ng-on mb-1">{dp.y}</div>
 <div className="font-mono text-[10px] text-ng-muted truncate">{dp.message}</div>
 </div>
 );
 };

 if (chartData.length === 0) {
 return (
 <div className="w-full h-full flex flex-col items-center justify-center bg-ng-mid/20 border-t border-ng-outline-dim/40 border-dashed p-8">
 <div className="w-1.5 h-1.5 bg-ng-muted/50 mb-3 rotate-45" />
 <span className="text-ng-muted tracking-widest text-[10px] font-mono uppercase">WAITING FOR TIMELINE DATA...</span>
 </div>
 );
 }

 return (
 <div className="w-full h-full bg-ng-base overflow-hidden relative flex flex-col">
 {/* AI summary button */}
 <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
 {aiSummary && (
 <div className="bg-ng-mid/90 border border-ng-cyan/50/30 px-3 py-2 text-ng-on text-[10px] font-mono max-w-[320px] ">
 {aiSummary}
 </div>
 )}
 <button
 onClick={handleAiSummarize}
 disabled={aiLoading}
 className="flex items-center gap-1 px-2 py-1 bg-ng-cyan-bright/10 hover:bg-ng-cyan-bright/20 border border-ng-cyan/50/30 text-ng-cyan text-[9px] font-mono tracking-widest uppercase transition-colors disabled:opacity-50"
 >
 {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
 AI
 </button>
 </div>

 {/* MITRE ATT&CK tactic labels */}
 {tacticBoundaries.length > 0 && (
 <div className="shrink-0 flex gap-1 px-[108px] pb-1 overflow-x-hidden">
 {tacticBoundaries.map(({ tactic }) => (
 <span
 key={tactic}
 className="text-[8px] font-mono text-ng-cyan/60 truncate bg-ng-cyan-bright/5 px-1 border-l border-ng-cyan/50/20"
 >
 {tactic}
 </span>
 ))}
 </div>
 )}

 {/* CEP sequence highlight badges */}
 {Object.keys(cepGroups).length > 0 && (
 <div className="shrink-0 flex gap-2 px-3 pb-1">
 {Object.entries(cepGroups).slice(0, 5).map(([seqId, pts]) => (
 <span
 key={seqId}
 className="flex items-center gap-1 px-2 py-0.5 bg-[#f97316]/10 border border-[#f97316]/30 text-[#f97316] text-[8px] font-mono"
 >
 🔗 CEP {seqId.slice(0, 8)}… <span className="text-ng-muted">({pts.length} events)</span>
 </span>
 ))}
 </div>
 )}

 {/* Chart */}
 <div className="flex-1 min-h-0">
 <ResponsiveContainer width="100%" height="100%">
 <ScatterChart margin={{ top: 10, right: 60, bottom: 20, left: 100 }}>
 <CartesianGrid strokeDasharray="3 3" stroke="#222" />
 <XAxis
 type="number"
 dataKey="x"
 name="Time"
 domain={['dataMin - 1000', 'dataMax + 1000']}
 tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
 stroke="#444"
 tick={{ fill: '#666', fontSize: 10, fontFamily: 'monospace' }}
 dy={10}
 />
 <YAxis
 type="category"
 dataKey="y"
 name="Entity"
 allowDuplicatedCategory={false}
 stroke="#444"
 tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }}
 width={90}
 />
 <ZAxis type="number" dataKey="value" range={[80, 80]} />
 <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#555' }} />

 {/* Tactic boundary reference lines */}
 {tacticBoundaries.map(({ x, tactic }) => (
 <ReferenceLine
 key={`tactic-${x}`}
 x={x}
 stroke="#0d9488"
 strokeDasharray="4 4"
 strokeOpacity={0.35}
 />
 ))}

 <Scatter name="Events" data={chartData}>
 {chartData.map((entry, index) => (
 <Cell
 key={`cell-${index}`}
 fill={
 entry.cep_sequence_id
 ? '#f97316' // CEP sequence events highlighted orange
 : SEV_COLOR[entry.level] ?? '#00f0ff'
 }
 className="transition-all hover:opacity-80"
 />
 ))}
 </Scatter>
 </ScatterChart>
 </ResponsiveContainer>
 </div>
 </div>
 );
}
