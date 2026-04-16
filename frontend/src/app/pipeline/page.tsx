"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Database, Network, BrainCircuit, Gauge, CheckCircle, Cpu, Activity, Zap, GitBranch, Shield, Eye, Cloud, Terminal, FileText, Wifi } from 'lucide-react';
import useSWR from 'swr';
import { useEventStream } from "@/contexts/EventStreamContext";
import { PanelCard, AnimatedNumber, StaggerChildren } from '@/components/ui/MotionWrappers';
import { DataGrid } from '@/components/ui/DataGrid';
import { AmbientBackground } from '@/components/ui/AmbientBackground';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Types ───────────────────────────────────────────────
interface StreamInfo { score?: number; weight?: number; status?: string; active?: boolean; }
interface PipelineStatus {
  events_processed: number;
  avg_duration_ms: number;
  streams: {
    ensemble?: StreamInfo;
    vae?: StreamInfo;
    hst?: StreamInfo;
    temporal?: StreamInfo;
    adversarial?: StreamInfo;
    meta_learner?: StreamInfo;
  };
}
interface ModelInfo { name: string; version: string; status: string; accuracy?: number; last_trained?: string; }
interface ModelsResponse { models: ModelInfo[]; }
interface NeuralLogEntry { timestamp: string; type: 'INFERENCE' | 'LOSS' | 'DATA' | 'WARN' | 'SYSTEM' | 'SCORE'; message: string; status?: 'FLAGGED' | 'CLEAN' | 'WARN'; score?: number; }

const DEMO_STATUS: PipelineStatus = {
  events_processed: 142897,
  avg_duration_ms: 14,
  streams: {
    ensemble: { score: 0.87, weight: 0.3, status: 'active', active: true },
    vae: { score: 0.72, weight: 0.2, status: 'active', active: true },
    hst: { score: 0.91, weight: 0.15, status: 'active', active: true },
    temporal: { score: 0.65, weight: 0.2, status: 'degraded', active: true },
    adversarial: { score: 0.88, weight: 0.1, status: 'active', active: true },
    meta_learner: { score: 0.93, weight: 0.05, status: 'active', active: true },
  },
};

const DEMO_MODELS: ModelInfo[] = [
  { name: 'Ensemble Detector', version: 'v2.4.1', status: 'serving', accuracy: 98.4, last_trained: '2026-03-08' },
  { name: 'VAE Anomaly', version: 'v1.9.0', status: 'serving', accuracy: 94.1, last_trained: '2026-03-07' },
  { name: 'HST Classifier', version: 'v3.1.2', status: 'serving', accuracy: 97.2, last_trained: '2026-03-09' },
  { name: 'Temporal RNN', version: 'v2.0.0', status: 'degraded', accuracy: 89.0, last_trained: '2026-03-01' },
  { name: 'Adversarial GAN', version: 'v1.2.3', status: 'serving', accuracy: 92.7, last_trained: '2026-03-08' },
];

const STREAM_LABELS: Record<string, string> = { ensemble: 'Ensemble', vae: 'VAE', hst: 'HST', temporal: 'Temporal', adversarial: 'Adversarial', meta_learner: 'Meta-Learner' };
const STREAM_ICONS: Record<string, React.ElementType> = { ensemble: BrainCircuit, vae: Activity, hst: Gauge, temporal: GitBranch, adversarial: Zap, meta_learner: Network };

