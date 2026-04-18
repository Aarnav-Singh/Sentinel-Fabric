"use client";

import React, { useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";

// Crisp, linear-ish easing for tactical feel
const tacticalEase = [0, 0, 0.2, 1] as const;

interface FadeInProps {
 children: React.ReactNode;
 delay?: number;
 duration?: number;
 className?: string;
 direction?: "up" | "down" | "left" | "right" | "none";
 distance?: number;
}

export function FadeIn({ children, delay = 0, duration = 0.2, className = "", direction = "up", distance = 10 }: FadeInProps) {
 const ref = useRef(null);
 const isInView = useInView(ref, { once: true, margin: "-10px" });

 const directionMap = {
 up: { y: distance, x: 0 },
 down: { y: -distance, x: 0 },
 left: { y: 0, x: distance },
 right: { y: 0, x: -distance },
 none: { y: 0, x: 0 },
 };

 const offset = directionMap[direction];

 return (
 <motion.div
 ref={ref}
 initial={{ opacity: 0, x: offset.x, y: offset.y }}
 animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: offset.x, y: offset.y }}
 transition={{ duration, delay, ease: tacticalEase }}
 className={className}
 >
 {children}
 </motion.div>
 );
}

interface StaggerChildrenProps {
 children: React.ReactNode;
 staggerDelay?: number;
 className?: string;
}

export function StaggerChildren({ children, staggerDelay = 0.05, className = "" }: StaggerChildrenProps) {
 return (
 <motion.div
 initial="hidden"
 animate="visible"
 variants={{
 hidden: { opacity: 0 },
 visible: {
 opacity: 1,
 transition: { staggerChildren: staggerDelay, delayChildren: 0 },
 },
 }}
 className={className}
 >
 {React.Children.map(children, (child) => {
 if (!React.isValidElement(child)) return child;
 return (
 <motion.div
 variants={{
 hidden: { opacity: 0, y: 5 },
 visible: {
 opacity: 1,
 y: 0,
 transition: { duration: 0.2, ease: tacticalEase },
 },
 }}
 >
 {child}
 </motion.div>
 );
 })}
 </motion.div>
 );
}

interface ScaleInProps {
 children: React.ReactNode;
 delay?: number;
 duration?: number;
 className?: string;
}

export function ScaleIn({ children, delay = 0, duration = 0.2, className = "" }: ScaleInProps) {
 const ref = useRef(null);
 const isInView = useInView(ref, { once: true, margin: "-10px" });

 return (
 <motion.div
 ref={ref}
 initial={{ opacity: 0, scale: 0.98 }}
 animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }}
 transition={{ duration, delay, ease: tacticalEase }}
 className={className}
 >
 {children}
 </motion.div>
 );
}

// Replaced GlassCard with PanelCard
interface PanelCardProps {
 children: React.ReactNode;
 className?: string;
 delay?: number;
}

export function PanelCard({ children, className = "", delay = 0 }: PanelCardProps) {
 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 transition={{ duration: 0.2, delay, ease: tacticalEase }}
 className={`ng-surface ${className}`}
 >
 {children}
 </motion.div>
 );
}

// Fallback for any component still using GlassCard
export const GlassCard = PanelCard;

interface AnimatedNumberProps {
 value: number;
 duration?: number;
 className?: string;
 format?: (n: number) => string;
}

export function AnimatedNumber({ value, duration = 0.5, className = "", format }: AnimatedNumberProps) {
 const ref = useRef<HTMLSpanElement>(null);
 const prevValue = useRef(0);
 const isInView = useInView(ref, { once: true });

 useEffect(() => {
 if (!isInView || !ref.current) return;

 const startValue = prevValue.current;
 const endValue = value;
 const startTime = performance.now();
 const durationMs = duration * 1000;

 function tick(currentTime: number) {
 const elapsed = currentTime - startTime;
 const progress = Math.min(elapsed / durationMs, 1);
 
 const eased = 1 - Math.pow(1 - progress, 3);
 const currentVal = Math.round(startValue + (endValue - startValue) * eased);

 if (ref.current) {
 ref.current.textContent = format ? format(currentVal) : currentVal.toLocaleString();
 }

 if (progress < 1) {
 requestAnimationFrame(tick);
 }
 }

 requestAnimationFrame(tick);
 prevValue.current = endValue;
 }, [value, isInView, duration, format]);

 return (
 <span ref={ref} className={className}>
 {format ? format(0) : "0"}
 </span>
 );
}

export function ShimmerSkeleton({ className = "" }: { className?: string; }) {
 return (
 <div className={`relative overflow-hidden bg-ng-mid border border-ng-outline-dim/40 rounded-[2px] ${className}`}>
 <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-ng-cyan-bright/10 to-transparent animate-sf-shimmer" />
 </div>
 );
}

/** SlideIn — directional entrance wrapper. Alias for FadeIn with left/right default. */
export function SlideIn({ children, delay = 0, duration = 0.2, className = "", direction = "left", distance = 20 }: FadeInProps) {
 return (
 <FadeIn delay={delay} duration={duration} className={className} direction={direction} distance={distance}>
 {children}
 </FadeIn>
 );
}
