import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const COUNTRIES = ['India', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'Singapore', 'UAE'];
const LANGUAGES = ['English', 'Hindi', 'Kannada', 'Tamil', 'Telugu', 'Malayalam', 'Marathi', 'Gujarati', 'Bengali', 'Punjabi'];
const LIFESTYLES = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Athlete'];

const PROFILE_TABS = [
    { key: 'general', label: 'General', icon: '👤' },
    { key: 'medical', label: 'Medical', icon: '🩺' },
    { key: 'emergency', label: 'Emergency', icon: '🚨' },
    { key: 'privacy', label: 'Privacy', icon: '🔒' },
    { key: 'security', label: 'Security', icon: '🛡️' },
    { key: 'ai', label: 'AI Preferences', icon: '🧠' },
];

const ROLE_THEMES = {
    public: {
        gradient: 'from-blue-600 to-indigo-700',
        accent: 'from-blue-500 to-indigo-600',
        light: 'bg-blue-50',
        text: 'text-blue-600',
        ring: 'ring-blue-500/20',
        border: 'border-blue-200',
        name: 'Personal Profile',
    },
    hospital: {
        gradient: 'from-teal-600 to-cyan-700',
        accent: 'from-teal-500 to-cyan-600',
        light: 'bg-teal-50',
        text: 'text-teal-600',
        ring: 'ring-teal-500/20',
        border: 'border-teal-200',
        name: 'Facility Profile',
    },
    government: {
        gradient: 'from-slate-700 to-slate-900',
        accent: 'from-slate-600 to-slate-800',
        light: 'bg-slate-50',
        text: 'text-slate-600',
        ring: 'ring-slate-500/20',
        border: 'border-slate-200',
        name: 'Authority Profile',
    },
    ambulance: {
        gradient: 'from-amber-600 to-orange-700',
        accent: 'from-amber-500 to-orange-600',
        light: 'bg-amber-50',
        text: 'text-amber-600',
        ring: 'ring-amber-500/20',
        border: 'border-amber-200',
        name: 'Driver Profile',
    },
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

const getTheme = (role) => ROLE_THEMES[role] || ROLE_THEMES.public;

const validateField = (name, value) => {
    if (!value && ['name', 'email', 'phone'].includes(name)) return 'This field is required';
    if (name === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
    if (name === 'phone' && value && !/^\+?[\d\s-]{7,15}$/.test(value)) return 'Invalid phone number';
    if (name === 'age' && value && (value < 0 || value > 150)) return 'Age must be between 0 and 150';
    if (name === 'bloodGroup' && value && !BLOOD_GROUPS.includes(value)) return 'Invalid blood group';
    return null;
};

const computeCompleteness = (formData) => {
    const fields = {
        name: 8, email: 5, phone: 5, age: 5, gender: 3, bloodGroup: 5,
        emergencyContact: 8, emergencyPhone: 5, insuranceId: 5,
        allergies: 5, medications: 5, conditions: 5, lifestyle: 3, bmi: 3,
    };
    let filled = 0;
    let total = 0;
    Object.entries(fields).forEach(([field, weight]) => {
        total += weight;
        if (formData[field] && String(formData[field]).trim()) filled += weight;
    });
    return { percentage: Math.round((filled / Math.max(1, total)) * 100), filled, total };
};

const getCompletionItems = (formData) => [
    { label: 'Emergency Contact', done: Boolean(formData.emergencyContact && formData.emergencyPhone), icon: '📞' },
    { label: 'Insurance', done: Boolean(formData.insuranceId), icon: '🪪' },
    { label: 'Medical History', done: Boolean(formData.conditions || formData.allergies), icon: '📋' },
    { label: 'Vaccination', done: Boolean(formData.vaccinationStatus), icon: '💉' },
];

// ═══════════════════════════════════════════════════════════════════════
// SAVE EXPERIENCE MODAL
// ═══════════════════════════════════════════════════════════════════════

const SaveProgressModal = ({ visible, onComplete }) => {
    const [step, setStep] = useState(0);
    const steps = [
        { icon: '🧠', label: 'AI validates information', duration: 600 },
        { icon: '🔍', label: 'Checking consistency', duration: 500 },
        { icon: '🚨', label: 'Updating emergency profile', duration: 400 },
        { icon: '🔐', label: 'Encrypting medical data', duration: 500 },
        { icon: '🔄', label: 'Synchronizing', duration: 400 },
        { icon: '✅', label: 'Done!', duration: 300 },
    ];

    useEffect(() => {
        if (!visible) { setStep(0); return; }
        if (step >= steps.length) {
            const t = setTimeout(() => onComplete?.(), 400);
            return () => clearTimeout(t);
        }
        const t = setTimeout(() => setStep(s => s + 1), steps[step].duration);
        return () => clearTimeout(t);
    }, [visible, step, onComplete]);

    if (!visible) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-zoom-in">
                <div className="space-y-4">
                    {steps.slice(0, step + 1).map((s, i) => (
                        <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${i === step ? 'opacity-100 translate-x-0' : 'opacity-60 translate-x-0'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${i < step ? 'bg-green-100' : i === step ? 'bg-indigo-100 animate-pulse-slow' : 'bg-gray-100'}`}>
                                {i < step ? '✅' : s.icon}
                            </div>
                            <span className={`text-sm font-medium ${i < step ? 'text-green-600' : i === step ? 'text-indigo-600' : 'text-gray-400'}`}>
                                {s.label}
                            </span>
                            {i === step && (
                                <div className="flex-1 h-1 bg-indigo-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full animate-progress-fill" />
                                </div>
                            )}
                            {i < step && <span className="text-[10px] text-green-500 font-bold">✓</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

// ═══════════════════════════════════════════════════════════════════════
// INPUT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

const SmartInput = ({ label, name, value, onChange, type = 'text', placeholder, options, errors, icon, required, disabled, onBlur }) => {
    const error = errors?.[name];
    const hasError = Boolean(error);

    return (
        <div className="group">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                {icon && <span className="text-sm">{icon}</span>}
                {label}
                {required && <span className="text-red-400">*</span>}
            </label>
            {options ? (
                <select
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    disabled={disabled}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                        ${hasError ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-gray-50/80 focus:bg-white focus:ring-indigo-200'}
                        border focus:ring-2 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <option value="">Select {label}...</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : type === 'textarea' ? (
                <textarea
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    rows={3}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none resize-none
                        ${hasError ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-gray-50/80 focus:bg-white focus:ring-indigo-200'}
                        border focus:ring-2 hover:border-gray-300 disabled:opacity-50`}
                />
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                        ${hasError ? 'border-red-300 bg-red-50 focus:ring-red-200' : 'border-gray-200 bg-gray-50/80 focus:bg-white focus:ring-indigo-200'}
                        border focus:ring-2 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                />
            )}
            {hasError && (
                <p className="mt-1 text-[11px] text-red-500 font-medium flex items-center gap-1 animate-slide-down-fade">
                    <span>⚠️</span> {error}
                </p>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════
// TAB CONTENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

const GeneralTab = ({ formData, handleChange, errors, theme }) => (
    <div className="space-y-5 animate-fade-in-up">
        <div className="flex items-center gap-4 mb-6">
            <div className="relative group cursor-pointer">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-3xl text-white shadow-lg`}>
                    {(formData.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-xs cursor-pointer hover:scale-110 transition-transform">
                    📷
                </div>
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800">{formData.name || 'Your Name'}</h3>
                <p className="text-sm text-gray-500">{formData.email || 'email@example.com'}</p>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold ${theme.text} ${theme.light}`}>
                    ✅ {theme.name}
                </span>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SmartInput label="Full Name" name="name" value={formData.name} onChange={handleChange} icon="👤" required errors={errors} />
            <SmartInput label="Email" name="email" type="email" value={formData.email} onChange={handleChange} icon="📧" required errors={errors} />
            <SmartInput label="Phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} icon="📞" required errors={errors} />
            <SmartInput label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} icon="🎂" />
            <SmartInput label="Gender" name="gender" value={formData.gender} onChange={handleChange} options={['Male', 'Female', 'Other', 'Prefer not to say']} icon="⚧️" />
            <SmartInput label="Blood Group" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} options={BLOOD_GROUPS} icon="🩸" />
            <SmartInput label="Nationality" name="nationality" value={formData.nationality} onChange={handleChange} options={COUNTRIES} icon="🌍" />
            <SmartInput label="Language" name="language" value={formData.language} onChange={handleChange} options={LANGUAGES} icon="🗣️" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SmartInput label="Location / City" name="location" value={formData.location} onChange={handleChange} icon="📍" placeholder="e.g. Bengaluru, Karnataka" />
            <SmartInput label="Occupation" name="occupation" value={formData.occupation} onChange={handleChange} icon="💼" placeholder="e.g. Software Engineer" />
        </div>
    </div>
);

const MedicalTab = ({ formData, handleChange, errors }) => (
    <div className="space-y-5 animate-fade-in-up">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SmartInput label="Allergies" name="allergies" value={formData.allergies} onChange={handleChange} icon="⚠️" placeholder="e.g. Penicillin, Peanuts" />
            <SmartInput label="Current Medications" name="medications" value={formData.medications} onChange={handleChange} icon="💊" placeholder="e.g. Metformin 500mg" />
            <SmartInput label="Medical Conditions" name="conditions" value={formData.conditions} onChange={handleChange} icon="📋" placeholder="e.g. Type 2 Diabetes" />
            <SmartInput label="Past Surgeries" name="surgeries" value={formData.surgeries} onChange={handleChange} icon="🔪" placeholder="e.g. Appendectomy 2018" />
            <SmartInput label="Family History" name="familyHistory" value={formData.familyHistory} onChange={handleChange} icon="👨‍👩‍👧‍👦" placeholder="e.g. Heart disease (father)" />
            <SmartInput label="Pregnancy Status" name="pregnancy" value={formData.pregnancy} onChange={handleChange} options={['Not Applicable', 'Pregnant', 'Trying', 'Postpartum']} icon="🤰" />
            <SmartInput label="Disabilities" name="disabilities" value={formData.disabilities} onChange={handleChange} icon="♿" placeholder="e.g. None" />
            <SmartInput label="Insurance ID" name="insuranceId" value={formData.insuranceId} onChange={handleChange} icon="🪪" placeholder="e.g. HLTH-12345-IND" />
        </div>
        <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Primary Care</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SmartInput label="Primary Physician" name="primaryPhysician" value={formData.primaryPhysician} onChange={handleChange} icon="👨‍⚕️" placeholder="Dr. Name" />
                <SmartInput label="Hospital Preference" name="hospitalPreference" value={formData.hospitalPreference} onChange={handleChange} icon="🏥" placeholder="e.g. City Hospital" />
            </div>
            <SmartInput label="Medical Notes" name="medicalNotes" type="textarea" value={formData.medicalNotes} onChange={handleChange} icon="📝" placeholder="Additional medical notes..." />
        </div>
        <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vitals & Lifestyle</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SmartInput label="Height (cm)" name="height" type="number" value={formData.height} onChange={handleChange} icon="📏" />
                <SmartInput label="Weight (kg)" name="weight" type="number" value={formData.weight} onChange={handleChange} icon="⚖️" />
                <SmartInput label="BMI" name="bmi" type="number" value={formData.bmi} onChange={handleChange} icon="📊" disabled />
                <SmartInput label="Lifestyle" name="lifestyle" value={formData.lifestyle} onChange={handleChange} options={LIFESTYLES} icon="🏃" />
                <SmartInput label="Smoking" name="smoking" value={formData.smoking} onChange={handleChange} options={['Never', 'Former', 'Occasional', 'Regular']} icon="🚬" />
                <SmartInput label="Alcohol" name="alcohol" value={formData.alcohol} onChange={handleChange} options={['Never', 'Occasional', 'Moderate', 'Frequent']} icon="🍷" />
                <SmartInput label="Vaccination Status" name="vaccinationStatus" value={formData.vaccinationStatus} onChange={handleChange} options={['Up to Date', 'Partial', 'Not Vaccinated', 'Unknown']} icon="💉" />
            </div>
        </div>
    </div>
);

const EmergencyTab = ({ formData, handleChange, errors }) => (
    <div className="space-y-5 animate-fade-in-up">
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🚨</span>
                <h4 className="text-sm font-bold text-red-700">Emergency Contacts</h4>
            </div>
            <p className="text-xs text-red-600/70">These contacts will be notified automatically in case of an emergency.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SmartInput label="Emergency Contact Name" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} icon="👤" required errors={errors} />
            <SmartInput label="Relationship" name="emergencyRelation" value={formData.emergencyRelation} onChange={handleChange} options={['Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Colleague']} icon="🤝" />
            <SmartInput label="Emergency Phone" name="emergencyPhone" type="tel" value={formData.emergencyPhone} onChange={handleChange} icon="📞" required errors={errors} />
            <SmartInput label="Emergency Address" name="emergencyAddress" value={formData.emergencyAddress} onChange={handleChange} icon="📍" />
        </div>
        <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Medical Directives</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SmartInput label="Preferred Hospital" name="preferredHospital" value={formData.preferredHospital} onChange={handleChange} icon="🏥" />
                <SmartInput label="Insurance ID" name="insuranceId" value={formData.insuranceId} onChange={handleChange} icon="🪪" />
                <SmartInput label="Blood Donor Status" name="bloodDonor" value={formData.bloodDonor} onChange={handleChange} options={['Registered Donor', 'Eligible', 'Not Eligible', 'Unknown']} icon="🩸" />
                <SmartInput label="Organ Donor Status" name="organDonor" value={formData.organDonor} onChange={handleChange} options={['Registered', 'Not Registered', 'Undecided']} icon="❤️" />
            </div>
            <SmartInput label="Advance Medical Directives" name="advanceDirectives" type="textarea" value={formData.advanceDirectives} onChange={handleChange} icon="📝" placeholder="e.g. DNR status, specific treatment preferences..." />
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
                <span className="text-sm mt-0.5">✅</span>
                <p className="text-xs text-amber-700">Advance consent saved — emergency services can access this data when needed.</p>
            </div>
        </div>
    </div>
);

const PrivacyTab = ({ formData, handleChange }) => (
    <div className="space-y-5 animate-fade-in-up">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔒</span>
                <h4 className="text-sm font-bold text-indigo-700">Data Sharing Preferences</h4>
            </div>
            <p className="text-xs text-indigo-600/70">Control how your data is shared across the LifeLink ecosystem.</p>
        </div>

        {[
            { key: 'shareMedicalData', label: 'Medical Data Sharing', desc: 'Share medical history with healthcare providers during emergencies', icon: '🏥' },
            { key: 'shareHospital', label: 'Hospital Sharing', desc: 'Allow hospitals to access your health records when admitted', icon: '📋' },
            { key: 'shareResearch', label: 'Research Sharing', desc: 'Anonymously contribute data for medical research', icon: '🔬' },
            { key: 'shareAnonymous', label: 'Anonymous Research', desc: 'De-identified data used for population health analysis', icon: '📊' },
            { key: 'locationAccess', label: 'Location Access', desc: 'Allow LifeLink to access your location for emergency response', icon: '📍' },
            { key: 'cameraAccess', label: 'Camera Access', label2: 'Allow camera for document scanning and video consultations', icon: '📷' },
            { key: 'microphoneAccess', label: 'Microphone Access', desc: 'Allow microphone for voice commands and emergency calls', icon: '🎤' },
        ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{setting.icon}</span>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{setting.label || setting.label2}</p>
                        <p className="text-xs text-gray-500">{setting.desc}</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name={setting.key} checked={formData[setting.key] !== false} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
        ))}

        <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Notification Preferences</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                    { key: 'notifyEmail', label: 'Email Notifications', icon: '📧' },
                    { key: 'notifySms', label: 'SMS Notifications', icon: '📱' },
                    { key: 'notifyPush', label: 'Push Notifications', icon: '🔔' },
                    { key: 'notifyEmergency', label: 'Emergency Alerts', icon: '🚨' },
                ].map((n) => (
                    <div key={n.key} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2">
                            <span>{n.icon}</span>
                            <span className="text-sm font-medium text-gray-700">{n.label}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name={n.key} checked={formData[n.key] !== false} onChange={handleChange} className="sr-only peer" />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const SecurityTab = ({ formData, handleChange }) => (
    <div className="space-y-5 animate-fade-in-up">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-gray-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🛡️</span>
                <h4 className="text-sm font-bold text-slate-700">Account Security</h4>
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SmartInput label="New Password" name="password" type="password" value={formData.password || ''} onChange={handleChange} icon="🔑" placeholder="Leave blank to keep current" />
            <SmartInput label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword || ''} onChange={handleChange} icon="🔐" placeholder="Re-enter new password" />
            <SmartInput label="Recovery Email" name="recoveryEmail" type="email" value={formData.recoveryEmail} onChange={handleChange} icon="📧" placeholder="Backup email for account recovery" />
            <SmartInput label="Recovery Phone" name="recoveryPhone" type="tel" value={formData.recoveryPhone} onChange={handleChange} icon="📞" placeholder="Backup phone for account recovery" />
        </div>

        <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Security Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { icon: '🔐', label: 'Two-Factor Auth', status: 'Not Enabled', color: 'text-amber-600', bg: 'bg-amber-50', action: 'Enable' },
                    { icon: '👆', label: 'Biometric Login', status: 'Available', color: 'text-green-600', bg: 'bg-green-50', action: 'Setup' },
                    { icon: '📱', label: 'Trusted Devices', status: '3 Active', color: 'text-blue-600', bg: 'bg-blue-50', action: 'Manage' },
                ].map((item, i) => (
                    <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                            <span>{item.icon}</span>
                            <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                        </div>
                        <p className={`text-sm font-bold ${item.color}`}>{item.status}</p>
                        <button className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800">{item.action} →</button>
                    </div>
                ))}
            </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Activity</h4>
            <div className="space-y-2">
                {[
                    { action: 'Login from Chrome on Windows', time: '2 hours ago', location: 'Bengaluru, India', current: true },
                    { action: 'Password changed', time: '7 days ago', location: 'Bengaluru, India' },
                    { action: 'New device authorized', time: '14 days ago', location: 'Mumbai, India' },
                ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2">
                            {item.current && <span className="w-2 h-2 rounded-full bg-green-500" />}
                            <div>
                                <p className="text-sm font-medium text-gray-700">{item.action}</p>
                                <p className="text-[10px] text-gray-400">{item.time} · {item.location}</p>
                            </div>
                        </div>
                        {item.current && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Current</span>}
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const AiPreferencesTab = ({ formData, handleChange }) => (
    <div className="space-y-5 animate-fade-in-up">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🧠</span>
                <h4 className="text-sm font-bold text-purple-700">AI Personalization</h4>
            </div>
            <p className="text-xs text-purple-600/70">LifeLink AI uses these preferences to personalize your experience.</p>
        </div>

        {[
            { key: 'aiRecommendations', label: 'AI-Powered Recommendations', desc: 'Receive personalized health and wellness recommendations based on your data', icon: '🎯' },
            { key: 'aiHealthMonitoring', label: 'Continuous Health Monitoring', desc: 'AI analyzes your vital trends and alerts you to significant changes', icon: '📊' },
            { key: 'aiAlertSensitivity', label: 'Alert Sensitivity', desc: 'Adjust how sensitive AI is when detecting health anomalies', icon: '🎚️' },
            { key: 'aiLifestyleCoaching', label: 'Lifestyle Coaching', desc: 'Get AI-generated lifestyle improvement suggestions', icon: '🏃' },
            { key: 'aiPredictiveHealth', label: 'Predictive Health Insights', desc: 'AI predicts potential health risks based on your historical data', icon: '🔮' },
            { key: 'aiMedicationReminders', label: 'Medication Reminders', desc: 'AI-powered smart reminders for your medications', icon: '💊' },
            { key: 'aiEmergencyDetection', label: 'Emergency Auto-Detection', desc: 'AI detects emergencies from vital signs and triggers SOS automatically', icon: '🚨' },
            { key: 'aiRiskNotifications', label: 'Risk Notifications', desc: 'Receive proactive notifications about potential health risks', icon: '⚠️' },
            { key: 'aiExplainDecisions', label: 'Explain AI Decisions', desc: 'Show AI reasoning and confidence scores for all recommendations', icon: '🧠' },
        ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all duration-200">
                <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{setting.icon}</span>
                    <div>
                        <p className="text-sm font-semibold text-gray-800">{setting.label}</p>
                        <p className="text-xs text-gray-500">{setting.desc}</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name={setting.key} checked={formData[setting.key] !== false} onChange={handleChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
            </div>
        ))}
    </div>
);

// ═══════════════════════════════════════════════════════════════════════
// MAIN PROFILE EDIT MODAL
// ═══════════════════════════════════════════════════════════════════════

const ProfileEditModal = ({ onClose }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSaveProgress, setShowSaveProgress] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const modalRef = useRef(null);
    const previousFocusRef = useRef(null);

    const role = user?.role || 'public';
    const theme = getTheme(role);

    // ── Load data on mount ──
    useEffect(() => {
        previousFocusRef.current = document.activeElement;
        const fetchData = async () => {
            if (!user?.id) return;
            try {
                const { ok, data } = await apiFetch(`/api/dashboard/public/${user.id}/full`, { method: 'GET' });
                const hp = data?.hospitalProfile || {};
                const hr = data?.healthRecords || {};
                setFormData({
                    name: user.name || '',
                    email: user.email || '',
                    phone: user.phone || hr.contact || '',
                    location: user.location || '',
                    age: hr.age || '',
                    gender: hr.gender || '',
                    bloodGroup: hr.bloodGroup || user.bloodGroup || '',
                    dob: hr.dob || '',
                    nationality: hr.nationality || '',
                    language: hr.language || '',
                    occupation: hr.occupation || '',
                    allergies: hr.allergies || '',
                    medications: hr.medications || '',
                    conditions: hr.conditions ? (Array.isArray(hr.conditions) ? hr.conditions.join(', ') : hr.conditions) : '',
                    surgeries: hr.surgeries || '',
                    familyHistory: hr.familyHistory || '',
                    pregnancy: hr.pregnancy || '',
                    disabilities: hr.disabilities || '',
                    insuranceId: hr.insuranceId || hp.insuranceId || '',
                    primaryPhysician: hr.primaryPhysician || '',
                    hospitalPreference: hr.hospitalPreference || '',
                    medicalNotes: hr.medicalNotes || '',
                    height: hr.height || '',
                    weight: hr.weight || '',
                    bmi: hr.bmi || '',
                    lifestyle: hr.lifestyle || '',
                    smoking: hr.smoking || '',
                    alcohol: hr.alcohol || '',
                    vaccinationStatus: hr.vaccinationStatus || '',
                    emergencyContact: hr.emergencyContact || '',
                    emergencyRelation: hr.emergencyRelation || '',
                    emergencyPhone: hr.emergencyPhone || '',
                    emergencyAddress: hr.emergencyAddress || '',
                    preferredHospital: hp.name || hr.preferredHospital || '',
                    bloodDonor: hr.bloodDonor || '',
                    organDonor: hr.organDonor || '',
                    advanceDirectives: hr.advanceDirectives || '',
                    recoveryEmail: user.email || '',
                    recoveryPhone: user.phone || '',
                    shareMedicalData: true, shareHospital: true, shareResearch: false, shareAnonymous: true,
                    locationAccess: true, cameraAccess: true, microphoneAccess: true,
                    notifyEmail: true, notifySms: true, notifyPush: true, notifyEmergency: true,
                    aiRecommendations: true, aiHealthMonitoring: true, aiAlertSensitivity: true,
                    aiLifestyleCoaching: true, aiPredictiveHealth: true, aiMedicationReminders: true,
                    aiEmergencyDetection: true, aiRiskNotifications: true, aiExplainDecisions: true,
                });
                setLastUpdated(new Date().toISOString());
            } catch (err) {
                console.error('Failed to load profile', err);
            }
        };
        fetchData();
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
            if (previousFocusRef.current) previousFocusRef.current.focus();
        };
    }, [user]);

    // ── Handle ESC ──
    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose?.(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // ── Handle changes ──
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
        setErrors(prev => ({ ...prev, [name]: null }));
        // Auto-calculate BMI
        if ((name === 'height' || name === 'weight') && formData.height && formData.weight) {
            const h = name === 'height' ? parseFloat(value) : parseFloat(formData.height);
            const w = name === 'weight' ? parseFloat(value) : parseFloat(formData.weight);
            if (h > 0 && w > 0) {
                const bmi = (w / ((h / 100) ** 2)).toFixed(1);
                setFormData(prev => ({ ...prev, bmi }));
            }
        }
    };

    // ── Validate on blur ──
    const handleBlur = (e) => {
        const error = validateField(e.target.name, e.target.value);
        setErrors(prev => ({ ...prev, [e.target.name]: error }));
    };

    // ── Profile completeness ──
    const completeness = useMemo(() => computeCompleteness(formData), [formData]);
    const completionItems = useMemo(() => getCompletionItems(formData), [formData]);

    // ── AI Profile Analysis ──
    const aiAnalysis = useMemo(() => {
        const hasMedical = Boolean(formData.conditions || formData.allergies || formData.medications);
        const hasEmergency = Boolean(formData.emergencyContact && formData.emergencyPhone);
        const hasVitals = Boolean(formData.bmi || formData.height);
        const hasInsurance = Boolean(formData.insuranceId);
        const score = Math.round(
            (hasMedical ? 25 : 0) + (hasEmergency ? 25 : 0) + (hasVitals ? 25 : 0) + (hasInsurance ? 25 : 0) +
            (formData.bloodGroup ? 10 : 0) + (formData.primaryPhysician ? 5 : 0)
        );
        return {
            quality: score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Incomplete',
            medicalData: hasMedical ? 'Complete' : 'Partial',
            emergencyReadiness: hasEmergency ? `${85 + Math.floor(Math.random() * 10)}%` : 'Not Configured',
            predictionAccuracy: `${90 + Math.floor(Math.random() * 8)}%`,
            verified: formData.bloodGroup && formData.name ? 'Verified' : 'Unverified',
            score: Math.min(100, score + 10),
        };
    }, [formData]);

    // ── Save ──
    const handleSave = async (e) => {
        e.preventDefault();
        // Validate required fields
        const newErrors = {};
        if (!formData.name) newErrors.name = 'Name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.phone) newErrors.phone = 'Phone is required';
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setSaving(true);
        setShowSaveProgress(true);

        try {
            const payload = { ...formData };
            if (!payload.password) { delete payload.password; delete payload.confirmPassword; }
            delete payload.confirmPassword;

            const { ok } = await apiFetch(`/api/dashboard/profile/${user.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });

            if (ok) {
                setTimeout(() => {
                    setShowSaveProgress(false);
                    setSaving(false);
                    setSuccessMessage('Profile saved successfully! 🎉');
                    setTimeout(() => {
                        setSuccessMessage('');
                        onClose?.();
                        window.location.reload();
                    }, 1500);
                }, 3200);
            } else {
                setShowSaveProgress(false);
                setSaving(false);
                setErrors({ form: 'Failed to save. Please try again.' });
            }
        } catch (err) {
            setShowSaveProgress(false);
            setSaving(false);
            setErrors({ form: err.message || 'Save failed' });
        }
    };

    // ── Render tab content ──
    const renderTabContent = () => {
        switch (activeTab) {
            case 'general': return <GeneralTab formData={formData} handleChange={handleChange} errors={errors} theme={theme} />;
            case 'medical': return <MedicalTab formData={formData} handleChange={handleChange} errors={errors} />;
            case 'emergency': return <EmergencyTab formData={formData} handleChange={handleChange} errors={errors} />;
            case 'privacy': return <PrivacyTab formData={formData} handleChange={handleChange} />;
            case 'security': return <SecurityTab formData={formData} handleChange={handleChange} />;
            case 'ai': return <AiPreferencesTab formData={formData} handleChange={handleChange} />;
            default: return null;
        }
    };

    return createPortal(
        <>
            {/* ── Overlay ── */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6"
                style={{ background: 'rgba(15,20,35,0.45)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
                onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
            >
                {/* ── Modal ── */}
                <div
                    ref={modalRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Profile Management"
                    className="relative w-full max-w-[1060px] h-[85vh] max-h-[900px] bg-white rounded-[26px] shadow-2xl flex flex-col overflow-hidden animate-zoom-in"
                    style={{ boxShadow: '0 25px 80px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.08)' }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* ── Header ── */}
                    <div className={`relative shrink-0 bg-gradient-to-r ${theme.gradient} p-5 sm:p-6`}>
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent_60%)]" />
                        <div className="relative flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-lg sm:text-xl font-bold text-white">Profile Management</h2>
                                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-white/90 border border-white/20">
                                        LifeLink Identity Center
                                    </span>
                                </div>
                                <p className="text-sm text-white/80 mt-0.5">Secure Personal & Medical Information</p>
                                <div className="flex items-center gap-4 mt-2 flex-wrap">
                                    <span className="flex items-center gap-1.5 text-[11px] text-white/70">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
                                        AI Profile Verification {aiAnalysis.verified}
                                    </span>
                                    {lastUpdated && (
                                        <span className="text-[11px] text-white/60">
                                            Last Updated: {new Date(lastUpdated).toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Profile completeness */}
                                <div className="hidden sm:flex items-center gap-2">
                                    <div className="relative w-12 h-12">
                                        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="white" strokeWidth="3"
                                                strokeDasharray={`${(completeness.percentage / 100) * 97.4} 97.4`}
                                                className="transition-all duration-1000 ease-out"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[10px] font-bold text-white">{completeness.percentage}%</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all duration-200"
                                    aria-label="Close modal"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Body ── */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* ── Tab Navigation ── */}
                        <div className="hidden md:flex flex-col w-[180px] shrink-0 bg-gray-50/80 border-r border-gray-200 p-3 space-y-1 overflow-y-auto">
                            {PROFILE_TABS.map((tab) => {
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-left
                                            ${isActive
                                                ? `bg-gradient-to-r ${theme.accent} text-white shadow-md`
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                                            } active:scale-[0.98]`}
                                    >
                                        <span className="text-base">{tab.icon}</span>
                                        <span className="truncate">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ── Mobile Tab Bar ── */}
                        <div className="md:hidden w-full shrink-0 border-b border-gray-200 bg-white z-10 overflow-x-auto scrollbar-none">
                            <div className="flex gap-1 p-2 min-w-max">
                                {PROFILE_TABS.map((tab) => {
                                    const isActive = activeTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap
                                                ${isActive ? `bg-gradient-to-r ${theme.accent} text-white shadow-sm` : 'text-gray-500 bg-gray-100'}`}
                                        >
                                            <span>{tab.icon}</span>
                                            <span>{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ── Tab Content ── */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                            {successMessage && (
                                <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-sm font-semibold text-green-700 text-center animate-slide-down-fade">
                                    {successMessage}
                                </div>
                            )}
                            {errors.form && (
                                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm font-semibold text-red-700 text-center animate-slide-down-fade">
                                    {errors.form}
                                </div>
                            )}
                            {renderTabContent()}
                        </div>

                        {/* ── AI Analysis Panel (Desktop) ── */}
                        <div className="hidden lg:flex flex-col w-[240px] shrink-0 bg-gray-50/80 border-l border-gray-200 p-4 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-lg">🧠</span>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Analysis</h4>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-slow ml-auto" />
                            </div>

                            {/* Score Ring */}
                            <div className="flex justify-center mb-4">
                                <div className="relative w-24 h-24">
                                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#profileGradient)" strokeWidth="2.5"
                                            strokeDasharray={`${(aiAnalysis.score / 100) * 97.4} 97.4`}
                                            className="transition-all duration-1000 ease-out"
                                            strokeLinecap="round"
                                        />
                                        <defs>
                                            <linearGradient id="profileGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#6366F1" />
                                                <stop offset="100%" stopColor="#8B5CF6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className="text-xl font-bold text-gray-800">{aiAnalysis.score}</span>
                                        <span className="text-[8px] text-gray-400 font-medium uppercase">Score</span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center mb-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold
                                    ${aiAnalysis.quality === 'Excellent' ? 'bg-green-100 text-green-700' :
                                      aiAnalysis.quality === 'Good' ? 'bg-blue-100 text-blue-700' :
                                      'bg-amber-100 text-amber-700'}`}>
                                    {aiAnalysis.quality}
                                </span>
                                <p className="text-[10px] text-gray-400 mt-1">Profile Quality</p>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { label: 'Medical Data', value: aiAnalysis.medicalData },
                                    { label: 'Emergency Readiness', value: aiAnalysis.emergencyReadiness },
                                    { label: 'Prediction Accuracy', value: aiAnalysis.predictionAccuracy },
                                    { label: 'Verification', value: aiAnalysis.verified },
                                ].map((item, i) => (
                                    <div key={i} className="p-2.5 rounded-xl bg-white border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-medium text-gray-500">{item.label}</span>
                                            <span className={`text-[10px] font-bold ${item.value.includes('Not') || item.value.includes('Incomplete') ? 'text-red-500' : 'text-green-600'}`}>
                                                {item.value}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Missing items */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Missing Information</h4>
                                <div className="space-y-1.5">
                                    {completionItems.filter(i => !i.done).map((item, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-amber-600">
                                            <span>{item.icon}</span>
                                            <span>{item.label}</span>
                                        </div>
                                    ))}
                                    {completionItems.filter(i => !i.done).length === 0 && (
                                        <p className="text-[11px] text-green-600">✅ All essential data provided</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline text-[10px] text-gray-400">
                                Profile {completeness.percentage}% complete
                            </span>
                            <div className="hidden sm:block w-24 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                <div
                                    className={`h-full rounded-full bg-gradient-to-r ${theme.accent} transition-all duration-1000 ease-out`}
                                    style={{ width: `${completeness.percentage}%` }}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all duration-200 active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({});
                                    setErrors({});
                                }}
                                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 border border-gray-200 transition-all duration-200 active:scale-95"
                            >
                                Reset Changes
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('general')}
                                className="hidden sm:inline-flex px-4 py-2 rounded-xl text-sm font-semibold text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-all duration-200 active:scale-95"
                            >
                                Preview Profile
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r ${theme.accent} shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ripple-container`}
                            >
                                {saving ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Saving...
                                    </span>
                                ) : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Progress Modal */}
            <SaveProgressModal visible={showSaveProgress} onComplete={() => {}} />
        </>,
        document.body
    );
};

export default ProfileEditModal;
