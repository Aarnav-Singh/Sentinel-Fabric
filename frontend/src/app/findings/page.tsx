"use client";

import React, { useState, useEffect } from 'react';
import { Target, ExternalLink, Database, Clock, ShieldAlert, Users, Server, UserPlus, Zap, Filter, Radio, Brain, Bug } from 'lucide-react';
import useSWR from 'swr';
import { FadeIn, SlideIn, ShimmerSkeleton, AnimatedNumber, PanelCard } from '@/components/ui/MotionWrappers';
import { useToast } from '@/components/ui/Toast';
import { DataGrid } from '@/components/ui/DataGrid';
import { EntityLink } from '@/components/ui/EntityLink';
import { MlScoreBadge } from '@/components/ui/MlScoreBadge';
import { DataFreshness } from '@/components/ui/DataFreshness';
import { Badge } from '@/components/ui/Badge';

const fetcher = (url: string) => fetch(url).then(r => r.json());

import { FindingHistoryModal } from '@/components/features/findings/FindingHistoryModal';
import { QuickActions } from '@/components/features/actions/QuickActions';

// ─── Types ───────────────────────────────────────────────
interface CveContext { cve_id: string; cvss_score?: number; severity?: string; description?: string; patch_available?: boolean; }
interface TriageResult { severity: string; confidence: number; summary: string; recommended_action: string; tools_used: string[]; }
interface Finding { id: string; title: string; description: string; severity: 'critical' | 'high' | 'medium' | 'low'; source?: string; status: 'open' | 'approved' | 'dismissed' | 'escalated' | 'new'; created_at?: string; ip?: string; domain?: string; linked_techniques?: string[]; cve_context?: CveContext[]; triage_result?: TriageResult; ml_score?: number; }
interface FindingsResponse { findings?: Finding[]; }

// ─── Helpers ─────────────────────────────────────────────
function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

const SEVERITY_MAP = {
  critical: { label: 'CR', color: 'var(--sf-critical)', text: 'text-sf-critical' },
  high: { label: 'HI', color: 'var(--sf-warning)', text: 'text-sf-warning' },
  medium: { label: 'ME', color: 'var(--sf-muted)', text: 'text-sf-text' },
  low: { label: 'LO', color: 'var(--sf-muted)', text: 'text-sf-muted' },
};

const STATUS_MAP = {
  open: 'text-sf-warning',
  new: 'text-sf-text',
  approved: 'text-sf-safe',
  dismissed: 'text-sf-disabled line-through',
  escalated: 'text-sf-critical',
};

