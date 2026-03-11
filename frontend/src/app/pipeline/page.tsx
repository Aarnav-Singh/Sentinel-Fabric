"use client";

import React, { useState, useCallback } from 'react';
import { Database, Network, BrainCircuit, Gauge, CheckCircle, Cpu, Activity, Zap, GitBranch } from 'lucide-react';
import useSWR from 'swr';
import { useLiveEvents } from '@/hooks/useLiveEvents';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─── Types ───────────────────────────────────────────────

interface StreamInfo {
  score?: number;
  weight?: number;
  status?: string;
  active?: boolean;
}

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

interface ModelInfo {
  name: string;
  version: string;
  status: string;
  accuracy?: number;
  last_trained?: string;
}

interface ModelsResponse {
  models: ModelInfo[];
}

interface NeuralLogEntry {
  timestamp: string;
  type: 'INFERENCE' | 'LOSS' | 'DATA' | 'WARN' | 'SYSTEM' | 'SCORE';
  message: string;
  status?: 'FLAGGED' | 'CLEAN' | 'WARN';
  score?: number;
}

// ─── Demo fallbacks ──────────────────────────────────────

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

const STREAM_LABELS: Record<string, string> = {
  ensemble: 'Ensemble',
  vae: 'VAE',
  hst: 'HST',
  temporal: 'Temporal',
  adversarial: 'Adversarial',
  meta_learner: 'Meta-Learner',
};

