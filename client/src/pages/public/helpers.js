import L from 'leaflet';
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect, useState } from 'react';

export const defaultIcon = L.icon({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = defaultIcon;

export const SpeechRecognition = typeof window !== 'undefined'
  ? window.SpeechRecognition || window.webkitSpeechRecognition
  : null;

export const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
};

export const useIsDesktop = () => {
  const getMatches = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(min-width: 1024px)').matches;
  };

  const [isDesktop, setIsDesktop] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(min-width: 1024px)');
    const handler = (event) => setIsDesktop(event.matches);

    if (media.addEventListener) {
      media.addEventListener('change', handler);
    } else {
      media.addListener(handler);
    }

    setIsDesktop(media.matches);
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', handler);
      } else {
        media.removeListener(handler);
      }
    };
  }, []);

  return isDesktop;
};

export const modules = [
  { key: 'home', label: 'Home' },
  { key: 'sos', label: 'Smart SOS' },
  { key: 'hospital', label: 'Find Hospital' },
  { key: 'health', label: 'Quick Health Check' },
  { key: 'donor', label: 'Donor Match' },
  { key: 'family', label: 'Family Monitoring' },
  { key: 'ai_chat', label: 'LifeLink AI Chat' }
];

export const toneMap = {
  rose: 'ring-1 ring-rose-100',
  sky: 'ring-1 ring-sky-100',
  emerald: 'ring-1 ring-emerald-100',
  amber: 'ring-1 ring-amber-100',
  slate: 'ring-1 ring-slate-100'
};

export const fallbackIncidents = [
  {
    id: 'inc-1',
    message: 'Multi-vehicle collision reported',
    severity: 'High',
    type: 'Traffic',
    responders: 'Ambulance + Traffic Unit',
    createdAt: new Date().toISOString(),
    location: { lat: 12.9752, lng: 77.6053, area: 'MG Road' },
  },
  {
    id: 'inc-2',
    message: 'Cardiac distress call from office tower',
    severity: 'Critical',
    type: 'Medical',
    responders: 'ICU Ambulance',
    createdAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    location: { lat: 12.9654, lng: 77.5855, area: 'Vittal Mallya Rd' },
  },
  {
    id: 'inc-3',
    message: 'Fire alarm with smoke reported',
    severity: 'High',
    type: 'Fire',
    responders: 'Fire Brigade + Ambulance',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    location: { lat: 12.9866, lng: 77.5532, area: 'Rajajinagar' },
  },
  {
    id: 'inc-4',
    message: 'Roadside injury assistance required',
    severity: 'Medium',
    type: 'Medical',
    responders: 'Rapid Response Unit',
    createdAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    location: { lat: 12.9362, lng: 77.605, area: 'Koramangala' },
  },
];
