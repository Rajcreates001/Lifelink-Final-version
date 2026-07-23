import React from 'react';
import { ActionButton } from './PublicShell';

const HomeScreen = ({ onSelect }) => (
  <div className="space-y-4">
    <div className="rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-700 text-white p-5 shadow animate-fade-in-up">
      <p className="text-xs uppercase tracking-widest text-sky-100">LifeLink Mobile</p>
      <h2 className="text-2xl font-bold font-display">Emergency Hub</h2>
      <p className="text-sm text-sky-100 mt-2">Tap one action. We handle the rest.</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="animate-fade-in-up delay-100"><ActionButton tone="rose" label="Smart SOS" subtitle="Start emergency response" onClick={() => onSelect('sos')} /></div>
      <div className="animate-fade-in-up delay-200"><ActionButton tone="sky" label="Find Hospital" subtitle="Nearest beds and ETA" onClick={() => onSelect('hospital')} /></div>
      <div className="animate-fade-in-up delay-300"><ActionButton tone="emerald" label="Quick Health Check" subtitle="Instant risk score" onClick={() => onSelect('health')} /></div>
      <div className="animate-fade-in-up delay-400"><ActionButton tone="amber" label="Donor Match" subtitle="Ranked donors near you" onClick={() => onSelect('donor')} /></div>
      <div className="animate-fade-in-up delay-500 sm:col-span-2"><ActionButton tone="slate" label="LifeLink AI Chat" subtitle="Ask, analyze, and plan" onClick={() => onSelect('ai_chat')} /></div>
    </div>
  </div>
);

export default HomeScreen;
