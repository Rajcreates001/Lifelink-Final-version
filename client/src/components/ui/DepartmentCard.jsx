import React from 'react';

const departmentThemes = {
  ceo: { gradient: 'from-blue-600 to-indigo-700', icon: 'fa-crown', light: 'bg-blue-50', text: 'text-blue-700' },
  finance: { gradient: 'from-emerald-600 to-teal-700', icon: 'fa-coins', light: 'bg-emerald-50', text: 'text-emerald-700' },
  emergency: { gradient: 'from-red-600 to-rose-700', icon: 'fa-ambulance', light: 'bg-red-50', text: 'text-red-700' },
  icu: { gradient: 'from-purple-600 to-violet-700', icon: 'fa-heart-pulse', light: 'bg-purple-50', text: 'text-purple-700' },
  opd: { gradient: 'from-sky-600 to-cyan-700', icon: 'fa-user-doctor', light: 'bg-sky-50', text: 'text-sky-700' },
  radiology: { gradient: 'from-amber-600 to-orange-700', icon: 'fa-x-ray', light: 'bg-amber-50', text: 'text-amber-700' },
  ot: { gradient: 'from-rose-600 to-pink-700', icon: 'fa-user-nurse', light: 'bg-rose-50', text: 'text-rose-700' },
  laboratory: { gradient: 'from-teal-600 to-cyan-700', icon: 'fa-flask', light: 'bg-teal-50', text: 'text-teal-700' },
  pharmacy: { gradient: 'from-green-600 to-emerald-700', icon: 'fa-tablets', light: 'bg-green-50', text: 'text-green-700' },
  blood_bank: { gradient: 'from-red-500 to-rose-600', icon: 'fa-droplet', light: 'bg-red-50', text: 'text-red-600' },
  admin: { gradient: 'from-slate-600 to-gray-700', icon: 'fa-building', light: 'bg-slate-50', text: 'text-slate-700' },
};

const roleMetrics = {
  ceo: [
    { label: 'Revenue MTD', value: '$2.4M', icon: 'fa-chart-line', color: 'text-emerald-600' },
    { label: 'Readiness', value: '97%', icon: 'fa-shield', color: 'text-blue-600' },
    { label: 'Staff Util.', value: '84%', icon: 'fa-users', color: 'text-purple-600' },
    { label: 'Operational Eff.', value: '92%', icon: 'fa-gauge-high', color: 'text-teal-600' },
  ],
  finance: [
    { label: 'Pending Bills', value: '146', icon: 'fa-file-invoice', color: 'text-orange-600' },
    { label: 'Revenue', value: '$8.2M', icon: 'fa-chart-bar', color: 'text-emerald-600' },
    { label: 'Insurance Claims', value: '84', icon: 'fa-shield', color: 'text-blue-600' },
    { label: 'Outstanding', value: '$1.2M', icon: 'fa-clock', color: 'text-red-600' },
  ],
  emergency: [
    { label: 'Incoming Cases', value: '18', icon: 'fa-triangle-exclamation', color: 'text-red-600' },
    { label: 'Critical', value: '3', icon: 'fa-heart-crack', color: 'text-rose-600' },
    { label: 'Ambulances', value: '7', icon: 'fa-truck-medical', color: 'text-orange-600' },
    { label: 'Avg ETA', value: '11 min', icon: 'fa-clock', color: 'text-amber-600' },
  ],
  icu: [
    { label: 'Beds Occupied', value: '42', icon: 'fa-bed', color: 'text-purple-600' },
    { label: 'Ventilators', value: '28', icon: 'fa-fan', color: 'text-blue-600' },
    { label: 'Critical Pts', value: '8', icon: 'fa-heart-pulse', color: 'text-red-600' },
    { label: 'Nurses Active', value: '36', icon: 'fa-user-nurse', color: 'text-teal-600' },
  ],
  radiology: [
    { label: 'Scans Today', value: '64', icon: 'fa-camera', color: 'text-amber-600' },
    { label: 'MRI Pending', value: '12', icon: 'fa-magnet', color: 'text-blue-600' },
    { label: 'CT Pending', value: '18', icon: 'fa-cube', color: 'text-purple-600' },
    { label: 'Waiting Queue', value: '8', icon: 'fa-hourglass', color: 'text-orange-600' },
  ],
  ot: [
    { label: 'Ops Today', value: '14', icon: 'fa-scalpel', color: 'text-rose-600' },
    { label: 'Scheduled', value: '9', icon: 'fa-calendar', color: 'text-blue-600' },
    { label: 'Emergency', value: '5', icon: 'fa-bolt', color: 'text-red-600' },
    { label: 'Available Rooms', value: '3', icon: 'fa-door-open', color: 'text-green-600' },
  ],
  opd: [
    { label: 'Appointments', value: '124', icon: 'fa-calendar-check', color: 'text-sky-600' },
    { label: 'Doctors On Duty', value: '18', icon: 'fa-user-doctor', color: 'text-blue-600' },
    { label: 'Avg Wait', value: '24 min', icon: 'fa-hourglass-half', color: 'text-orange-600' },
    { label: 'Consultations', value: '86', icon: 'fa-notes-medical', color: 'text-teal-600' },
  ],
  default: [
    { label: 'Active Cases', value: '42', icon: 'fa-chart-simple', color: 'text-blue-600' },
    { label: 'Staff', value: '128', icon: 'fa-users', color: 'text-purple-600' },
    { label: 'Resources', value: '86%', icon: 'fa-boxes', color: 'text-green-600' },
    { label: 'Efficiency', value: '91%', icon: 'fa-gauge-high', color: 'text-teal-600' },
  ],
};

