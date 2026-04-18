"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
 Network, 
 Server, 
 User, 
 FileText, 
 Globe, 
 ShieldAlert, 
 Crosshair, 
 Info,
 ChevronRight,
 Database
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

// Interfaces for STIX2 objects
export interface STIXNode {
 id: string;
 type: string;
 created?: string;
 name?: string;
 description?: string;
 pattern?: string;
 [key: string]: any;
}

export interface STIXEdge {
 source: string;
 target: string;
 type: string;
 properties?: Record<string, any>;
}

export interface ThreatGraphProps {
 nodes: STIXNode[];
 edges: STIXEdge[];
 onNodeClick?: (node: STIXNode) => void;
 className?: string;
}

// Icon mapping based on STIX entity type
const getIconForType = (type: string) => {
 switch (type.toLowerCase()) {
 case 'indicator': return <Crosshair className="h-5 w-5" />;
 case 'threatactor': return <User className="h-5 w-5 text-[var(--ng-error)]" />;
 case 'campaign': return <ShieldAlert className="h-5 w-5 text-[var(--ng-magenta)]" />;
 case 'malware': return <Database className="h-5 w-5 text-[var(--ng-cyan)]" />;
 case 'attackpattern': return <Network className="h-5 w-5" />;
 case 'vulnerability': return <FileText className="h-5 w-5 text-[var(--ng-magenta)]" />;
 default: return <Globe className="h-5 w-5 text-ng-muted" />;
 }
};

const getColorForType = (type: string) => {
 switch(type.toLowerCase()) {
 case 'threatactor': return 'border-[var(--ng-error)]/50 bg-[var(--ng-error)]/10';
 case 'campaign': return 'border-[var(--ng-magenta)]/50 bg-[var(--ng-magenta)]/10';
 case 'malware': return 'border-[var(--ng-cyan)]/50 bg-[var(--ng-cyan)]/10';
 case 'indicator': return 'border-[var(--ng-cyan-bright)]/50 bg-[var(--ng-cyan-bright)]/10';
 case 'attackpattern': return 'border-[var(--ng-lime)]/50 bg-[var(--ng-lime)]/10';
 case 'vulnerability': return 'border-[var(--ng-magenta)]/50 bg-[var(--ng-magenta)]/10';
 default: return 'border-ng-outline-dim/40/50 bg-ng-muted/10';
 }
};

