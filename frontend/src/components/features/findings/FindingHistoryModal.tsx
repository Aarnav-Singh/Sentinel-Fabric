"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Shield, History, Info, ChevronDown, ChevronRight, Activity, User, Target, Zap } from 'lucide-react';
import { FadeIn, SlideIn } from '@/components/ui/MotionWrappers';

interface HistoryItem {
 type: string;
 timestamp: string;
 message: string;
 author?: string;
 notes?: string;
 source?: string;
}

interface FindingDetails {
 finding_id: string;
 details: any;
 history: HistoryItem[];
}

interface FindingHistoryModalProps {
 isOpen: boolean;
 onClose: () => void;
 findingId: string | null;
}

export function FindingHistoryModal({ isOpen, onClose, findingId }: FindingHistoryModalProps) {
 const [data, setData] = useState<FindingDetails | null>(null);
 const [isLoading, setIsLoading] = useState(false);
 const [showRaw, setShowRaw] = useState(false);

 useEffect(() => {
 if (isOpen && findingId) {
 setIsLoading(true);
 fetch(`/api/proxy/api/v1/findings/${findingId}/details`)
 .then(res => res.json())
 .then(json => {
 setData(json);
 setIsLoading(false);
 })
 .catch(() => setIsLoading(false));
 }
 }, [isOpen, findingId]);

 if (!isOpen) return null;

 return (
 <AnimatePresence>
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
 <motion.div 
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="bg-ng-mid border border-ng-outline-dim/40 w-full max-w-2xl h-[80vh] flex flex-col relative  overflow-hidden"
 >
 {/* Header */}
 <div className="p-4 border-b border-ng-outline-dim/40 flex items-center justify-between bg-ng-base/50">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 bg-ng-error/10 border border-ng-error/30 flex items-center justify-center">
 <Shield className="w-4 h-4 text-ng-error" />
 </div>
 <div>
 <h2 className="text-xs font-mono font-bold tracking-widest text-ng-on uppercase">Finding Details</h2>
 <p className="text-[10px] font-mono text-ng-muted uppercase tracking-tighter">{findingId}</p>
 </div>
 </div>
 <button onClick={onClose} className="p-1 hover:bg-ng-outline-dim/30 transition-colors text-ng-muted hover:text-ng-on">
 <X className="w-5 h-5" />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
 {isLoading ? (
 <div className="flex flex-col items-center justify-center h-full gap-4 text-ng-muted">
 <div className="w-8 h-8 border-2 border-ng-cyan/50 border-t-transparent animate-spin rounded-full" />
 <span className="text-[10px] font-mono uppercase tracking-widest">Retrieving History...</span>
 </div>
 ) : data ? (
 <>
 {/* Overview Section */}
 <section>
 <div className="flex items-center gap-2 mb-4">
 <Info className="w-4 h-4 text-ng-cyan" />
 <h3 className="text-[11px] font-bold font-mono uppercase tracking-widest text-ng-on">Intelligence Summary</h3>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="bg-ng-base p-3 border border-ng-outline-dim/40/30">
 <span className="text-[9px] font-mono text-ng-muted uppercase block mb-1">Source Logic</span>
 <span className="text-xs font-mono text-ng-on uppercase">{data.details.source_type || 'Automation Engine'}</span>
 </div>
 <div className="bg-ng-base p-3 border border-ng-outline-dim/40/30">
 <span className="text-[9px] font-mono text-ng-muted uppercase block mb-1">Severity Rank</span>
 <span className={`text-xs font-mono font-bold uppercase ${data.details.severity === 'critical' ? 'text-ng-error' : 'text-ng-magenta'}`}>{data.details.severity || 'UNKNOWN'}</span>
 </div>
 <div className="bg-ng-base p-3 border border-ng-outline-dim/40/30">
 <span className="text-[9px] font-mono text-ng-muted uppercase block mb-1">Involved Entities</span>
 <span className="text-xs font-mono text-ng-on">{data.details.src_ip ? `${data.details.src_ip} -> ${data.details.dst_ip}` : 'Systems Analysis'}</span>
 </div>
 <div className="bg-ng-base p-3 border border-ng-outline-dim/40/30">
 <span className="text-[9px] font-mono text-ng-muted uppercase block mb-1">Protocol / Port</span>
 <span className="text-xs font-mono text-ng-on uppercase">{data.details.protocol || '-'}:{data.details.dst_port || '-'}</span>
 </div>
 </div>
 </section>

 {/* Timeline Section */}
 <section>
 <div className="flex items-center gap-2 mb-6">
 <History className="w-4 h-4 text-ng-cyan" />
 <h3 className="text-[11px] font-bold font-mono uppercase tracking-widest text-ng-on">Audit Timeline</h3>
 </div>
 <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-ng-outline-dim/30/50">
 {data.history.map((item, idx) => (
 <div key={idx} className="relative">
 <div className="absolute -left-[19px] top-1 w-3 h-3 bg-ng-base border border-ng-cyan/50 rounded-full z-10">
 <div className="absolute inset-0.5 bg-ng-cyan-bright animate-pulse rounded-full" />
 </div>
 <div className="flex flex-col gap-1">
 <div className="flex items-center justify-between">
 <span className="text-[10px] font-bold font-mono text-ng-on uppercase tracking-widest">
 {item.type.replace('_', ' ')}
 </span>
 <span className="text-[9px] font-mono text-ng-muted">
 {new Date(item.timestamp).toLocaleString()}
 </span>
 </div>
 <p className="text-xs text-ng-muted leading-relaxed max-w-md">
 {item.message}
 </p>
 {item.author && (
 <div className="flex items-center gap-1.5 mt-1">
 <User className="w-3 h-3 text-ng-muted" />
 <span className="text-[9px] font-mono text-ng-muted uppercase tracking-wider">Actor: {item.author}</span>
 </div>
 )}
 {item.notes && (
 <div className="mt-2 p-2 bg-ng-base/50 border-l border-ng-cyan/50 text-[10px] italic text-ng-on font-mono">
 &quot;{item.notes}&quot;
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 </section>

 {/* Raw Data Section */}
 <section className="border-t border-ng-outline-dim/40 pt-6">
 <button 
 onClick={() => setShowRaw(!showRaw)}
 className="flex items-center gap-2 text-[10px] font-mono text-ng-muted hover:text-ng-on transition-colors uppercase tracking-widest"
 >
 {showRaw ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
 Inspect Raw Canonical Record
 </button>
 <AnimatePresence>
 {showRaw && (
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden"
 >
 <div className="mt-4 p-4 bg-black/50 font-mono text-[10px] text-green-500 overflow-x-auto border border-ng-outline-dim/40/20 max-h-48 custom-scrollbar">
 <pre>{JSON.stringify(data.details, null, 2)}</pre>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </section>
 </>
 ) : (
 <div className="flex flex-col items-center justify-center h-full text-ng-muted uppercase font-mono text-xs">
 Information Node Unavailable
 </div>
 )}
 </div>

 {/* Footer Actions */}
 <div className="p-4 border-t border-ng-outline-dim/40 bg-ng-base/50 flex gap-3">
 <button className="flex-1 border border-ng-outline-dim/40 py-2 text-[10px] font-mono tracking-widest text-ng-on hover:bg-ng-mid uppercase transition-colors flex items-center justify-center gap-2 group">
 <Target className="w-3 h-3 text-ng-muted group-hover:text-ng-cyan transition-colors" /> PIVOT TO ENTITY
 </button>
 <button className="flex-1 border border-ng-on bg-ng-on py-2 text-[10px] font-mono tracking-widest text-ng-base hover:bg-ng-on/90 uppercase transition-colors flex items-center justify-center gap-2">
 CLOSE VIEW
 </button>
 </div>
 </motion.div>
 </div>
 </AnimatePresence>
 );
}
