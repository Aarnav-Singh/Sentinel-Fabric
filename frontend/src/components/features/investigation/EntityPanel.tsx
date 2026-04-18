"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEntity } from '@/contexts/EntityContext';
import { useEntityDetails } from '@/hooks/useEntityDetails';

import { X, Activity, AlertTriangle, Shield, CheckCircle, Database, Ban, GripHorizontal, ArrowLeft, ListOrdered } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import { QuickActions } from '@/components/features/actions/QuickActions';
import { EntityLink } from '@/components/ui/EntityLink';

export function EntityPanel() {
 const { isOpen, entityType, entityValue, closeEntity, entityHistory, goBack } = useEntity();
 const { data, loading, error } = useEntityDetails(entityType, entityValue);
 const [activeTab, setActiveTab] = useState<'activity'|'risk'|'intel'|'actions'>('activity');

 return (
 <AnimatePresence>
 {isOpen && (
 <>
 {/* Backdrop */}
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={closeEntity}
 className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm pointer-events-auto"
 />

 {/* Draggable Panel */}
 <motion.div
 drag
 dragMomentum={false}
 initial={{ x: '100%', y: 0 }}
 animate={{ x: 0, y: 0 }}
 exit={{ x: '100%', opacity: 0 }}
 transition={{ type: 'spring', damping: 25, stiffness: 200 }}
 className="fixed right-4 top-16 bottom-16 w-full max-w-md bg-ng-base border border-ng-outline-dim/40  overflow-hidden flex flex-col z-50 rounded-none pointer-events-auto"
 >
 {/* Header / Drag Handle */}
 <div className="flex flex-col bg-ng-mid border-b border-ng-outline-dim/40 cursor-move">
 <div className="flex justify-center p-1 opacity-50">
 <GripHorizontal size={14} className="text-ng-muted" />
 </div>
 <div className="flex items-center justify-between px-4 pb-3">
 <div className="flex items-center gap-3">
 {entityHistory.length > 0 && (
 <button onClick={(e) => { e.stopPropagation(); goBack(); }} onPointerDown={(e) => e.stopPropagation()} className="text-ng-muted hover:text-ng-on bg-ng-base p-1 rounded transition-colors border border-ng-outline-dim/40">
 <ArrowLeft size={16} />
 </button>
 )}
 <div>
 <div className="text-[10px] font-mono text-ng-muted uppercase tracking-wider mb-0.5">
 {entityType} Information
 </div>
 <h2 className="text-sm font-bold text-ng-on font-mono truncate max-w-[250px]">
 {entityValue}
 </h2>
 </div>
 </div>
 <button
 onPointerDown={(e) => e.stopPropagation()}
 onClick={(e) => { e.stopPropagation(); closeEntity(); }}
 className="p-1 rounded bg-ng-base border border-ng-outline-dim/40 text-ng-muted hover:text-ng-on transition-colors"
 title="Close Panel"
 >
 <X size={16} />
 </button>
 </div>
 </div>

 {/* Tabs */}
 <div className="flex border-b border-ng-outline-dim/40 bg-ng-base" onPointerDown={(e) => e.stopPropagation()}>
 {(['activity', 'risk', 'intel', 'actions'] as const).map(tab => (
 <button
 key={tab}
 onClick={() => setActiveTab(tab)}
 className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest text-center border-b-2 transition-colors ${activeTab === tab ? 'border-ng-cyan/50 text-ng-cyan bg-ng-cyan-bright/5' : 'border-transparent text-ng-muted hover:text-ng-on hover:bg-ng-mid'}`}
 >
 {tab}
 </button>
 ))}
 </div>

 {/* Content */}
 <div className="p-4 flex-1 overflow-y-auto custom-scrollbar" onPointerDown={(e) => e.stopPropagation()}>
 {loading && (
 <div className="space-y-4 animate-pulse">
 <div className="h-24 bg-ng-mid rounded"></div>
 <div className="h-32 bg-ng-mid rounded"></div>
 </div>
 )}

 {error && (
 <div className="p-4 bg-ng-error/10 border border-ng-error/20 rounded flex items-start gap-3">
 <AlertTriangle className="text-ng-error shrink-0 mt-0.5" size={18} />
 <p className="text-sm text-ng-error">{error}</p>
 </div>
 )}

 {!loading && !error && data && (
 <div className="space-y-4">
 {activeTab === 'activity' && (
 <div className="space-y-4">
 <div className="grid grid-cols-2 gap-3">
 <div className="p-3 bg-ng-mid border border-ng-outline-dim/40 rounded">
 <div className="text-[10px] uppercase font-mono text-ng-muted mb-1 flex items-center gap-1.5"><Activity size={12}/> Frequency</div>
 <div className="text-xl font-mono text-ng-on">{data.frequency}</div>
 </div>
 <div className="p-3 bg-ng-mid border border-ng-outline-dim/40 rounded">
 <div className="text-[10px] uppercase font-mono text-ng-muted mb-1 flex items-center gap-1.5"><ListOrdered size={12}/> Related Events</div>
 <div className="text-xl font-mono text-ng-on">{data.relatedEvents}</div>
 </div>
 </div>
 <div>
 <h3 className="text-[10px] font-mono uppercase text-ng-muted mb-2 tracking-widest border-b border-ng-outline-dim/40 pb-1">Recent Activity</h3>
 <div className="space-y-2">
 {data.recentEvents?.map((ev: any, i: number) => (
 <div key={i} className="p-2 border border-ng-outline-dim/40 bg-ng-mid rounded">
 <div className="flex justify-between items-center mb-1">
 <span className={`text-[9px] font-mono px-1 py-0.5 uppercase tracking-widest ${ev.severity === 'high' ? 'bg-ng-error/20 text-ng-error border border-ng-error/30' : ev.severity === 'medium' ? 'bg-ng-magenta/20 text-ng-magenta border border-ng-magenta/30' : 'bg-ng-cyan-bright/10 text-ng-cyan border border-ng-cyan/50/20'}`}>{ev.severity}</span>
 <span className="text-[9px] text-ng-muted font-mono">{new Date(ev.time).toLocaleTimeString()}</span>
 </div>
 <div className="text-xs font-mono text-ng-on">{ev.message}</div>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {activeTab === 'risk' && (
 <div className="space-y-4">
 <div className="p-3 bg-ng-mid border border-ng-outline-dim/40 rounded flex justify-between items-center">
 <div className="text-[10px] uppercase font-mono text-ng-muted flex items-center gap-1.5"><Shield size={12}/> ML Risk Score</div>
 <div className="text-xl font-mono text-ng-cyan bg-ng-cyan-bright/10 px-2 py-0.5 border border-ng-cyan/50/20 rounded">{(data.riskScore * 100).toFixed(1)}</div>
 </div>
 <div className="h-32 bg-ng-mid border border-ng-outline-dim/40 rounded relative p-2">
 <div className="text-[9px] font-mono text-ng-muted absolute top-2 left-2 z-10 uppercase tracking-widest">7-Day Local Risk Trend</div>
 <ResponsiveContainer width="100%" height="100%">
 <LineChart data={data.riskTrend}>
 <YAxis hide domain={[0, 100]} />
 <Tooltip contentStyle={{ backgroundColor: 'var(--ng-base)', borderColor: 'var(--ng-outline-dim/30)', fontSize: '10px', fontFamily: 'monospace' }} />
 <Line type="monotone" dataKey="score" stroke="var(--ng-cyan-bright)" strokeWidth={2} dot={{ r: 2, fill: 'var(--ng-base)' }} />
 </LineChart>
 </ResponsiveContainer>
 </div>
 <div>
 <h3 className="text-[10px] font-mono uppercase text-ng-muted mb-2 tracking-widest border-b border-ng-outline-dim/40 pb-1">Sigma Rule Matches</h3>
 <div className="space-y-2">
 {data.sigmaMatches?.map((sig: any, i: number) => (
 <div key={i} className="p-2 border border-ng-outline-dim/40 bg-ng-mid rounded flex flex-col">
 <div className="flex justify-between items-center mb-1">
 <span className="text-[9px] font-mono text-ng-magenta bg-ng-magenta/10 border border-ng-magenta/30 px-1">{sig.ruleId}</span>
 <span className={`text-[9px] font-mono px-1 ${sig.severity === 'critical' ? 'text-ng-error' : 'text-ng-magenta'}`}>{sig.severity}</span>
 </div>
 <span className="text-[10px] font-mono text-ng-on">{sig.name}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {activeTab === 'intel' && (
 <div className="space-y-4">
 <div>
 <h3 className="text-[10px] font-mono uppercase text-ng-muted mb-2 tracking-widest border-b border-ng-outline-dim/40 pb-1">First / Last Seen</h3>
 <div className="p-3 bg-ng-mid border border-ng-outline-dim/40 rounded flex flex-col gap-2 text-[10px] font-mono text-ng-on">
 <div className="flex justify-between">
 <span className="text-ng-muted">First Seen (Network)</span>
 <span>{new Date(data.firstSeen).toLocaleString()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-ng-muted">Last Seen (Network)</span>
 <span>{new Date(data.lastSeen).toLocaleString()}</span>
 </div>
 </div>
 </div>
 <div>
 <h3 className="text-[10px] font-mono uppercase text-ng-muted mb-2 tracking-widest border-b border-ng-outline-dim/40 pb-1 flex items-center justify-between">
 <span className="flex items-center gap-1.5"><Database size={12} className="text-ng-cyan" /> Qdrant Semantic Similarity</span>
 </h3>
 <div className="space-y-2">
 {data.qdrantSimilar?.map((sim: any, idx: number) => (
 <div key={idx} className="text-sm p-2 bg-ng-mid border border-ng-outline-dim/40 flex justify-between items-center hover:bg-ng-base transition-colors">
 <EntityLink type={entityType!} value={sim.value} className="text-[10px]" />
 <span className="text-[9px] font-mono text-ng-cyan bg-ng-cyan-bright/10 px-1 border border-ng-cyan/50/20">{(sim.score * 100).toFixed(1)}%</span>
 </div>
 ))}
 </div>
 </div>
 <div className="p-3 bg-ng-mid border-l-2 border-ng-muted italic text-[10px] font-mono text-ng-muted">
 STIX2 Integration Pending: Graph traversal disabled for this entity context.
 </div>
 </div>
 )}

 {activeTab === 'actions' && (
 <div className="space-y-4">
 <h3 className="text-[10px] font-mono uppercase text-ng-muted mb-2 tracking-widest border-b border-ng-outline-dim/40 pb-1">SOAR Actions</h3>
 <QuickActions entityType={entityType!} entityId={entityValue!} className="flex flex-col gap-2" />
 </div>
 )}
 </div>
 )}
 </div>
 </motion.div>
 </>
 )}
 </AnimatePresence>
 );
}