const GRAPH_NODES = {
  ingestors: [
    { id: 'zeek', label: 'ZEEK NIDS', icon: Eye, x: 15, y: 20 },
    { id: 'suricata', label: 'SURICATA', icon: Shield, x: 15, y: 40 },
    { id: 'aws', label: 'AWS TRAIL', icon: Cloud, x: 15, y: 60 },
    { id: 'syslog', label: 'SYSLOG', icon: Terminal, x: 15, y: 80 },
  ],
  extractors: [
    { id: 'netflow', label: 'PCAP/NETFLOW', icon: Wifi, x: 50, y: 30 },
    { id: 'logext', label: 'LOG EXTRACTOR', icon: FileText, x: 50, y: 70 },
  ],
  models: [
    { id: 'vae', label: 'VAE ANOMALY', icon: Activity, x: 85, y: 15 },
    { id: 'hst', label: 'HST CLASS', icon: Gauge, x: 85, y: 33 },
    { id: 'temporal', label: 'TEMP RNN', icon: GitBranch, x: 85, y: 50 },
    { id: 'adversarial', label: 'ADV GAN', icon: Zap, x: 85, y: 68 },
    { id: 'ensemble', label: 'ENSEMBLE', icon: BrainCircuit, x: 85, y: 85 },
  ]
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function MLPipelinePage() {
  const [neuralLog, setNeuralLog] = useState<NeuralLogEntry[]>([
    { timestamp: '14:02:41', type: 'INFERENCE', message: 'Pipeline initialized — awaiting live events', status: 'CLEAN' },
  ]);
  const [pulses, setPulses] = useState<{ id: string; source: string; ext: string; mod: string }[]>([]);

  const { data: statusData, isLoading: statusLoading } = useSWR<PipelineStatus>('/api/proxy/api/v1/pipeline/status', fetcher, { refreshInterval: 5000 });
  const { data: modelsData, isLoading: modelsLoading } = useSWR<ModelsResponse>('/api/proxy/api/v1/pipeline/models', fetcher, { refreshInterval: 30000 });
  const { data: connectorsData } = useSWR("/api/proxy/api/v1/admin/connectors", fetcher);

  const pipelineStatus = statusData ?? DEMO_STATUS;
  const models = modelsData?.models ?? DEMO_MODELS;
  const streams = pipelineStatus.streams ?? {};
  
  const isDemo = !statusData && !statusLoading;
  const isDemoModels = !modelsData && !modelsLoading;

  const graphNodes = React.useMemo(() => {
    return connectorsData?.connectors ?? connectorsData ?? GRAPH_NODES;
  }, [connectorsData]);

  const currentConnections = React.useMemo(() => {
    const conns: { id: string, from: any; to: any }[] = [];
    if (graphNodes.ingestors && graphNodes.extractors) {
      graphNodes.ingestors.forEach((ing: any) => {
        graphNodes.extractors.forEach((ext: any) => {
          conns.push({ id: `${ing.id}-${ext.id}`, from: ing, to: ext });
        });
      });
    }
    if (graphNodes.extractors && graphNodes.models) {
      graphNodes.extractors.forEach((ext: any) => {
        graphNodes.models.forEach((mod: any) => {
          conns.push({ id: `${ext.id}-${mod.id}`, from: ext, to: mod });
        });
      });
    }
    return conns;
  }, [graphNodes]);

  const handleLiveEvent = useCallback((event: Record<string, unknown>) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    const scores = event.ml_scores as Record<string, number> | undefined;
    const metaScore = scores?.meta_score ?? 0;
    const severity = (event.severity as string) || 'low';
    const isFlagged = metaScore > 0.7 || severity === 'critical' || severity === 'high';
    const sourceType = (event.source_type as string) || 'UNKNOWN';
    const evId = ((event.event_id as string) || '').slice(0, 8);
    
    if (!evId) {
        setNeuralLog(prev => [{
            timestamp: ts,
            type: 'SYSTEM' as const,
            message: `[HEARTBEAT] Connection active — ping verified`,
            status: 'CLEAN' as const
        }, ...prev].slice(0, 50));
        return;
    }

    const entry: NeuralLogEntry = {
      timestamp: ts,
      type: isFlagged ? 'INFERENCE' : 'DATA',
      message: `[${sourceType.toUpperCase()}] ID:${evId} SCORE:${metaScore.toFixed(3)} ${isFlagged ? 'FLAGGED' : 'CLEAN'}`,
      status: isFlagged ? 'FLAGGED' : 'CLEAN',
      score: metaScore,
    };

    setNeuralLog(prev => [entry, ...prev].slice(0, 50));

    const sType = sourceType.toLowerCase();
    const sourceMap: Record<string, string> = { zeek: 'zeek', suricata: 'suricata', aws: 'aws', syslog: 'syslog' };
    const ingestorsInfo = graphNodes.ingestors || GRAPH_NODES.ingestors;
    const extractorsInfo = graphNodes.extractors || GRAPH_NODES.extractors;
    const modelsInfo = graphNodes.models || GRAPH_NODES.models;
    const matchedSourceId = Object.keys(sourceMap).find(k => sType.includes(k)) || ingestorsInfo[Math.floor(Math.random() * ingestorsInfo.length)].id;
    const extId = extractorsInfo[Math.floor(Math.random() * extractorsInfo.length)].id;
    const modId = modelsInfo[Math.floor(Math.random() * modelsInfo.length)].id;

    const newPulse = { id: Date.now().toString() + Math.random(), source: matchedSourceId, ext: extId, mod: modId };
    setPulses(p => [...p, newPulse]);
    setTimeout(() => { setPulses(p => p.filter(pulse => pulse.id !== newPulse.id)); }, 300);
  }, []);

  const { lastEvent } = useEventStream();
  useEffect(() => {
    if (lastEvent) {
      handleLiveEvent(lastEvent);
    }
  }, [lastEvent, handleLiveEvent]);

  const avgAccuracy = models.length ? models.reduce((sum, m) => sum + (m.accuracy ?? 0), 0) / models.length : 98.4;
  const servingCount = models.filter(m => m.status === 'serving').length;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-transparent relative flex flex-col min-h-0">
      <AmbientBackground variant="pipeline" />
      <div className="relative z-10 flex flex-col flex-1 p-6">
      {/* KPI TOP ROW */}
      <div className="flex shrink-0 gap-4 mb-4">
        <PanelCard className="flex-1 p-3 flex flex-col gap-1">
            <span className="text-[10px] text-sf-muted font-mono tracking-widest">AVG LATENCY</span>
            <div className="text-2xl font-mono text-sf-text">
                {pipelineStatus.avg_duration_ms != null && !isNaN(Number(pipelineStatus.avg_duration_ms)) ? (
                    <>{pipelineStatus.avg_duration_ms}<span className="text-sm text-sf-muted ml-0.5">MS</span></>
                ) : (
                    "—"
                )}
            </div>
        </PanelCard>
        <PanelCard className="flex-1 p-3 flex flex-col gap-1">
            <span className="text-[10px] text-sf-muted font-mono tracking-widest">AVG ACCURACY</span>
            <div className="text-2xl font-mono text-sf-text">{avgAccuracy.toFixed(1)}<span className="text-sm text-sf-muted ml-0.5">%</span></div>
        </PanelCard>
         <PanelCard className="flex-1 p-3 flex flex-col gap-1">
            <span className="text-[10px] text-sf-muted font-mono tracking-widest">MODELS SERVING</span>
            <div className="text-2xl font-mono text-sf-text">{servingCount}<span className="text-sm text-sf-muted ml-0.5">/{models.length}</span></div>
        </PanelCard>
        <PanelCard className="flex-1 p-3 flex flex-col gap-1">
            <span className="text-[10px] text-sf-muted font-mono tracking-widest">EVENTS PROCESSED</span>
            <div className="text-2xl font-mono text-sf-text">
                {Number.isFinite(Number(pipelineStatus.events_processed)) ? (
                    <AnimatedNumber value={Number(pipelineStatus.events_processed) || 0} />
                ) : (
                    "—"
                )}
            </div>
        </PanelCard>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 flex flex-col gap-4">
            
            {/* Visualizer Panel */}
            <PanelCard className="flex-[2] relative overflow-hidden flex flex-col p-4">
                <div className="absolute top-3 left-3 z-20 bg-sf-surface border border-sf-border px-2 py-0.5">
                    <span className="text-[10px] text-sf-accent font-mono tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-sf-accent animate-pulse-fast border border-sf-bg" /> INFERENCE TOPOLOGY
                    </span>
                </div>
                {isDemo && (
                  <div className="absolute top-2 right-2 z-20 text-[9px] font-mono bg-sf-warning/10 border border-sf-warning/30 text-sf-warning px-1.5 py-0.5">
                    [DEMO DATA]
                  </div>
                )}
                
                <div className="flex-1 relative border border-sf-border bg-sf-bg overflow-hidden mt-3 md:mt-0">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {currentConnections.map(conn => {
                        const isPulsing = pulses.some(
                        p => (p.source === conn.from.id && p.ext === conn.to.id) || 
                            (p.ext === conn.from.id && p.mod === conn.to.id)
                        );
                        return (
                        <path
                            key={conn.id}
                            vectorEffect="non-scaling-stroke"
                            d={`M ${conn.from.x} ${conn.from.y} L ${conn.to.x} ${conn.to.y}`}
                            fill="none"
                            stroke={isPulsing ? 'rgba(13,148,136,0.8)' : 'rgba(255,255,255,0.3)'}
                            strokeWidth={isPulsing ? 1.5 : 1.5}
                            className="transition-colors duration-100"
                        />
                        );
                    })}
                    </svg>

                    <div className="absolute inset-0 z-10 pointer-events-none">
                    {Object.entries(graphNodes || GRAPH_NODES).flatMap(([group, nodes]) => (nodes as any[]).map((node: any) => {
                        const isPulsing = pulses.some(p => p.source === node.id || p.ext === node.id || p.mod === node.id);
                        const Icon = node.icon || Activity;
                        return (
                        <div
                            key={node.id}
                            className={`absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 ${isPulsing ? 'scale-[1.15]' : ''}`}
                            style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        >
                            <div className={`w-8 h-8 rounded-none border-[1.5px] ${isPulsing ? 'border-sf-accent bg-sf-accent/10 text-sf-accent' : 'border-sf-border bg-sf-surface text-sf-muted'} flex items-center justify-center transition-colors duration-100`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`mt-1 text-[8px] font-mono tracking-widest px-1 transition-colors duration-100 ${isPulsing ? 'bg-sf-accent text-sf-bg' : 'bg-sf-surface text-sf-muted'}`}>
                              {node.label}
                            </span>
                        </div>
                        );
                    }))}
                    </div>
                </div>
            </PanelCard>

             {/* ML Stream Bar Charts */}
             <PanelCard className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-sf-border bg-sf-surface">
                    <span className="text-[10px] text-sf-muted font-mono tracking-widest uppercase">Stream Telemetry</span>
                </div>
                <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                     {Object.keys(streams).length === 0 ? (
                         <div className="col-span-full h-full flex flex-col items-center justify-center text-sf-muted opacity-50">
                             <span className="text-[10px] font-mono tracking-widest uppercase">No Active Data Streams</span>
                         </div>
                     ) : (
                         Object.entries(streams).map(([key, info]) => {
                            const score = (info as StreamInfo)?.score ?? 0;
                            const scoreColor = score > 0.8 ? 'var(--sf-safe)' : score > 0.6 ? 'var(--sf-warning)' : 'var(--sf-critical)';
                            return (
                                <div key={key} className="flex flex-col">
                                    <div className="flex justify-between items-end mb-1">
                                        <span className="text-[10px] text-sf-muted font-mono tracking-widest uppercase">{STREAM_LABELS[key] ?? key}</span>
                                        <span className="text-[10px] font-mono" style={{ color: scoreColor }}>{(score * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-sf-bg border border-sf-border relative">
                                        <div className="absolute top-0 left-0 h-full transition-all duration-300" style={{ width: `${score * 100}%`, backgroundColor: scoreColor }} />
                                    </div>
                                </div>
                            );
                         })
                     )}
                </div>
            </PanelCard>
        </div>

        <div className="flex-[0.8] flex flex-col gap-4 min-w-[300px]">
             {/* Models registry table */}
             <PanelCard className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-sf-border bg-sf-surface">
                    <span className="text-[10px] font-mono tracking-widest text-sf-muted uppercase">Model Registry</span>
                </div>
                <div className="flex-1 p-2 overflow-y-auto">
                    <DataGrid
                        data={models}
                        rowKey="name"
                        columns={[
                            { header: "ST", key: "status", render: (val) => <div className={`w-1.5 h-1.5 ${val === 'serving' ? 'bg-sf-safe' : 'bg-sf-warning'}`} /> },
                            { header: "MODEL", key: "name", render: (val) => <div className="flex items-center gap-2"><span className="text-[11px] text-sf-text">{val}</span>{isDemoModels && <span className="text-[8px] border border-sf-warning/40 text-sf-warning px-1.5 font-mono">[DEMO]</span>}</div> },
                            { header: "ACCURACY", key: "accuracy", align: "right", render: (val) => <span className="text-[11px] font-mono text-sf-text">{val}%</span> }
                        ]}
                    />
                </div>
             </PanelCard>

             {/* Neural Log */}
             <PanelCard className="flex-1 flex flex-col overflow-hidden">
                <div className="px-3 py-2 border-b border-sf-border bg-sf-surface flex justify-between items-center">
                    <span className="text-[10px] font-mono tracking-widest text-sf-muted uppercase">Neural Debug Log</span>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-sf-accent border border-sf-accent/30 bg-sf-accent/10 px-1.5 py-0.5">
                        <div className="w-1.5 h-1.5 bg-sf-accent animate-pulse-fast" /> SYNCED
                    </div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar bg-sf-bg font-mono text-[9px] uppercase space-y-1.5">
                    {neuralLog.map((entry, i) => (
                        <div key={i} className="flex gap-2 leading-tight">
                            <span className="text-sf-muted shrink-0 w-16">{entry.timestamp}</span>
                            <span className={`${entry.status === 'FLAGGED' ? 'text-sf-critical' : entry.type === 'WARN' ? 'text-sf-warning' : 'text-sf-accent/60'}`}>
                                {entry.message}
                            </span>
                        </div>
                    ))}
                </div>
             </PanelCard>
        </div>
      </div>
      </div>
    </div>
  );
}
