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
    <div className="min-h-screen bg-sf-bg flex flex-col justify-center items-center p-4 relative overflow-hidden font-mono text-[10px] uppercase tracking-widest text-sf-muted">
      
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Login Terminal */}
      <AnimatePresence mode="wait">
        {!success ? (
          <motion.div
            key="login-card"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm relative z-10"
          >
            <PanelCard className="p-0 overflow-hidden rounded-none border-[1px] border-sf-border shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                
              {/* Header Box */}
              <div className="p-6 border-b border-sf-border bg-sf-surface flex flex-col items-center">
                  <div className="w-12 h-12 border border-sf-border bg-sf-bg flex items-center justify-center mb-4">
                      <Shield className="w-5 h-5 text-sf-accent" />
                  </div>
                  <h1 className="text-sm font-bold text-sf-text tracking-widest">UMBRIX</h1>
                  <p className="text-[9px] text-sf-muted mt-1 tracking-widest">TERMINAL ACCESS REQUIRED</p>
              </div>

              <div className="p-6 bg-sf-bg relative">
                   <form onSubmit={handleLogin} className="space-y-4">
                        <motion.div custom={0} initial="hidden" animate="visible" variants={formFieldVariants} className="space-y-1.5 flex flex-col">
                            <label className="text-[9px] font-bold text-sf-muted">ANALYST ID</label>
                            <div className="relative">
                                <Command className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-sf-muted" />
                                <input
                                    type="text"
                                    required
                                    placeholder="admin"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-sf-surface border border-sf-border py-2 pl-9 pr-3 text-[11px] text-sf-text focus:border-sf-accent focus:ring-0 outline-none transition-colors placeholder:text-sf-muted/30"
                                    disabled={isLoading}
                                    style={{ fontFamily: 'monospace' }}
                                />
                            </div>
                        </motion.div>

                        <motion.div custom={1} initial="hidden" animate="visible" variants={formFieldVariants} className="space-y-1.5 flex flex-col">
                            <label className="text-[9px] font-bold text-sf-muted">ACCESS PIN</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-sf-muted" />
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-sf-surface border border-sf-border py-2 pl-9 pr-3 text-[11px] text-sf-text focus:border-sf-accent focus:ring-0 outline-none transition-colors placeholder:text-sf-muted/30 tracking-widest"
                                    disabled={isLoading}
                                    style={{ fontFamily: 'monospace' }}
                                />
                            </div>
                        </motion.div>

                        <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-sf-critical text-sf-bg font-bold text-[9px] px-3 py-2 text-center"
                            >
                                ERR: {error}
                            </motion.div>
                        )}
                        </AnimatePresence>

                        <motion.div custom={2} initial="hidden" animate="visible" variants={formFieldVariants} className="pt-2">
                             <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 border border-sf-accent bg-sf-accent/10 hover:bg-sf-accent hover:text-black text-sf-accent min-h-[40px] font-bold transition-colors disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <span className="flex gap-2 items-center"><span className="w-3 h-3 border border-current border-t-transparent animate-spin rounded-full" /> AUTHENTICATING</span>
                                ) : (
                                    <span className="flex gap-2 items-center text-[10px]">VERIFY <ArrowRight className="w-3 h-3" /></span>
                                )}
                            </button>
                        </motion.div>
                   </form>
              </div>

               <div className="px-4 py-3 bg-sf-surface border-t border-sf-border flex items-center justify-between">
                   <div className="flex gap-2">
                        <span className="text-[9px] bg-sf-bg px-1 border border-sf-border text-sf-muted">NODE: US-E1</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                       <span className="w-1.5 h-1.5 border border-sf-safe bg-sf-safe/50 animate-pulse-fast" />
                       <span className="text-[9px] text-sf-muted">SYS.ON</span>
                   </div>
               </div>
            </PanelCard>
          </motion.div>
        ) : (
          <motion.div
            key="success-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 relative z-10"
          >
            <div className="w-12 h-12 bg-sf-safe border border-sf-safe flex items-center justify-center text-black shadow-[0_0_20px_var(--sf-safe)]">
                <Shield className="w-6 h-6" />
            </div>
            <p className="text-sf-safe font-mono font-bold text-[11px] tracking-widest">ACCESS GRANTED</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
