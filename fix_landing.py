"""Fix LandingPage.jsx issues: hooks violation, dead code, missing CTA button"""
import os

filepath = os.path.join("client", "src", "pages", "LandingPage.jsx")
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix imports - remove unused useMemo, Link, add useCallback
old_imports = "import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';\nimport { useNavigate, Link } from 'react-router-dom';"
new_imports = "import React, { useState, useEffect, useRef, useCallback } from 'react';\nimport { useNavigate } from 'react-router-dom';"
content = content.replace(old_imports, new_imports)

# 2. Fix LiveStatsBar - remove useCountUp from .map and filePath, use top-level calls instead
old_LiveStatsBar = """// ─── LIVE STATS BAR ──────────────────────────────────────
const LiveStatsBar = () => {
    const [entered, statsRef] = useScrollIn();
    const stats = [
        { label: 'Emergency Requests', value: 125420, suffix: '', icon: 'fa-tower-cell', color: '#DC2626' },
        { label: 'Hospitals Connected', value: 286, suffix: '+', icon: 'fa-hospital', color: '#059669' },
        { label: 'Ambulances Active', value: 142, suffix: '', icon: 'fa-truck-medical', color: '#F97316' },
        { label: 'Citizens Protected', value: 2400000, suffix: '+', icon: 'fa-users', color: '#2563EB', format1: true },
        { label: 'AI Decisions Made', value: 1200000, suffix: '+', icon: 'fa-brain', color: '#7C3AED', format1: true },
        { label: 'Avg Response Time', value: 3.1, suffix: ' min', icon: 'fa-gauge-high', color: '#0891B2', decimals: 1 },
    ];
    const counts = stats.map((s) => { const [c] = useCountUp(s.value, 2500); return c; });
    const fmt = (num, f) => { if (!f) return num.toLocaleString(); if (num >= 1000000) return (num/1000000).toFixed(1)+'M'; if (num >= 1000) return (num/1000).toFixed(1)+'K'; return num.toLocaleString(); };
    const filePath = 'client/src/pages/LandingPage.jsx';
    return ("""

new_LiveStatsBar = """// ─── LIVE STATS BAR ──────────────────────────────────────
const LiveStatsBar = () => {
    const [entered, statsRef] = useScrollIn();
    const [count1] = useCountUp(125420, 2500);
    const [count2] = useCountUp(286, 2500);
    const [count3] = useCountUp(142, 2500);
    const [count4] = useCountUp(2400000, 2500);
    const [count5] = useCountUp(1200000, 2500);
    const [count6] = useCountUp(3.1, 2500);
    const counts = [count1, count2, count3, count4, count5, count6];
    const stats = [
        { label: 'Emergency Requests', value: 125420, suffix: '', icon: 'fa-tower-cell', color: '#DC2626' },
        { label: 'Hospitals Connected', value: 286, suffix: '+', icon: 'fa-hospital', color: '#059669' },
        { label: 'Ambulances Active', value: 142, suffix: '', icon: 'fa-truck-medical', color: '#F97316' },
        { label: 'Citizens Protected', value: 2400000, suffix: '+', icon: 'fa-users', color: '#2563EB', format1: true },
        { label: 'AI Decisions Made', value: 1200000, suffix: '+', icon: 'fa-brain', color: '#7C3AED', format1: true },
        { label: 'Avg Response Time', value: 3.1, suffix: ' min', icon: 'fa-gauge-high', color: '#0891B2' },
    ];
    const fmt = (num, f) => { if (!f) return num.toLocaleString(); if (num >= 1000000) return (num/1000000).toFixed(1)+'M'; if (num >= 1000) return (num/1000).toFixed(1)+'K'; return num.toLocaleString(); };
    return ("""

content = content.replace(old_LiveStatsBar, new_LiveStatsBar)

# 3. Add "View Research" button to CTA section
old_cta_buttons = """                    <button onClick={() => document.getElementById('ai-engine')?.scrollIntoView({ behavior: 'smooth' })}
                        className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl border border-white/30 text-white font-semibold text-[15px] hover:bg-white/10 transition-all duration-200">
                        <i className="fas fa-brain"></i>
                        <span>Explore AI Engine</span>
                    </button>
                </div>"""

new_cta_buttons = """                    <button onClick={() => document.getElementById('ai-engine')?.scrollIntoView({ behavior: 'smooth' })}
                        className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl border border-white/30 text-white font-semibold text-[15px] hover:bg-white/10 transition-all duration-200">
                        <i className="fas fa-brain"></i>
                        <span>Explore AI Engine</span>
                    </button>
                    <button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                        className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl border border-white/30 text-white font-semibold text-[15px] hover:bg-white/10 transition-all duration-200">
                        <i className="fas fa-flask"></i>
                        <span>View Research</span>
                    </button>
                </div>"""

content = content.replace(old_cta_buttons, new_cta_buttons)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed: {len(content)} bytes written")
