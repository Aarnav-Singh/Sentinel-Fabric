"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, Download, ShieldAlert, Cpu, Loader2 } from 'lucide-react';

import { useToast } from '@/components/ui/Toast';

interface TechniqueData {
  id: string;
  name: string;
  rule_count: number;
  coverage_pct: number;
}

interface TacticData {
  tactic_name: string;
  techniques: Record<string, TechniqueData>;
}

interface MitreCoverageResponse {
  summary: {
    total_techniques: number;
    covered_techniques: number;
    coverage_pct: number;
    total_sigma_rules: number;
    total_tactics: number;
    covered_tactics: number;
  };
  by_tactic: Record<string, TacticData>;
}

interface MitreHeatmapProps {
  className?: string;
}

export function MitreHeatmap({ className = '' }: MitreHeatmapProps) {
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [coverageData, setCoverageData] = useState<MitreCoverageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/proxy/api/v1/compliance/mitre-coverage')
      .then(res => res.json())
      .then(data => {
        setCoverageData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load MITRE coverage", err);
        setLoading(false);
      });
  }, []);
  
  return (
    <div className={`flex flex-col h-full bg-sf-bg ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between shrink-0 mb-4 bg-sf-surface border border-sf-border p-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-sf-accent w-5 h-5" />
          <div>
            <h2 className="text-sm font-mono font-bold tracking-widest text-sf-text uppercase">MITRE ATT&CK Matrix</h2>
            <div className="text-[10px] text-sf-muted font-mono uppercase tracking-widest flex items-center gap-2">
              Enterprise v14.0 Coverage
              {coverageData && (
                <span className="text-sf-accent border border-sf-accent/30 px-1 py-0.5 rounded-sm">
                  {coverageData.summary.covered_techniques} / {coverageData.summary.total_techniques} Techniques Covered ({(coverageData.summary.coverage_pct * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-sf-border hover:bg-sf-surface text-sf-text text-xs uppercase font-mono tracking-widest transition-colors">
              <Download size={14} /> Export JSON
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-sf-accent/10 border border-sf-accent/30 text-sf-accent hover:bg-sf-accent/20 text-xs uppercase font-mono tracking-widest transition-colors">
              <Cpu size={14} /> Auto-Map Rules
            </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-sf-border p-4 bg-black/20">
          <Loader2 className="w-8 h-8 text-sf-accent animate-spin mb-4" />
          <div className="text-xs font-mono text-sf-muted uppercase tracking-widest animate-pulse">Loading MITRE Matrix...</div>
        </div>
      ) : !coverageData ? (
        <div className="flex-1 flex flex-col items-center justify-center border border-sf-border p-4 bg-black/20 text-sf-critical text-xs font-mono uppercase">
          Failed to load MITRE coverage data.
        </div>
      ) : (
        /* Matrix Canvas */
        <div className="flex-1 overflow-auto custom-scrollbar border border-sf-border p-4 bg-black/20 relative">
          <div className="inline-flex gap-2 min-w-max">
            {Object.entries(coverageData.by_tactic).map(([tacticKey, tacticData]) => {
              const techniques = Object.entries(tacticData.techniques).map(([tid, tval]: [string, any]) => ({
                id: tid,
                name: tval.name || `Technique ${tid}`,
                rule_count: tval.rules?.length || 0,
                coverage_pct: tval.covered ? 1.0 : 0.0
              })).sort((a, b) => a.id.localeCompare(b.id));

              return (
                <div key={tacticKey} className="flex flex-col w-40 shrink-0 gap-2">
                  {/* Tactic Header */}
                  <div className="bg-sf-surface border border-sf-border p-2 text-center sticky top-0 z-10 shadow-md">
                    <div className="text-[10px] font-mono font-bold text-sf-text tracking-widest uppercase truncate" title={tacticData.tactic_name}>
                      {tacticData.tactic_name}
                    </div>
                    <div className="text-[9px] text-sf-muted font-mono mt-1">
                      {techniques.length} Techniques
                    </div>
                  </div>
                  
                  {/* Techniques List */}
                  <div className="flex flex-col gap-1 mt-1">
                    {techniques.map((tech) => {
                      let bgColor = 'bg-sf-surface/50 border-sf-border';
                      if (tech.rule_count > 0) {
                        if (tech.coverage_pct >= 0.8) bgColor = 'bg-sf-safe/20 border-sf-safe/50';
                        else if (tech.coverage_pct >= 0.4) bgColor = 'bg-sf-warning/20 border-sf-warning/50';
                        else bgColor = 'bg-sf-accent/20 border-sf-accent/50';
                      }

                      return (
                        <motion.div
                          key={tech.id}
                          whileHover={{ scale: 1.02 }}
                          onHoverStart={() => setHoveredNode({ ...tech, tactic: tacticData.tactic_name })}
                          onHoverEnd={() => setHoveredNode(null)}
                          onClick={() => toast(`Viewing rules for technique ${tech.id}: ${tech.name}`, 'info')}
                          className={`relative p-2 border cursor-pointer transition-colors ${bgColor} hover:brightness-125`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[9px] font-mono text-sf-text/70">{tech.id.toUpperCase()}</span>
                            {tech.rule_count > 0 && (
                              <span className="text-[8px] font-mono bg-sf-bg px-1 text-sf-accent/80 border border-sf-border">
                                {tech.rule_count} rules
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] font-mono leading-tight text-sf-text break-words">
                            {tech.name}
                          </div>
                          
                          {/* Coverage Indicator */}
                          {tech.rule_count > 0 && (
                            <div className="mt-2 h-0.5 w-full bg-sf-bg/50 overflow-hidden">
                              <div 
                                className="h-full bg-sf-accent transition-all duration-1000" 
                                style={{ width: `${Math.max(10, tech.coverage_pct * 100)}%` }}
                              />
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Tooltip */}
          <AnimatePresence>
            {hoveredNode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="fixed bottom-6 right-6 p-4 bg-sf-surface border border-sf-border shadow-2xl z-50 w-80 pointer-events-none"
              >
                <div className="text-[9px] font-mono text-sf-accent uppercase tracking-widest mb-1">
                  {hoveredNode.tactic}
                </div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-mono font-bold text-sf-text">{hoveredNode.name}</h3>
                  <span className="text-[10px] font-mono text-sf-muted px-1 border border-sf-border">
                    {hoveredNode.id.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-sf-muted leading-relaxed">
                  Mapped to <span className="text-sf-accent">{hoveredNode.rule_count} active detection rule{hoveredNode.rule_count !== 1 ? 's' : ''}</span> in your Sigma rule repository.
                </p>
                <div className="mt-3 space-y-2 pt-2 border-t border-sf-border">
                    <div className="flex justify-between text-[10px] font-mono text-sf-muted mb-1 uppercase tracking-widest">
                        <span>Detection Coverage</span>
                        <span>{Math.round(hoveredNode.coverage_pct * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-sf-surface rounded-none overflow-hidden">
                        <div className="h-full bg-sf-accent" style={{ width: `${hoveredNode.coverage_pct * 100}%` }} />
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
