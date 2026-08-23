import React from 'react';

const Footer = () => (
    <footer className="bg-gray-900 text-gray-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                            <i className="fas fa-heart-pulse"></i>
                        </span>
                        <span className="text-lg font-bold text-white font-display">LifeLink</span>
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">AI-powered healthcare coordination platform connecting citizens, hospitals, and emergency services.</p>
                </div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Product</h4>
                    <ul className="space-y-2.5">
                        {['Features', 'AI Engine', 'Platform', 'Our Mission', 'Integrations'].map((item) => (
                            <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Company</h4>
                    <ul className="space-y-2.5">
                        {['About', 'Research', 'Blog', 'Careers', 'Contact'].map((item) => (
                            <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Legal</h4>
                    <ul className="space-y-2.5">
                        {['Privacy Policy', 'Terms of Service', 'Security', 'Compliance', 'GDPR'].map((item) => (
                            <li key={item}><a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{item}</a></li>
                        ))}
                    </ul>
                </div>
            </div>
            <div className="mt-10 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-gray-600">\u00a9 2026 LifeLink. All rights reserved.</p>
                <div className="flex items-center gap-4">
                    {['fa-github', 'fa-twitter', 'fa-linkedin', 'fa-envelope'].map((icon) => (
                        <a key={icon} href="#" className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-all">
                            <i className={`fab ${icon} text-sm`}></i>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    </footer>
);

// ─── MAIN LANDING PAGE ──────────────────────────────────

export default Footer;
