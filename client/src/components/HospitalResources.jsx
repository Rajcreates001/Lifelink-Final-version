import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { LoadingSpinner, StatusPill } from './Common';
import {
  ResourceHeroCommandCenter, ResourceHealthEngine, ResourceInventoryBrain,
  ResourcePredictiveInventory, ResourceSmartProcurement, ResourceSupplierIntelligence,
  ResourceEquipmentDigitalTwin, ResourcePredictiveMaintenance, ResourceCriticalWatch,
  ResourceAllocationEngine, ResourceCostOptimization, ResourceWasteDetection,
  ResourceSupplyChainMap, ResourceTimeline, ResourceKnowledgeGraph,
  ResourceScenarioSimulator,
} from './ui/ResourceIntelComponents';

const AnimatedBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
    <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-teal-200/15 to-emerald-300/15 blur-3xl animate-pulse-slow" />
    <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gradient-to-tr from-blue-200/15 to-cyan-200/15 blur-3xl animate-pulse-slower" />
    <svg className="absolute inset-0 w-full h-full opacity-[0.01]" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id="ri-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5"/></pattern></defs>
      <rect width="100%" height="100%" fill="url(#ri-grid)"/>
    </svg>
  </div>
);

const ResourceIntelligenceCenter = () => {
  const { user } = useAuth();
  const hospitalId = user?._id || user?.id;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!hospitalId) { setStats(null); setLoading(false); return; }
      setLoading(true);
      try {
        const res = await apiFetch('/api/hospital-ops/ceo/resources?hospitalId=' + hospitalId, { method: 'GET' });
        setStats(res.ok ? res.data : null);
      } catch (_) { setStats(null); }
      finally { setLoading(false); }
    };
    load();
  }, [hospitalId]);

  if (loading && !stats) return <LoadingSpinner />;

  return (
    <div className="relative pb-10">
      <AnimatedBg />
      <div className="relative z-10 space-y-4 sm:space-y-5">

        {/* Hero Command Center */}
        <ResourceHeroCommandCenter />

        {/* Row 1: Health Engine + Inventory Brain */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResourceHealthEngine />
          <ResourceInventoryBrain />
        </div>

        {/* Row 2: Predictive Inventory + Smart Procurement */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResourcePredictiveInventory />
          <ResourceSmartProcurement />
        </div>

        {/* Row 3: Supplier Intelligence + Equipment Twins */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResourceSupplierIntelligence />
          <ResourceEquipmentDigitalTwin />
        </div>

        {/* Row 4: Predictive Maintenance + Critical Watch */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResourcePredictiveMaintenance />
          <ResourceCriticalWatch />
        </div>

        {/* Row 5: Allocation + Cost Optimization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResourceAllocationEngine />
          <ResourceCostOptimization />
        </div>

        {/* Row 6: Waste Detection + Supply Chain */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResourceWasteDetection />
          <ResourceSupplyChainMap />
        </div>

        {/* Row 7: Timeline + Knowledge Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResourceTimeline />
          <ResourceKnowledgeGraph />
        </div>

        {/* Row 8: Scenario Simulator + Backend Data */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResourceScenarioSimulator />
          {stats && (
            <div className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 overflow-hidden animate-fade-in-up">
              <div className="px-4 py-3 bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b border-white/20">
                <h3 className="text-sm font-bold text-slate-800 font-display flex items-center gap-2">
                  <i className="fas fa-database text-slate-500" />Resource Data (from backend)
                </h3>
              </div>
              <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                {stats.inventory?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Inventory ({stats.inventory.length} items)</p>
                    {stats.inventory.slice(0, 6).map((item) => (
                      <div key={item._id || item.name} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-700">{item.name}</span>
                        <span className={`text-[9px] font-bold ${Number(item.quantity) <= Number(item.minThreshold || 0) ? 'text-red-600' : 'text-emerald-600'}`}>
                          {item.quantity} {item.unit || 'units'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {stats.equipment?.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Equipment ({stats.equipment.length} items)</p>
                    {stats.equipment.slice(0, 4).map((item) => (
                      <div key={item._id || item.name} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/50 border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-700">{item.name}</span>
                        <StatusPill text={item.status || 'Available'} color={item.status === 'Active' ? 'green' : 'yellow'} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
                {(!stats.inventory?.length && !stats.equipment?.length) && (
                  <p className="text-xs text-slate-400 text-center py-4">No resource data available yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceIntelligenceCenter;
