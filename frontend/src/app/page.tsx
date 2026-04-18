"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api/client";
import { setAuth } from "@/lib/auth";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { NeonButton } from "@/components/ui/NeonButton";

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
    <div className="min-h-screen bg-ng-base flex items-center justify-center relative overflow-hidden">
      {/* Ambient background handled in layout, but added slight grid accent for login */}
      
      {/* Panel */}
      <div className="relative z-10 w-full max-w-xs mx-4">
        <GlassPanel className="p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <svg width="40" height="40" viewBox="0 0 20 20" className="text-ng-cyan mb-3" fill="none">
              <polygon points="10,1 19,6 19,14 10,19 1,14 1,6" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <line x1="10" y1="1" x2="10" y2="19" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <h1 className="font-headline tracking-widest uppercase text-[28px] font-headline font-bold text-ng-on leading-none uppercase tracking-widest text-shadow-cyan">UMBRIX</h1>
            <p className="text-[12px] text-ng-muted mt-1 uppercase tracking-widest font-mono">Operations Terminal</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-medium text-ng-muted uppercase tracking-widest mb-1.5 font-mono">Identifier</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-ng-base/50 border border-ng-outline-dim/40 text-ng-on text-[13px] px-3 h-9 focus:outline-none focus:border-ng-cyan/60 placeholder:text-ng-muted/40 font-mono rounded-none"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-ng-muted uppercase tracking-widest mb-1.5 font-mono">Passphrase</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-ng-base/50 border border-ng-outline-dim/40 text-ng-on text-[13px] px-3 h-9 focus:outline-none focus:border-ng-cyan/60 placeholder:text-ng-muted/40 font-mono rounded-none"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-ng-error text-[11px] font-mono">{error}</p>}
            <NeonButton
              type="submit"
              loading={isLoading}
              className="w-full mt-2"
            >
              {isLoading ? "Authenticating…" : "Access Platform"}
            </NeonButton>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-ng-outline-dim/40 flex justify-between text-[9px] font-mono text-ng-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-ng-lime animate-pulse inline-block rounded-none"></span>
              PIPELINE ACTIVE
            </span>
            <span>US-E1</span>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
