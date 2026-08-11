import React, { useMemo, useState } from 'react';

// ─── KPI Card ──────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, color, trend }) => (
  <div className="rounded-xl bg-slate-800/60 border border-slate-700/30 p-4 hover:border-slate-600/50 transition-all duration-200 group">
    <div className="flex items-center justify-between mb-2">
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color || 'from-blue-600 to-indigo-700'} bg-opacity-20 flex items-center justify-center`}>
        <i className={`fas ${icon} text-sm text-white`} />
      </div>
      {trend && (
        <span className={`text-[10px] font-bold ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          <i className={`fas ${trend > 0 ? 'fa-arrow-up' : 'fa-arrow-down'} mr-0.5`} />
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-white font-mono">{value}</p>
    <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
    {sub && <p className="text-[9px] text-slate-500 mt-1">{sub}</p>}
  </div>
);

// ─── Action Button ─────────────────────────────────────────
const QuickAction = ({ icon, label, gradient, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r ${gradient || 'from-slate-700 to-slate-600'} text-white text-[10px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all`}
  >
    <i className={`fas ${icon} text-[11px]`} />
    {label}
  </button>
);

// ─── National Admin Mission Board ──────────────────────────
const NationalAdminBoard = () => {
  const kpis = useMemo(() => [
    { icon: 'fa-triangle-exclamation', label: 'Active Emergencies', value: '8', sub: '3 critical · 5 high', color: 'from-red-600 to-rose-700', trend: 12 },
    { icon: 'fa-flag', label: 'States Affected', value: '12', sub: '28 districts total', color: 'from-amber-500 to-orange-600', trend: 5 },
    { icon: 'fa-shield-halved', label: 'Resources Deployed', value: '2,400', sub: 'NDRF · Army · SDRF', color: 'from-blue-600 to-indigo-700', trend: -3 },
    { icon: 'fa-users', label: 'Personnel Mobilized', value: '18,500', sub: '82% deployment rate', color: 'from-emerald-500 to-teal-600', trend: 8 },
    { icon: 'fa-hospital', label: 'Hospital Capacity', value: '68%', sub: '32% beds available', color: 'from-purple-600 to-violet-700', trend: -2 },
    { icon: 'fa-chart-line', label: 'National Risk Index', value: '74.2', sub: 'High risk · 6 hotspots', color: 'from-rose-600 to-pink-700', trend: 15 },
  ], []);

  return (
    <div className="space-y-4">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* Command Actions */}
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">National Quick Commands</p>
        <div className="flex flex-wrap gap-2">
          <QuickAction icon="fa-tower-broadcast" label="Declare National Emergency" gradient="from-red-600 to-rose-700" />
          <QuickAction icon="fa-helmet-safety" label="Activate NDRF" gradient="from-orange-600 to-red-700" />
          <QuickAction icon="fa-truck-medical" label="Deploy Army Medical Corps" gradient="from-green-600 to-emerald-700" />
          <QuickAction icon="fa-jet-fighter" label="Activate Air Force Support" gradient="from-blue-600 to-indigo-700" />
          <QuickAction icon="fa-boxes" label="Allocate National Stock" gradient="from-amber-600 to-orange-700" />
          <QuickAction icon="fa-microchip" label="Launch AI Simulation" gradient="from-purple-600 to-violet-700" />
        </div>
      </div>

      {/* Cross-Department Coordination */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Inter-State Coordination</p>
          <div className="space-y-2">
            {[
              ['Karnataka', 'Flood · 12 districts', 'Red', 85],
              ['Maharashtra', 'Cyclone warning', 'Amber', 72],
              ['Kerala', 'Landslide risk', 'Amber', 68],
              ['Tamil Nadu', 'Hospital surge', 'Yellow', 45],
            ].map(([state, situation, level, coord]) => (
              <div key={state} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30 border border-slate-600/20">
                <span className={`w-2 h-2 rounded-full ${level === 'Red' ? 'bg-red-500' : level === 'Amber' ? 'bg-amber-500' : 'bg-yellow-500'}`} />
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-slate-200">{state}</p>
                  <p className="text-[9px] text-slate-400">{situation}</p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">{coord}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">National Risk Forecast (AI)</p>
          <div className="space-y-3">
            {[
              { label: 'Cyclone — Arabian Sea', risk: 78, eta: '36 hrs', impact: 'Coastal Karnataka, Kerala' },
              { label: 'Flood — Netravati Basin', risk: 92, eta: '12 hrs', impact: 'Dakshina Kannada, Udupi' },
              { label: 'Earthquake — Western Ghats', risk: 34, eta: 'N/A', impact: 'Seismic Zone III' },
              { label: 'Landslide — Kodagu', risk: 65, eta: '24 hrs', impact: 'Hilly terrain, 3 taluks' },
            ].map((forecast) => (
              <div key={forecast.label} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-slate-200">{forecast.label}</span>
                    <span className={`text-[10px] font-bold font-mono ${forecast.risk > 70 ? 'text-red-400' : forecast.risk > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {forecast.risk}%
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${forecast.risk > 70 ? 'bg-red-500' : forecast.risk > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${forecast.risk}%` }}
                    />
                  </div>
                  <p className="text-[8px] text-slate-500 mt-1">{forecast.impact} · ETA: {forecast.eta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── State Admin Mission Board ────────────────────────────
const StateAdminBoard = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard icon="fa-triangle-exclamation" label="District Emergencies" value="5" sub="3 critical · 2 high" color="from-red-600 to-rose-700" trend={8} />
      <KpiCard icon="fa-building" label="Districts Active" value="12" sub="28 total districts" color="from-blue-600 to-indigo-700" trend={0} />
      <KpiCard icon="fa-hospital" label="Avg Hospital Capacity" value="72%" sub="18% critical" color="from-amber-500 to-orange-600" trend={-5} />
      <KpiCard icon="fa-truck-medical" label="Ambulance Readiness" value="156" sub="82% fleet available" color="from-emerald-500 to-teal-600" trend={3} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">District Readiness Ranking (AI)</p>
        <div className="space-y-2">
          {[
            ['Dakshina Kannada', 92, 'Prepared'],
            ['Udupi', 85, 'Ready'],
            ['Kodagu', 68, 'Attention'],
            ['Chikkamagaluru', 72, 'Monitor'],
          ].map(([district, score, status]) => (
            <div key={district} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200">{district}</span>
                  <span className={`text-[10px] font-mono ${score > 80 ? 'text-emerald-400' : score > 70 ? 'text-amber-400' : 'text-red-400'}`}>{score}%</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full ${score > 80 ? 'bg-emerald-500' : score > 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">State Quick Commands</p>
        <div className="flex flex-wrap gap-2">
          <QuickAction icon="fa-tower-broadcast" label="Activate SDRF" gradient="from-orange-600 to-red-700" />
          <QuickAction icon="fa-road" label="Close Highways" gradient="from-amber-600 to-orange-700" />
          <QuickAction icon="fa-school" label="Open Relief Shelters" gradient="from-blue-600 to-indigo-700" />
          <QuickAction icon="fa-truck" label="Redirect Supplies" gradient="from-green-600 to-emerald-700" />
          <QuickAction icon="fa-broadcast-tower" label="Emergency Broadcast" gradient="from-red-600 to-rose-700" />
        </div>
      </div>
    </div>
  </div>
);

// ─── District Admin Mission Board ─────────────────────────
const DistrictAdminBoard = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard icon="fa-tower-broadcast" label="Active Incidents" value="12" sub="4 critical" color="from-red-600 to-rose-700" trend={15} />
      <KpiCard icon="fa-truck-medical" label="Ambulances on Road" value="8" sub="ETA 4-12 min" color="from-emerald-500 to-teal-600" trend={0} />
      <KpiCard icon="fa-bed" label="Hospital Beds Free" value="143" sub="of 520 total" color="from-blue-600 to-indigo-700" trend={-8} />
      <KpiCard icon="fa-users" label="Response Teams" value="24" sub="6 sectors" color="from-amber-500 to-orange-600" trend={5} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Emergency Timeline</p>
        <div className="space-y-2">
          {[
            ['Road accident — Pumpwell', '12:34', 'Dispatched', 'red-500'],
            ['Medical emergency — Kadri', '12:28', 'En route', 'amber-500'],
            ['Building fire — Balmatta', '12:15', 'On scene', 'orange-500'],
            ['Flooding — Ullal', '11:50', 'Contained', 'emerald-500'],
          ].map(([event, time, status, color]) => (
            <div key={event} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
              <span className={`w-1.5 h-1.5 rounded-full bg-${color}`} />
              <span className="text-[10px] text-slate-200 flex-1">{event}</span>
              <span className="text-[9px] text-slate-500">{time}</span>
              <span className={`text-[9px] font-semibold text-${color}`}>{status}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">AI District Assistant</p>
        <div className="space-y-3 text-[11px] text-slate-300">
          <div className="p-3 rounded-lg bg-blue-600/10 border border-blue-500/20">
            <p className="text-blue-400 font-semibold text-[10px] mb-1">⚠️ Prediction</p>
            <p>Hospital occupancy expected to reach 92% in 6 hours. Divert moderate cases to KMC Hospital and activate overflow beds.</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-600/10 border border-amber-500/20">
            <p className="text-amber-400 font-semibold text-[10px] mb-1">🔄 Recommended</p>
            <p>Route ambulances via NH-66 bypass. Traffic congestion at Pumpwell Junction causing 8-min delays.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ─── Police Mission Board ─────────────────────────────────
const PoliceBoard = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard icon="fa-shield" label="Active Incidents" value="24" sub="4 critical" color="from-blue-700 to-indigo-800" trend={8} />
      <KpiCard icon="fa-car" label="Patrols Active" value="86" sub="92% coverage" color="from-amber-500 to-orange-600" trend={3} />
      <KpiCard icon="fa-phone" label="Emergency Calls" value="312" sub="24/hr avg" color="from-red-600 to-rose-700" trend={12} />
      <KpiCard icon="fa-clock" label="Avg Response" value="8.2m" sub="Target: 7m" color="from-emerald-500 to-teal-600" trend={-5} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">AI Traffic & Crowd Analysis</p>
        <div className="space-y-2">
          {[
            ['Pumpwell Junction', 'Severe congestion', 'Override signal'],
            ['Hampankatta', 'Heavy pedestrian flow', 'Deploy 2 units'],
            ['Kadri Market', 'Moderate traffic', 'Monitor'],
          ].map(([loc, status, action]) => (
            <div key={loc} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-slate-200">{loc}</p>
                <p className="text-[9px] text-amber-400">{status}</p>
              </div>
              <span className="text-[9px] text-blue-400">{action}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Emergency Route Clearance</p>
        <div className="space-y-2">
          {[
            ['AMB-KA-1042 → Wenlock', 'Hampankatta', 'Clear', 'emerald-500'],
            ['AMB-KA-1077 → KMC', 'Surathkal', 'Clear', 'emerald-500'],
            ['AMB-KA-1031 → AJ Hospital', 'Kadri', 'Congested', 'amber-500'],
          ].map(([amb, loc, status, color]) => (
            <div key={amb} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
              <span className="text-[10px] text-slate-200 flex-1">{amb}</span>
              <span className="text-[9px] text-slate-400">{loc}</span>
              <span className={`text-[9px] font-semibold text-${color}`}>{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Fire Mission Board ────────────────────────────────────
const FireBoard = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard icon="fa-fire" label="Active Fires" value="7" sub="3 structure · 4 forest" color="from-red-600 to-orange-700" trend={15} />
      <KpiCard icon="fa-truck" label="Units Deployed" value="18" sub="92% capacity" color="from-orange-600 to-amber-700" trend={5} />
      <KpiCard icon="fa-hand-holding-heart" label="Rescues Today" value="42" sub="34 from fire" color="from-emerald-500 to-teal-600" trend={20} />
      <KpiCard icon="fa-biohazard" label="Hazmat Alerts" value="3" sub="1 critical" color="from-amber-500 to-yellow-600" trend={0} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">AI Fire Spread Prediction</p>
        <div className="p-3 rounded-lg bg-orange-600/10 border border-orange-500/20 mb-2">
          <p className="text-[10px] text-orange-400 font-semibold mb-1">🔥 Balmatta Fire</p>
          <p className="text-[10px] text-slate-300">Predicted spread: 200m NE in 30 min. Wind: 15 km/h from SW. Humidity: 62%. Recommend 2 additional units.</p>
        </div>
        <div className="p-3 rounded-lg bg-amber-600/10 border border-amber-500/20">
          <p className="text-[10px] text-amber-400 font-semibold mb-1">🌲 Kodagu Forest Fire</p>
          <p className="text-[10px] text-slate-300">2 km perimeter. Slope: 15°. Vegetation: Dry deciduous. Risk of crown fire. Deploy aerial support.</p>
        </div>
      </div>
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Rescue Priority Queue</p>
        <div className="space-y-2">
          {[
            ['Building collapse — Bondel', 'Critical', '12 trapped', 'red-500'],
            ['Chemical spill — Baikampady', 'Severe', 'Evac zone 500m', 'orange-500'],
            ['Vehicle fire — NH-66', 'High', '2 injured', 'amber-500'],
          ].map(([incident, priority, detail, color]) => (
            <div key={incident} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
              <span className={`w-1.5 h-1.5 rounded-full bg-${color} animate-pulse`} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-slate-200 truncate">{incident}</p>
                <p className="text-[8px] text-slate-400">{detail}</p>
              </div>
              <span className={`text-[8px] font-bold px-1 py-0.5 rounded bg-${color}/20 text-${color}`}>{priority}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── NDMA Mission Board ──────────────────────────────────
const NDMABoard = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard icon="fa-triangle-exclamation" label="Ongoing Disasters" value="8" sub="4 major events" color="from-red-600 to-rose-700" trend={20} />
      <KpiCard icon="fa-flag" label="States Affected" value="12" sub="28 districts" color="from-amber-500 to-orange-600" trend={5} />
      <KpiCard icon="fa-boxes" label="Resources Deployed" value="2,400" sub="NDRF · SDRF · Army" color="from-blue-600 to-indigo-700" trend={-3} />
      <KpiCard icon="fa-bell" label="Early Warnings" value="5" sub="3 critical" color="from-purple-600 to-violet-700" trend={10} />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Disaster Risk Assessment (AI)</p>
        <div className="space-y-2">
          {[
            ['Cyclone — Arabian Sea', 'High Risk', '90%', 'red-500'],
            ['Flood — Netravati Valley', 'Severe', '85%', 'orange-500'],
            ['Earthquake — Western Ghats', 'Moderate', '45%', 'amber-500'],
            ['Landslide — Kodagu', 'Moderate', '55%', 'yellow-500'],
          ].map(([disaster, risk, confidence, color]) => (
            <div key={disaster} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-200">{disaster}</span>
                  <span className={`text-[10px] font-bold text-${color}`}>{risk}</span>
                </div>
                <p className="text-[8px] text-slate-400">AI Confidence: {confidence}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Evacuation AI</p>
        <div className="space-y-2">
          {[
            ['Ullal Region', '5,200', '3 shelters', '92%', 'emerald-500'],
            ['Netravati Banks', '3,800', '2 shelters', '78%', 'amber-500'],
            ['Kudremukh', '1,200', '1 shelter', '65%', 'orange-500'],
          ].map(([area, pop, shelters, progress, color]) => (
            <div key={area} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/30">
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-slate-200">{area}</p>
                <p className="text-[8px] text-slate-400">{pop} people — {shelters}</p>
              </div>
              <span className={`text-[10px] font-mono text-${color}`}>{progress}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Export registry ─────────────────────────────────────
const MISSION_BOARDS = {
  national_admin: { component: NationalAdminBoard, label: 'National Command Center', description: 'National emergency intelligence & strategic command' },
  state_admin: { component: StateAdminBoard, label: 'State Operations Center', description: 'State-level emergency coordination' },
  district_admin: { component: DistrictAdminBoard, label: 'District Command Center', description: 'Tactical district operations' },
  police: { component: PoliceBoard, label: 'Police Command Center', description: 'Law enforcement & public safety' },
  fire: { component: FireBoard, label: 'Fire Command Center', description: 'Fire suppression & rescue operations' },
  ndma: { component: NDMABoard, label: 'Disaster Command Center', description: 'Multi-hazard disaster intelligence' },
};

const resolveMissionBoard = (subRole) => {
  const board = MISSION_BOARDS[subRole];
  return board || null;
};

export { MISSION_BOARDS, resolveMissionBoard, NationalAdminBoard, StateAdminBoard, DistrictAdminBoard, PoliceBoard, FireBoard, NDMABoard };
