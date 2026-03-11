const fs = require('fs');
let text = fs.readFileSync('frontend/src/app/integrations/page.tsx', 'utf8');

let startIndex = text.indexOf('                {/* Hero Section: Mesh Network Live Visualizer */}');
let endIndex = text.indexOf('                <section>\n                    <header className="flex flex-col md:flex-row');

if (startIndex === -1 || endIndex === -1) {
    endIndex = text.indexOf('                <section>\r\n                    <header className="flex flex-col md:flex-row');
}

if (startIndex !== -1 && endIndex !== -1) {
    let eol = text.includes('\r\n') ? '\r\n' : '\n';
    let newHero = `                {/* Hero Section: Cyber Infrastructure Grid */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-slate-100 text-lg font-bold tracking-tight uppercase flex items-center gap-2">
                            <Activity className="w-5 h-5 text-brand-warning" />
                            Global Infrastructure Grid
                        </h2>
                        <span className="bg-brand-accent/20 text-brand-accent text-[10px] px-2 py-1 rounded-full border border-brand-accent/30 uppercase tracking-widest font-bold">Live Visualizer</span>
                    </div>
                    
                    <div className="relative w-full aspect-[4/3] md:aspect-[21/9] lg:aspect-[32/9] bg-[#0a0f18] rounded-xl overflow-hidden border border-slate-800 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
                        {/* Abstract Grid Background */}
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #9ca3af 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                        
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1000 400">
                            {/* Connection Lines */}
                            <path d="M 200 150 Q 300 200 450 250" fill="none" stroke="rgba(244,63,94,0.3)" strokeWidth="1.5" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
                            <path d="M 450 250 Q 600 350 800 300" fill="none" stroke="rgba(0,242,255,0.3)" strokeWidth="1.5" />
                            <path d="M 450 250 Q 350 320 150 280" fill="none" stroke="rgba(244,63,94,0.3)" strokeWidth="1.5" />
                            <path d="M 450 250 Q 550 150 710 120" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" strokeDasharray="2 2" />
                            <path d="M 710 120 Q 800 100 900 180" fill="none" stroke="rgba(244,63,94,0.3)" strokeWidth="1.5" />
                            <path d="M 200 150 Q 150 100 100 150" fill="none" stroke="rgba(0,242,255,0.3)" strokeWidth="1.5" />
                            <path d="M 450 250 L 510 90" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1.5" />
                        </svg>

                        {/* Node Points */}
                        <div className="absolute top-[35%] left-[19%] w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_12px_#00f2ff]"></div>
                        <div className="absolute top-[61.5%] left-[44.5%] w-3 h-3 rounded-full bg-brand-critical shadow-[0_0_15px_#f43f5e] animate-pulse"></div>
                        <div className="absolute top-[28.5%] left-[70.5%] w-2 h-2 rounded-full bg-brand-warning shadow-[0_0_12px_#fbbf24]"></div>
                        <div className="absolute top-[74%] left-[79.5%] w-2.5 h-2.5 rounded-full bg-brand-accent shadow-[0_0_12px_#00f2ff]"></div>
                        <div className="absolute top-[69%] left-[14.5%] w-2.5 h-2.5 rounded-full bg-slate-500"></div>
                        <div className="absolute top-[21%] left-[50.5%] w-2.5 h-2.5 rounded-full bg-brand-warning shadow-[0_0_12px_#fbbf24]"></div>
                        <div className="absolute top-[44%] left-[89.5%] w-2.5 h-2.5 rounded-full bg-brand-critical shadow-[0_0_12px_#f43f5e]"></div>

                        {/* Ambient small stars / drops */}
                        <div className="absolute top-[20%] left-[80%] w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                        <div className="absolute top-[50%] left-[30%] w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                        <div className="absolute top-[80%] left-[50%] w-1 h-1 rounded-full bg-blue-500/50"></div>
                        <div className="absolute top-[10%] left-[40%] w-1.5 h-1.5 rounded-full bg-red-500/50"></div>
                        <div className="absolute top-[90%] left-[20%] w-1.5 h-1.5 rounded-full bg-orange-500/50"></div>

                        {/* Labels */}
                        <div className="absolute top-[64%] left-[45%] -translate-x-1/2 border border-brand-critical/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-critical flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-critical/20 pb-0.5 mb-0.5">THREAT_LVL: CRITICAL</span>
                            <span>SRC_IP: 104.22.7.12</span>
                        </div>

                        <div className="absolute top-[31%] left-[71%] border border-brand-warning/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-warning flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-warning/20 pb-0.5 mb-0.5">NODE: SYD-HUB</span>
                            <span>STATUS: NOMINAL</span>
                        </div>

                        <div className="absolute top-[76%] left-[80%] border border-brand-accent/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-accent flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-accent/20 pb-0.5 mb-0.5">NODE: SYD-CORE-02</span>
                            <span>STATUS: ACTIVE_SYNC</span>
                        </div>
                        
                        <div className="absolute top-[37%] left-[19%] border border-brand-accent/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-accent flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-accent/20 pb-0.5 mb-0.5">NODE: HKD-EDGE-01</span>
                            <span>LATENCY: 342ms</span>
                        </div>

                        <div className="absolute top-[12%] left-[51%] border border-brand-warning/30 bg-[#111827]/80 backdrop-blur-md px-2 py-1.5 rounded-md text-[9px] font-mono text-brand-warning flex flex-col gap-0.5 whitespace-nowrap shadow-lg">
                            <span className="font-bold border-b border-brand-warning/20 pb-0.5 mb-0.5">NODE: LON-SEC-01</span>
                            <span>LATENCY: 12ms</span>
                            <span className="text-slate-400">ROUTING_UPLINK: ACTIVE</span>
                        </div>

                        {/* Location Data Block */}
                        <div className="absolute bottom-5 left-5 border border-brand-warning/30 bg-[#0d1421]/90 backdrop-blur-md px-4 py-3 rounded-lg text-[10px] sm:text-xs font-mono text-brand-warning flex flex-col gap-1 w-48 sm:w-56 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
                            <div className="flex justify-between">
                                <span className="text-slate-500">LAT:</span>
                                <span className="font-bold">34.0522° N</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">LNG:</span>
                                <span className="font-bold">118.2437° W</span>
                            </div>
                            <div className="mt-2 pt-2 border-t border-brand-warning/20 font-bold opacity-90 text-center text-brand-critical animate-pulse">
                                THREAT: DDOS_DETECTED
                            </div>
                        </div>

                        {/* Top Controls */}
                        <div className="absolute top-4 right-16 flex gap-2">
                            <button className="bg-[#1f2937]/90 hover:bg-[#374151] backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider text-slate-300 border border-slate-600 transition-colors">
                                OSINT
                            </button>
                            <button className="bg-[#1f2937]/90 hover:bg-[#374151] backdrop-blur-md px-3 py-1.5 rounded-md text-[10px] uppercase font-bold tracking-wider text-slate-300 border border-slate-600 transition-colors">
                                INTERNAL
                            </button>
                        </div>
                        
                        {/* Zoom/Pan Controls */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-[#1f2937]/90 backdrop-blur-md rounded-lg p-1.5 border border-slate-700 shadow-xl">
                            <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors font-bold text-xl">
                                +
                            </button>
                            <div className="w-6 h-px bg-slate-600 mx-auto my-0.5"></div>
                            <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors font-bold text-xl">
                                -
                            </button>
                            <div className="w-6 h-px bg-slate-600 mx-auto my-0.5"></div>
                            <button className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
                                <Target className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </section>` + eol + eol;
    
    let endContent = text.substring(endIndex);
    let finalCode = text.substring(0, startIndex) + newHero + endContent;
    fs.writeFileSync('frontend/src/app/integrations/page.tsx', finalCode, 'utf8');
    console.log("Successfully replaced block");
} else {
    console.log("Could not find boundaries", {startIndex, endIndex});
}
