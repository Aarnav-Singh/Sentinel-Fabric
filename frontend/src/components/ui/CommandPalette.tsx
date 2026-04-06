"use client";

import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { useCommandPaletteContext } from '@/contexts/CommandPaletteContext';
import { useEntity } from '@/contexts/EntityContext';
import { useRouter } from 'next/navigation';
import { Search, FolderSync, ShieldAlert, MonitorPlay, Radar, Activity, Zap, Server, Settings, FileText, ChevronRight, Clock, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export function CommandPalette() {
  const { isOpen, close } = useCommandPaletteContext();
  const { openEntity } = useEntity();
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleSelect = (callback: () => void) => {
    callback();
    close();
  };

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  if (!isOpen) return null;

  const showNav = !search.startsWith('>') && !search.startsWith('/');
  const showActions = !search.startsWith('/');
  
  const isEntity = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(search) || search.includes('@') || search.length === 32 || search.length === 64;
  const entityTypeOverride = search.includes('@') ? 'user' : (search.length === 32 || search.length === 64) ? 'hash' : 'ip';
  
  const isNLQuery = search.length > 5 && !search.startsWith('>') && !search.startsWith('/') && !isEntity;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close} 
      />
      <Command 
        className="relative w-full max-w-2xl bg-sf-surface border border-sf-border shadow-2xl rounded-xl overflow-hidden font-sans"
        filter={(value, search) => {
          let cleanSearch = search;
          if (search.startsWith('>') || search.startsWith('/')) {
              cleanSearch = search.slice(1);
          }
          if (!cleanSearch) return 1;
          return value.toLowerCase().includes(cleanSearch.toLowerCase()) ? 1 : 0;
        }}
        loop
      >
        <div className="flex items-center border-b border-sf-border px-3">
          <Search className="w-4 h-4 text-sf-muted mr-2 shrink-0" />
          <Command.Input 
            autoFocus
            value={search}
            onValueChange={setSearch}
            className="flex-1 w-full h-12 bg-transparent text-sf-text placeholder-sf-muted focus:outline-none focus:ring-0 text-sm font-mono" 
            placeholder="Type a command or search..." 
          />
          <div className="flex items-center gap-1">
             <kbd className="bg-sf-bg border border-sf-border px-1.5 py-0.5 text-[10px] font-mono text-sf-muted rounded">ESC</kbd>
          </div>
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
          <Command.Empty className="py-6 text-center text-sm font-mono text-sf-muted">
            No results found.
          </Command.Empty>

          {search.length === 0 && (
             <Command.Group heading="Recent" className="text-xs font-mono text-sf-muted px-2 py-1.5 mb-1">
               <Command.Item 
                  value="recent dashboard"
                  onSelect={() => handleSelect(() => router.push('/dashboard'))}
                  className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
              >
                <Clock className="w-4 h-4 mr-3 text-sf-muted group-aria-selected:text-sf-accent" />
                Command Center Dashboard
              </Command.Item>
              <Command.Item 
                  value="recent findings"
                  onSelect={() => handleSelect(() => router.push('/findings'))}
                  className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
              >
                <Clock className="w-4 h-4 mr-3 text-sf-muted group-aria-selected:text-sf-accent" />
                Latest Threat Findings
              </Command.Item>
             </Command.Group>
          )}

          {isEntity && (
             <Command.Group heading="Entity Search" className="text-xs font-mono text-sf-muted px-2 py-1.5 mb-1">
               <Command.Item 
                  value={`investigate ${search}`}
                  onSelect={() => handleSelect(() => openEntity(entityTypeOverride as any, search))}
                  className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-accent aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
              >
                <Search className="w-4 h-4 mr-3 text-sf-accent" />
                Investigate {entityTypeOverride}: {search}
              </Command.Item>
             </Command.Group>
          )}

          {isNLQuery && (
             <Command.Group heading="Natural Language Search (UQL Beta)" className="text-xs font-mono text-sf-muted px-2 py-1.5 mb-1 bg-sf-accent/5 border border-sf-accent/10 rounded my-1">
               <Command.Item 
                  value={`nl query ${search}`}
                  onSelect={() => handleSelect(() => toast(`Generating UQL query for: "${search}"`, 'info'))}
                  className="flex items-center px-4 py-3 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
              >
                <Sparkles className="w-4 h-4 mr-3 text-sf-accent" />
                <span>Translate to UQL: <span className="text-sf-accent font-italic">&quot;{search}&quot;</span></span>
              </Command.Item>
             </Command.Group>
          )}

          {showNav && (
            <Command.Group heading="Navigation" className="text-xs font-mono text-sf-muted px-2 py-1.5 mb-1">
            <Command.Item 
                value="command center dashboard nav"
                onSelect={() => handleSelect(() => router.push('/dashboard'))}
                className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
            >
              <MonitorPlay className="w-4 h-4 mr-3 text-sf-muted group-aria-selected:text-sf-accent" />
              Command Center
            </Command.Item>
            <Command.Item 
                value="raw events alerts nav"
                onSelect={() => handleSelect(() => router.push('/events'))}
                className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
            >
              <Activity className="w-4 h-4 mr-3 text-sf-muted group-aria-selected:text-sf-accent" />
              Raw Events
            </Command.Item>
            <Command.Item 
                value="threat findings incidents nav"
                onSelect={() => handleSelect(() => router.push('/findings'))}
                className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
            >
              <Radar className="w-4 h-4 mr-3 text-sf-muted group-aria-selected:text-sf-accent" />
              Threat Findings
            </Command.Item>
            <Command.Item 
                value="ml pipeline models train nav"
                onSelect={() => handleSelect(() => router.push('/pipeline'))}
                className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
            >
              <FolderSync className="w-4 h-4 mr-3 text-sf-muted group-aria-selected:text-sf-accent" />
              ML Pipeline
            </Command.Item>
             <Command.Item 
                value="sigma rules detections nav"
                onSelect={() => handleSelect(() => router.push('/sigma-rules'))}
                className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
            >
              <ShieldAlert className="w-4 h-4 mr-3 text-sf-muted group-aria-selected:text-sf-accent" />
              Sigma Rules
            </Command.Item>
            </Command.Group>
          )}

          {showNav && showActions && (
            <Command.Separator className="h-px bg-sf-border my-2" />
          )}

          {showActions && (
            <Command.Group heading="Actions" className="text-xs font-mono text-sf-muted px-2 py-1.5 mb-1">
               <Command.Item 
                  value="run soar playbook actions"
                  onSelect={() => handleSelect(() => toast('Started new playbook run.', 'success'))}
                  className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
              >
                <Zap className="w-4 h-4 mr-3 text-sf-muted group-aria-selected:text-sf-accent" />
                Run SOAR Playbook...
              </Command.Item>
              <Command.Item 
                  value="preferences settings actions"
                  onSelect={() => handleSelect(() => toast('Settings opened.', 'info'))}
                  className="flex items-center px-4 py-2 hover:bg-sf-bg cursor-pointer text-sm text-sf-text aria-selected:bg-sf-bg aria-selected:text-sf-accent group"
              >
                <Settings className="w-4 h-4 mr-3 text-sf-muted group-aria-selected:text-sf-accent" />
                Preferences
              </Command.Item>
            </Command.Group>
          )}
        </Command.List>
        <div className="bg-sf-bg border-t border-sf-border p-2 flex items-center justify-between">
           <div className="flex gap-2.5">
             <div className="flex items-center gap-1 font-mono text-[9px] text-sf-muted">
                 <kbd className="bg-sf-surface border border-sf-border px-1 py-0.5 rounded">↑</kbd>
                 <kbd className="bg-sf-surface border border-sf-border px-1 py-0.5 rounded">↓</kbd>
                 <span>navigate</span>
             </div>
             <div className="flex items-center gap-1 font-mono text-[9px] text-sf-muted">
                 <kbd className="bg-sf-surface border border-sf-border px-1 py-0.5 rounded">↵</kbd>
                 <span>execute</span>
             </div>
           </div>
           <div className="font-mono text-[9px] text-sf-muted flex items-center">
               <span className="text-sf-accent/70 mr-1">TIPS:</span> use <kbd className="mx-1 bg-sf-surface px-1">/nav</kbd> or <kbd className="mx-1 bg-sf-surface px-1">{`>`}</kbd> for actions
           </div>
        </div>
      </Command>
      <style jsx global>{`
        [cmdk-item][aria-selected="true"] {
          background: var(--sf-bg);
          color: var(--sf-accent);
        }
        [cmdk-group-heading] {
            user-select: none;
            padding-left: 8px;
            color: var(--sf-muted);
            margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
