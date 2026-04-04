"use client";

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';

export default function ThreatGlobeClient() {
  const globeEl = useRef<GlobeMethods | undefined>();
  const [countries, setCountries] = useState<any>({ features: [] });
  const [arcsData, setArcsData] = useState<any[]>([]);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });

  // Update dims on mount/resize
  useEffect(() => {
    function handleResize() {
      // Find parent container dimensions to make it responsive
      const container = document.getElementById('globe-container');
      if (container) {
        setWindowDimensions({
          width: container.clientWidth,
          height: container.clientHeight
        });
      }
    }
    
    // Slight delay to ensure parent is rendered
    setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch topologies and generate mock attack arcs
  useEffect(() => {
    // Load country boundaries
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(res => res.json())
      .then(topoData => {
        // Need to convert TopoJSON to GeoJSON, but for react-globe we can typically pass GeoJSON
        // Let's grab a pre-built geojson for simplicity
        fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
          .then(res => res.json())
          .then(setCountries);
      });

    // Generate mock attack data mapping coordinates
    const N = 20;
    const arcs = Array.from({ length: N }, () => ({
      startLat: (Math.random() - 0.5) * 180,
      startLng: (Math.random() - 0.5) * 360,
      endLat: (Math.random() - 0.5) * 180,
      endLng: (Math.random() - 0.5) * 360,
      color: Math.random() > 0.8 ? '#ef4444' : '#f59e0b' // sf-critical or sf-warning
    }));
    setArcsData(arcs);
  }, []);

  useEffect(() => {
    // Auto-rotate settings
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 1.0;
      // Allow user manual override when dragged
      globeEl.current.controls().enableZoom = true;
      
      // Set initial POV camera
      globeEl.current.pointOfView({ lat: 20, lng: -40, altitude: 2 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!windowDimensions.width) return <div className="w-full h-full animate-pulse bg-sf-surface-raised rounded-xl" />;

  return (
    <div id="globe-inner" className="relative w-full h-full flex items-center justify-center cursor-move">
      <Globe
        ref={globeEl}
        width={windowDimensions.width}
        height={windowDimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-water.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Polygons (Countries)
        polygonsData={countries.features}
        polygonCapColor={() => "rgba(20, 184, 166, 0.4)"} // sf-accent fill
        polygonSideColor={() => 'rgba(0, 0, 0, 0.7)'}
        polygonStrokeColor={() => '#14b8a6'} // sf-accent (Neon Teal)
        
        // Arcs (Attacks)
        arcsData={arcsData}
        arcColor={(d: any) => d.status === "blocked" ? "#10b981" : "#ef4444"} // sf-safe / sf-critical
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcAltitudeAutoScale={0.5}
        arcStroke={0.5}

        // Atmosphere
        atmosphereColor="#06b6d4" // sf-accent-2
        atmosphereAltitude={0.15}
      />
    </div>
  );
}
