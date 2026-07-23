import React from 'react';

const RoleCard = ({ title, description, icon, onSelect, delay = 0 }) => (
    <button
        type="button"
        onClick={onSelect}
        style={{ animationDelay: `${delay}ms` }}
        className="
            flex-1 max-w-[220px] text-center 
            bg-white/80 backdrop-blur p-3 sm:p-4 
            rounded-xl shadow-md border border-white/60 
            hover:-translate-y-1.5 hover:shadow-xl 
            active:scale-95
            transition-all duration-300 ease-out
            animate-fade-in-up
            hover:border-sky-300 hover:bg-white/90
            focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2
            relative overflow-hidden group
        "
    >
        {/* Animated gradient background on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50/0 to-indigo-50/0 group-hover:from-sky-50/50 group-hover:to-indigo-50/50 transition-all duration-500 rounded-xl"></div>
        
        <div className="relative z-10">
            <div className="text-sky-500 text-lg sm:text-xl mb-1.5 transform group-hover:scale-110 group-hover:text-sky-600 transition-all duration-300">
                <i className={`fas ${icon}`}></i>
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-sky-700 transition-colors duration-300">{title}</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-tight group-hover:text-slate-600 transition-colors duration-300">{description}</p>
            
            {/* Bottom accent bar on hover */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full group-hover:w-3/4 transition-all duration-300"></div>
        </div>
    </button>
);

export default RoleCard;
