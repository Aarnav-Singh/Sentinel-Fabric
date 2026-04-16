"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LayoutDashboard, Fingerprint, Crosshair, Target, BookOpen, Shield, Server, Lock, Network, Zap, FileText, ShieldCheck, Activity, Settings, Bell, Search } from "lucide-react";
import { RealSparkline } from "@/components/ui/RealSparkline";
import { NavGroup } from "@/components/ui/NavGroup";
import { useThreatState } from "@/contexts/ThreatStateContext";
import { useEventStream } from "@/contexts/EventStreamContext";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";

const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { id: "dashboard", name: "Command Center", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: "events", name: "Raw Events", href: "/events", icon: <Fingerprint className="w-4 h-4" /> },
      { id: "findings", name: "Threat Findings", href: "/findings", icon: <Crosshair className="w-4 h-4" /> },
    ]
  },
  {
    label: "Intelligence",
    items: [
      { id: "campaigns", name: "Campaigns", href: "/campaigns", icon: <Target className="w-4 h-4" /> },
      { id: "sigma-rules", name: "Sigma Rules", href: "/sigma-rules", icon: <BookOpen className="w-4 h-4" /> },
    ]
  },
  {
    label: "Infrastructure",
    items: [
      { id: "posture", name: "Posture", href: "/posture", icon: <Shield className="w-4 h-4" /> },
      { id: "assets", name: "Asset Registry", href: "/integrations", icon: <Server className="w-4 h-4" /> },
      { id: "vault", name: "Secure Vault", href: "/vault", icon: <Lock className="w-4 h-4" /> },
    ]
  },
  {
    label: "Automation",
    items: [
      { id: "pipeline", name: "ML Pipeline", href: "/pipeline", icon: <Network className="w-4 h-4" /> },
      { id: "soar", name: "SOAR Actions", href: "/soar", icon: <Zap className="w-4 h-4" /> },
    ]
  },
  {
    label: "Admin",
    items: [
      { id: "audit", name: "Audit Trail", href: "/audit", icon: <FileText className="w-4 h-4" /> },
      { id: "compliance", name: "Compliance", href: "/compliance", icon: <ShieldCheck className="w-4 h-4" /> },
      { id: "health", name: "System Health", href: "/health", icon: <Activity className="w-4 h-4" /> },
      { id: "settings", name: "Settings", href: "/settings", icon: <Settings className="w-4 h-4" /> },
    ]
  }
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { threatState } = useThreatState();
  const { eventsRate } = useEventStream();

  // Fetch recent critical findings for notification bell
  const { data: findingsRes } = useSWR("/api/proxy/api/v1/findings", url => fetch(url).then(r => r.json()), { refreshInterval: 10000 });
  const findings = Array.isArray(findingsRes) ? findingsRes : findingsRes?.findings || [];
  const recentCritical = findings.filter((f: any) => f.severity === "critical" && f.status !== "dismissed" && f.status !== "approved");
  const criticalCount = recentCritical.length;

  const expanded = sidebarOpen || hovering;

  const stateColor = {
    nominal: "text-sf-safe",
    elevated: "text-sf-warning",
    incident: "text-sf-critical",
  };
  const stateLabel = {
    nominal: "SYSTEM SECURE",
    elevated: "ELEVATED RISK",
    incident: "ACTIVE INCIDENT",
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (pathname === "/") return <>{children}</>;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-sf-bg font-sans text-sf-text">
      {/* Header */}
      <header className={`shrink-0 h-14 border-b border-sf-border bg-sf-surface flex items-center px-4 transition-colors duration-500`}
        style={threatState === "incident" ? { borderBottomColor: "var(--sf-critical)" } : {}}
      >
        <div className="flex items-center gap-4 w-56 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 group no-underline">
            <div className={`w-6 h-6 border flex items-center justify-center font-bold text-xs transition-colors
              ${threatState === "incident" ? "border-sf-critical bg-sf-critical/10 text-sf-critical" : "border-sf-border bg-sf-bg text-sf-accent"}`}
            >
              UX
            </div>
            <span className="font-bold tracking-widest text-sm uppercase hidden sm:block">UMBRIX</span>
          </Link>
          <motion.button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-sf-muted hover:text-sf-text transition-colors ml-auto"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
        </div>

        <div className="flex-1 flex items-center px-4">
          <div className="relative w-full max-w-lg hidden md:block group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sf-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="SEARCH PLATFORM..."
              className="w-full bg-sf-bg border border-sf-border h-8 pl-9 pr-12 text-[11px] font-mono focus:outline-none focus:border-sf-border-active placeholder:text-sf-muted/40 transition-colors"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-sf-muted border border-sf-border px-1.5 py-0.5 bg-sf-surface group-focus-within:border-sf-accent group-focus-within:text-sf-accent">
              ⌘K
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {/* EPS Sparkline */}
          <div className="hidden md:flex items-center gap-2">
            <RealSparkline source="eps" width={60} height={18} />
            <span className="text-[11px] font-mono text-sf-accent">{eventsRate} EPS</span>
          </div>

          {/* Bell */}
          <div className="relative">
            <button onClick={() => setNotifOpen(o => !o)} className="relative text-sf-muted hover:text-sf-text">
              <Bell className="w-4 h-4" />
              {criticalCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-sf-critical text-[7px] font-mono flex items-center justify-center">
                  {criticalCount > 9 ? "9+" : criticalCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  className="absolute right-0 top-8 w-80 sf-panel-elevated z-50 p-3"
                >
                  <div className="text-[10px] font-mono text-sf-muted uppercase tracking-widest mb-2">Recent Critical</div>
                  {recentCritical.length === 0 ? (
                    <div className="text-sf-muted text-[11px] py-2">No unresolved critical findings</div>
                  ) : (
                    recentCritical.slice(0, 5).map((f: any) => (
                      <Link key={f.id} href={`/findings`} onClick={() => setNotifOpen(false)}
                        className="flex items-center gap-2 py-1.5 border-b border-sf-border/50 last:border-0 hover:bg-sf-surface/50 no-underline">
                        <span className="w-1.5 h-1.5 bg-sf-critical shrink-0" />
                        <span className="text-[11px] text-sf-text truncate">{f.summary || f.id}</span>
                      </Link>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Threat State Pill */}
          <div className={`hidden sm:flex items-center gap-1.5 text-[10px] font-mono ${stateColor[threatState]}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {stateLabel[threatState]}
          </div>

          {/* Profile */}
          <Link href="/profile" className="w-7 h-7 bg-sf-surface border border-sf-border flex items-center justify-center text-sf-accent text-[10px] font-mono no-underline hover:border-sf-border-active">
            OP
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <aside
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          className={`shrink-0 flex flex-col bg-sf-bg border-r border-sf-border overflow-hidden transition-all duration-200 ease-out z-40 relative md:relative md:translate-x-0 absolute inset-y-0 left-0
            ${expanded ? "w-56" : "w-14"}
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
          style={{ background: `linear-gradient(180deg, var(--sf-bg) 0%, color-mix(in srgb, var(--sf-bg) 95%, var(--sf-surface)) 100%)` }}
        >
          <div className="flex flex-col flex-1 py-2 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {NAV_GROUPS.map(group => (
              <NavGroup key={group.label} label={group.label} items={group.items} expanded={expanded} />
            ))}
          </div>

          {/* Footer — Threat State Badge */}
          <div className="shrink-0 border-t border-sf-border/20 p-3 bg-sf-bg/95 backdrop-blur-sm shadow-[0_-4px_12px_rgba(0,0,0,0.5)] z-10">
            <div className={`flex items-center gap-2 text-[10px] font-mono ${stateColor[threatState]}`}>
              <span className="w-1.5 h-1.5 rounded-none bg-current shrink-0" />
              {expanded && stateLabel[threatState]}
            </div>
          </div>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}