const STREAM_ICONS: Record<string, React.ElementType> = {
  ensemble: BrainCircuit,
  vae: Activity,
  hst: Gauge,
  temporal: GitBranch,
  adversarial: Zap,
  meta_learner: Network,
};

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-800/60 rounded ${className}`} />;
}

function StatusDot({ status }: { status?: string }) {
  const color = status === 'active' || status === 'serving'
    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
    : status === 'degraded'
    ? 'bg-yellow-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]'
    : 'bg-slate-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function getLogColor(entry: NeuralLogEntry): string {
  if (entry.type === 'WARN') return 'text-yellow-400/70';
  if (entry.status === 'FLAGGED') return 'text-brand-accent/60';
  return 'text-brand-accent/50';
}

function getLogBodyColor(entry: NeuralLogEntry): string {
  if (entry.status === 'FLAGGED') return 'text-red-400';
  if (entry.status === 'WARN' || entry.type === 'WARN') return 'text-yellow-400';
  return 'text-slate-200';
}

export default function MLPipelinePage() {
  const [neuralLog, setNeuralLog] = useState<NeuralLogEntry[]>([
    { timestamp: '14:02:41', type: 'INFERENCE', message: 'Pipeline initialized — awaiting live events', status: 'CLEAN' },
  ]);

  const { data: statusData, isLoading: statusLoading } = useSWR<PipelineStatus>(
    '/api/proxy/api/v1/pipeline/status', fetcher, { refreshInterval: 5000 }
  );
  const { data: modelsData, isLoading: modelsLoading } = useSWR<ModelsResponse>(
    '/api/proxy/api/v1/pipeline/models', fetcher, { refreshInterval: 30000 }
  );

  const pipelineStatus = statusData ?? DEMO_STATUS;
  const models = modelsData?.models ?? DEMO_MODELS;
  const streams = pipelineStatus.streams ?? {};

  // SSE: update neural log feed
  const handleLiveEvent = useCallback((event: Record<string, unknown>) => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    const scores = event.ml_scores as Record<string, number> | undefined;
    const metaScore = scores?.meta_score ?? 0;
    const severity = (event.severity as string) || 'low';
    const isFlagged = metaScore > 0.7 || severity === 'critical' || severity === 'high';
    const sourceType = (event.source_type as string) || 'UNKNOWN';
    const evId = ((event.event_id as string) || '').slice(0, 8);

    const entry: NeuralLogEntry = {
      timestamp: ts,
      type: isFlagged ? 'INFERENCE' : 'DATA',
      message: `${sourceType.toUpperCase()}: Event ${evId} scored ${metaScore.toFixed(3)} ${isFlagged ? '[FLAGGED]' : '[CLEAN]'}`,
      status: isFlagged ? 'FLAGGED' : 'CLEAN',
      score: metaScore,
    };

    setNeuralLog(prev => [entry, ...prev].slice(0, 50));
  }, []);

  useLiveEvents({ onEvent: handleLiveEvent });

  // Compute accuracy from models or use demo
  const avgAccuracy = models.length
    ? models.reduce((sum, m) => sum + (m.accuracy ?? 0), 0) / models.length
    : 98.4;

  const servingCount = models.filter(m => m.status === 'serving').length;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ML Pipeline</h1>
            <p className="text-sm text-slate-400 mt-1">Real-time model inference and training dynamics.</p>
          </div>
          <div className="flex items-center gap-3">
            {statusLoading
              ? <SkeletonBlock className="w-40 h-8" />
              : (
                <div className="text-[10px] font-mono text-brand-accent bg-brand-accent/10 px-3 py-1.5 rounded border border-brand-accent/30 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
                  {formatCount(pipelineStatus.events_processed)} EVENTS PROCESSED
                </div>
              )
            }
          </div>
        </header>

        {/* ── Top KPI row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Avg Duration */}
          <div className="bg-brand-card/50 backdrop-blur-md p-4 rounded-xl border border-brand-accent/20">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Avg Latency</p>
            {statusLoading
              ? <SkeletonBlock className="h-8 w-20 mt-1" />
              : <p className="text-2xl font-bold text-white">{pipelineStatus.avg_duration_ms}<span className="text-xs text-slate-400 ml-1">ms</span></p>
            }
          </div>
          {/* Accuracy */}
          <div className="bg-brand-card/50 backdrop-blur-md p-4 rounded-xl border border-brand-accent/20">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Avg Accuracy</p>
            {modelsLoading
              ? <SkeletonBlock className="h-8 w-20 mt-1" />
              : <p className="text-2xl font-bold text-white">{avgAccuracy.toFixed(1)}<span className="text-xs text-slate-400 ml-1">%</span></p>
            }
          </div>
          {/* Models serving */}
          <div className="bg-brand-card/50 backdrop-blur-md p-4 rounded-xl border border-brand-accent/20">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Models Serving</p>
            {modelsLoading
              ? <SkeletonBlock className="h-8 w-12 mt-1" />
              : <p className="text-2xl font-bold text-white">{servingCount}<span className="text-xs text-slate-400 ml-1">/ {models.length}</span></p>
            }
          </div>
          {/* Events counter */}
          <div className="bg-brand-card/50 backdrop-blur-md p-4 rounded-xl border border-brand-accent/20">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Live Feed</p>
            <p className="text-2xl font-bold text-brand-accent">{neuralLog.filter(l => l.type === 'INFERENCE').length}<span className="text-xs text-slate-400 ml-1">events</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: ML Flow Visualizer + Stream cards */}
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-brand-accent text-sm font-bold tracking-tight uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  ML Flow Visualizer
                </h3>
                <span className="flex items-center gap-2 text-[10px] font-mono text-brand-accent bg-brand-accent/10 px-2 py-1 rounded border border-brand-accent/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" /> LIVE INFERENCE
                </span>
              </div>

              <div className="relative w-full aspect-square md:aspect-video lg:aspect-square rounded-2xl overflow-hidden bg-brand-card/50 backdrop-blur-md border border-brand-accent/30 shadow-[0_0_15px_rgba(0,242,255,0.1)] group">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/5 to-transparent" />
                <div className="scan-line absolute inset-0 opacity-20" />

                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-8 z-10">
                  {/* Ingestion Node */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-brand-dark border-2 border-brand-accent flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-transform hover:scale-110 cursor-pointer">
                      <Database className="w-6 h-6 text-brand-accent" />
                    </div>
                    <span className="text-[10px] font-bold text-brand-accent tracking-widest uppercase">Ingestion</span>
                  </div>

                  <div className="h-8 w-0.5 bg-gradient-to-b from-brand-accent to-transparent" />

                  {/* Extraction Node */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-14 h-14 rounded-full bg-brand-dark border-2 border-slate-500 flex items-center justify-center opacity-80 transition-transform hover:scale-110 cursor-pointer">
                      <Network className="w-6 h-6 text-slate-300" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Extraction</span>
                  </div>

                  <div className="h-8 w-0.5 bg-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[50%] bg-brand-accent animate-[slideDown_2s_linear_infinite]" />
                  </div>

                  {/* Training Node */}
                  <div className="flex flex-col items-center gap-2 relative">
                    <div className="absolute inset-0 bg-brand-accent/20 rounded-lg animate-ping opacity-20 blur-xl" />
                    <div className="w-16 h-16 rounded-lg bg-brand-accent/10 border-2 border-brand-accent flex items-center justify-center shadow-[0_0_30px_rgba(0,242,255,0.2)] transition-transform hover:scale-110 cursor-pointer relative z-10">
                      <BrainCircuit className="w-7 h-7 text-brand-accent" />
                    </div>
                    <span className="text-[10px] font-bold text-brand-accent tracking-widest uppercase">Training</span>
                  </div>
                </div>

                <div className="absolute top-4 right-4 text-[10px] font-mono text-brand-accent/70 bg-black/60 p-2 rounded border border-brand-accent/20 backdrop-blur-md">
                  <div className="flex justify-between gap-4">
                    <span>LATENCY:</span>
                    <span>{statusLoading ? '...' : `${pipelineStatus.avg_duration_ms}ms`}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>EVENTS:</span>
                    <span>{statusLoading ? '...' : formatCount(pipelineStatus.events_processed)}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ML Stream Cards */}
            <section className="space-y-3">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Cpu className="w-4 h-4" /> ML Stream Status
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {statusLoading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-20 rounded-xl" />)
                  : Object.entries(streams).map(([key, info]) => {
                      const Icon = STREAM_ICONS[key] ?? Activity;
                      const label = STREAM_LABELS[key] ?? key;
                      const score = (info as StreamInfo)?.score ?? 0;
                      const weight = (info as StreamInfo)?.weight ?? 0;
                      const status = (info as StreamInfo)?.status ?? 'unknown';
                      const scoreColor = score > 0.8 ? 'text-emerald-400' : score > 0.6 ? 'text-yellow-400' : 'text-red-400';
                      return (
                        <div key={key} className="bg-brand-card/50 backdrop-blur-md p-3 rounded-xl border border-brand-accent/20 hover:border-brand-accent/40 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <StatusDot status={status} />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 font-mono">w={weight.toFixed(2)}</span>
                          </div>
                          <p className={`text-xl font-bold ${scoreColor}`}>{(score * 100).toFixed(0)}<span className="text-xs text-slate-400 ml-0.5">%</span></p>
                          <div className="h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${score * 100}%`, backgroundColor: score > 0.8 ? '#10b981' : score > 0.6 ? '#fbbf24' : '#f43f5e' }}
                            />
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </section>
          </div>

          {/* Right Column: Metrics & Model Table & Neural Log */}
          <div className="flex flex-col gap-6">
            {/* Circular accuracy / confidence */}
            <section className="grid grid-cols-2 gap-4">
              <div className="bg-brand-card/50 backdrop-blur-md p-5 rounded-xl border border-brand-accent/20 hover:border-brand-accent/40 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accuracy</span>
                  <Gauge className="w-4 h-4 text-brand-accent" />
                </div>
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle className="text-slate-800" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="6" />
                    <circle className="text-brand-accent transition-all duration-1000" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - avgAccuracy / 100)} strokeWidth="6" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                    <span className="text-xl font-bold text-white">{avgAccuracy.toFixed(1)}</span>
                    <span className="text-[8px] text-brand-accent uppercase -mt-1">%</span>
                  </div>
                </div>
              </div>

              <div className="bg-brand-card/50 backdrop-blur-md p-5 rounded-xl border border-brand-accent/20 hover:border-brand-accent/40 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Confidence</span>
                  <CheckCircle className="w-4 h-4 text-brand-accent" />
                </div>
                <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    <circle className="text-slate-800" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="6" />
                    <circle className="text-brand-accent/60 transition-all duration-1000" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (streams.meta_learner?.score ?? 0.921))} strokeWidth="6" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center mt-1">
                    <span className="text-xl font-bold text-white">{((streams.meta_learner?.score ?? 0.921) * 100).toFixed(1)}</span>
                    <span className="text-[8px] text-brand-accent uppercase -mt-1">%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Models table */}
            <section className="bg-brand-card/50 backdrop-blur-md p-5 rounded-xl border border-brand-accent/20">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Model Registry
              </h4>
              <div className="space-y-2.5">
                {modelsLoading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-10 rounded" />)
                  : models.map((m) => (
                      <div key={m.name} className="flex items-center justify-between gap-3 py-1.5 border-b border-brand-accent/5 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusDot status={m.status} />
                          <div className="min-w-0">
                            <p className="text-xs text-white font-medium truncate">{m.name}</p>
                            <p className="text-[9px] text-slate-500 font-mono">{m.version}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {m.accuracy != null && (
                            <p className="text-xs font-bold text-brand-accent">{m.accuracy.toFixed(1)}%</p>
                          )}
                          {m.last_trained && (
                            <p className="text-[9px] text-slate-500 font-mono">{m.last_trained}</p>
                          )}
                        </div>
                      </div>
                    ))
                }
              </div>
            </section>

            {/* Neural Log Feed — SSE driven */}
            <section className="bg-brand-card/50 backdrop-blur-md p-5 rounded-xl border border-brand-accent/20 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3 border-b border-brand-accent/10 pb-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neural Log Feed</h4>
                <span className="text-[8px] font-mono text-brand-accent bg-brand-accent/10 px-1.5 py-0.5 rounded animate-pulse">STREAMING...</span>
              </div>
              <div className="font-mono text-[10px] space-y-2.5 text-slate-400 max-h-48 overflow-y-auto custom-scrollbar pr-2 flex-1">
                {neuralLog.map((entry, i) => (
                  <p key={i} className="flex gap-2 leading-relaxed hover:bg-white/5 px-1 -mx-1 rounded">
                    <span className={`shrink-0 ${getLogColor(entry)}`}>[{entry.timestamp}]</span>
                    <span className={getLogBodyColor(entry)}>
                      {entry.type}: {entry.message}
                    </span>
                  </p>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
