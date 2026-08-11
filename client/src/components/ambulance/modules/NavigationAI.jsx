import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

const ambulanceIcon = L.divIcon({ className: '', html: '<div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg animate-pulse border-2 border-white"><i class="fas fa-ambulance text-white text-sm"></i></div>', iconSize: [40, 40], iconAnchor: [20, 20] });
const incidentIcon = L.divIcon({ className: '', html: '<div class="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg animate-ping border-2 border-white"><i class="fas fa-exclamation-triangle text-white text-sm"></i></div>', iconSize: [48, 48], iconAnchor: [24, 24] });
const hospitalIcon = L.divIcon({ className: '', html: '<div class="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white"><i class="fas fa-hospital text-white text-sm"></i></div>', iconSize: [40, 40], iconAnchor: [20, 20] });

const NavigationAI = ({ vehicle, incident, hospital, toIncident, toHospital, onAction }) => {
  const mapCenter = useMemo(() => {
    const lat = incident?.lat || 12.9716;
    const lng = incident?.lng || 77.5946;
    return [lat, lng];
  }, [incident]);

  const routeOptions = [
    { label: 'Fastest Route', eta: toIncident?.etaMinutes || 7, distance: toIncident?.distanceKm || 4.1, traffic: 'Light', risk: 'Low', confidence: 92, color: 'emerald' },
    { label: 'Alternate A', eta: (toIncident?.etaMinutes || 7) + 3, distance: (toIncident?.distanceKm || 4.1) + 1.2, traffic: 'Light', risk: 'Low', confidence: 85, color: 'sky' },
    { label: 'Alternate B', eta: (toIncident?.etaMinutes || 7) + 2, distance: (toIncident?.distanceKm || 4.1) + 0.8, traffic: 'Moderate', risk: 'Medium', confidence: 78, color: 'amber' },
    { label: 'Safest Route', eta: (toIncident?.etaMinutes || 7) + 5, distance: (toIncident?.distanceKm || 4.1) + 2.5, traffic: 'Light', risk: 'Very Low', confidence: 96, color: 'indigo' },
  ];

  const toIncidentPath = toIncident?.path || [[vehicle?.lat || 12.9766, vehicle?.lng || 77.5713], [incident?.lat || 12.9763, incident?.lng || 77.5929]];
  const toHospitalPath = toHospital?.path || [[incident?.lat || 12.9763, incident?.lng || 77.5929], [hospital?.lat || 12.9686, hospital?.lng || 77.5995]];

  return (
    <div className="space-y-4">
      {/* ETA Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-4">
          <p className="text-[9px] font-bold text-sky-600 uppercase">To Pickup Location</p>
          <p className="text-3xl font-black text-slate-900">{toIncident?.etaMinutes || '--'} <span className="text-sm font-medium text-slate-500">min</span></p>
          <p className="text-xs text-slate-500 mt-1">{toIncident?.distanceKm || '--'} km · {toIncident?.traffic?.level || 'Light'} traffic</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <p className="text-[9px] font-bold text-amber-600 uppercase">To Destination Hospital</p>
          <p className="text-3xl font-black text-slate-900">{toHospital?.etaMinutes || '--'} <span className="text-sm font-medium text-slate-500">min</span></p>
          <p className="text-xs text-slate-500 mt-1">{toHospital?.distanceKm || '--'} km · {toHospital?.traffic?.level || 'Moderate'} traffic</p>
        </div>
      </div>

      {/* Large Map (~70% of module) */}
      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
        <div className="h-[420px] w-full">
          <MapContainer center={mapCenter} zoom={14} className="h-full w-full" scrollWheelZoom={true}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
            {vehicle && <Marker position={[vehicle.lat || 12.9766, vehicle.lng || 77.5713]} icon={ambulanceIcon}><Popup><div className="text-xs"><p className="font-semibold">{vehicle.label || 'Ambulance A1'}</p><p>Speed: {vehicle.speedKph || 44} km/h</p></div></Popup></Marker>}
            {incident && <Marker position={[incident.lat || 12.9763, incident.lng || 77.5929]} icon={incidentIcon}><Popup><div className="text-xs"><p className="font-semibold">{incident.label || 'Incident'}</p><p>{incident.address || ''}</p></div></Popup></Marker>}
            {hospital && <Marker position={[hospital.lat || 12.9686, hospital.lng || 77.5995]} icon={hospitalIcon}><Popup><div className="text-xs"><p className="font-semibold">{hospital.label}</p><p>{hospital.address || ''}</p></div></Popup></Marker>}
            {toIncidentPath.length >= 2 && <Polyline positions={toIncidentPath} pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.7, dashArray: '10, 6' }} />}
            {toHospitalPath.length >= 2 && <Polyline positions={toHospitalPath} pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.7 }} />}
          </MapContainer>
        </div>
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-3 rounded-full bg-blue-600" /> Ambulance</div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-3 rounded-full bg-red-500" /> Incident</div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-3 h-3 rounded-full bg-emerald-600" /> Hospital</div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 ml-auto"><span className="w-4 h-0.5 bg-red-400" /> To Pickup</div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500"><span className="w-4 h-0.5 bg-sky-400" /> To Hospital</div>
        </div>
      </div>

      {/* Route Options + AI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Route Options */}
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-route text-slate-400 text-xs" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Route Options</span>
          </div>
          <div className="space-y-1.5">
            {routeOptions.map((r) => (
              <div key={r.label} className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <input type="radio" name="nav-route" defaultChecked={r.label === 'Fastest Route'} className="accent-indigo-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{r.label}</p>
                    <p className="text-[10px] text-slate-400">{r.eta} min · {r.distance} km</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded bg-${r.color}-100 text-${r.color}-700`}>{r.traffic}</span>
                  <span className="text-[10px] font-bold text-slate-500">{r.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation AI Summary */}
        <div className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-satellite-dish text-sky-400 text-sm" />
            <span className="text-[10px] font-bold text-sky-400 uppercase">Navigation AI</span>
          </div>
          <div className="space-y-3 text-xs text-slate-300">
            <p>Route optimized for fastest patient delivery. Traffic moderate on Cubbon Rd — recommended route uses priority lanes.</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-[9px] text-slate-400 uppercase">Current ETA</p>
                <p className="text-lg font-bold text-white">{toHospital?.etaMinutes || '--'} min</p>
              </div>
              <div className="rounded-lg bg-white/5 p-2">
                <p className="text-[9px] text-slate-400 uppercase">Confidence</p>
                <p className="text-lg font-bold text-emerald-400">92%</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px]">Traffic: Moderate</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px]">Weather: Clear</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[9px]">Road: Open</span>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onAction?.('reroute')}
              className="flex-1 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 active:scale-95 transition-all">
              <i className="fas fa-arrows-rotate mr-1" /> Re-Route
            </button>
            <button type="button" onClick={() => onAction?.('traffic_view')}
              className="flex-1 py-2 rounded-lg bg-slate-700 text-white text-xs font-bold hover:bg-slate-600 active:scale-95 transition-all">
              <i className="fas fa-traffic-light mr-1" /> Traffic View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationAI;
