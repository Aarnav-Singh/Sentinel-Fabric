"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroupProps {
  label: string;
  items: NavItem[];
  expanded: boolean;
}

export function NavGroup({ label, items, expanded }: NavGroupProps) {
  const pathname = usePathname();

  return (
    <div className="mt-1">
      {expanded && (
        <div className="px-3 pt-3 pb-1 text-[9px] font-medium uppercase tracking-[0.12em] text-sf-muted/40 select-none border-t border-sf-border/20 mt-1">
          {label}
        </div>
      )}
      {!expanded && <div className="mt-1 border-t border-sf-border/20" />}
      {items.map(item => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 transition-colors group relative
              ${active
                ? "bg-sf-surface-2 border-l-2 border-sf-accent text-sf-text"
                : "border-l-2 border-transparent text-sf-muted hover:text-sf-text hover:bg-sf-surface/50"
              }`}
          >
            <span className="shrink-0 w-5 h-5 flex items-center justify-center">{item.icon}</span>
            {expanded && (
              <span className="text-[12px] font-normal whitespace-nowrap overflow-hidden">{item.name}</span>
            )}
            {!expanded && (
              <div className="absolute left-14 z-50 hidden group-hover:flex items-center">
                <div className="bg-sf-surface border border-sf-border px-2 py-1 text-[11px] text-sf-text whitespace-nowrap shadow-xl">
                  {item.name}
                </div>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