async function postAction(id: string, action: 'approve' | 'dismiss' | 'escalate', feedback?: string) {
  const res = await fetch(`/api/proxy/api/v1/findings/${id}/action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, feedback }) });
  if (!res.ok) throw new Error(`Action failed: ${res.status}`);
  return res.json();
}

async function triggerAiTriage(id: string): Promise<TriageResult | null> {
  try {
    const res = await fetch('/api/proxy/api/v1/agents/triage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finding_id: id }) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default function FindingsPage() {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verdictPending, setVerdictPending] = useState<Record<string, string>>({});
  const [localStatuses, setLocalStatuses] = useState<Record<string, Finding['status']>>({});
  const [triageResults, setTriageResults] = useState<Record<string, TriageResult>>({});
  const [triagePending, setTriagePending] = useState<Record<string, boolean>>({});
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const { toast } = useToast();

  const { data, isLoading, mutate } = useSWR<FindingsResponse | Finding[]>('/api/proxy/api/v1/findings', fetcher, { refreshInterval: 10000 });

  useEffect(() => {
      if (data) setLastUpdated(Date.now());
  }, [data]);

  let findings: Finding[] = [];
  if (data) {
    if (Array.isArray(data)) findings = data;
    else if ((data as FindingsResponse).findings) findings = (data as FindingsResponse).findings!;
  }

  findings = findings.map(f => localStatuses[f.id] ? { ...f, status: localStatuses[f.id] } : f);

  const filtered = findings.filter(f => {
    if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    return true;
  });

  const newCount = findings.filter(f => f.status === 'open' || f.status === 'new').length;
  const criticalCount = findings.filter(f => f.severity === 'critical').length;

  const handleAction = async (id: string, action: 'approve' | 'dismiss' | 'escalate') => {
    setVerdictPending(p => ({ ...p, [id]: action }));
    try {
      await postAction(id, action);
      const newStatus: Finding['status'] = action === 'approve' ? 'approved' : action === 'dismiss' ? 'dismissed' : 'escalated';
      setLocalStatuses(p => ({ ...p, [id]: newStatus }));
      mutate();
      toast(
          `FINDING ${action.toUpperCase()}${action.endsWith('e') ? 'D' : 'ED'} - ID: ${id.slice(0, 8)}`,
          action === 'escalate' ? 'error' : 'success'
      );
    } catch { 
        toast(`Could not process ${action}.`, 'error');
    } 
    finally { setVerdictPending(p => { const n = { ...p }; delete n[id]; return n; }); }
  };

  const sourceIconMap: Record<string, React.ElementType> = { endpoint: Database, network: ShieldAlert, identity: Users, cloud: Server };

  // mock ML score based on severity if it's missing just so we have data
  const getMlScore = (f: Finding) => f.ml_score !== undefined ? f.ml_score : (f.severity === 'critical' ? 0.95 : f.severity === 'high' ? 0.75 : f.severity === 'medium' ? 0.5 : 0.2);

  return (
    <div className="flex-1 overflow-auto custom-scrollbar p-6 bg-sf-bg flex min-h-0">
      <div className="flex flex-col xl:flex-row gap-6 w-full h-full max-w-[1600px] mx-auto min-h-0">
        
        {/* Left Column: DataGrid of Findings */}
        <div className="flex-[2] flex flex-col min-h-0 min-w-0">
            <PanelCard className="flex flex-col h-full min-h-0">
                <div className="px-4 py-3 border-b border-sf-border bg-sf-surface flex items-center justify-between shrink-0">
                    <div className="flex items-center flex-1">
                        <h2 className="text-[10px] font-mono tracking-widest text-sf-muted uppercase mr-4">Threat Vectors</h2>
                        <DataFreshness lastUpdated={lastUpdated} refreshInterval={10} showProgressBar={false} />
                    </div>
                    <div className="flex gap-2 text-[10px] uppercase font-mono tracking-widest text-sf-text">
                        <select className="bg-sf-bg border border-sf-border px-2 py-1 outline-none" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
                            <option value="all">ALL SEV</option>
                            <option value="critical">CRITICAL</option>
                            <option value="high">HIGH</option>
                            <option value="medium">MEDIUM</option>
                            <option value="low">LOW</option>
                        </select>
                         <select className="bg-sf-bg border border-sf-border px-2 py-1 outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="all">ALL STATUS</option>
                            <option value="open">OPEN</option>
                            <option value="new">NEW</option>
                            <option value="approved">APPROVED</option>
                            <option value="dismissed">DISMISSED</option>
                            <option value="escalated">ESCALATED</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-4 space-y-4">
                        <ShimmerSkeleton className="h-10 w-full" />
                        <ShimmerSkeleton className="h-10 w-full" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center font-mono text-[10px] text-sf-muted tracking-widest uppercase">
                        No active findings
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto">
                        <DataGrid 
                            data={filtered}
                            rowKey="id"
                            onRowClick={(row) => {
                                setSelectedFindingId(row.id);
                                setIsHistoryOpen(true);
                            }}
                            columns={[
                                { 
                                    header: "!", 
                                    key: "severity", 
                                    render: (val, row) => (
                                        <div className={row.status === 'dismissed' || row.status === 'approved' ? 'opacity-50 grayscale' : ''}>
                                            <Badge label={SEVERITY_MAP[val as keyof typeof SEVERITY_MAP].label} severity={val as any} />
                                        </div>
                                    ) 
                                },
                                {
                                    header: "SOURCE",
                                    key: "source",
                                    render: (val, row) => {
                                        const Icon = sourceIconMap[val] || Target;
                                        return <div className="flex items-center gap-2 text-[10px] text-sf-muted uppercase"><Icon className="w-3 h-3" /> {val}</div>
                                    }
                                },
                                {
                                    header: "OBSERVATION",
                                    key: "title",
                                    render: (val, row) => (
                                        <div className={`flex flex-col ${row.status === 'dismissed' || row.status === 'approved' ? 'grayscale opacity-50' : ''}`}>
                                            <span className="text-sm font-medium text-sf-text font-mono truncate max-w-sm" title={val}>{val}</span>
                                            <span className="text-[9px] text-sf-muted font-mono truncate max-w-sm" title={row.description}>{row.description}</span>
                                        </div>
                                    )
                                },
                                {
                                    header: "CONF",
                                    key: "ml_score",
                                    render: (_, row) => <MlScoreBadge score={getMlScore(row)} />
                                },
                                {
                                    header: "IP/DOMAIN",
                                    key: "ip",
                                    render: (val, row) => {
                                        if (val) return (
                                            <div className="flex items-center gap-2">
                                                <EntityLink type="ip" value={val} className="text-[10px]" />
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity"><QuickActions entityType="ip" entityId={val} /></div>
                                            </div>
                                        );
                                        if (row.domain) return (
                                            <div className="flex items-center gap-2">
                                                <EntityLink type="host" value={row.domain} className="text-[10px]" />
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity"><QuickActions entityType="host" entityId={row.domain} /></div>
                                            </div>
                                        );
                                        return <span className="text-[10px] font-mono text-sf-muted">-</span>;
                                    }
                                },
                                {
                                    header: "STATUS",
                                    key: "status",
                                    render: (val) => <span className={`text-[9px] font-bold uppercase tracking-widest ${STATUS_MAP[val as keyof typeof STATUS_MAP]}`}>{val}</span>
                                },
                                {
                                    header: "ACT",
                                    key: "actions" as keyof Finding,
                                    align: "right",
                                    render: (_, row) => {
                                        const isResolved = row.status === 'approved' || row.status === 'dismissed';
                                        return (
                                            <div className="flex gap-1 justify-end">
                                                {!isResolved && (
                                                    <>
                                                        {!triageResults[row.id] && !row.triage_result && (
                                                            <button 
                                                                className="px-2 py-1 bg-sf-surface border border-sf-border text-[9px] text-sf-text hover:bg-sf-border transition-colors font-bold uppercase disabled:opacity-50"
                                                                onClick={() => {
                                                                    setTriagePending(p => ({ ...p, [row.id]: true }));
                                                                    triggerAiTriage(row.id).then(r => {
                                                                        if (r) setTriageResults(p => ({ ...p, [row.id]: r }));
                                                                        setTriagePending(p => { const n = { ...p }; delete n[row.id]; return n; });
                                                                    });
                                                                }}
                                                                disabled={triagePending[row.id]}
                                                            >
                                                                {triagePending[row.id] ? '...' : 'AI'}
                                                            </button>
                                                        )}
                                                        <button 
                                                            className="px-2 py-1 bg-sf-surface border border-sf-border hover:bg-sf-safe hover:text-black hover:border-sf-safe text-[9px] text-sf-safe transition-colors font-bold uppercase disabled:opacity-50"
                                                            onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'approve'); }}
                                                            disabled={!!verdictPending[row.id]}
                                                        >A</button>
                                                         <button 
                                                            className="px-2 py-1 bg-sf-surface border border-sf-border hover:bg-sf-disabled hover:text-black hover:border-sf-disabled text-[9px] text-sf-muted transition-colors font-bold uppercase disabled:opacity-50"
                                                            onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'dismiss'); }}
                                                            disabled={!!verdictPending[row.id]}
                                                        >D</button>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity border-l border-sf-border pl-1 ml-1 flex items-center">
                                                            <QuickActions entityType="finding" entityId={row.id} />
                                                        </div>
                                                           <button 
                                                            className="px-2 py-1 bg-sf-surface border border-sf-critical text-[9px] text-sf-critical transition-colors hover:bg-sf-critical hover:text-black font-bold uppercase disabled:opacity-50"
                                                            onClick={() => handleAction(row.id, 'escalate')}
                                                            disabled={!!verdictPending[row.id]}
                                                        >ESC</button>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    }
                                }
                            ]}
                        />
                    </div>
                )}
            </PanelCard>
        </div>

        {/* Right Column: Visualization & Summary */}
        <div className="flex-1 flex flex-col gap-4 min-w-[300px]">
            <PanelCard className="flex flex-col overflow-hidden relative">
                <div className="absolute top-0 right-0 p-3 pointer-events-none">
                     <span className="text-[10px] font-mono tracking-widest text-sf-accent flex items-center gap-1.5 border border-sf-accent px-1.5 py-0.5">
                         <span className="w-1.5 h-1.5 bg-sf-accent animate-pulse-fast border border-black/50" /> LIVE_PLOT
                     </span>
                </div>
                <div className="p-4 border-b border-sf-border flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-sf-muted">Risk Surface</span>
                    <div className="text-4xl font-mono text-sf-text mt-1">{criticalCount > 0 ? 'ELEVATED' : 'NOMINAL'}</div>
                </div>

                {/* Scope Plot */}
                <div className="h-48 w-full relative bg-sf-bg border-b border-sf-border overflow-hidden flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full stroke-sf-border stroke-1" fill="none">
                        <circle cx="50%" cy="50%" r="20%" />
                        <circle cx="50%" cy="50%" r="40%" />
                        <line x1="0" y1="50%" x2="100%" y2="50%" />
                        <line x1="50%" y1="0" x2="50%" y2="100%" />
                        {filtered.map((f, i) => {
                            const cx = `${10 + (Math.abs(Math.sin((f.id.charCodeAt(0)||0) * i)) * 80)}%`;
                            const cy = `${10 + (Math.abs(Math.cos((f.id.charCodeAt(f.id.length-1)||0) * i)) * 80)}%`;
                            const unresolved = f.status !== 'approved' && f.status !== 'dismissed';
                            return (
                                <circle 
                                    key={f.id}
                                    cx={cx} cy={cy} r={unresolved ? (f.severity === 'critical' ? 3 : 2) : 1}
                                    className={unresolved ? 'fill-current animate-pulse-fast' : 'fill-sf-disabled'}
                                    style={{ color: unresolved ? SEVERITY_MAP[f.severity]?.color : undefined }}
                                />
                            );
                        })}
                    </svg>
                    <div className="absolute w-full h-[1px] bg-sf-accent shadow-[0_0_8px_var(--sf-accent)] rotate-[45deg] origin-center opacity-30 animate-[spin_4s_linear_infinite]" />
                </div>

                <div className="p-4 grid grid-cols-2 gap-4 bg-sf-surface">
                    {(['critical', 'high', 'medium', 'low'] as const).map(s => {
                        const count = findings.filter(f => f.severity === s && f.status !== 'dismissed').length;
                        return (
                            <div key={s} className="flex flex-col">
                                <span className={`text-2xl font-mono ${count > 0 ? SEVERITY_MAP[s].text : 'text-sf-disabled'}`}>{count}</span>
                                <span className="text-[9px] font-mono uppercase tracking-widest text-sf-muted mt-0.5">{s}</span>
                            </div>
                        );
                    })}
                </div>
            </PanelCard>
            
            <PanelCard className="flex flex-col p-4 bg-sf-bg gap-2 mt-auto">
                <button className="w-full border border-sf-border py-2 text-[10px] font-mono tracking-widest text-sf-text hover:bg-sf-surface uppercase transition-colors flex items-center justify-center gap-2">
                    <UserPlus className="w-3 h-3 text-sf-muted" /> ASSIGN INCIDENT
                </button>
                 <button className="w-full border border-sf-text bg-sf-text py-2 text-[10px] font-mono tracking-widest text-sf-bg hover:bg-sf-text/90 uppercase transition-colors flex items-center justify-center gap-2">
                    <Zap className="w-3 h-3" /> START MITIGATION
                </button>
            </PanelCard>
        </div>


      </div>

      <FindingHistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        findingId={selectedFindingId}
      />
    </div>
  );
}
