/**
 * LifeLink Emergency Heat Map Component
 *
 * Displays emergency incident density as a heat map overlay on Leaflet.
 * Uses leaflet.heat plugin for WebGL-accelerated rendering.
 *
 * Usage:
 *   <HeatMapView
 *     incidents={incidentData}
 *     center={[12.9716, 77.5946]}
 *     zoom={11}
 *     height="400px"
 *   />
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.heat';  // Patches L.heatLayer for heat map rendering
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Inner component that adds the heat map layer.
 */
const HeatMapLayer = ({ points = [], radius = 25, blur = 15, maxZoom = 17 }) => {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!L.heatLayer) {
      console.warn('leaflet.heat not loaded. Install: npm install leaflet.heat');
      return;
    }

    // Convert incidents to [lat, lng, intensity] format
    const heatPoints = points
      .filter((p) => p.lat && p.lng)
      .map((p) => [
        p.lat,
        p.lng,
        p.intensity || (
          p.severity === 'Critical' ? 1.0
          : p.severity === 'High' ? 0.8
          : p.severity === 'Moderate' ? 0.5
          : 0.3
        ),
      ]);

    if (heatPoints.length === 0) return;

    // Remove old layer if exists
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
    }

    // Add new heat layer
    const heat = L.heatLayer(heatPoints, {
      radius,
      blur,
      maxZoom,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.3: 'cyan',
        0.5: 'lime',
        0.7: 'yellow',
        0.8: 'orange',
        1.0: 'red',
      },
    });

    heat.addTo(map);
    heatRef.current = heat;

    return () => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [map, points, radius, blur, maxZoom]);

  return null;
};

/**
 * Emergency heat map component.
 */
const HeatMapView = ({
  incidents = [],
  center = [12.9716, 77.5946],
  zoom = 11,
  height = '400px',
  showMarkers = true,
  heatRadius = 25,
  heatBlur = 15,
}) => {
  const [heatLoaded, setHeatLoaded] = useState(!!L.heatLayer);

  useEffect(() => {
    let alive = true;
    // leaflet.heat is a CommonJS plugin that patches L.heatLayer
    // Poll until it's available (it should be after npm import)
    const check = () => {
      if (!alive) return;
      if (L.heatLayer) {
        setHeatLoaded(true);
      } else {
        setTimeout(check, 500);
      }
    };
    if (!L.heatLayer) check();
    return () => { alive = false; };
  }, []);

  // Stats
  const totalIncidents = incidents.length;
  const criticalCount = incidents.filter((i) => i.severity === 'Critical').length;
  const highCount = incidents.filter((i) => i.severity === 'High').length;

  return (
    <div className="space-y-3">
      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs">
        <span className="font-semibold text-slate-700">
          Total: {totalIncidents}
        </span>
        {criticalCount > 0 && (
          <span className="text-red-600 font-semibold">Critical: {criticalCount}</span>
        )}
        {highCount > 0 && (
          <span className="text-orange-600 font-semibold">High: {highCount}</span>
        )}
      </div>

      {/* Map */}
      <div
        style={{ height, width: '100%' }}
        className="rounded-xl overflow-hidden border border-slate-200 shadow-sm"
      >
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {heatLoaded && (
            <HeatMapLayer
              points={incidents}
              radius={heatRadius}
              blur={heatBlur}
            />
          )}
          {showMarkers && incidents.slice(0, 100).map((inc, idx) => (
            <SimpleMarker
              key={`m-${inc.id || idx}`}
              lat={inc.lat}
              lng={inc.lng}
              color={inc.severity === 'Critical' ? '#ef4444' : '#f97316'}
            />
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span> Low
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-lime-500"></span> Moderate
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-orange-500"></span> High
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span> Critical
        </span>
      </div>
    </div>
  );
};

/** Simple circle marker for individual incidents */
const SimpleMarker = ({ lat, lng, color = '#ef4444' }) => {
  const map = useMap();
  useEffect(() => {
    const marker = L.circleMarker([lat, lng], {
      radius: 5,
      fillColor: color,
      color: '#fff',
      weight: 1.5,
      fillOpacity: 0.7,
    }).addTo(map);
    return () => { map.removeLayer(marker); };
  }, [map, lat, lng, color]);
  return null;
};

export default HeatMapView;
