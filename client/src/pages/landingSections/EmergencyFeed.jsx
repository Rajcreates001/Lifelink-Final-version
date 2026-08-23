import React from 'react';
import { EMERGENCY_FEED, FEATURES } from './constants';

const EmergencyFeed = () => (
    <div className="py-4 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-blue-600/5 border-y border-gray-200/30 overflow-hidden">
        <div className="ticker-container">
            <div className="flex animate-ticker gap-12 items-center">
                {[...EMERGENCY_FEED, ...EMERGENCY_FEED].map((item, i) => (
                    <span key={i} className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-slow"></span>
                        <span>{item.msg}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{item.time}</span>
                    </span>
                ))}
            </div>
        </div>
    </div>
);

// ─── FEATURES SECTION ───────────────────────────────────

export default EmergencyFeed;
