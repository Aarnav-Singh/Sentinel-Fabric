"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State {
 hasError: boolean;
 error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
 constructor(props: { children: React.ReactNode }) {
 super(props);
 this.state = { hasError: false, error: null };
 }

 static getDerivedStateFromError(error: Error): State {
 return { hasError: true, error };
 }

 componentDidCatch(error: Error, info: React.ErrorInfo) {
 console.error("[UMBRIX] Uncaught render error:", error, info.componentStack);
 }

 render() {
 if (this.state.hasError) {
 return (
 <div className="min-h-screen bg-ng-base flex items-center justify-center p-8">
 <div className="max-w-md w-full bg-ng-mid border border-ng-error/30 p-8 flex flex-col items-center gap-6 text-center">
 <AlertTriangle className="w-10 h-10 text-ng-error" />
 <div>
 <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-white mb-2">
 Interface Error
 </h2>
 <p className="text-xs text-ng-muted font-mono">
 {this.state.error?.message || "An unexpected error occurred."}
 </p>
 </div>
 <button
 onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
 className="flex items-center gap-2 px-4 py-2 border border-ng-outline-dim/40 bg-ng-base hover:bg-ng-mid text-ng-on text-xs font-mono uppercase tracking-widest transition-colors"
 >
 <RefreshCw className="w-3 h-3" /> Reload
 </button>
 </div>
 </div>
 );
 }
 return this.props.children;
 }
}
