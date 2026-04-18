"use client";

import React from "react";

interface SkeletonProps {
 className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
 return (
 <div
 className={`animate-pulse bg-ng-mid/50 border border-ng-outline-dim/40/30 ${className}`}
 style={{
 backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent)",
 backgroundSize: "200% 100%",
 }}
 />
 );
}
