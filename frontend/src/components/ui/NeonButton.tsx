"use client";
import React from "react";
import { motion } from "framer-motion";

interface NeonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: "primary" | "secondary" | "tertiary" | "danger";
 size?: "sm" | "md" | "lg";
 loading?: boolean;
}

export function NeonButton({ variant = "primary", size = "md", loading, className = "", children, disabled, ...props }: NeonButtonProps) {
 const base = "inline-flex items-center justify-center gap-2 font-mono uppercase tracking-widest transition-all duration-150 rounded-none disabled:opacity-40 disabled:cursor-not-allowed";
 const sizes = {
 sm: "h-7 px-3 text-[10px]",
 md: "h-9 px-4 text-[11px]",
 lg: "h-11 px-6 text-[12px]",
 };
 const variants = {
 primary: "bg-ng-cyan-bright text-ng-base hover:brightness-110 ng-glow-cyan",
 secondary: "border border-ng-magenta text-ng-magenta bg-transparent hover:bg-ng-magenta/10 ng-glow-magenta",
 tertiary: "text-ng-lime bg-transparent underline underline-offset-2 hover:brightness-125",
 danger: "border border-ng-error text-ng-error bg-ng-error/10 hover:bg-ng-error/20 ng-glow-error",
 };

 return (
 <motion.button
 whileTap={{ scale: 0.97 }}
 disabled={disabled || loading}
 className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
 {...(props as any)}
 >
 {loading && <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />}
 {children}
 </motion.button>
 );
}
