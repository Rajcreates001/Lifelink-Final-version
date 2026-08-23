/**
 * LifeLink i18n — Internationalization Module
 * =============================================
 * Lightweight i18n solution for multi-language support.
 * No external dependencies — uses a simple context-based approach.
 *
 * Supported languages:
 *   - English (en) — default
 *   - Hindi (hi) — Hindi
 *   - Kannada (kn) — Kannada (regional)
 *   - Tamil (ta) — Tamil (regional)
 *   - Telugu (te) — Telugu (regional)
 *
 * Usage:
 *   import { useTranslation, TranslationProvider } from '../i18n';
 *   const { t } = useTranslation();
 *   return <h1>{t('welcome')}</h1>;
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

// ─── Translation Dictionaries ──────────────────────────────────────

const translations = {
  en: {
    // Common
    welcome: 'Welcome to LifeLink',
    loading: 'Loading...',
    error: 'Error',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    refresh: 'Refresh',
    back: 'Back',
    next: 'Next',
    submit: 'Submit',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',

    // Navigation
    home: 'Home',
    dashboard: 'Dashboard',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
    login: 'Login',
    signup: 'Sign Up',

    // Emergency
    sos_emergency: 'SOS Emergency',
    trigger_sos: 'Trigger SOS',
    emergency_response: 'Emergency Response',
    nearest_hospital: 'Nearest Hospital',
    call_ambulance: 'Call Ambulance',
    emergency_contacts: 'Emergency Contacts',
    severity: 'Severity',
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',

    // Hospital
    hospital_dashboard: 'Hospital Dashboard',
    bed_management: 'Bed Management',
    staff_management: 'Staff Management',
    patient_list: 'Patient List',
    admissions: 'Admissions',
    discharges: 'Discharges',
    emergency_feed: 'Emergency Feed',
    finance: 'Finance',
    billing: 'Billing',
    reports: 'Reports',

    // Government
    government_dashboard: 'Government Dashboard',
    command_center: 'Command Center',
    live_monitoring: 'Live Monitoring',
    disaster_management: 'Disaster Management',
    resource_allocation: 'Resource Allocation',
    policy_workflow: 'Policy Workflow',
    verification_center: 'Verification Center',

    // Ambulance
    ambulance_dashboard: 'Ambulance Dashboard',
    assignments: 'Assignments',
    live_tracking: 'Live Tracking',
    route_optimization: 'Route Optimization',
    patient_info: 'Patient Info',
    response_history: 'Response History',

    // Health
    health_check: 'Health Check',
    risk_score: 'Risk Score',
    vitals: 'Vitals',
    heart_rate: 'Heart Rate',
    blood_pressure: 'Blood Pressure',
    oxygen_saturation: 'Oxygen Saturation',
    temperature: 'Temperature',

    // Donor
    donor_matching: 'Donor Matching',
    blood_bank: 'Blood Bank',
    find_donors: 'Find Donors',
    compatibility_score: 'Compatibility Score',

    // Status
    online: 'Online',
    offline: 'Offline',
    active: 'Active',
    inactive: 'Inactive',
    pending: 'Pending',
    completed: 'Completed',
    failed: 'Failed',
    approved: 'Approved',
    rejected: 'Rejected',
  },

  hi: {
    welcome: 'LifeLink में आपका स्वागत है',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    search: 'खोजें',
    filter: 'फ़िल्टर',
    export: 'निर्यात',
    refresh: 'रीफ्रेश',
    back: 'वापस',
    next: 'अगला',
    submit: 'जमा करें',
    confirm: 'पुष्टि करें',
    yes: 'हाँ',
    no: 'नहीं',
    home: 'होम',
    dashboard: 'डैशबोर्ड',
    settings: 'सेटिंग्स',
    profile: 'प्रोफ़ाइल',
    logout: 'लॉग आउट',
    login: 'लॉग इन',
    signup: 'साइन अप',
    sos_emergency: 'SOS आपातकाल',
    trigger_sos: 'SOS ट्रिगर करें',
    emergency_response: 'आपातकालीन प्रतिक्रिया',
    nearest_hospital: 'निकटतम अस्पताल',
    call_ambulance: 'एम्बुलेंस बुलाएं',
    severity: 'गंभीरता',
    critical: 'गंभीर',
    high: 'उच्च',
    medium: 'मध्यम',
    low: 'कम',
    hospital_dashboard: 'अस्पताल डैशबोर्ड',
    bed_management: 'बेड प्रबंधन',
    staff_management: 'स्टाफ प्रबंधन',
    patient_list: 'रोगी सूची',
    government_dashboard: 'सरकारी डैशबोर्ड',
    command_center: 'कमांड सेंटर',
    live_monitoring: 'लाइव मॉनिटरिंग',
    ambulance_dashboard: 'एम्बुलेंस डैशबोर्ड',
    health_check: 'स्वास्थ्य जांच',
    risk_score: 'जोखिम स्कोर',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन',
    active: 'सक्रिय',
    pending: 'लंबित',
    completed: 'पूर्ण',
  },

  kn: {
    welcome: 'LifeLink ಗೆ ಸ್ವಾಗತ',
    loading: 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
    error: 'ದೋಷ',
    save: 'ಉಳಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    search: 'ಹುಡುಕಿ',
    home: 'ಹೋಮ್',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    sos_emergency: 'SOS ತುರ್ತು',
    hospital_dashboard: 'ಆಸ್ಪತ್ರೆ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    government_dashboard: 'ಸರ್ಕಾರಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    ambulance_dashboard: 'ಆಂಬುಲೆನ್ಸ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    online: 'ಆನ್‌ಲೈನ್',
    offline: 'ಆಫ್‌ಲೈನ್',
    active: 'ಸಕ್ರಿಯ',
    pending: 'ಬಾಕಿ',
  },

  ta: {
    welcome: 'LifeLink க்கு வரவேற்கிறோம்',
    loading: 'ஏற்றுகிறது...',
    error: 'பிழை',
    save: 'சேமி',
    cancel: 'ரத்துசெய்',
    search: 'தேடு',
    home: 'முகப்பு',
    dashboard: 'டாஷ்போர்டு',
    sos_emergency: 'SOS அவசரநிலை',
    hospital_dashboard: 'மருத்துவமனை டாஷ்போர்டு',
    government_dashboard: 'அரசு டாஷ்போர்டு',
    ambulance_dashboard: 'ஆம்புலன்ஸ் டாஷ்போர்டு',
    online: 'ஆன்லைன்',
    offline: 'ஆஃப்லைன்',
    active: 'செயலில்',
    pending: 'நிலுவையில்',
  },

  te: {
    welcome: 'LifeLink కి స్వాగతం',
    loading: 'లోడ్ అవుతోంది...',
    error: 'లోపం',
    save: 'సేవ్ చేయండి',
    cancel: 'రద్దు చేయండి',
    search: 'వెతకండి',
    home: 'హోమ్',
    dashboard: 'డ్యాష్‌బోర్డ్',
    sos_emergency: 'SOS అత్యవసర',
    hospital_dashboard: 'ఆసుపత్రి డ్యాష్‌బోర్డ్',
    government_dashboard: 'ప్రభుత్వ డ్యాష్‌బోర్డ్',
    ambulance_dashboard: 'అంబులెన్స్ డ్యాష్‌బోర్డ్',
    online: 'ఆన్‌లైన్',
    offline: 'ఆఫ్‌లైన్',
    active: 'యాక్టివ్',
    pending: 'పెండింగ్',
  },
};

// ─── Context ───────────────────────────────────────────────────────

const I18nContext = createContext({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
  availableLocales: [],
});

// ─── Provider ──────────────────────────────────────────────────────

export const TranslationProvider = ({ children, defaultLocale = 'en' }) => {
  const [locale, setLocale] = useState(() => {
    try {
      return localStorage.getItem('lifelink_locale') || defaultLocale;
    } catch {
      return defaultLocale;
    }
  });

  const handleSetLocale = useCallback((newLocale) => {
    setLocale(newLocale);
    try {
      localStorage.setItem('lifelink_locale', newLocale);
    } catch { /* ignore */ }
  }, []);

  const t = useCallback((key, fallback) => {
    const dict = translations[locale] || translations.en;
    return dict[key] || translations.en[key] || fallback || key;
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale: handleSetLocale,
    t,
    availableLocales: Object.keys(translations),
  }), [locale, handleSetLocale, t]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────

export const useTranslation = () => useContext(I18nContext);

// ─── Language Selector Component ──────────────────────────────────

export const LanguageSelector = ({ className = '' }) => {
  const { locale, setLocale, availableLocales } = useTranslation();

  const languageNames = {
    en: 'English',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
    ta: 'தமிழ்',
    te: 'తెలుగు',
  };

  return (
    <select
      className={`p-2 border rounded text-sm ${className}`}
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      aria-label="Select language"
    >
      {availableLocales.map((loc) => (
        <option key={loc} value={loc}>
          {languageNames[loc] || loc}
        </option>
      ))}
    </select>
  );
};

export default { TranslationProvider, useTranslation, LanguageSelector };
