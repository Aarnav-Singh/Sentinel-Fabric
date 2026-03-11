"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Lock, Command } from "lucide-react";
import { motion } from "framer-motion";
import { auth } from "@/lib/api/client";
import { setAuth } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const data = await auth.login(username, password);
      setAuth(data.access_token, data.tenant_id);
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid credentials";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none mix-blend-screen bg-brand-navy" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-accent/5 via-transparent to-brand-dark" />

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-accent to-transparent opacity-50" />

        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-surface border border-brand-border rounded-2xl flex items-center justify-center mb-4 relative group">
              <div className="absolute inset-0 bg-brand-accent/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Shield className="w-8 h-8 text-brand-accent relative z-10" />
            </div>
            <h1 className="font-display font-bold text-2xl text-text-primary tracking-wide">SENTINEL FABRIC</h1>
            <p className="text-text-secondary text-sm mt-1 font-mono tracking-wider">SECURE COMMAND CENTER</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted ml-1">Analyst ID</label>
              <div className="relative">
                <Command className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  required
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all placeholder:text-text-muted/50"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted ml-1">Access Token</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-dark border border-brand-border rounded-lg py-2.5 pl-10 pr-4 text-sm text-text-primary focus:border-brand-accent focus:ring-1 focus:ring-brand-accent outline-none transition-all placeholder:text-text-muted/50 tracking-widest"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg text-center font-mono">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-brand-accent/10 border border-brand-accent/50 hover:bg-brand-accent/20 hover:border-brand-accent text-brand-accent px-4 py-3 rounded-lg font-bold transition-all shadow-[0_0_15px_rgba(0,242,255,0.15)] hover:shadow-[0_0_20px_rgba(0,242,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Authenticate <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="px-8 py-4 bg-brand-surface border-t border-brand-border flex items-center justify-between">
          <span className="text-xs text-text-muted font-mono">NODE: US-EAST-1</span>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse shadow-[0_0_5px_rgba(16,185,129,1)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">System Online</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
