import dynamic from 'next/dynamic';

const ThreatGlobeClient = dynamic(
  () => import('./ThreatGlobeClient'),
  { ssr: false, loading: () => <div className="w-full h-full animate-pulse bg-sf-surface-raised rounded-xl flex items-center justify-center text-sf-muted font-mono text-xs">INITIALIZING WEBGL DRIVER...</div> }
);

export function ThreatGlobe() {
  return (
    <div id="globe-container" className="w-full h-full min-h-[300px]">
      <ThreatGlobeClient />
    </div>
  );
}
