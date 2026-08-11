import React, { useState } from 'react';
import { GovKPICard, GovStatusBadge, GovSectionHeader, GovModuleHero } from '../shared/GovernmentShared';

const Resources = () => {
  const inventory = [
    { name: 'NDRF Teams', total: 24, available: 18, unit: 'teams', status: 'Available' },
    { name: 'Ambulances', total: 120, available: 84, unit: 'units', status: 'Active' },
    { name: 'Fire Units', total: 48, available: 36, unit: 'units', status: 'Available' },
    { name: 'Helicopters', total: 12, available: 8, unit: 'aircraft', status: 'Limited' },
    { name: 'Boats / Rescue Vessels', total: 32, available: 24, unit: 'vessels', status: 'Available' },
    { name: 'Field Hospitals', total: 8, available: 5, unit: 'units', status: 'Active' },
    { name: 'Food Supplies (Meals)', total: 50000, available: 42000, unit: 'meals', status: 'Available' },
    { name: 'Water (Litres)', total: 120000, available: 98000, unit: 'L', status: 'Available' },
    { name: 'Generators', total: 60, available: 42, unit: 'units', status: 'Limited' },
    { name: 'Oxygen Cylinders', total: 400, available: 320, unit: 'units', status: 'Active' },
  ];

  return (
    <div className="space-y-5">
      <GovModuleHero
        title="National Resource Management"
        subtitle="Track, allocate, and optimize emergency resources across all agencies"
        icon="fa-boxes-stacked"
        gradient="from-teal-700 to-emerald-800"
        stats={[
          { label: 'Total Resources', value: '24,500+' },
          { label: 'Allocated', value: '8,200' },
          { label: 'Available', value: '14,800' },
          { label: 'Pending Requests', value: '12' },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GovKPICard label="Medical Supplies" value="78%" icon="fa-kit-medical" color="red" trend={-5} />
        <GovKPICard label="Fuel Reserves" value="82%" icon="fa-gas-pump" color="amber" />
        <GovKPICard label="Shelter Capacity" value="65%" icon="fa-house-chimney" color="emerald" />
        <GovKPICard label="Fleet Readiness" value="91%" icon="fa-truck" color="sky" trend={3} />
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <GovSectionHeader icon="fa-list" label="Resource Inventory" action={{ label: 'Request Resources', onClick: () => {} }} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="p-3 font-semibold text-slate-500">Resource</th>
                <th className="p-3 font-semibold text-slate-500">Total</th>
                <th className="p-3 font-semibold text-slate-500">Available</th>
                <th className="p-3 font-semibold text-slate-500">Utilization</th>
                <th className="p-3 font-semibold text-slate-500">Status</th>
                <th className="p-3 font-semibold text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {inventory.map((r, i) => {
                const util = Math.round(((r.total - r.available) / r.total) * 100);
                return (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-medium text-slate-800">{r.name}</td>
                    <td className="p-3 text-slate-600">{r.total.toLocaleString()} {r.unit}</td>
                    <td className="p-3 text-slate-600">{r.available.toLocaleString()} {r.unit}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${util > 80 ? 'bg-red-500' : util > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: util + '%' }} />
                        </div>
                        <span className="text-[9px] text-slate-400">{util}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <GovStatusBadge text={r.status} color={r.status === 'Available' ? 'emerald' : r.status === 'Active' ? 'sky' : 'amber'} />
                    </td>
                    <td className="p-3">
                      <button className="text-[9px] font-semibold text-indigo-600 hover:text-indigo-800">Allocate</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warehouse + Procurement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-warehouse" label="Warehouse Capacity" />
          <div className="space-y-3">
            {[
              { name: 'Mangaluru Central', used: 72, capacity: '12,000 units' },
              { name: 'Bengaluru Hub', used: 58, capacity: '25,000 units' },
              { name: 'Udupi Regional', used: 34, capacity: '8,000 units' },
              { name: 'Hubballi Depot', used: 81, capacity: '15,000 units' },
            ].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">{w.name}</span>
                    <span className="text-[9px] text-slate-400">{w.capacity}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${w.used > 75 ? 'bg-red-500' : w.used > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: w.used + '%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm">
          <GovSectionHeader icon="fa-truck-fast" label="Pending Procurement" />
          <div className="space-y-2">
            {[
              { item: 'Oxygen Cylinders', qty: 200, urgency: 'Critical', eta: '24h' },
              { item: 'Temporary Shelters', qty: 500, urgency: 'High', eta: '48h' },
              { item: 'Medical Kits', qty: 1000, urgency: 'High', eta: '36h' },
              { item: 'Water Purifiers', qty: 100, urgency: 'Medium', eta: '72h' },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div>
                  <p className="text-xs font-semibold text-slate-700">{p.item}</p>
                  <p className="text-[9px] text-slate-400">Qty: {p.qty} · ETA: {p.eta}</p>
                </div>
                <GovStatusBadge text={p.urgency} color={p.urgency === 'Critical' ? 'red' : p.urgency === 'High' ? 'amber' : 'orange'} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Resources;
