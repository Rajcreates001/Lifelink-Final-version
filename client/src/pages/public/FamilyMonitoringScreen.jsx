import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../config/api';
import MobileCard from '../../components/ui/MobileCard';
import LifelinkAiChat from '../../components/LifelinkAiChat';
import PublicShell from './PublicShell';

export const MobileAiChatScreen = ({ onBack, rightSlot, moduleKey }) => (
  <PublicShell title="LifeLink AI" onBack={onBack} rightSlot={rightSlot}>
    <div className="min-h-[70vh]">
      <LifelinkAiChat variant="page" moduleKey={moduleKey} />
    </div>
  </PublicShell>
);

const FamilyMonitoringScreen = ({ user, onBack, rightSlot }) => {
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({ name: '', relation: '', phone: '' });
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await apiFetch(`/api/family/members/${user.id}`, { method: 'GET' });
    if (res.ok) {
      setMembers(res.data?.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [user?.id]);

  const handleAdd = async () => {
    if (!form.name || !form.relation || !user?.id) return;
    const res = await apiFetch('/api/family/members', {
      method: 'POST',
      body: JSON.stringify({
        userId: user.id,
        name: form.name,
        relation: form.relation,
        phone: form.phone
      })
    });
    if (res.ok) {
      setMembers([res.data, ...members]);
      setForm({ name: '', relation: '', phone: '' });
    }
  };

  return (
    <PublicShell title="Family Monitoring" onBack={onBack} rightSlot={rightSlot}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 animate-fade-in-up delay-100">
          <input className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-slate-300" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-slate-300" placeholder="Relation" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })} />
          <input className="rounded-xl border border-slate-200 p-3 text-sm transition-all duration-200 focus:ring-2 focus:ring-slate-300" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <button onClick={handleAdd} className="rounded-2xl bg-slate-900 text-white font-bold py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-95">Add Member</button>
        </div>
        {loading && <p className="text-xs text-slate-400 animate-fade-in">Loading family...</p>}
        <div className="space-y-3">
          {members.map((member, index) => (
            <MobileCard key={member._id || member.id} className="animate-fade-in-up" style={{ animationDelay: `${200 + index * 100}ms` }}>
              <p className="font-semibold text-slate-900">{member.name}</p>
              <p className="text-xs text-slate-500">{member.relation} • {member.phone}</p>
            </MobileCard>
          ))}
        </div>
      </div>
    </PublicShell>
  );
};

export default FamilyMonitoringScreen;
