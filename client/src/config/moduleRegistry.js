/**
 * LifeLink Module Registry — Centralized module definitions
 * Single source of truth for all dashboard modules, their labels,
 * access roles, and development status.
 */

export const MODULE_STATUS = {
  PRODUCTION: 'PRODUCTION',
  BETA: 'BETA',
  COMING_SOON: 'COMING_SOON',
};

/**
 * @typedef {Object} ModuleDefinition
 * @property {string} key - Unique module identifier
 * @property {string} label - Display name
 * @property {string} icon - Font Awesome icon class
 * @property {string[]} roles - Allowed roles (all = everyone with that role)
 * @property {string} status - Production/Beta/ComingSoon
 * @property {string} [description] - Optional description
 * @property {string} [subRole] - Optional sub-role requirement
 */

/** @type {ModuleDefinition[]} */
export const MODULE_REGISTRY = [
  // ─── Public Modules ───────────────────────────────
  {
    key: 'public_home',
    label: 'Home',
    icon: 'fa-home',
    roles: ['public'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Emergency hub with quick actions',
  },
  {
    key: 'public_sos',
    label: 'Smart SOS',
    icon: 'fa-ambulance',
    roles: ['public'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Trigger emergency response with location sharing',
  },
  {
    key: 'public_hospital',
    label: 'Find Hospital',
    icon: 'fa-hospital',
    roles: ['public'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Nearby hospitals with bed availability',
  },
  {
    key: 'public_health',
    label: 'Health Check',
    icon: 'fa-heartbeat',
    roles: ['public'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Quick AI health risk assessment',
  },
  {
    key: 'public_donor',
    label: 'Donor Match',
    icon: 'fa-droplet',
    roles: ['public'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Find blood donors near you',
  },
  {
    key: 'public_family',
    label: 'Family Monitor',
    icon: 'fa-users',
    roles: ['public'],
    status: MODULE_STATUS.BETA,
    description: 'Monitor family health members',
  },
  {
    key: 'public_ai_chat',
    label: 'AI Chat',
    icon: 'fa-robot',
    roles: ['public'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Ask LifeLink AI anything',
  },

  // ─── Hospital Modules ─────────────────────────────
  {
    key: 'hospital_overview',
    label: 'Overview',
    icon: 'fa-chart-pie',
    roles: ['hospital'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'CEO dashboard with KPI metrics',
  },
  {
    key: 'hospital_patients',
    label: 'Patients',
    icon: 'fa-bed',
    roles: ['hospital'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Patient directory and intake queue',
  },
  {
    key: 'hospital_ops',
    label: 'Operations',
    icon: 'fa-cogs',
    roles: ['hospital'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Department analytics, finance, staff, reports',
  },
  {
    key: 'hospital_ai',
    label: 'AI Insights',
    icon: 'fa-brain',
    roles: ['hospital'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'ML predictions: ETA, bed demand, staff allocation',
  },
  {
    key: 'hospital_resources',
    label: 'Resources',
    icon: 'fa-boxes',
    roles: ['hospital'],
    status: MODULE_STATUS.BETA,
    description: 'Bed management and resource tracking',
  },

  // ─── Government Modules ───────────────────────────
  {
    key: 'government_command',
    label: 'Command Center',
    icon: 'fa-tower-broadcast',
    roles: ['government'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Live emergency monitoring and dispatch',
  },
  {
    key: 'government_ai',
    label: 'AI Hub',
    icon: 'fa-microchip',
    roles: ['government'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Outbreak forecast, allocation, policy insights',
  },

  // ─── Ambulance Modules ────────────────────────────
  {
    key: 'ambulance_dispatch',
    label: 'Dispatch',
    icon: 'fa-truck-medical',
    roles: ['ambulance'],
    status: MODULE_STATUS.PRODUCTION,
    description: 'Emergency response and routing',
  },
];

/**
 * Get all modules accessible by a given role.
 * @param {string} role
 * @returns {ModuleDefinition[]}
 */
export function getModulesByRole(role) {
  return MODULE_REGISTRY.filter((m) => m.roles.includes(role));
}

/**
 * Check if a module is accessible by a given role.
 * @param {string} moduleKey
 * @param {string} role
 * @returns {boolean}
 */
export function canAccessModule(moduleKey, role) {
  const module = MODULE_REGISTRY.find((m) => m.key === moduleKey);
  if (!module) return false;
  return module.roles.includes(role);
}
