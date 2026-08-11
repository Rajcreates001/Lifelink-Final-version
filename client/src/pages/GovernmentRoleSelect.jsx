import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GovernmentLoginModal from '../components/ui/GovernmentLoginModal';

import LogoutConfirmDialog from '../components/ui/LogoutConfirmDialog';

// ═══════════════════════════════════════════════════════════════════════════
// GOVERNMENT ORGANIZATIONS — Complete National Emergency Response Ecosystem
// ═══════════════════════════════════════════════════════════════════════════

const ORGANIZATIONS = [
  { key: 'ministry_health', title: 'Ministry of Health & Family Welfare', desc: 'National health policy & governance', icon: 'fa-landmark', category: 'national', level: 'national', staff: 240, online: 142, status: 'Operational', aiHealth: 94, emergencyPriority: 90 },
  { key: 'ndma', title: 'National Disaster Management Authority', desc: 'Disaster preparedness & response coordination', icon: 'fa-shield-halved', category: 'national', level: 'national', staff: 180, online: 96, status: 'Operational', aiHealth: 90, emergencyPriority: 100 },
  { key: 'national_emergency', title: 'National Emergency Command Centre', desc: '24/7 emergency response coordination', icon: 'fa-tower-broadcast', category: 'national', level: 'national', staff: 85, online: 56, status: 'Busy', aiHealth: 82, emergencyPriority: 100 },
  { key: 'ncdc', title: 'National Centre for Disease Control', desc: 'Disease surveillance & outbreak control', icon: 'fa-microscope', category: 'national', level: 'national', staff: 120, online: 78, status: 'Operational', aiHealth: 92, emergencyPriority: 85 },
  { key: 'icmr', title: 'Indian Council of Medical Research', desc: 'Medical research & clinical trials', icon: 'fa-flask', category: 'national', level: 'national', staff: 90, online: 62, status: 'Operational', aiHealth: 96, emergencyPriority: 70 },
  { key: 'nha', title: 'National Health Authority', desc: 'Health insurance & Ayushman Bharat', icon: 'fa-id-card', category: 'national', level: 'national', staff: 160, online: 105, status: 'Operational', aiHealth: 88, emergencyPriority: 75 },
  { key: 'central_gov', title: 'Central Government Administrator', desc: 'Central oversight & policy execution', icon: 'fa-building-columns', category: 'national', level: 'national', staff: 300, online: 185, status: 'Operational', aiHealth: 91, emergencyPriority: 85 },
  { key: 'blood_council', title: 'National Blood Transfusion Council', desc: 'National blood supply management', icon: 'fa-droplet', category: 'national', level: 'national', staff: 55, online: 38, status: 'Operational', aiHealth: 93, emergencyPriority: 80 },
  { key: 'central_surveillance', title: 'Central Surveillance Unit', desc: 'National health surveillance & monitoring', icon: 'fa-satellite-dish', category: 'national', level: 'national', staff: 85, online: 55, status: 'Operational', aiHealth: 93, emergencyPriority: 85 },

  { key: 'state_health', title: 'State Health Department', desc: 'State healthcare administration', icon: 'fa-flag', category: 'state', level: 'state', staff: 200, online: 130, status: 'Operational', aiHealth: 90, emergencyPriority: 85 },
  { key: 'state_disaster', title: 'State Disaster Management Authority', desc: 'State-level disaster response', icon: 'fa-triangle-exclamation', category: 'state', level: 'state', staff: 140, online: 88, status: 'Operational', aiHealth: 86, emergencyPriority: 95 },
  { key: 'state_emergency', title: 'State Emergency Operations Centre', desc: 'Emergency coordination & dispatch', icon: 'fa-phone', category: 'state', level: 'state', staff: 75, online: 52, status: 'Busy', aiHealth: 84, emergencyPriority: 95 },
  { key: 'state_medical', title: 'State Health Commissioner Office', desc: 'Medical regulation & public health', icon: 'fa-user-doctor', category: 'state', level: 'state', staff: 110, online: 72, status: 'Operational', aiHealth: 91, emergencyPriority: 80 },
  { key: 'state_surveillance', title: 'State Disease Surveillance Unit', desc: 'Disease tracking & reporting', icon: 'fa-chart-line', category: 'state', level: 'state', staff: 65, online: 45, status: 'Operational', aiHealth: 89, emergencyPriority: 80 },

  { key: 'district_collector', title: 'District Collector Office', desc: 'District administration & governance', icon: 'fa-building', category: 'district', level: 'district', staff: 180, online: 115, status: 'Operational', aiHealth: 88, emergencyPriority: 80 },
  { key: 'district_health', title: 'District Health Office', desc: 'District health services & programs', icon: 'fa-hospital', category: 'district', level: 'district', staff: 120, online: 78, status: 'Operational', aiHealth: 90, emergencyPriority: 80 },
  { key: 'district_emergency', title: 'District Emergency Control Room', desc: 'Local emergency response coordination', icon: 'fa-tower-cell', category: 'district', level: 'district', staff: 45, online: 32, status: 'Operational', aiHealth: 85, emergencyPriority: 90 },
  { key: 'district_surveillance', title: 'District Surveillance Office', desc: 'Local disease & health monitoring', icon: 'fa-eye', category: 'district', level: 'district', staff: 35, online: 24, status: 'Operational', aiHealth: 87, emergencyPriority: 70 },
  { key: 'district_disaster', title: 'District Disaster Management Cell', desc: 'Local disaster preparedness & relief', icon: 'fa-helmet-safety', category: 'district', level: 'district', staff: 50, online: 35, status: 'Operational', aiHealth: 83, emergencyPriority: 85 },

  { key: 'police', title: 'Police Department', desc: 'Law enforcement & public safety', icon: 'fa-shield', category: 'emergency_services', level: 'department', staff: 500, online: 320, status: 'Operational', aiHealth: 86, emergencyPriority: 90 },
  { key: 'police_control', title: 'Police Control Room', desc: 'Emergency dispatch & incident response', icon: 'fa-tower-broadcast', category: 'emergency_services', level: 'department', staff: 120, online: 85, status: 'Busy', aiHealth: 80, emergencyPriority: 95 },
  { key: 'traffic_police', title: 'Traffic Control', desc: 'Traffic management & road safety', icon: 'fa-traffic-light', category: 'emergency_services', level: 'department', staff: 200, online: 140, status: 'Operational', aiHealth: 84, emergencyPriority: 70 },
  { key: 'cyber_crime', title: 'Cyber Crime Unit', desc: 'Cyber crime investigation & prevention', icon: 'fa-laptop', category: 'emergency_services', level: 'department', staff: 60, online: 42, status: 'Operational', aiHealth: 92, emergencyPriority: 60 },
  { key: 'special_ops', title: 'Special Operations', desc: 'Tactical response & special missions', icon: 'fa-crosshairs', category: 'emergency_services', level: 'department', staff: 80, online: 55, status: 'Operational', aiHealth: 88, emergencyPriority: 90 },
  { key: 'intelligence', title: 'Intelligence Unit', desc: 'Intelligence gathering & analysis', icon: 'fa-user-secret', category: 'emergency_services', level: 'department', staff: 45, online: 30, status: 'Operational', aiHealth: 90, emergencyPriority: 90 },
  { key: 'fire', title: 'Fire & Emergency Services', desc: 'Fire suppression & rescue operations', icon: 'fa-fire-extinguisher', category: 'emergency_services', level: 'department', staff: 350, online: 220, status: 'Operational', aiHealth: 85, emergencyPriority: 95 },
  { key: 'fire_control', title: 'Fire Control Room', desc: 'Fire dispatch & incident management', icon: 'fa-tower-broadcast', category: 'emergency_services', level: 'department', staff: 50, online: 35, status: 'Busy', aiHealth: 82, emergencyPriority: 95 },
  { key: 'hazmat', title: 'Hazmat Team', desc: 'Hazardous materials response', icon: 'fa-biohazard', category: 'emergency_services', level: 'department', staff: 40, online: 28, status: 'Operational', aiHealth: 90, emergencyPriority: 90 },
  { key: 'ambulance_authority', title: 'Ambulance Authority', desc: 'EMS fleet & patient transport', icon: 'fa-truck-medical', category: 'emergency_services', level: 'department', staff: 280, online: 185, status: 'Operational', aiHealth: 86, emergencyPriority: 95 },
  { key: 'ambulance_dispatch', title: 'Ambulance Dispatch', desc: 'Emergency dispatch & routing', icon: 'fa-map-location-dot', category: 'emergency_services', level: 'department', staff: 65, online: 45, status: 'Busy', aiHealth: 81, emergencyPriority: 95 },
  { key: 'civil_defence', title: 'Civil Defence', desc: 'Civil protection & volunteer coordination', icon: 'fa-hard-hat', category: 'emergency_services', level: 'department', staff: 80, online: 55, status: 'Operational', aiHealth: 86, emergencyPriority: 80 },

  { key: 'public_health', title: 'Public Health Department', desc: 'Population health & disease prevention', icon: 'fa-heart-pulse', category: 'health', level: 'department', staff: 150, online: 98, status: 'Operational', aiHealth: 93, emergencyPriority: 80 },
  { key: 'epidemiology', title: 'Epidemiology Unit', desc: 'Disease outbreak investigation', icon: 'fa-virus', category: 'health', level: 'department', staff: 55, online: 38, status: 'Operational', aiHealth: 95, emergencyPriority: 85 },
  { key: 'vaccination', title: 'Vaccination Office', desc: 'Immunization programs & supply', icon: 'fa-syringe', category: 'health', level: 'department', staff: 80, online: 55, status: 'Operational', aiHealth: 91, emergencyPriority: 75 },
  { key: 'blood_bank_authority', title: 'Blood Bank Authority', desc: 'National blood inventory & distribution', icon: 'fa-droplet', category: 'health', level: 'department', staff: 60, online: 42, status: 'Operational', aiHealth: 94, emergencyPriority: 85 },
  { key: 'animal_husbandry', title: 'Animal Husbandry Department', desc: 'Livestock health & zoonotic disease control', icon: 'fa-horse-head', category: 'health', level: 'department', staff: 80, online: 52, status: 'Operational', aiHealth: 88, emergencyPriority: 60 },
  { key: 'pharma_supply', title: 'Pharmaceutical Supply Authority', desc: 'Medicine procurement & distribution', icon: 'fa-tablets', category: 'health', level: 'department', staff: 60, online: 40, status: 'Operational', aiHealth: 92, emergencyPriority: 80 },
  { key: 'medical_equipment', title: 'Medical Equipment Authority', desc: 'Medical device procurement & maintenance', icon: 'fa-stethoscope', category: 'health', level: 'department', staff: 50, online: 35, status: 'Operational', aiHealth: 90, emergencyPriority: 75 },

  { key: 'ndrf', title: 'NDRF', desc: 'National Disaster Response Force', icon: 'fa-helmet-safety', category: 'disaster_response', level: 'department', staff: 400, online: 280, status: 'Operational', aiHealth: 87, emergencyPriority: 100 },
  { key: 'sdrf', title: 'SDRF', desc: 'State Disaster Response Force', icon: 'fa-shield-halved', category: 'disaster_response', level: 'department', staff: 250, online: 170, status: 'Operational', aiHealth: 85, emergencyPriority: 95 },
  { key: 'relief_coordination', title: 'Relief Coordination', desc: 'Emergency relief & rehabilitation', icon: 'fa-hand-holding-heart', category: 'disaster_response', level: 'department', staff: 100, online: 68, status: 'Operational', aiHealth: 88, emergencyPriority: 90 },

  { key: 'municipal', title: 'Municipal Corporation', desc: 'Urban administration & civic services', icon: 'fa-city', category: 'civic', level: 'department', staff: 350, online: 220, status: 'Operational', aiHealth: 86, emergencyPriority: 70 },
  { key: 'municipal_health', title: 'Municipal Health Office', desc: 'Urban health & sanitation', icon: 'fa-broom', category: 'civic', level: 'department', staff: 120, online: 78, status: 'Operational', aiHealth: 88, emergencyPriority: 70 },
  { key: 'water_supply', title: 'Water Supply Department', desc: 'Water distribution & quality', icon: 'fa-water', category: 'civic', level: 'department', staff: 90, online: 60, status: 'Operational', aiHealth: 82, emergencyPriority: 65 },
  { key: 'waste_management', title: 'Waste Management', desc: 'Solid waste & sanitation services', icon: 'fa-trash-can', category: 'civic', level: 'department', staff: 140, online: 95, status: 'Operational', aiHealth: 80, emergencyPriority: 60 },
  { key: 'food_corporation', title: 'Food Corporation', desc: 'Food supply & distribution during emergencies', icon: 'fa-truck', category: 'civic', level: 'department', staff: 120, online: 78, status: 'Operational', aiHealth: 86, emergencyPriority: 75 },

  { key: 'transport', title: 'Transport Department', desc: 'Transport regulation & logistics', icon: 'fa-bus', category: 'infrastructure', level: 'department', staff: 100, online: 65, status: 'Operational', aiHealth: 84, emergencyPriority: 70 },
  { key: 'nhai', title: 'National Highway Authority', desc: 'Highway infrastructure & maintenance', icon: 'fa-road', category: 'infrastructure', level: 'department', staff: 80, online: 52, status: 'Operational', aiHealth: 86, emergencyPriority: 65 },
  { key: 'railways', title: 'Railways', desc: 'Rail transport & emergency logistics', icon: 'fa-train', category: 'infrastructure', level: 'department', staff: 200, online: 130, status: 'Operational', aiHealth: 85, emergencyPriority: 75 },
  { key: 'airport', title: 'Airport Authority', desc: 'Aviation & air emergency support', icon: 'fa-plane', category: 'infrastructure', level: 'department', staff: 150, online: 98, status: 'Operational', aiHealth: 88, emergencyPriority: 80 },
  { key: 'port_authority', title: 'Port Authority', desc: 'Maritime operations & coastal logistics', icon: 'fa-ship', category: 'infrastructure', level: 'department', staff: 100, online: 65, status: 'Operational', aiHealth: 87, emergencyPriority: 70 },
  { key: 'public_works', title: 'Public Works Department', desc: 'Infrastructure construction & maintenance', icon: 'fa-hard-hat', category: 'infrastructure', level: 'department', staff: 200, online: 130, status: 'Operational', aiHealth: 84, emergencyPriority: 65 },

  { key: 'electricity', title: 'Electricity Board', desc: 'Power supply & grid management', icon: 'fa-bolt', category: 'utilities', level: 'department', staff: 180, online: 115, status: 'Operational', aiHealth: 84, emergencyPriority: 80 },
  { key: 'telecom', title: 'Telecommunications', desc: 'Communication networks & emergency lines', icon: 'fa-signal', category: 'utilities', level: 'department', staff: 75, online: 50, status: 'Operational', aiHealth: 90, emergencyPriority: 85 },
  { key: 'imd', title: 'IMD — Weather Department', desc: 'Weather forecasting & disaster warnings', icon: 'fa-cloud-sun', category: 'utilities', level: 'department', staff: 60, online: 42, status: 'Operational', aiHealth: 92, emergencyPriority: 85 },

  { key: 'forest', title: 'Forest Department', desc: 'Forest conservation & wildlife protection', icon: 'fa-tree', category: 'environment', level: 'department', staff: 120, online: 78, status: 'Operational', aiHealth: 87, emergencyPriority: 60 },
  { key: 'forest_fire', title: 'Forest Fire Control', desc: 'Forest fire prevention & response', icon: 'fa-fire', category: 'environment', level: 'department', staff: 50, online: 35, status: 'Operational', aiHealth: 83, emergencyPriority: 85 },

  { key: 'red_cross', title: 'Indian Red Cross Society', desc: 'Humanitarian aid & disaster relief', icon: 'fa-hand-holding-heart', category: 'ngo', level: 'ngo', staff: 200, online: 140, status: 'Operational', aiHealth: 90, emergencyPriority: 80 },
  { key: 'goonj', title: 'Goonj', desc: 'Disaster relief & community development', icon: 'fa-box-open', category: 'ngo', level: 'ngo', staff: 120, online: 80, status: 'Operational', aiHealth: 88, emergencyPriority: 75 },
  { key: 'seeds', title: 'SEEDS India', desc: 'Disaster preparedness & resilient recovery', icon: 'fa-seedling', category: 'ngo', level: 'ngo', staff: 60, online: 42, status: 'Operational', aiHealth: 91, emergencyPriority: 75 },
  { key: 'doctors_for_you', title: 'Doctors For You', desc: 'Medical relief & health camps', icon: 'fa-stethoscope', category: 'ngo', level: 'ngo', staff: 85, online: 58, status: 'Operational', aiHealth: 93, emergencyPriority: 80 },
  { key: 'care_india', title: 'CARE India', desc: 'Poverty alleviation & emergency relief', icon: 'fa-hands', category: 'ngo', level: 'ngo', staff: 100, online: 68, status: 'Operational', aiHealth: 87, emergencyPriority: 70 },
  { key: 'give_india', title: 'GiveIndia Disaster Response', desc: 'Fundraising & relief coordination', icon: 'fa-gift', category: 'ngo', level: 'ngo', staff: 50, online: 35, status: 'Operational', aiHealth: 89, emergencyPriority: 65 },
  { key: 'akshaya_patra', title: 'Akshaya Patra — Relief', desc: 'Food relief during emergencies', icon: 'fa-utensils', category: 'ngo', level: 'ngo', staff: 80, online: 55, status: 'Operational', aiHealth: 92, emergencyPriority: 75 },

  { key: 'army_liaison', title: 'Army Liaison', desc: 'Army medical & logistics support', icon: 'fa-shield', category: 'defence', level: 'defence', staff: 60, online: 42, status: 'Operational', aiHealth: 95, emergencyPriority: 95 },
  { key: 'air_force_liaison', title: 'Air Force Liaison', desc: 'Air evacuation & airdrop support', icon: 'fa-jet-fighter', category: 'defence', level: 'defence', staff: 40, online: 28, status: 'Operational', aiHealth: 94, emergencyPriority: 95 },
  { key: 'navy_liaison', title: 'Navy Liaison', desc: 'Maritime rescue & coastal support', icon: 'fa-ship', category: 'defence', level: 'defence', staff: 35, online: 24, status: 'Operational', aiHealth: 93, emergencyPriority: 90 },
  { key: 'medical_corps', title: 'Medical Corps', desc: 'Armed forces medical services', icon: 'fa-star-of-life', category: 'defence', level: 'defence', staff: 80, online: 55, status: 'Operational', aiHealth: 96, emergencyPriority: 95 },
];

