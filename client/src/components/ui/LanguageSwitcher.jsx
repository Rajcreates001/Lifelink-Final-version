import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * LanguageSwitcher — Toggle between English and Hindi.
 * Can be used as a dropdown or inline button.
 */

const LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇺🇸' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
];

// Inline button variant (for sidebar)
export const LanguageSwitcherInline = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleSwitch = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lifelink_language', code);
    document.documentElement.lang = code;
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 h-[42px] rounded-[12px] text-sm font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-700/50 transition-all duration-200 ease-out active:scale-[0.98] group"
      >
        <span className="w-5 text-center text-base">{currentLang.flag}</span>
        <span className="flex-1 text-left">{currentLang.nativeLabel}</span>
        <i className={`fas fa-chevron-down text-[10px] text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-50 animate-slide-down-fade">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleSwitch(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 ${
                  i18n.language === lang.code
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <span className="text-base">{lang.flag}</span>
                <span>{lang.nativeLabel}</span>
                {i18n.language === lang.code && (
                  <i className="fas fa-check text-xs text-indigo-500 ml-auto" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// Compact button variant (for navbar)
export const LanguageSwitcherCompact = () => {
  const { i18n } = useTranslation();
  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleSwitch = () => {
    const nextLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(nextLang);
    localStorage.setItem('lifelink_language', nextLang);
    document.documentElement.lang = nextLang;
  };

  return (
    <button
      onClick={handleSwitch}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200"
      title={`Switch to ${i18n.language === 'en' ? 'Hindi' : 'English'}`}
    >
      <span className="text-sm">{currentLang.flag}</span>
      <span className="hidden sm:inline">{currentLang.code.toUpperCase()}</span>
    </button>
  );
};

export default LanguageSwitcherInline;
