"use client";

import React, { useMemo, memo } from "react";
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";

// Use a lightweight topology from CDN
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface ThreatEvent {
 id: string;
 from: [number, number]; // [longitude, latitude]
 to: [number, number];
 severity: 'low' | 'medium' | 'high' | 'critical';
}

interface VectorMapProps {
 className?: string;
 threats?: ThreatEvent[];
}

const severityColors = {
 low: "var(--ng-lime)",
 medium: "var(--ng-magenta)",
 high: "var(--ng-magenta)",
 critical: "var(--ng-error)"
};

const VectorMapInner = ({ className = "", threats = [] }: VectorMapProps) => {
 // Generate some random background points just for texture
 const noisePoints = useMemo(() => {
 return Array.from({ length: 15 }).map((_, i) => ({
 coordinates: [Math.random() * 360 - 180, Math.random() * 140 - 70] as [number, number],
 r: Math.random() * 1.5 + 0.5
 }));
 }, []);

 return (
 <div className={`relative w-full h-full overflow-hidden ${className}`}>
 <ComposableMap 
 projection="geoEquirectangular" // Flat projection
 projectionConfig={{ scale: 180 }}
 style={{ width: "100%", height: "100%" }}
 >
 <Geographies geography={geoUrl}>
 {({ geographies }) =>
 geographies.map((geo) => (
 <Geography
 key={geo.rsmKey}
 geography={geo}
 fill="var(--ng-mid)"
 stroke="var(--ng-outline-dim/30)"
 strokeWidth={0.5}
 style={{
 default: { outline: "none" },
 hover: { fill: "var(--ng-mid-raised)", outline: "none" },
 pressed: { outline: "none" },
 }}
 />
 ))
 }
 </Geographies>

 {/* Noise markers */}
 {noisePoints.map((pt, i) => (
 <Marker key={`noise-${i}`} coordinates={pt.coordinates}>
 <circle r={pt.r} fill="var(--ng-muted)" opacity={0.3} />
 </Marker>
 ))}

 {/* Active Threat Lines */}
 {threats.map((threat) => (
 <Line
 key={`line-${threat.id}`}
 from={threat.from}
 to={threat.to}
 stroke={severityColors[threat.severity]}
 strokeWidth={1}
 strokeLinecap="round"
 className="animate-pulse-fast"
 style={{
 vectorEffect: "non-scaling-stroke",
 strokeDasharray: "2 2",
 }}
 />
 ))}

 {/* Active Threat Markers (Impact points) */}
 {threats.map((threat) => (
 <Marker key={`marker-${threat.id}`} coordinates={threat.to}>
 <circle r={2.5} fill={severityColors[threat.severity]} className="animate-pulse-fast" />
 <circle r={6} fill="transparent" stroke={severityColors[threat.severity]} strokeWidth={1} className="animate-ping-slow" />
 </Marker>
 ))}
 </ComposableMap>
 
 {/* CRT Scanline Overlay */}
 <div className="absolute inset-0 pointer-events-none bg-[url('/scanline.png')] bg-repeat opacity-[0.03]" />
 </div>
 );
};

export const VectorMap = memo(VectorMapInner);