export const ThreatGraph: React.FC<ThreatGraphProps> = ({ 
 nodes, 
 edges, 
 onNodeClick,
 className = "" 
}) => {
 const [selectedNode, setSelectedNode] = useState<STIXNode | null>(null);

 // Group nodes by type for a pseudo-hierarchical layout
 const groupedNodes = nodes.reduce((acc, node) => {
 const type = node.type.toLowerCase();
 if (!acc[type]) acc[type] = [];
 acc[type].push(node);
 return acc;
 }, {} as Record<string, STIXNode[]>);

 // Custom ordered layout hierarchy
 const orderedTypes = ['threatactor', 'campaign', 'attackpattern', 'malware', 'vulnerability', 'indicator'];
 // Append any types not in preferred ordering
 Object.keys(groupedNodes).forEach(type => {
 if (!orderedTypes.includes(type)) {
 orderedTypes.push(type);
 }
 });

 const handleNodeClick = (node: STIXNode) => {
 setSelectedNode(node);
 if (onNodeClick) onNodeClick(node);
 };

 return (
 <div className={`relative flex flex-col xl:flex-row gap-6 w-full h-[600px] overflow-hidden bg-ng-base/40 rounded-none border border-ng-outline-dim/40 p-6 ${className}`}>
 {/* Node Visualization Area */}
 <div className="flex-1 overflow-auto flex flex-col gap-12 relative pb-20 items-center hide-scrollbar">
 
 {orderedTypes.map((type) => {
 const typeNodes = groupedNodes[type];
 if (!typeNodes || typeNodes.length === 0) return null;
 
 return (
 <motion.div 
 key={type}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex flex-col items-center gap-4 w-full"
 >
 <h3 className="text-sm font-medium text-ng-muted capitalize tracking-wider flex items-center gap-2">
 {type.replace("-", " ")}
 <Badge label={typeNodes.length.toString()} className="bg-ng-mid/50 text-xs" />
 </h3>
 
 <div className="flex flex-wrap justify-center gap-6">
 {typeNodes.map(node => {
 const isSelected = selectedNode?.id === node.id;
 
 return (
 <motion.div
 key={node.id}
 whileHover={{ scale: 1.05, y: -2 }}
 whileTap={{ scale: 0.95 }}
 onClick={() => handleNodeClick(node)}
 className={`
 min-w-[200px] max-w-[240px] p-4 cursor-pointer relative
 rounded-none border backdrop-blur-sm transition-all duration-300
 flex flex-col items-center text-center gap-3
 ${getColorForType(node.type)}
 ${isSelected ? 'ring-2 ring-ng-cyan-bright ring-offset-2 ring-offset-ng-base  shadow-ng-cyan-bright/20 scale-105' : 'hover: hover:shadow-black/40'}
 `}
 >
 <div className={`p-3 rounded-none bg-ng-base/50 shadow-inner`}>
 {getIconForType(node.type)}
 </div>
 
 <div className="w-full">
 <p className="font-semibold text-sm text-ng-on line-clamp-1 break-all" title={node.name || node.type}>
 {node.name || `${node.type.toUpperCase()}`}
 </p>
 <p className="text-xs text-ng-muted mt-1 truncate" title={node.id}>
 {node.id.split('--')[1]?.substring(0, 8) || 'unknown'}
 </p>
 </div>

 {/* Display connected edges count badge */}
 {edges.filter(e => e.source === node.id || e.target === node.id).length > 0 && (
 <div className="absolute -top-2 -right-2 bg-ng-mid border border-ng-outline-dim/40 text-ng-on text-[10px] w-6 h-6 flex items-center justify-center rounded-none ">
 {edges.filter(e => e.source === node.id || e.target === node.id).length}
 </div>
 )}
 </motion.div>
 );
 })}
 </div>
 </motion.div>
 );
 })}
 
 </div>

 {/* Edge Inspector Panel (Right side) */}
 <AnimatePresence>
 {selectedNode && (
 <motion.div
 initial={{ width: 0, opacity: 0 }}
 animate={{ width: 320, opacity: 1 }}
 exit={{ width: 0, opacity: 0 }}
 className="h-full flex flex-col bg-ng-base/60 rounded-none border border-ng-outline-dim/40 backdrop-blur-md overflow-hidden shrink-0"
 >
 <div className="p-4 border-b border-ng-outline-dim/40 flex justify-between items-center bg-ng-base/50">
 <h3 className="font-semibold text-ng-on">Entity Inspector</h3>
 <Button variant="ghost" className="h-6 w-6 p-0 rounded-none text-ng-muted hover:text-ng-on" onClick={() => setSelectedNode(null)}>
 &times;
 </Button>
 </div>
 
 <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
 {/* Properties */}
 <div className="space-y-4">
 <div className="flex items-center gap-3">
 <div className={`p-2 ${getColorForType(selectedNode.type)}`}>
 {getIconForType(selectedNode.type)}
 </div>
 <div>
 <h4 className="text-sm font-bold text-ng-on uppercase tracking-widest">{selectedNode.type}</h4>
 <p className="text-xs text-ng-muted break-all">{selectedNode.id}</p>
 </div>
 </div>
 
 {selectedNode.name && (
 <div>
 <p className="text-xs font-semibold text-ng-muted uppercase">Name</p>
 <p className="text-sm text-ng-on mt-1">{selectedNode.name}</p>
 </div>
 )}
 
 {selectedNode.description && (
 <div>
 <p className="text-xs font-semibold text-ng-muted uppercase">Description</p>
 <p className="text-sm text-ng-on mt-1 line-clamp-4">{selectedNode.description}</p>
 </div>
 )}

 {selectedNode.pattern && (
 <div>
 <p className="text-xs font-semibold text-ng-muted uppercase">Pattern</p>
 <div className="mt-1 bg-ng-base border border-ng-outline-dim/40 rounded-none p-2 text-xs text-ng-cyan font-mono overflow-auto custom-scrollbar max-h-32">
 {selectedNode.pattern}
 </div>
 </div>
 )}
 </div>

 {/* Relationships */}
 <div className="pt-4 border-t border-ng-outline-dim/40">
 <h4 className="text-xs font-semibold text-ng-muted uppercase mb-3 flex items-center gap-2">
 <Network className="w-3 h-3" /> Relationships
 </h4>
 
 <div className="flex flex-col gap-2">
 {edges.filter(e => e.source === selectedNode.id).map((e, idx) => {
 const targetNode = nodes.find(n => n.id === e.target);
 return (
 <div key={`out-${idx}`} className="bg-ng-mid/30 rounded-none p-2 border border-ng-outline-dim/40/50 flex flex-col gap-1">
 <div className="flex items-center gap-2">
 <Badge label={e.type} className="text-[10px] bg-ng-base border-ng-outline-dim/40 px-1 py-0" />
 <ChevronRight className="w-3 h-3 text-ng-muted" />
 <span className="text-xs text-ng-on truncate max-w-[120px]" title={targetNode?.name || targetNode?.id}>
 {targetNode?.name || targetNode?.type || 'Unknown'}
 </span>
 </div>
 </div>
 );
 })}
 
 {edges.filter(e => e.target === selectedNode.id).map((e, idx) => {
 const sourceNode = nodes.find(n => n.id === e.source);
 return (
 <div key={`in-${idx}`} className="bg-ng-mid/30 rounded-none p-2 border border-ng-outline-dim/40/50 flex flex-col gap-1">
 <div className="flex items-center gap-2 text-ng-muted">
 <span className="text-xs text-ng-on truncate max-w-[120px]" title={sourceNode?.name || sourceNode?.id}>
 {sourceNode?.name || sourceNode?.type || 'Unknown'}
 </span>
 <ChevronRight className="w-3 h-3" />
 <Badge label={e.type} className="text-[10px] bg-ng-base border-ng-outline-dim/40 px-1 py-0" />
 </div>
 </div>
 );
 })}

 {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
 <p className="text-xs text-ng-muted italic">No connected entities discovered yet.</p>
 )}
 </div>
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
};