const DepartmentCard = ({ role, title, description, icon: overrideIcon, onSelect, delay = 0 }) => {
  const theme = departmentThemes[role] || departmentThemes.default;
  const metrics = roleMetrics[role] || roleMetrics.default;
  const icon = overrideIcon || theme.icon;

  const aiStatusColors = {
    ceo: 'bg-blue-100 text-blue-700',
    finance: 'bg-emerald-100 text-emerald-700',
    emergency: 'bg-red-100 text-red-700',
    icu: 'bg-purple-100 text-purple-700',
  };
  const aiStatusText = {
    ceo: 'AI Strategic Analysis Active',
    emergency: 'High traffic in next 2 hrs',
    icu: 'AI Risk Monitoring Active',
    finance: 'Revenue Forecast Ready',
  };
  const statusColor = aiStatusColors[role] || 'bg-sky-100 text-sky-700';
  const statusText = aiStatusText[role] || 'AI Analysis Ready';

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`
        relative overflow-hidden rounded-2xl border transition-all duration-300 ease-out
        animate-fade-in-up group cursor-pointer
        border-white/40 bg-white/70 hover:border-indigo-200 hover:bg-white/90 hover:shadow-xl hover:-translate-y-1
        active:scale-[0.98]
      `}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' && onSelect) onSelect(); }}
    >

      {/* Animated border gradient */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05), transparent)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${theme.gradient} text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
            <i className={`fas ${icon} text-xl`}></i>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors duration-300 truncate">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 leading-tight line-clamp-1">{description}</p>
          </div>
          <div className="flex-shrink-0 mt-1">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all duration-300">
              <i className="fas fa-chevron-right text-xs"></i>
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {metrics.map((metric, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white/50 rounded-lg px-2.5 py-2 border border-slate-100/50">
              <i className={`fas ${metric.icon} ${metric.color} text-xs`}></i>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-slate-400 uppercase truncate">{metric.label}</p>
                <p className={`text-sm font-bold ${metric.color}`}>{metric.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* AI Status */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${statusColor} text-[11px] font-semibold`}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
          </span>
          {statusText}
        </div>
      </div>

      {/* Bottom accent bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${theme.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
    </div>
  );
};

export default DepartmentCard;
