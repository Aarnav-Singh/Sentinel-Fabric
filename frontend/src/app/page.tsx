"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Lock, Command } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/api/client";
import { setAuth } from "@/lib/auth";
import { PanelCard } from "@/components/ui/MotionWrappers";

const formFieldVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.05, duration: 0.2 },
  }),
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const data = await auth.login(username, password);
      setAuth(data.access_token, data.tenant_id);
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 400);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid credentials";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sf-bg flex items-center justify-center relative overflow-hidden">
      {/* Ambient dot-grid background */}
      <div
        className="absolute inset-0 z-0 pointer-events-none animate-ambient-drift"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--sf-bg)_100%)]" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-xs mx-4" style={{ boxShadow: "0 0 60px rgba(109,40,217,0.15)" }}>
        <div className="sf-panel-elevated p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <svg width="40" height="40" viewBox="0 0 20 20" className="text-sf-accent mb-3" fill="none">
              <polygon points="10,1 19,6 19,14 10,19 1,14 1,6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <line x1="10" y1="1" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <h1 className="text-[28px] font-medium text-sf-text leading-none">UMBRIX</h1>
            <p className="text-[12px] text-sf-muted mt-1 uppercase tracking-widest font-mono">Operations Terminal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-medium text-sf-muted uppercase tracking-widest mb-1.5 font-mono">Identifier</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-sf-bg border border-sf-border text-sf-text text-[13px] px-3 h-9 focus:outline-none focus:border-sf-border-active placeholder:text-sf-muted/40 font-mono"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-sf-muted uppercase tracking-widest mb-1.5 font-mono">Passphrase</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-sf-bg border border-sf-border text-sf-text text-[13px] px-3 h-9 focus:outline-none focus:border-sf-border-active placeholder:text-sf-muted/40 font-mono"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sf-critical text-[11px] font-mono">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-9 bg-sf-accent hover:bg-sf-accent/90 text-sf-bg text-[13px] font-medium transition-colors disabled:opacity-50 font-mono tracking-widest uppercase mt-2 rounded-[2px]"
            >
              {isLoading ? "Authenticating…" : "Access Platform"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-sf-border/50 flex justify-between text-[9px] font-mono text-sf-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-sf-safe rounded-[1px] animate-pulse-fast inline-block"></span>
              PIPELINE ACTIVE
            </span>
            <span>US-E1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
