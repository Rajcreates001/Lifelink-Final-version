import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import MobileCard from '../../components/ui/MobileCard';
import PublicShell from './PublicShell';
import { getDistanceKm } from './helpers';
import mockHospitals from '../../data/mockHospitals';

const FindHospitalScreen = ({ onBack, rightSlot }) => {
  const [location, setLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [condition, setCondition] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiRanked, setAiRanked] = useState([]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(null),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!location) return;
    const fetchNearby = async () => {
      setLoading(true);
      const res = await apiFetch(`/v2/hospital/nearby?lat=${location.lat}&lng=${location.lng}&limit=5&radius_km=50&include_eta=true`);
      if (res.ok) {
        const list = res.data?.hospitals || [];
        if (list.length) {
          setHospitals(list);
        } else {
          const fallback = mockHospitals.slice(0, 6).map((item) => ({
            id: item.id,
            name: item.name,
            distance_km: getDistanceKm(location.lat, location.lng, item.lat, item.lng),
            beds_available: item.bedsAvailable,
            beds_total: item.bedsAvailable + 40,
            eta_seconds: Math.round((getDistanceKm(location.lat, location.lng, item.lat, item.lng) / 40) * 3600),
            safety_score: Math.round(item.rating * 20),
          }));
          setHospitals(fallback);
        }
      }
      setLoading(false);
    };
    fetchNearby();
  }, [location]);

  const buildFallbackRanking = () => {
    const ranked = [...hospitals]
      .filter((item) => item && item.id)
      .sort((a, b) => {
        const distanceA = Number(a.distance_km ?? 9999);
        const distanceB = Number(b.distance_km ?? 9999);
        if (distanceA !== distanceB) return distanceA - distanceB;
        const bedsA = Number(a.beds_available ?? 0);
        const bedsB = Number(b.beds_available ?? 0);
        if (bedsA !== bedsB) return bedsB - bedsA;
        return Number(b.safety_score ?? 0) - Number(a.safety_score ?? 0);
      })
      .slice(0, 3)
      .map((item, index) => ({
        id: item.id,
        name: item.name,
        distance_km: item.distance_km,
        rank: index + 1,
      }));
    if (ranked.length > 0) {
      setAiRanked(ranked);
      setAiSuggestion('Showing distance-based ranking (fast mode).');
    } else {
      setAiSuggestion('No ranking available yet.');
    }
  };

  const handleAiRank = async () => {
    if (!condition || !location) return;
    setAiLoading(true);
    setAiSuggestion('');
    try {
      const res = await apiFetch('/v2/agents/ask', {
        method: 'POST',
        body: JSON.stringify({
          query: `Best hospital for ${condition} emergency?`,
          latitude: location.lat,
          longitude: location.lng,
        })
      });
      if (res.ok) {
        const ranked = res.data?.actions?.find((action) => action.type === 'hospital_rank')?.ranked || [];
        if (ranked.length > 0) {
          setAiRanked(ranked);
          setAiSuggestion(res.data?.answer || 'AI ranking ready.');
        } else {
          buildFallbackRanking();
        }
      } else {
        buildFallbackRanking();
      }
    } catch (err) {
      buildFallbackRanking();
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <PublicShell title="Find Hospital" onBack={onBack} rightSlot={rightSlot}>
      <div className="space-y-4">
        <MobileCard className="animate-fade-in-up delay-100">
          <p className="text-sm font-semibold text-slate-700">AI hospital ranking</p>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-sky-200"
              placeholder="Condition (e.g., chest pain)"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            />
            <button onClick={handleAiRank} disabled={aiLoading || !condition} className="rounded-xl bg-slate-900 text-white px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 hover:shadow-lg disabled:opacity-60">
              {aiLoading ? 'Ranking...' : 'Rank'}
            </button>
          </div>
          {aiSuggestion && <p className="text-xs text-slate-500 mt-2 animate-fade-in">{aiSuggestion}</p>}
        </MobileCard>
        <div className="rounded-2xl bg-white border border-slate-200 p-4 animate-fade-in-up delay-200">
          <p className="text-sm font-semibold text-slate-700">Nearest hospitals</p>
          {loading && <p className="text-xs text-slate-400 mt-2 animate-fade-in">Loading...</p>}
          {!loading && hospitals.length === 0 && (
            <p className="text-xs text-slate-400 mt-2 animate-fade-in">No hospitals found nearby.</p>
          )}
        </div>
        <div className="space-y-3">
          {hospitals.map((hospital, index) => (
            <MobileCard key={hospital.id} className="animate-fade-in-up" style={{ animationDelay: `${300 + index * 100}ms` }}>
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{hospital.name}</p>
                <span className="text-xs text-slate-500">{hospital.distance_km} km</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Beds {hospital.beds_available}/{hospital.beds_total}</p>
              <p className="text-xs text-slate-500">ETA {Math.round((hospital.eta_seconds || 0) / 60)} min</p>
              <p className="text-xs text-slate-500">Readiness score {hospital.safety_score}</p>
              <p className="text-xs text-slate-500">Rating {((hospital.safety_score || 80) / 20).toFixed(1)} ★</p>
              {aiRanked.length > 0 && aiRanked.some((item) => String(item.id) === String(hospital.id)) && (
                <span className="inline-flex mt-2 text-[11px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">AI recommended</span>
              )}
            </MobileCard>
          ))}
        </div>
      </div>
    </PublicShell>
  );
};

export default FindHospitalScreen;
