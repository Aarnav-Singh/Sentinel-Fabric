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
            className="fixed right-4 top-16 bottom-16 w-full max-w-md bg-sf-bg border border-sf-border shadow-2xl overflow-hidden flex flex-col z-50 rounded-lg pointer-events-auto"
          >
            {/* Header / Drag Handle */}
            <div className="flex flex-col bg-sf-surface border-b border-sf-border cursor-move">
              <div className="flex justify-center p-1 opacity-50">
                <GripHorizontal size={14} className="text-sf-muted" />
              </div>
              <div className="flex items-center justify-between px-4 pb-3">
                <div className="flex items-center gap-3">
                  {entityHistory.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); goBack(); }} onPointerDown={(e) => e.stopPropagation()} className="text-sf-muted hover:text-sf-text bg-sf-bg p-1 rounded transition-colors border border-sf-border">
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <div>
                    <div className="text-[10px] font-mono text-sf-muted uppercase tracking-wider mb-0.5">
                      {entityType} Information
                    </div>
                    <h2 className="text-sm font-bold text-sf-text font-mono truncate max-w-[250px]">
                      {entityValue}
                    </h2>
                  </div>
                </div>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); closeEntity(); }}
                  className="p-1 rounded bg-sf-bg border border-sf-border text-sf-muted hover:text-sf-text transition-colors"
                  title="Close Panel"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-sf-border bg-sf-bg" onPointerDown={(e) => e.stopPropagation()}>
              {(['activity', 'risk', 'intel', 'actions'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest text-center border-b-2 transition-colors ${activeTab === tab ? 'border-sf-accent text-sf-accent bg-sf-accent/5' : 'border-transparent text-sf-muted hover:text-sf-text hover:bg-sf-surface'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="p-4 flex-1 overflow-y-auto custom-scrollbar" onPointerDown={(e) => e.stopPropagation()}>
              {loading && (
                <div className="space-y-4 animate-pulse">
                  <div className="h-24 bg-sf-surface rounded"></div>
                  <div className="h-32 bg-sf-surface rounded"></div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-sf-critical/10 border border-sf-critical/20 rounded flex items-start gap-3">
                  <AlertTriangle className="text-sf-critical shrink-0 mt-0.5" size={18} />
                  <p className="text-sm text-sf-critical">{error}</p>
                </div>
              )}

              {!loading && !error && data && (
                <div className="space-y-4">
                  {activeTab === 'activity' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-sf-surface border border-sf-border rounded">
                          <div className="text-[10px] uppercase font-mono text-sf-muted mb-1 flex items-center gap-1.5"><Activity size={12}/> Frequency</div>
                          <div className="text-xl font-mono text-sf-text">{data.frequency}</div>
                        </div>
                        <div className="p-3 bg-sf-surface border border-sf-border rounded">
                          <div className="text-[10px] uppercase font-mono text-sf-muted mb-1 flex items-center gap-1.5"><ListOrdered size={12}/> Related Events</div>
                          <div className="text-xl font-mono text-sf-text">{data.relatedEvents}</div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[10px] font-mono uppercase text-sf-muted mb-2 tracking-widest border-b border-sf-border pb-1">Recent Activity</h3>
                        <div className="space-y-2">
                          {data.recentEvents?.map((ev: any, i: number) => (
                            <div key={i} className="p-2 border border-sf-border bg-sf-surface rounded">
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[9px] font-mono px-1 py-0.5 uppercase tracking-widest ${ev.severity === 'high' ? 'bg-sf-critical/20 text-sf-critical border border-sf-critical/30' : ev.severity === 'medium' ? 'bg-sf-warning/20 text-sf-warning border border-sf-warning/30' : 'bg-sf-accent/10 text-sf-accent border border-sf-accent/20'}`}>{ev.severity}</span>
                                <span className="text-[9px] text-sf-muted font-mono">{new Date(ev.time).toLocaleTimeString()}</span>
                              </div>
                              <div className="text-xs font-mono text-sf-text">{ev.message}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'risk' && (
                    <div className="space-y-4">
                      <div className="p-3 bg-sf-surface border border-sf-border rounded flex justify-between items-center">
                        <div className="text-[10px] uppercase font-mono text-sf-muted flex items-center gap-1.5"><Shield size={12}/> ML Risk Score</div>
                        <div className="text-xl font-mono text-sf-accent bg-sf-accent/10 px-2 py-0.5 border border-sf-accent/20 rounded">{(data.riskScore * 100).toFixed(1)}</div>
                      </div>
                      <div className="h-32 bg-sf-surface border border-sf-border rounded relative p-2">
                         <div className="text-[9px] font-mono text-sf-muted absolute top-2 left-2 z-10 uppercase tracking-widest">7-Day Local Risk Trend</div>
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.riskTrend}>
                                <YAxis hide domain={[0, 100]} />
                                <Tooltip contentStyle={{ backgroundColor: 'var(--sf-bg)', borderColor: 'var(--sf-border)', fontSize: '10px', fontFamily: 'monospace' }} />
                                <Line type="monotone" dataKey="score" stroke="var(--sf-accent)" strokeWidth={2} dot={{ r: 2, fill: 'var(--sf-bg)' }} />
                            </LineChart>
                         </ResponsiveContainer>
                      </div>
                      <div>
                        <h3 className="text-[10px] font-mono uppercase text-sf-muted mb-2 tracking-widest border-b border-sf-border pb-1">Sigma Rule Matches</h3>
                        <div className="space-y-2">
                          {data.sigmaMatches?.map((sig: any, i: number) => (
                             <div key={i} className="p-2 border border-sf-border bg-sf-surface rounded flex flex-col">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-mono text-sf-warning bg-sf-warning/10 border border-sf-warning/30 px-1">{sig.ruleId}</span>
                                    <span className={`text-[9px] font-mono px-1 ${sig.severity === 'critical' ? 'text-sf-critical' : 'text-sf-warning'}`}>{sig.severity}</span>
                                </div>
                                <span className="text-[10px] font-mono text-sf-text">{sig.name}</span>
                             </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'intel' && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-[10px] font-mono uppercase text-sf-muted mb-2 tracking-widest border-b border-sf-border pb-1">First / Last Seen</h3>
                        <div className="p-3 bg-sf-surface border border-sf-border rounded flex flex-col gap-2 text-[10px] font-mono text-sf-text">
                           <div className="flex justify-between">
                             <span className="text-sf-muted">First Seen (Network)</span>
                             <span>{new Date(data.firstSeen).toLocaleString()}</span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-sf-muted">Last Seen (Network)</span>
                             <span>{new Date(data.lastSeen).toLocaleString()}</span>
                           </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-[10px] font-mono uppercase text-sf-muted mb-2 tracking-widest border-b border-sf-border pb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Database size={12} className="text-sf-accent" /> Qdrant Semantic Similarity</span>
                        </h3>
                        <div className="space-y-2">
                          {data.qdrantSimilar?.map((sim: any, idx: number) => (
                            <div key={idx} className="text-sm p-2 bg-sf-surface border border-sf-border flex justify-between items-center hover:bg-sf-bg transition-colors">
                              <EntityLink type={entityType!} value={sim.value} className="text-[10px]" />
                              <span className="text-[9px] font-mono text-sf-accent bg-sf-accent/10 px-1 border border-sf-accent/20">{(sim.score * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-sf-surface border-l-2 border-sf-muted italic text-[10px] font-mono text-sf-muted">
                        STIX2 Integration Pending: Graph traversal disabled for this entity context.
                      </div>
                    </div>
                  )}

                  {activeTab === 'actions' && (
                     <div className="space-y-4">
                        <h3 className="text-[10px] font-mono uppercase text-sf-muted mb-2 tracking-widest border-b border-sf-border pb-1">SOAR Actions</h3>
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
