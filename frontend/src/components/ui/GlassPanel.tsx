"use client";
import React from "react";
import { cn } from "@/components/ui/utils";

interface GlassPanelProps {
 children: React.ReactNode;
 accent?: "cyan" | "magenta" | "lime";
 className?: string;
 as?: "div" | "aside" | "header" | "nav";
}

export function GlassPanel({ children, accent = "cyan", className = "", as: Tag = "div" }: GlassPanelProps) {
 const border = {
 cyan: "border-ng-cyan/30",
 magenta: "border-ng-magenta/30",
 lime: "border-ng-lime/30",
 }[accent];

 return (
 <Tag className={cn("ng-glass border", border, className)}>
 {children}
 </Tag>
 );
}