// ─── Category Section Config ──────────────────────────────
const SECTIONS = [
  { key: 'national', label: 'National Command', icon: 'fa-crown', gradient: 'from-amber-500 to-yellow-600', light: 'bg-amber-50/50', accent: 'border-l-amber-500', tierClass: 'gold' },
  { key: 'state', label: 'State Command', icon: 'fa-flag', gradient: 'from-sky-500 to-blue-600', light: 'bg-sky-50/50', accent: 'border-l-sky-500', tierClass: 'blue' },
  { key: 'district', label: 'District Command', icon: 'fa-building', gradient: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50/50', accent: 'border-l-emerald-500', tierClass: 'green' },
  { key: 'emergency_services', label: 'Emergency Services', icon: 'fa-truck-medical', gradient: 'from-red-500 to-rose-600', light: 'bg-red-50/50', accent: 'border-l-red-400' },
  { key: 'health', label: 'Health', icon: 'fa-heart-pulse', gradient: 'from-cyan-500 to-teal-600', light: 'bg-cyan-50/50', accent: 'border-l-cyan-400' },
  { key: 'disaster_response', label: 'Disaster Response', icon: 'fa-helmet-safety', gradient: 'from-orange-500 to-red-600', light: 'bg-orange-50/50', accent: 'border-l-orange-400' },
  { key: 'civic', label: 'Civic Administration', icon: 'fa-city', gradient: 'from-slate-500 to-gray-600', light: 'bg-slate-50/50', accent: 'border-l-slate-400' },
  { key: 'infrastructure', label: 'Infrastructure', icon: 'fa-road', gradient: 'from-amber-500 to-orange-600', light: 'bg-amber-50/50', accent: 'border-l-amber-400' },
  { key: 'utilities', label: 'Utilities', icon: 'fa-bolt', gradient: 'from-yellow-500 to-amber-600', light: 'bg-yellow-50/50', accent: 'border-l-yellow-400' },
  { key: 'environment', label: 'Environment', icon: 'fa-tree', gradient: 'from-green-500 to-emerald-600', light: 'bg-green-50/50', accent: 'border-l-green-400' },
  { key: 'ngo', label: 'Non-Governmental Organizations', icon: 'fa-hand-holding-heart', gradient: 'from-purple-500 to-violet-600', light: 'bg-purple-50/50', accent: 'border-l-purple-400' },
  { key: 'defence', label: 'Defence & Armed Forces', icon: 'fa-shield', gradient: 'from-green-700 to-emerald-800', light: 'bg-green-50/50', accent: 'border-l-green-600' },
];

// ─── Theme Colors ────────────────────────────────────────
const orgTheme = {
  ministry_health: { gradient: 'from-sky-600 to-blue-700', light: 'bg-sky-50' },
  ndma: { gradient: 'from-red-700 to-rose-800', light: 'bg-red-50' },
  ncdc: { gradient: 'from-cyan-600 to-blue-700', light: 'bg-cyan-50' },
  icmr: { gradient: 'from-purple-600 to-violet-700', light: 'bg-purple-50' },
  nha: { gradient: 'from-indigo-600 to-purple-700', light: 'bg-indigo-50' },
  central_gov: { gradient: 'from-slate-700 to-gray-800', light: 'bg-slate-50' },
  national_emergency: { gradient: 'from-rose-700 to-red-800', light: 'bg-rose-50' },
  blood_council: { gradient: 'from-red-600 to-rose-700', light: 'bg-red-50' },
  state_health: { gradient: 'from-teal-600 to-cyan-700', light: 'bg-teal-50' },
  state_disaster: { gradient: 'from-orange-600 to-red-700', light: 'bg-orange-50' },
  state_emergency: { gradient: 'from-amber-600 to-orange-700', light: 'bg-amber-50' },
  state_medical: { gradient: 'from-green-600 to-emerald-700', light: 'bg-green-50' },
  state_surveillance: { gradient: 'from-sky-600 to-blue-700', light: 'bg-sky-50' },
  central_surveillance: { gradient: 'from-sky-700 to-blue-800', light: 'bg-sky-50' },
  district_collector: { gradient: 'from-blue-700 to-indigo-800', light: 'bg-blue-50' },
  district_health: { gradient: 'from-emerald-600 to-teal-700', light: 'bg-emerald-50' },
  district_emergency: { gradient: 'from-rose-600 to-red-700', light: 'bg-rose-50' },
  district_surveillance: { gradient: 'from-cyan-600 to-blue-700', light: 'bg-cyan-50' },
  district_disaster: { gradient: 'from-amber-700 to-orange-800', light: 'bg-amber-50' },
  police: { gradient: 'from-blue-800 to-indigo-900', light: 'bg-blue-100' },
  police_control: { gradient: 'from-indigo-700 to-blue-800', light: 'bg-indigo-50' },
  traffic_police: { gradient: 'from-yellow-600 to-amber-700', light: 'bg-yellow-50' },
  cyber_crime: { gradient: 'from-violet-700 to-purple-800', light: 'bg-violet-50' },
  special_ops: { gradient: 'from-gray-700 to-slate-800', light: 'bg-gray-50' },
  intelligence: { gradient: 'from-slate-800 to-gray-900', light: 'bg-slate-50' },
  fire: { gradient: 'from-red-600 to-orange-700', light: 'bg-red-50' },
  fire_control: { gradient: 'from-orange-600 to-red-700', light: 'bg-orange-50' },
  hazmat: { gradient: 'from-amber-600 to-yellow-700', light: 'bg-amber-50' },
  ambulance_authority: { gradient: 'from-green-600 to-emerald-700', light: 'bg-green-50' },
  ambulance_dispatch: { gradient: 'from-emerald-600 to-green-700', light: 'bg-emerald-50' },
  public_health: { gradient: 'from-cyan-600 to-teal-700', light: 'bg-cyan-50' },
  epidemiology: { gradient: 'from-purple-600 to-pink-700', light: 'bg-purple-50' },
  vaccination: { gradient: 'from-blue-500 to-cyan-600', light: 'bg-blue-50' },
  blood_bank_authority: { gradient: 'from-red-500 to-pink-600', light: 'bg-red-50' },
  ndrf: { gradient: 'from-orange-700 to-red-800', light: 'bg-orange-50' },
  sdrf: { gradient: 'from-amber-700 to-orange-800', light: 'bg-amber-50' },
  relief_coordination: { gradient: 'from-emerald-600 to-green-700', light: 'bg-emerald-50' },
  municipal: { gradient: 'from-slate-600 to-gray-700', light: 'bg-slate-50' },
  municipal_health: { gradient: 'from-teal-600 to-green-700', light: 'bg-teal-50' },
  water_supply: { gradient: 'from-sky-600 to-blue-700', light: 'bg-sky-50' },
  waste_management: { gradient: 'from-green-700 to-lime-800', light: 'bg-green-50' },
  food_corporation: { gradient: 'from-amber-600 to-orange-700', light: 'bg-amber-50' },
  transport: { gradient: 'from-blue-600 to-indigo-700', light: 'bg-blue-50' },
  nhai: { gradient: 'from-amber-600 to-orange-700', light: 'bg-amber-50' },
  railways: { gradient: 'from-blue-700 to-indigo-800', light: 'bg-blue-50' },
  airport: { gradient: 'from-sky-600 to-blue-700', light: 'bg-sky-50' },
  port_authority: { gradient: 'from-blue-700 to-cyan-800', light: 'bg-blue-50' },
  public_works: { gradient: 'from-yellow-600 to-amber-700', light: 'bg-yellow-50' },
  electricity: { gradient: 'from-yellow-500 to-amber-600', light: 'bg-yellow-50' },
  telecom: { gradient: 'from-violet-600 to-purple-700', light: 'bg-violet-50' },
  imd: { gradient: 'from-cyan-500 to-sky-600', light: 'bg-cyan-50' },
  animal_husbandry: { gradient: 'from-green-600 to-emerald-700', light: 'bg-green-50' },
  pharma_supply: { gradient: 'from-teal-600 to-cyan-700', light: 'bg-teal-50' },
  medical_equipment: { gradient: 'from-indigo-600 to-purple-700', light: 'bg-indigo-50' },
  forest: { gradient: 'from-green-700 to-emerald-800', light: 'bg-green-50' },
  forest_fire: { gradient: 'from-red-600 to-orange-700', light: 'bg-red-50' },
  civil_defence: { gradient: 'from-amber-600 to-yellow-700', light: 'bg-amber-50' },
  red_cross: { gradient: 'from-red-600 to-rose-700', light: 'bg-red-50' },
  goonj: { gradient: 'from-amber-600 to-orange-700', light: 'bg-amber-50' },
  seeds: { gradient: 'from-green-600 to-emerald-700', light: 'bg-green-50' },
  doctors_for_you: { gradient: 'from-sky-600 to-blue-700', light: 'bg-sky-50' },
  care_india: { gradient: 'from-blue-600 to-indigo-700', light: 'bg-blue-50' },
  give_india: { gradient: 'from-purple-600 to-violet-700', light: 'bg-purple-50' },
  akshaya_patra: { gradient: 'from-orange-500 to-red-600', light: 'bg-orange-50' },
  army_liaison: { gradient: 'from-green-800 to-emerald-900', light: 'bg-green-50' },
  air_force_liaison: { gradient: 'from-blue-700 to-indigo-800', light: 'bg-blue-50' },
  navy_liaison: { gradient: 'from-blue-800 to-cyan-900', light: 'bg-blue-50' },
  medical_corps: { gradient: 'from-red-700 to-rose-800', light: 'bg-red-50' },
};

const statusConfig = {
  Operational: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  Busy: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  Critical: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  Maintenance: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  Offline: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const QUICK_ACCESS = [
  { key: 'national_emergency', icon: 'fa-tower-broadcast', label: 'National Emergency', gradient: 'from-rose-700 to-red-800' },
  { key: 'ndrf', icon: 'fa-helmet-safety', label: 'NDRF', gradient: 'from-orange-700 to-red-800' },
  { key: 'police_control', icon: 'fa-tower-broadcast', label: 'Police Control', gradient: 'from-indigo-700 to-blue-800' },
  { key: 'fire_control', icon: 'fa-tower-broadcast', label: 'Fire Control', gradient: 'from-orange-600 to-red-700' },
  { key: 'ambulance_authority', icon: 'fa-truck-medical', label: 'Ambulance', gradient: 'from-green-600 to-emerald-700' },
  { key: 'ndma', icon: 'fa-shield-halved', label: 'NDMA', gradient: 'from-red-700 to-rose-800' },
  { key: 'ncdc', icon: 'fa-microscope', label: 'NCDC', gradient: 'from-cyan-600 to-blue-700' },
  { key: 'red_cross', icon: 'fa-hand-holding-heart', label: 'Red Cross', gradient: 'from-red-600 to-rose-700' },
];

// ─── Storage Keys ─────────────────────────────────────────
const SESSION_KEY = 'gov_gateway_session';
const FAVORITES_KEY = 'gov_favorites';
const RECENT_KEY = 'gov_recent_workspaces';

// ─── Background ───────────────────────────────────────────
const GovGatewayBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50" />
    <div className="absolute top-[-20%] left-[-15%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-amber-200/10 to-yellow-200/10 blur-[120px]" />
    <div className="absolute bottom-[-20%] right-[-15%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-sky-200/10 to-cyan-200/10 blur-[120px]" />
    <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[80%] h-[40%] rounded-full bg-gradient-to-br from-emerald-200/8 to-teal-200/8 blur-[150px]" />
    <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
      <defs><pattern id="gov-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" /></pattern></defs>
      <rect width="100%" height="100%" fill="url(#gov-grid)" />
    </svg>
    <div className="absolute top-[10%] left-[5%] w-[30%] h-[1px] bg-gradient-to-r from-transparent via-amber-300/20 to-transparent blur-[2px]" />
    <div className="absolute bottom-[15%] right-[10%] w-[25%] h-[1px] bg-gradient-to-r from-transparent via-sky-300/20 to-transparent blur-[2px]" />
  </div>
);

// ─── Org Card Component ───────────────────────────────────
const OrgCard = React.memo(({ org, isFavorite, onToggleFav, onClick, hovered, onHover, onLeave }) => {
  const theme = orgTheme[org.key] || { gradient: 'from-slate-600 to-gray-700', light: 'bg-slate-50' };
  const status = statusConfig[org.status] || statusConfig.Operational;
  const isCommand = ['national', 'state', 'district'].includes(org.level);

  const borderClass = isCommand
    ? org.level === 'national'
      ? 'border-amber-400/30 hover:border-amber-400/60 shadow-sm hover:shadow-[0_0_24px_rgba(245,158,11,0.12)]'
      : org.level === 'state'
        ? 'border-sky-400/30 hover:border-sky-400/60 shadow-sm hover:shadow-[0_0_24px_rgba(59,130,246,0.1)]'
        : 'border-emerald-400/30 hover:border-emerald-400/60 shadow-sm hover:shadow-[0_0_24px_rgba(16,185,129,0.1)]'
    : 'border-slate-200 hover:border-slate-300 hover:shadow-md';

  const iconBgClass = isCommand
    ? org.level === 'national'
      ? 'bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-600 ring-1 ring-amber-300/50'
      : org.level === 'state'
        ? 'bg-gradient-to-br from-sky-100 to-blue-100 text-sky-600 ring-1 ring-sky-300/50'
        : 'bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-600 ring-1 ring-emerald-300/50'
    : 'bg-slate-100 text-slate-500 group-hover:bg-gradient-to-br group-hover:' + theme.gradient + ' group-hover:text-white transition-all duration-200';

  const titleClass = isCommand
    ? org.level === 'national' ? 'text-amber-900' : org.level === 'state' ? 'text-sky-900' : 'text-emerald-900'
    : 'text-slate-800 group-hover:text-slate-900';

  return (
    <div
      className={`group relative rounded-xl bg-white border transition-all duration-200 cursor-pointer ${borderClass} ${hovered ? 'scale-[1.01]' : 'scale-100'}`}
      onMouseEnter={() => onHover(org.key)}
      onMouseLeave={() => onLeave()}
      onClick={() => onClick(org)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(org); }}
    >
      <div className="p-4">
        <div className="relative">
          {/* Favorites star */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav(org.key); }}
            className={`absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
              isFavorite
                ? 'text-amber-400 hover:text-amber-500 bg-amber-50 hover:bg-amber-100'
                : 'text-slate-200 hover:text-amber-300 hover:bg-amber-50/50 opacity-0 group-hover:opacity-100'
            }`}
          >
            <i className={`fas fa-star ${isFavorite ? 'text-[11px]' : 'text-[10px]'}`} />
          </button>

          {/* Main row: icon + info */}
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${iconBgClass}`}>
              <i className={`fas ${org.icon || 'fa-building'} ${isCommand ? 'text-lg' : 'text-base'}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className={`text-sm font-semibold truncate ${titleClass}`}>{org.title}</h3>
                {isCommand && (
                  <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wider text-white shadow-sm ${
                    org.level === 'national'
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                      : org.level === 'state'
                        ? 'bg-gradient-to-r from-sky-500 to-blue-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  }`}>
                    {org.level === 'national' ? 'NATIONAL' : org.level === 'state' ? 'STATE' : 'DISTRICT'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">{org.desc}</p>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${status.bg} ${status.text} text-[9px] font-semibold`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {org.status}
            </span>
          </div>

          {/* Hover expand: staff + AI + Open button */}
          <div className={`grid transition-all duration-200 overflow-hidden ${hovered ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span><i className="fas fa-users text-slate-300 mr-1" />{org.staff} staff</span>
                  <span className="flex items-center gap-1">
                    <i className="fas fa-robot text-slate-300" />
                    <span className={`font-semibold ${org.aiHealth >= 90 ? 'text-emerald-600' : org.aiHealth >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{org.aiHealth}%</span>
                  </span>
                  <span><i className="fas fa-signal text-slate-300 mr-1" />Priority {org.emergencyPriority}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-indigo-500 font-semibold">Open Workspace</span>
                  <i className="fas fa-arrow-right text-[10px] text-indigo-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const GovernmentRoleSelect = () => {
  const { user, setSelectedOrg, performGatewayLogout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { orgKey } = useParams();
  const searchInputRef = useRef(null);

  // ─── State ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);
  const [authModalOrg, setAuthModalOrg] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hoveredOrg, setHoveredOrg] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; }
    catch { return []; }
  });
  const [recentWorkspaces, setRecentWorkspaces] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(RECENT_KEY)) || []; }
    catch { return []; }
  });

  const allowSwitch = new URLSearchParams(location.search).get('switch') === '1';

  // ─── Redirect if already authenticated ────────────────
  useEffect(() => {
    if (!allowSwitch && user?.subRole && user?.role === 'government') {
      navigate('/dashboard/government', { replace: true });
    }
  }, [allowSwitch, user?.subRole, user?.role, navigate]);

  // ─── Handle orgKey param — open login modal directly ──
  useEffect(() => {
    if (orgKey) {
      const org = ORGANIZATIONS.find((o) => o.key === orgKey);
      if (org) {
        setSelectedOrg({ ...org, _portal: 'government' });
        setAuthModalOrg(org);
        addToRecent(org);
        // Clean the URL — replace /government/:orgKey with /government
        navigate('/government', { replace: true });
      } else {
        navigate('/government', { replace: true });
      }
    }
  }, []); // Run only on mount

  // ─── Restore session memory ───────────────────────────
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.searchQuery) setSearchQuery(parsed.searchQuery);
        if (parsed.expandedSection) setExpandedSection(parsed.expandedSection);
        if (parsed.scrollY) {
          setTimeout(() => { window.scrollTo(0, parsed.scrollY); }, 100);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // ─── Save session memory ──────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          searchQuery, expandedSection, scrollY: window.scrollY,
        }));
      } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, expandedSection]);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && authModalOrg) setAuthModalOrg(null); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [authModalOrg]);

  // ─── Helpers ───────────────────────────────────────────
  const addToRecent = useCallback((org) => {
    setRecentWorkspaces((prev) => {
      const next = [
        { key: org.key, title: org.title, icon: org.icon, level: org.level, timestamp: Date.now() },
        ...prev.filter((r) => r.key !== org.key),
      ].slice(0, 8);
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleCardClick = useCallback((org) => {
    setSelectedOrg({ ...org, _portal: 'government' });
    setAuthModalOrg(org);
    addToRecent(org);
  }, [setSelectedOrg, addToRecent]);

  const handleLoginSuccess = useCallback(() => {
    navigate('/dashboard/government', { replace: true });
  }, [navigate]);

  const handleLogoutConfirm = useCallback(() => {
    setShowLogoutConfirm(false);
    const redirectRoute = performGatewayLogout();
    navigate(redirectRoute, { replace: true });
  }, [navigate, performGatewayLogout]);

  const handleToggleFav = useCallback((key) => {
    setFavorites((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }, []);

  // ─── Memo'd data ───────────────────────────────────────
  const orgMap = useMemo(() => {
    const map = {};
    for (const org of ORGANIZATIONS) map[org.key] = org;
    return map;
  }, []);

  const favoriteOrgs = useMemo(() => favorites.map((k) => orgMap[k]).filter(Boolean), [favorites, orgMap]);

  const filteredSections = useMemo(() => {
    return SECTIONS.map((section) => {
      const orgs = ORGANIZATIONS.filter((o) => o.category === section.key);
      const sorted = [...orgs].sort((a, b) => (b.emergencyPriority || 0) - (a.emergencyPriority || 0));
      let filtered = sorted;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = sorted.filter((o) =>
          o.title.toLowerCase().includes(q) || o.desc.toLowerCase().includes(q) || o.key.toLowerCase().includes(q)
        );
      }
      return { ...section, orgs: filtered, total: orgs.length };
    });
  }, [searchQuery]);

  const hasActiveSearch = searchQuery.trim().length > 0;

  const aiRecommendation = useMemo(() => {
    const top = [...ORGANIZATIONS].sort((a, b) => (b.emergencyPriority || 0) - (a.emergencyPriority || 0))[0];
    if (!top) return null;
    return {
      org: top,
      reason: `${top.emergencyPriority >= 95 ? 'Active' : 'High priority'} emergency response coordination required \u00b7 Priority ${top.emergencyPriority}/100`,
    };
  }, []);

  const totalOrgs = ORGANIZATIONS.length;
  const activeEmergencies = ORGANIZATIONS.filter((o) => o.status === 'Busy').length;
  const avgReadiness = Math.round(ORGANIZATIONS.reduce((sum, o) => sum + (o.aiHealth || 0), 0) / totalOrgs);

  const hours = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen relative overflow-hidden">
      <GovGatewayBg />

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ════════════════════════════════════════════ */}
        {/* MINIMAL HEADER — only branding + Sign Out        */}
        {/* ════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-white shadow-sm">
              <i className="fas fa-crown text-sm" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700 font-display">Government Gateway</p>
              <p className="text-[10px] text-slate-400">{user?.name || 'Administrator'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-[0.97] transition-all duration-200"
          >
            <i className="fas fa-sign-out-alt text-[11px]" />
            Sign Out
          </button>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* HERO SECTION — Government of India           */}
        {/* ════════════════════════════════════════════ */}
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-2xl">
          <svg className="absolute inset-0 w-full h-full opacity-[0.06]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M48 0L0 0 0 48" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-grid)" />
          </svg>
          <div className="absolute top-[-30%] left-[-10%] w-[50%] h-[70%] rounded-full bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent blur-[100px]" />
          <div className="absolute bottom-[-30%] right-[-10%] w-[50%] h-[70%] rounded-full bg-gradient-to-br from-emerald-500/8 via-teal-500/5 to-transparent blur-[100px]" />

          <div className="relative px-6 sm:px-10 py-8 sm:py-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-1">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <i className="fas fa-crown text-3xl text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.15em]">Government of India</p>
                  <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">LifeLink National Emergency Platform</h1>
                  <p className="text-sm text-slate-300/80 mt-1 max-w-2xl">AI-powered national emergency command workspace \u2014 unified coordination for disaster response, health surveillance, and cross-agency operations.</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-semibold text-white/70">
                  <i className="far fa-calendar mr-1.5" />{greeting}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-[10px] font-bold text-white shadow-lg">
                  <i className="fas fa-shield-halved mr-1" />GovNet Secure
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                <i className="fas fa-building text-amber-400/60 text-[10px]" />
                <span className="text-xs text-slate-300"><strong className="text-white font-bold">{totalOrgs}</strong> Organizations Connected</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                <i className="fas fa-exclamation-triangle text-red-400/60 text-[10px]" />
                <span className="text-xs text-slate-300"><strong className="text-red-400 font-bold">{activeEmergencies}</strong> Active Emergencies</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                <i className="fas fa-robot text-emerald-400/60 text-[10px]" />
                <span className="text-xs text-slate-300"><strong className="text-emerald-400 font-bold">{avgReadiness}%</strong> National Readiness</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                <i className="fas fa-shield-halved text-indigo-400/60 text-[10px]" />
                <span className="text-xs text-slate-300"><i className="fas fa-circle text-[6px] text-emerald-500 mr-1 animate-pulse" />AI Monitoring Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* AI RECOMMENDATION                            */}
        {/* ════════════════════════════════════════════ */}
        {aiRecommendation && !hasActiveSearch && (
          <div className="mb-6 animate-fade-in-down">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] shadow-md">
                <i className="fas fa-robot" />
              </div>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">AI Recommended Workspace</span>
            </div>
            <button
              onClick={() => handleCardClick(aiRecommendation.org)}
              className="group w-full text-left rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200/60 p-4 hover:shadow-lg hover:border-indigo-300 active:scale-[0.99] transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <i className={`fas ${aiRecommendation.org.icon || 'fa-building'} text-xl`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-indigo-900">{aiRecommendation.org.title}</h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[8px] font-bold">AI PICK</span>
                  </div>
                  <p className="text-xs text-indigo-600/80">{aiRecommendation.reason}</p>
                </div>
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-semibold group-hover:bg-indigo-600 transition-colors">
                    Open <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* SEARCH + QUICK ACCESS                        */}
        {/* ════════════════════════════════════════════ */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-sm pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) setExpandedSection(null);
                }}
                placeholder="Search organizations by name, role, district, or keyword\u2026"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-times text-[10px]" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Access Pills */}
          {!hasActiveSearch && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick:</span>
              {QUICK_ACCESS.map((qa) => (
                <button
                  key={qa.key}
                  onClick={() => { const org = ORGANIZATIONS.find((o) => o.key === qa.key); if (org) handleCardClick(org); }}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:shadow-sm hover:text-slate-800 active:scale-[0.97] transition-all duration-200"
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-white text-[7px] bg-gradient-to-br ${qa.gradient}`}>
                    <i className={`fas ${qa.icon}`} />
                  </span>
                  {qa.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* FAVORITES                                    */}
        {/* ════════════════════════════════════════════ */}
        {favoriteOrgs.length > 0 && !hasActiveSearch && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <i className="fas fa-star text-amber-400 text-xs" />
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Favourite Organizations</span>
              <span className="text-[10px] text-slate-400">({favoriteOrgs.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {favoriteOrgs.map((org) => (
                <OrgCard
                  key={org.key} org={org} isFavorite={true}
                  onToggleFav={handleToggleFav} onClick={handleCardClick}
                  hovered={hoveredOrg === org.key} onHover={setHoveredOrg} onLeave={() => setHoveredOrg(null)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* RECENT WORKSPACES                            */}
        {/* ════════════════════════════════════════════ */}
        {recentWorkspaces.length > 0 && !hasActiveSearch && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <i className="fas fa-clock-rotate text-slate-400 text-xs" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Workspaces</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentWorkspaces.slice(0, 6).map((r) => {
                const org = orgMap[r.key];
                if (!org) return null;
                return (
                  <button
                    key={r.key}
                    onClick={() => handleCardClick(org)}
                    className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm active:scale-[0.98] transition-all duration-200"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-500 flex items-center justify-center text-[10px]">
                      <i className={`fas ${r.icon || 'fa-building'}`} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors truncate max-w-[150px]">{r.title}</span>
                    <i className="fas fa-arrow-right text-[9px] text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* SEARCH RESULTS HEADER                        */}
        {/* ════════════════════════════════════════════ */}
        {hasActiveSearch && (
          <div className="mb-4">
            <p className="text-xs text-slate-500">
              <i className="fas fa-search mr-1.5 text-indigo-400" />
              Search results for &ldquo;<strong className="text-slate-700">{searchQuery}</strong>&rdquo;
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* COLLAPSIBLE SECTIONS                         */}
        {/* ════════════════════════════════════════════ */}
        <div className="space-y-2.5">
          {filteredSections.map((section) => {
            const isExpanded = hasActiveSearch || expandedSection === section.key;
            const isEmpty = section.orgs.length === 0;

            if (isEmpty && !hasActiveSearch) return null;
            if (isEmpty) {
              return <div key={section.key} className="text-xs text-slate-400 py-1 px-1">No results in {section.label}</div>;
            }

            const totalCount = section.orgs.length;

            return (
              <div key={section.key} className={`rounded-xl bg-white border ${section.accent || 'border-slate-200'} overflow-hidden transition-all duration-200 ${section.tierClass ? 'shadow-sm border-l-4' : ''}`}>
                {/* Section Header */}
                <button
                  onClick={() => setExpandedSection((prev) => prev === section.key ? null : section.key)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors duration-200 ${isExpanded ? section.light : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shadow-sm bg-gradient-to-br ${section.gradient}`}>
                      <i className={`fas ${section.icon}`} />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-800">{section.label}</span>
                      <span className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[9px] font-semibold">{totalCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {section.tierClass && (
                      <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider text-white shadow-sm ${
                        section.tierClass === 'gold' ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                        : section.tierClass === 'blue' ? 'bg-gradient-to-r from-sky-500 to-blue-500'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                      }`}>
                        {section.tierClass === 'gold' ? 'NATIONAL COMMAND' : section.tierClass === 'blue' ? 'STATE COMMAND' : 'DISTRICT COMMAND'}
                      </span>
                    )}
                    <i className={`fas fa-chevron-down text-slate-300 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Section Content */}
                <div className={`grid transition-all duration-300 ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <div className="px-5 pb-4 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                        {section.orgs.map((org) => (
                          <OrgCard
                            key={org.key} org={org} isFavorite={favorites.includes(org.key)}
                            onToggleFav={handleToggleFav} onClick={handleCardClick}
                            hovered={hoveredOrg === org.key} onHover={setHoveredOrg} onLeave={() => setHoveredOrg(null)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* FOOTER                                       */}
        {/* ════════════════════════════════════════════ */}
        <div className="mt-10 pt-6 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <i className="fas fa-shield-halved text-emerald-500" />
                Secured by LifeLink Enterprise Authentication
              </span>
              <span className="hidden sm:inline">&middot;</span>
              <span className="flex items-center gap-1.5">
                <i className="fas fa-robot text-indigo-400" />
                AI-Powered Emergency Platform
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Operational
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* LOGIN MODAL                                        */}
      {/* ═══════════════════════════════════════════════════ */}
      {authModalOrg && (
        <GovernmentLoginModal
          org={authModalOrg}
          onClose={() => setAuthModalOrg(null)}
          onSuccess={handleLoginSuccess}
        />
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* LOGOUT CONFIRM                                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <LogoutConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
        userName={user?.name}
        userRole={user?.designation || 'Government Official'}
        workspaceName="Government Gateway"
      />
    </div>
  );
};

export default GovernmentRoleSelect;
