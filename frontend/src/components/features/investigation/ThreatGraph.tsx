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
    case 'threatactor': return <User className="h-5 w-5 text-[var(--sf-critical)]" />;
    case 'campaign': return <ShieldAlert className="h-5 w-5 text-[var(--sf-warning)]" />;
    case 'malware': return <Database className="h-5 w-5 text-[var(--sf-accent-2)]" />;
    case 'attackpattern': return <Network className="h-5 w-5" />;
    case 'vulnerability': return <FileText className="h-5 w-5 text-[var(--sf-warning)]" />;
    default: return <Globe className="h-5 w-5 text-sf-muted" />;
  }
};

const getColorForType = (type: string) => {
  switch(type.toLowerCase()) {
    case 'threatactor': return 'border-[var(--sf-critical)]/50 bg-[var(--sf-critical)]/10';
    case 'campaign': return 'border-[var(--sf-warning)]/50 bg-[var(--sf-warning)]/10';
    case 'malware': return 'border-[var(--sf-accent-2)]/50 bg-[var(--sf-accent-2)]/10';
    case 'indicator': return 'border-[var(--sf-accent)]/50 bg-[var(--sf-accent)]/10';
    case 'attackpattern': return 'border-[var(--sf-safe)]/50 bg-[var(--sf-safe)]/10';
    case 'vulnerability': return 'border-[var(--sf-warning)]/50 bg-[var(--sf-warning)]/10';
    default: return 'border-sf-border/50 bg-sf-muted/10';
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
    <div className={`relative flex flex-col xl:flex-row gap-6 w-full h-[600px] overflow-hidden bg-sf-bg/40 rounded-none border border-sf-border p-6 ${className}`}>
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
              <h3 className="text-sm font-medium text-sf-muted capitalize tracking-wider flex items-center gap-2">
                {type.replace("-", " ")}
                <Badge label={typeNodes.length.toString()} className="bg-sf-surface/50 text-xs" />
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
                        ${isSelected ? 'ring-2 ring-sf-accent ring-offset-2 ring-offset-sf-bg shadow-lg shadow-sf-accent/20 scale-105' : 'hover:shadow-md hover:shadow-black/40'}
                      `}
                    >
                      <div className={`p-3 rounded-none bg-sf-bg/50 shadow-inner`}>
                        {getIconForType(node.type)}
                      </div>
                      
                      <div className="w-full">
                        <p className="font-semibold text-sm text-sf-text line-clamp-1 break-all" title={node.name || node.type}>
                          {node.name || `${node.type.toUpperCase()}`}
                        </p>
                        <p className="text-xs text-sf-muted mt-1 truncate" title={node.id}>
                          {node.id.split('--')[1]?.substring(0, 8) || 'unknown'}
                        </p>
                      </div>

                      {/* Display connected edges count badge */}
                      {edges.filter(e => e.source === node.id || e.target === node.id).length > 0 && (
                        <div className="absolute -top-2 -right-2 bg-sf-surface border border-sf-border text-sf-text text-[10px] w-6 h-6 flex items-center justify-center rounded-none shadow-sm">
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
            className="h-full flex flex-col bg-sf-bg/60 rounded-none border border-sf-border backdrop-blur-md overflow-hidden shrink-0"
          >
            <div className="p-4 border-b border-sf-border flex justify-between items-center bg-sf-bg/50">
              <h3 className="font-semibold text-sf-text">Entity Inspector</h3>
              <Button variant="ghost" className="h-6 w-6 p-0 rounded-none text-sf-muted hover:text-sf-text" onClick={() => setSelectedNode(null)}>
                &times;
              </Button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6">
              {/* Properties */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-md ${getColorForType(selectedNode.type)}`}>
                    {getIconForType(selectedNode.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-sf-text uppercase tracking-widest">{selectedNode.type}</h4>
                    <p className="text-xs text-sf-muted break-all">{selectedNode.id}</p>
                  </div>
                </div>
                
                {selectedNode.name && (
                  <div>
                    <p className="text-xs font-semibold text-sf-muted uppercase">Name</p>
                    <p className="text-sm text-sf-text mt-1">{selectedNode.name}</p>
                  </div>
                )}
                
                {selectedNode.description && (
                  <div>
                    <p className="text-xs font-semibold text-sf-muted uppercase">Description</p>
                    <p className="text-sm text-sf-text mt-1 line-clamp-4">{selectedNode.description}</p>
                  </div>
                )}

                {selectedNode.pattern && (
                  <div>
                    <p className="text-xs font-semibold text-sf-muted uppercase">Pattern</p>
                    <div className="mt-1 bg-sf-bg border border-sf-border rounded-none p-2 text-xs text-sf-accent font-mono overflow-auto custom-scrollbar max-h-32">
                      {selectedNode.pattern}
                    </div>
                  </div>
                )}
              </div>

              {/* Relationships */}
              <div className="pt-4 border-t border-sf-border">
                <h4 className="text-xs font-semibold text-sf-muted uppercase mb-3 flex items-center gap-2">
                  <Network className="w-3 h-3" /> Relationships
                </h4>
                
                <div className="flex flex-col gap-2">
                  {edges.filter(e => e.source === selectedNode.id).map((e, idx) => {
                    const targetNode = nodes.find(n => n.id === e.target);
                    return (
                      <div key={`out-${idx}`} className="bg-sf-surface/30 rounded-none p-2 border border-sf-border/50 flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <Badge label={e.type} className="text-[10px] bg-sf-bg border-sf-border px-1 py-0" />
                          <ChevronRight className="w-3 h-3 text-sf-muted" />
                          <span className="text-xs text-sf-text truncate max-w-[120px]" title={targetNode?.name || targetNode?.id}>
                            {targetNode?.name || targetNode?.type || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {edges.filter(e => e.target === selectedNode.id).map((e, idx) => {
                    const sourceNode = nodes.find(n => n.id === e.source);
                    return (
                      <div key={`in-${idx}`} className="bg-sf-surface/30 rounded-none p-2 border border-sf-border/50 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sf-muted">
                          <span className="text-xs text-sf-text truncate max-w-[120px]" title={sourceNode?.name || sourceNode?.id}>
                            {sourceNode?.name || sourceNode?.type || 'Unknown'}
                          </span>
                          <ChevronRight className="w-3 h-3" />
                          <Badge label={e.type} className="text-[10px] bg-sf-bg border-sf-border px-1 py-0" />
                        </div>
                      </div>
                    );
                  })}

                  {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length === 0 && (
                    <p className="text-xs text-sf-muted italic">No connected entities discovered yet.</p>
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
