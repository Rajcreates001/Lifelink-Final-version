import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const NavBar = ({ navigate }) => {
    const { user, logout } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenu, setMobileMenu] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${scrolled ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-100/50' : 'bg-transparent'}`}>
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm shadow-lg group-hover:scale-105 transition-transform duration-300">
                            <i className="fas fa-heart-pulse"></i>
                        </span>
                        <span className="text-lg font-bold text-gray-900 font-display">LifeLink</span>
                    </div>
                    <div className="hidden lg:flex items-center gap-8">
                        <a href="#features" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Features</a>
                        <a href="#portals" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Platform</a>
                        <a href="#ai-engine" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">AI Engine</a>
                        <a href="#tech" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Technology</a>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/50">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700">AI Online . 99.98%</span>
                        </div>
                        <button onClick={() => navigate('/login')} className="text-sm font-semibold text-gray-700 hover:text-blue-600 transition-colors">Log in</button>
                        <button onClick={() => navigate('/signup')}
                            className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                            Get Started <i className="fas fa-arrow-right ml-1.5 text-xs"></i>
                        </button>
                    </div>
                    <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-gray-600 hover:text-gray-900">
                        <i className={`fas ${mobileMenu ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
                    </button>
                </div>
                {mobileMenu && (
                    <div className="lg:hidden py-4 border-t border-gray-100 animate-fade-in">
                        <div className="flex flex-col gap-3">
                            <a href="#features" onClick={() => setMobileMenu(false)} className="text-sm font-medium text-gray-700 py-2">Features</a>
                            <a href="#portals" onClick={() => setMobileMenu(false)} className="text-sm font-medium text-gray-700 py-2">Platform</a>
                            <a href="#ai-engine" onClick={() => setMobileMenu(false)} className="text-sm font-medium text-gray-700 py-2">AI Engine</a>
                            <a href="#tech" onClick={() => setMobileMenu(false)} className="text-sm font-medium text-gray-700 py-2">Technology</a>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => navigate('/login')} className="flex-1 text-sm font-semibold text-gray-700 border border-gray-200 rounded-xl py-2.5">Log in</button>
                                <button onClick={() => navigate('/signup')} className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-sm font-semibold text-white py-2.5">Get Started</button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
};

// ─── HERO SECTION ────────────────────────────────────────

export default NavBar;
