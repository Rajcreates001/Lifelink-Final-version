import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { apiFetch } from '../../config/api';

/**
 * GPSTrackingSimulator — Software-based GPS ambulance tracking
 * 
 * Simulates real-time ambulance GPS positions without hardware.
 * Displays:
 * - Live ambulance positions on a simulated map
 * - Speed, fuel, battery, signal metrics
 * - Route progress and ETA
 * - Traffic and weather conditions
 */

const GPSTrackingSimulator = ({ onAmbulanceSelect }) => {
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [toast, setToast] = useState(null);
  const [mapView, setMapView] = useState('live'); // live, routes, stats

  // Fetch simulation status
  const { data: statusData, loading: statusLoading, refetch: refetchStatus } = useApiData(
    '/api/gps-tracking/status',
    { pollInterval: 5000 }
  );

  // Fetch all ambulance positions
  const { data: ambulancesData, loading: ambulancesLoading, refetch: refetchAmbulances } = useApiData(
    '/api/gps-tracking/ambulances',
    { pollInterval: 2000, enabled: simulationRunning }
  );

  // Fetch available routes
  const { data: routesData } = useApiData('/api/gps-tracking/routes');

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Start simulation
  const handleStartSimulation = useCallback(async () => {
    try {
      const res = await apiFetch('/api/gps-tracking/start', { method: 'POST' });
      if (res.ok) {
        setSimulationRunning(true);
        showToast(`GPS simulation started with ${res.data?.ambulances || 5} ambulances`);
        refetchStatus();
      } else {
        showToast('Failed to start simulation', 'error');
      }
    } catch (err) {
      showToast('Error starting simulation', 'error');
    }
  }, [showToast, refetchStatus]);

  // Stop simulation
  const handleStopSimulation = useCallback(async () => {
    try {
      const res = await apiFetch('/api/gps-tracking/stop', { method: 'POST' });
      if (res.ok) {
        setSimulationRunning(false);
        showToast('GPS simulation stopped');
        refetchStatus();
      }
    } catch (err) {
      showToast('Error stopping simulation', 'error');
    }
  }, [showToast, refetchStatus]);

  // Update simulation running state from status
  useEffect(() => {
    if (statusData?.status === 'running') {
      setSimulationRunning(true);
    }
  }, [statusData]);

  const ambulances = ambulancesData?.ambulances || [];
  const routes = routesData?.routes || [];

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`} />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-sky-600 to-indigo-700 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <i className="fas fa-satellite-dish text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-bold">GPS Ambulance Tracking</h2>
              <p className="text-xs text-white/80">Software-based GPS simulation — no hardware required</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-white/60 uppercase">Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${simulationRunning ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
                <span className="text-sm font-semibold">{simulationRunning ? 'Running' : 'Stopped'}</span>
              </div>
            </div>
            <button
              onClick={simulationRunning ? handleStopSimulation : handleStartSimulation}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                simulationRunning 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-white text-indigo-700 hover:bg-white/90'
              }`}
            >
              <i className={`fas ${simulationRunning ? 'fa-stop' : 'fa-play'} mr-1.5`} />
              {simulationRunning ? 'Stop' : 'Start'} Simulation
            </button>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'live', label: 'Live Tracking', icon: 'fa-satellite' },
          { key: 'routes', label: 'Routes', icon: 'fa-route' },
          { key: 'stats', label: 'Statistics', icon: 'fa-chart-bar' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMapView(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mapView === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <i className={`fas ${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live Tracking View */}
      {mapView === 'live' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Map Area */}
          <div className="lg:col-span-2 rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="fas fa-map text-indigo-500" />
                  <span className="text-sm font-bold text-slate-800">Live Ambulance Map</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => refetchAmbulances()}
                    className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50"
                  >
                    <i className="fas fa-sync mr-1" />Refresh
                  </button>
                </div>
              </div>
            </div>
            
            {/* Simulated Map */}
            <div className="relative h-80 bg-slate-900">
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)',
                backgroundSize: '40px 40px'
              }} />
              
              {/* Ambulance markers */}
              {ambulances.map((amb, idx) => {
                const x = ((amb.longitude - 77.55) / 0.25) * 100; // Normalize to map width
                const y = ((12.99 - amb.latitude) / 0.08) * 100; // Normalize to map height
                return (
                  <div
                    key={amb.ambulanceId}
                    className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-125 ${
                      selectedAmbulance === amb.ambulanceId ? 'z-20' : 'z-10'
                    }`}
                    style={{ left: `${Math.max(5, Math.min(95, x))}%`, top: `${Math.max(5, Math.min(95, y))}%` }}
                    onClick={() => setSelectedAmbulance(amb.ambulanceId)}
                  >
                    <div className={`relative ${selectedAmbulance === amb.ambulanceId ? 'animate-bounce' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                        amb.status === 'en_route' ? 'bg-emerald-500' : 
                        amb.status === 'at_location' ? 'bg-amber-500' : 'bg-slate-500'
                      }`}>
                        <i className="fas fa-truck-medical text-white text-xs" />
                      </div>
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-black/30 rounded-full blur-sm" />
                      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        <span className="text-[8px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                          {amb.ambulanceId}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Map legend */}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg p-2">
                <div className="flex items-center gap-3">
                  {[
                    { color: 'bg-emerald-500', label: 'En Route' },
                    { color: 'bg-amber-500', label: 'At Location' },
                    { color: 'bg-slate-500', label: 'Idle' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-[8px] text-white/70">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coordinates display */}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                <span className="text-[9px] text-white/70">12.9716°N, 77.5946°E — Bangalore</span>
              </div>
            </div>
          </div>

          {/* Ambulance List */}
          <div className="rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <i className="fas fa-list text-indigo-500 text-sm" />
                <span className="text-sm font-bold text-slate-800">Active Ambulances</span>
                <span className="ml-auto text-[10px] font-semibold text-slate-400">{ambulances.length} total</span>
              </div>
            </div>
            <div className="divide-y divide-slate-50 max-h-96 overflow-y-auto">
              {ambulances.length === 0 ? (
                <div className="p-8 text-center">
                  <i className="fas fa-satellite-dish text-3xl text-slate-200 mb-3" />
                  <p className="text-xs text-slate-400">No ambulances tracked</p>
                  <p className="text-[10px] text-slate-300 mt-1">Start the simulation to begin tracking</p>
                </div>
              ) : (
                ambulances.map((amb) => (
                  <div
                    key={amb.ambulanceId}
                    onClick={() => setSelectedAmbulance(amb.ambulanceId)}
                    className={`p-3 cursor-pointer transition-all ${
                      selectedAmbulance === amb.ambulanceId
                        ? 'bg-indigo-50 border-l-2 border-indigo-500'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          amb.status === 'en_route' ? 'bg-emerald-500 animate-pulse' :
                          amb.status === 'at_location' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        <span className="text-xs font-bold text-slate-800">{amb.ambulanceId}</span>
                      </div>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                        amb.status === 'en_route' ? 'bg-emerald-100 text-emerald-700' :
                        amb.status === 'at_location' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {amb.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="flex items-center gap-1 text-slate-500">
                        <i className="fas fa-gauge-high text-[8px]" />
                        <span>{amb.speedKmh} km/h</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <i className="fas fa-gas-pump text-[8px]" />
                        <span>{amb.fuelLevel}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <i className="fas fa-battery-three-quarters text-[8px]" />
                        <span>{amb.batteryLevel}%</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500">
                        <i className="fas fa-signal text-[8px]" />
                        <span>{amb.signalStrength}%</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 truncate">{amb.route}</span>
                      <span className="text-[9px] font-semibold text-indigo-600">{amb.progress}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-100 mt-1">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${amb.progress}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Routes View */}
      {mapView === 'routes' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routes.map((route) => (
            <div key={route.key} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <i className="fas fa-route text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{route.name}</p>
                  <p className="text-[10px] text-slate-400">Key: {route.key}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-lg font-bold text-slate-800">{route.waypoints}</p>
                  <p className="text-[9px] text-slate-400">Waypoints</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-lg font-bold text-slate-800">{route.distanceKm}</p>
                  <p className="text-[9px] text-slate-400">km</p>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  <p className="text-lg font-bold text-slate-800">{route.estimatedMinutes}</p>
                  <p className="text-[9px] text-slate-400">min ETA</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats View */}
      {mapView === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <i className="fas fa-truck-medical text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{statusData?.totalAmbulances || 0}</p>
                <p className="text-[10px] text-slate-400">Total Ambulances</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center">
                <i className="fas fa-play text-sky-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{statusData?.activeAmbulances || 0}</p>
                <p className="text-[10px] text-slate-400">Active Now</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <i className="fas fa-road text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{statusData?.totalDistanceKm || 0}</p>
                <p className="text-[10px] text-slate-400">Total km</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <i className="fas fa-flag-checkered text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{statusData?.totalTrips || 0}</p>
                <p className="text-[10px] text-slate-400">Trips Completed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Ambulance Detail */}
      {selectedAmbulance && ambulances.find(a => a.ambulanceId === selectedAmbulance) && (
        <AmbulanceDetailPanel
          ambulance={ambulances.find(a => a.ambulanceId === selectedAmbulance)}
          onClose={() => setSelectedAmbulance(null)}
        />
      )}
    </div>
  );
};

// Ambulance Detail Panel
const AmbulanceDetailPanel = ({ ambulance, onClose }) => (
  <div className="rounded-xl bg-white border border-slate-200 shadow-sm p-5">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          ambulance.status === 'en_route' ? 'bg-emerald-100 text-emerald-600' :
          ambulance.status === 'at_location' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
        }`}>
          <i className="fas fa-truck-medical" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">{ambulance.ambulanceId}</h3>
          <p className="text-[10px] text-slate-400">{ambulance.route}</p>
        </div>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
        <i className="fas fa-times" />
      </button>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-3 rounded-lg bg-slate-50">
        <p className="text-[9px] text-slate-400 mb-1">Position</p>
        <p className="text-xs font-bold text-slate-800">{ambulance.latitude.toFixed(4)}°N</p>
        <p className="text-xs font-bold text-slate-800">{ambulance.longitude.toFixed(4)}°E</p>
      </div>
      <div className="p-3 rounded-lg bg-slate-50">
        <p className="text-[9px] text-slate-400 mb-1">Speed</p>
        <p className="text-lg font-bold text-slate-800">{ambulance.speedKmh}</p>
        <p className="text-[9px] text-slate-400">km/h</p>
      </div>
      <div className="p-3 rounded-lg bg-slate-50">
        <p className="text-[9px] text-slate-400 mb-1">Fuel</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${
              ambulance.fuelLevel > 50 ? 'bg-emerald-500' : ambulance.fuelLevel > 20 ? 'bg-amber-500' : 'bg-red-500'
            }`} style={{ width: `${ambulance.fuelLevel}%` }} />
          </div>
          <span className="text-xs font-bold text-slate-800">{ambulance.fuelLevel}%</span>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-slate-50">
        <p className="text-[9px] text-slate-400 mb-1">Weather</p>
        <p className="text-sm font-bold text-slate-800 capitalize">{ambulance.weather}</p>
        {ambulance.trafficDelay > 0 && (
          <p className="text-[9px] text-amber-600">Traffic delay: {ambulance.trafficDelay}s</p>
        )}
      </div>
    </div>
    <div className="mt-3 p-3 rounded-lg bg-indigo-50 border border-indigo-100">
      <p className="text-[9px] font-semibold text-indigo-600 mb-1">Route Progress</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-indigo-100">
          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${ambulance.progress}%` }} />
        </div>
        <span className="text-xs font-bold text-indigo-700">{ambulance.progress}%</span>
      </div>
      <p className="text-[9px] text-slate-500 mt-1">
        Waypoint {ambulance.currentWaypoint + 1} of {ambulance.totalWaypoints} · {ambulance.totalDistanceKm} km traveled
      </p>
    </div>
  </div>
);

export default GPSTrackingSimulator;
