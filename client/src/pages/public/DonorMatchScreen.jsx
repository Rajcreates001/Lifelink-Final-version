import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import MobileCard from '../../components/ui/MobileCard';
import PublicShell from './PublicShell';

const DonorMatchScreen = ({ user, onBack, rightSlot }) => {
  const [location, setLocation] = useState(null);
  const [form, setForm] = useState({ blood_group: 'O+', urgency: 'medium' });
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(null),
      { enableHighAccuracy: true }
    );
  }, []);

  const handleMatch = async () => {
    if (!location) return;
    setLoading(true);
    const res = await apiFetch('/v2/public/donors/match', {
      method: 'POST',
      body: JSON.stringify({
        blood_group: form.blood_group,
        urgency: form.urgency,
        latitude: location.lat,
        longitude: location.lng
      })
    });
    if (res.ok) {
      setDonors(res.data?.donors || []);
    }
    setLoading(false);
  };

  const handleEmergencyRequest = async () => {
    setRequesting(true);
    setRequestMessage('');
    try {
      const details = `Emergency donor request for ${form.blood_group}. Urgency: ${form.urgency}. Location lat ${location?.lat}, lng ${location?.lng}.`;
      if (!user?.id) {
        setRequestMessage('Sign in to send an emergency request.');
        return;
      }
      const res = await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          request_type: 'blood',
          details,
          urgency: form.urgency,
          requester_id: user.id,
        })
      });
      if (res.ok) {
        setRequestMessage('Emergency request broadcasted to nearby donors.');
      } else {
        setRequestMessage('Could not broadcast request.');
      }
    } catch (err) {
      setRequestMessage('Could not broadcast request.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <PublicShell title="Donor Match" onBack={onBack} rightSlot={rightSlot}>
      <div className="space-y-4">
        <MobileCard className="animate-fade-in-up delay-100">
          <p className="text-sm font-semibold text-slate-700">Emergency donor request</p>
          <p className="text-xs text-slate-500 mt-1">Send an urgent request to nearby donors and track responses.</p>
          <button
            onClick={handleEmergencyRequest}
            disabled={requesting}
            className="mt-3 w-full rounded-2xl bg-rose-600 text-white font-bold py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:opacity-60"
          >
            {requesting ? 'Broadcasting...' : 'Broadcast Emergency Request'}
          </button>
          {requestMessage && <p className="text-xs text-slate-500 mt-2 animate-fade-in">{requestMessage}</p>}
        </MobileCard>
        <div className="grid grid-cols-2 gap-3 animate-fade-in-up delay-200">
          <select className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-amber-200" value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}>
            {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((group) => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
          <select className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-amber-200" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <button onClick={handleMatch} disabled={loading || !location} className="w-full rounded-2xl bg-amber-500 text-white font-bold py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95 disabled:opacity-60">
          {loading ? 'Matching...' : 'Find Donors'}
        </button>
        <div className="space-y-3">
          {donors.length === 0 && !loading && (
            <p className="text-xs text-slate-500 animate-fade-in">No donors matched yet. Try a different blood group or urgency.</p>
          )}
          {donors.map((donor, index) => (
            <MobileCard key={donor.id || donor.user_id || donor._id} className="animate-fade-in-up" style={{ animationDelay: `${300 + index * 100}ms` }}>
              <p className="font-semibold text-slate-900">{donor.name}</p>
              <p className="text-xs text-slate-500">{donor.blood_group} • {donor.distance_km} km</p>
              <p className="text-xs text-slate-500">Score {donor.score}</p>
            </MobileCard>
          ))}
        </div>
      </div>
    </PublicShell>
  );
};

export default DonorMatchScreen;
