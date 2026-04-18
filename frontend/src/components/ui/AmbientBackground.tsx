"use client";

import React from "react";
import { useThreatState } from "@/contexts/ThreatStateContext";
import { useEventStream } from "@/contexts/EventStreamContext";

type Variant = "dotgrid" | "threatmap" | "frequency" | "pipeline";

interface AmbientBackgroundProps {
 variant: Variant;
 className?: string;
}

const OPACITY: Record<string, number> = { nominal: 0.12, elevated: 0.30, incident: 0.55 };

export function AmbientBackground({ variant, className = "" }: AmbientBackgroundProps) {
 const { threatState } = useThreatState();
 const { eventsRate } = useEventStream();
 const opacity = OPACITY[threatState] ?? 0.12;

 if (variant === "dotgrid") {
 return (
 <div
 className={`absolute inset-0 z-0 pointer-events-none animate-ambient-drift ${className}`}
 style={{
 opacity,
 backgroundImage:
 `radial-gradient(circle, rgba(99,102,241,0.5) 1px, transparent 1px)`,
 backgroundSize: "24px 24px",
 }}
 />
 );
 }

 if (variant === "frequency") {
 // Horizontal gradient bars representing event volume — driven by eventsRate
 const intensity = Math.min(eventsRate / 300, 1);
 return (
 <div
 className={`absolute inset-0 z-0 pointer-events-none ${className}`}
 style={{
 opacity,
 background: `linear-gradient(90deg,
 rgba(99,102,241,${intensity * 0.3}) 0%,
 rgba(124,58,237,${intensity * 0.5}) 30%,
 rgba(99,102,241,${intensity * 0.2}) 60%,
 transparent 100%)`,
 }}
 />
 );
 }

 if (variant === "pipeline") {
 return (
 <div
 className={`absolute inset-0 z-0 pointer-events-none ${className}`}
 style={{
 opacity,
 backgroundImage:
 `repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(99,102,241,0.15) 40px),
 repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(99,102,241,0.08) 40px)`,
 }}
 />
 );
 }

 // threatmap — radial glow
 return (
 <div
 className={`absolute inset-0 z-0 pointer-events-none ${className}`}
 style={{
 opacity,
 background:
 `radial-gradient(ellipse 60% 50% at 50% 50%,
 rgba(124,58,237,0.2) 0%,
 rgba(67,56,202,0.1) 40%,
 transparent 70%)`,
 }}
 />
 );
}
