"use client";

import React from 'react';
import { useEntity } from '@/contexts/EntityContext';

interface EntityLinkProps {
  type: 'ip' | 'host' | 'user' | 'hash';
  value: string;
  children?: React.ReactNode;
  className?: string;
}

export function EntityLink({ type, value, children, className = '' }: EntityLinkProps) {
  const { openEntity } = useEntity();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openEntity(type, value);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 font-mono text-sf-accent hover:text-sf-accent/80 hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-sf-accent/50 rounded px-1 -mx-1 ${className}`}
      title={`Investigate ${type}: ${value}`}
    >
      {/* Visual indicator that this is an interactive entity */}
      {type === 'ip' && <span className="text-[10px] text-sf-muted font-sans border border-sf-muted/30 px-1 rounded-sm bg-black/20">IP</span>}
      {type === 'host' && <span className="text-[10px] text-sf-muted font-sans border border-sf-muted/30 px-1 rounded-sm bg-black/20">HST</span>}
      {type === 'user' && <span className="text-[10px] text-sf-muted font-sans border border-sf-muted/30 px-1 rounded-sm bg-black/20">USR</span>}
      {type === 'hash' && <span className="text-[10px] text-sf-muted font-sans border border-sf-muted/30 px-1 rounded-sm bg-black/20">MD5</span>}
      
      {children || value}
    </button>
  );
}
