"use client";
import { motion } from "framer-motion";

export function ThreatMap() {
    const blips = [
        { id: 1, top: '25%', left: '22%' }, // US East
        { id: 2, top: '48%', left: '55%' }, // Europe
        { id: 3, top: '40%', left: '78%' }, // Asia
        { id: 4, top: '65%', left: '30%' }, // South America
    ];

    return (
        <div className="absolute inset-0 overflow-hidden bg-brand-dark flex items-center justify-center">
            {/* Background World Map vector simulation */}
            <svg className="absolute w-full h-full opacity-[0.15]" viewBox="0 0 1000 500" fill="none" stroke="currentColor">
                {/* Very stylized grid and boundaries */}
                <line x1="0" y1="250" x2="1000" y2="250" strokeDasharray="4 4" />
                <line x1="500" y1="0" x2="500" y2="500" strokeDasharray="4 4" />
                <circle cx="500" cy="250" r="200" strokeDasharray="2 8" />
                <path d="M200 150 Q 250 100 300 200 T 400 100" strokeWidth="2" strokeOpacity="0.5" />
                <path d="M600 250 Q 700 200 800 300" strokeWidth="2" strokeOpacity="0.5" />
            </svg>

            {/* Blips */}
            {blips.map(blip => (
                <div key={blip.id} className="absolute" style={{ top: blip.top, left: blip.left }}>
                    <motion.div
                        className="w-2.5 h-2.5 bg-brand-orange rounded-full shadow-[0_0_15px_rgba(249,115,22,1)]"
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 2 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border border-brand-orange/40"
                        animate={{ scale: [0.2, 1.5], opacity: [1, 0] }}
                        transition={{ duration: 2 + Math.random(), repeat: Infinity, ease: "easeOut" }}
                    />
                </div>
            ))}
        </div>
    );
}
