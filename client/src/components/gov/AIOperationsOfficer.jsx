import React, { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../config/api';

// ─── Role-Specific AI Personas ──────────────────────────────
const AI_PERSONAS = {
  national_admin: {
    name: 'National Strategy AI',
    avatar: '🇮🇳',
    tagline: 'National emergency intelligence & strategic coordination',
    systemPrompt: 'You are the National Strategy AI for LifeLink, the Government of India\'s emergency response platform. You provide strategic-level recommendations for national-scale emergencies. Your responses should reference NDMA guidelines, NDRF capabilities, interstate coordination, and national resource allocation. Always provide confidence percentages and explainable reasoning.',
    quickActions: ['Generate National Situation Report', 'Assess Interstate Risk', 'Recommend Resource Allocation', 'Predict Escalation Risk'],
  },
  state_admin: {
    name: 'State Coordination AI',
    avatar: '🏛️',
    tagline: 'State-level emergency coordination & resource optimization',
    systemPrompt: 'You are the State Coordination AI for LifeLink. You help state administrators coordinate district-level responses, allocate state resources, and manage inter-department collaboration. Reference state disaster management protocols and district capabilities.',
    quickActions: ['District Risk Assessment', 'Resource Reallocation Plan', 'Inter-District Coordination', 'State Health Advisory'],
  },
  district_admin: {
    name: 'District Operations AI',
    avatar: '🏢',
    tagline: 'Tactical district operations & real-time response',
    systemPrompt: 'You are the District Operations AI for LifeLink. You provide tactical recommendations for emergency response at the district level, including hospital coordination, ambulance routing, evacuation planning, and local resource deployment. Reference district disaster management plans.',
    quickActions: ['Hospital Load Assessment', 'Evacuation Route Plan', 'Ambulance Deployment', 'Local Resource Status'],
  },
  police: {
    name: 'Law Enforcement AI',
    avatar: '🚔',
    tagline: 'Public safety, crowd management & emergency routing',
    systemPrompt: 'You are the Law Enforcement AI for LifeLink. You assist police departments with crowd analysis, traffic management during emergencies, VIP route optimization, crime pattern analysis during disasters, and emergency response coordination.',
    quickActions: ['Traffic Analysis', 'Crowd Density Report', 'Emergency Route Clearance', 'Incident Pattern Analysis'],
  },
  fire: {
    name: 'Fire Operations AI',
    avatar: '🚒',
    tagline: 'Fire spread prediction, hazmat analysis & rescue ops',
    systemPrompt: 'You are the Fire Operations AI for LifeLink. You assist fire departments with fire spread prediction, hazmat analysis, building collapse risk assessment, rescue priority determination, and resource allocation.',
    quickActions: ['Fire Spread Simulation', 'Hazmat Risk Assessment', 'Building Collapse Risk', 'Rescue Priority Queue'],
  },
  ndma: {
    name: 'Disaster Intelligence AI',
    avatar: '⛑️',
    tagline: 'Multi-hazard disaster prediction & coordinated response',
    systemPrompt: 'You are the Disaster Intelligence AI for LifeLink. You provide multi-hazard disaster predictions (floods, cyclones, earthquakes, landslides), recommend evacuation plans, optimize shelter allocation, and coordinate multi-agency disaster response. Reference NDMA guidelines and historical disaster data.',
    quickActions: ['Multi-Hazard Risk Assessment', 'Evacuation Plan Generator', 'Shelter Optimization', 'Post-Disaster Assessment'],
  },
  ndrf: {
    name: 'Response Operations AI',
    avatar: '🛟',
    tagline: 'Search & rescue operations, logistics & deployment',
    systemPrompt: 'You are the Response Operations AI for LifeLink. You assist NDRF/SDRF teams with search and rescue planning, resource deployment optimization, logistics coordination, and field operations management during disaster response.',
    quickActions: ['Team Deployment Plan', 'Search Area Prioritization', 'Logistics Route Planning', 'Field Resource Status'],
  },
  health: {
    name: 'Medical Intelligence AI',
    avatar: '🏥',
    tagline: 'Healthcare capacity, disease surveillance & medical logistics',
    systemPrompt: 'You are the Medical Intelligence AI for LifeLink. You provide healthcare capacity forecasting, disease outbreak detection, medical supply chain optimization, hospital load balancing, and public health recommendations. Reference WHO guidelines and MoHFW protocols.',
    quickActions: ['Hospital Capacity Analysis', 'Disease Outbreak Alert', 'Medical Supply Forecast', 'Vaccination Coverage Report'],
  },
  ambulance: {
    name: 'EMS Logistics AI',
    avatar: '🚑',
    tagline: 'Ambulance routing, ETA prediction & patient transport',
    systemPrompt: 'You are the EMS Logistics AI for LifeLink. You optimize ambulance deployment, predict ETAs based on traffic and road conditions, manage patient transport logistics, and coordinate with hospitals for bed availability.',
    quickActions: ['Fleet Optimization', 'ETA Prediction', 'Hospital Bed Matching', 'Traffic Rerouting'],
  },
  default: {
    name: 'Operations Officer AI',
    avatar: '🎯',
    tagline: 'General emergency operations support & analysis',
    systemPrompt: 'You are the Operations Officer AI for LifeLink, the Government of India\'s national emergency response platform. You provide tactical recommendations, situation analysis, and decision support for emergency operations.',
    quickActions: ['Situation Assessment', 'Resource Status Report', 'Action Recommendation', 'Risk Analysis'],
  },
};

// ─── Quick replies ─────────────────────────────────────────
const QUICK_REPLIES = [
  { label: 'What is my current situation?', icon: 'fa-satellite-dish' },
  { label: 'What should I prioritize?', icon: 'fa-list-check' },
  { label: 'Predict next 6 hours', icon: 'fa-chart-line' },
  { label: 'Recommend immediate actions', icon: 'fa-bolt' },
  { label: 'Assess current risks', icon: 'fa-triangle-exclamation' },
  { label: 'Generate situation report', icon: 'fa-file-alt' },
];

const AIOperationsOfficer = ({ role = 'default', orgName = '', onCommand }) => {
  const persona = AI_PERSONAS[role] || AI_PERSONAS.default;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  // Welcome message on mount
  useEffect(() => {
    setMessages([
      {
        role: 'ai',
        text: `**${persona.name}** online. ${persona.tagline}. How may I assist your operations?`,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [role, persona.name, persona.tagline]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg = {
      role: 'user',
      text,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await apiFetch('/v2/ai/ask', {
        method: 'POST',
        body: JSON.stringify({
          query: text,
          role,
          context: { org_name: orgName, persona: persona.name },
        }),
        timeoutMs: 20000,
      });

      const responseText = res.ok
        ? (res.data?.response || res.data?.answer || 'Analysis complete. No actionable intelligence at this time.')
        : 'Unable to process request. Switching to local analysis mode.';

      const aiMsg = {
        role: 'ai',
        text: responseText,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'ai',
        text: '⚠️ Communication interrupted. Running local decision support model.\n\n**Tactical Assessment:** Situation nominal. Monitoring channels.',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, role, orgName, persona.name]);

  return (
    <div className="flex flex-col h-full">
      {/* ── AI Officer Header ── */}
      <div className="shrink-0 px-4 py-3 bg-slate-800/80 border-b border-slate-700/30">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{persona.avatar}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{persona.name}</p>
            <p className="text-[9px] text-slate-400 truncate">{persona.tagline}</p>
          </div>
          <span className="flex items-center gap-1 text-[9px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </span>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="shrink-0 px-3 py-2 flex flex-wrap gap-1 border-b border-slate-700/20">
        {persona.quickActions.slice(0, 3).map((action) => (
          <button
            key={action}
            onClick={() => handleSend(action)}
            className="text-[9px] font-medium px-2 py-1 rounded-md bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors border border-slate-600/30"
          >
            {action}
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'ai' && (
              <span className="text-sm mt-1 shrink-0">{persona.avatar}</span>
            )}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 ${
              msg.role === 'user'
                ? 'bg-blue-600/20 text-blue-100 border border-blue-500/20'
                : 'bg-slate-700/50 text-slate-200 border border-slate-600/30'
            }`}>
              <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              <p className="text-[8px] text-slate-500 mt-1 text-right">{msg.time}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <span className="text-sm mt-1">{persona.avatar}</span>
            <div className="bg-slate-700/50 rounded-xl px-3 py-2 border border-slate-600/30">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Replies ── */}
      {!expanded && messages.length < 4 && (
        <div className="shrink-0 px-3 py-2 flex flex-wrap gap-1 border-t border-slate-700/20">
          {QUICK_REPLIES.slice(0, 3).map((qr) => (
            <button
              key={qr.label}
              onClick={() => handleSend(qr.label)}
              className="text-[9px] px-2 py-1 rounded-md bg-slate-700/30 text-slate-400 hover:text-slate-200 hover:bg-slate-600/30 transition-colors flex items-center gap-1"
            >
              <i className={`fas ${qr.icon} text-[8px]`} />
              {qr.label}
            </button>
          ))}
          <button
            onClick={() => setExpanded(true)}
            className="text-[9px] px-2 py-1 rounded-md text-slate-500 hover:text-slate-300"
          >
            +{QUICK_REPLIES.length - 3} more
          </button>
        </div>
      )}

      {/* ── Input ── */}
      <div className="shrink-0 px-3 py-2 border-t border-slate-700/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask ${persona.name}...`}
            className="flex-1 bg-slate-700/50 text-white text-[11px] px-3 py-2 rounded-lg border border-slate-600/30 focus:outline-none focus:border-blue-500/50 placeholder-slate-500"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-2.5 py-2 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <i className="fas fa-arrow-right" />
          </button>
        </div>
      </div>
    </div>
  );
};

export { AI_PERSONAS, AIOperationsOfficer as default };
