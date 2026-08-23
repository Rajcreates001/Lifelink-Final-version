import React from 'react';
import { createPortal } from 'react-dom';

const DetailModal = ({ isOpen, onClose, item, type }) => {
    if (!isOpen || !item) return null;
    const isFeature = type === 'feature';
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true"></div>
            <div
                className="relative w-full max-w-2xl rounded-2xl shadow-2xl animate-fade-in-up"
                style={{
                    background: 'rgba(255,255,255,0.97)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all duration-200 z-10"
                    aria-label="Close details"
                >
                    <i className="fas fa-xmark text-sm"></i>
                </button>

                {/* Header */}
                <div className="p-6 sm:p-7 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0"
                            style={{ background: `${item.color}15`, color: item.color }}>
                            <i className={`fas ${item.icon}`}></i>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                            <p className="text-sm text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                    </div>
                    {!isFeature && item.metrics && (
                        <div className="mt-3 flex items-center gap-3">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                style={{ background: `${item.color}12`, color: item.color }}>
                                <i className="fas fa-microchip text-[9px]"></i>
                                {item.model}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                                <i className="fas fa-database text-[9px]"></i>
                                {item.trained}
                            </span>
                        </div>
                    )}
                    {item.coverage !== undefined && (
                        <div className="mt-3 flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold"
                                style={{ background: `${item.color}12`, color: item.color }}>
                                <i className="fas fa-shield-halved text-[9px]"></i>
                                Coverage: {item.coverage}%
                            </span>
                            {item.value && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
                                    <i className="fas fa-check-circle text-[9px]"></i>
                                    {item.value}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 sm:p-7 pt-4 space-y-4">
                    {isFeature ? (
                        <>
                            {item.subFeatures && item.subFeatures.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Key Features</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                        {item.subFeatures.map((sf) => (
                                            <div key={sf} className="flex items-center gap-2 text-sm text-gray-700">
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }}></span>
                                                {sf}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {item.useCases && item.useCases.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Use Cases</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.useCases.map((uc) => (
                                            <span key={uc} className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                                                style={{ background: `${item.color}10`, color: item.color }}>
                                                {uc}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {item.benefits && item.benefits.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Impact</h4>
                                    <div className="space-y-1.5">
                                        {item.benefits.map((b) => (
                                            <div key={b} className="flex items-center gap-2 text-sm">
                                                <i className="fas fa-circle-check text-[12px]" style={{ color: item.color }}></i>
                                                <span className="text-gray-700 font-medium">{b}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {item.details && item.details.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Capabilities</h4>
                                    <div className="space-y-1.5">
                                        {item.details.map((d) => (
                                            <div key={d} className="flex items-center gap-2 text-sm text-gray-700">
                                                <i className="fas fa-chevron-right text-[10px]" style={{ color: item.color }}></i>
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="bg-gray-50/80 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Accuracy / Performance</span>
                                    <span className="text-lg font-bold" style={{ color: item.color }}>{item.metrics}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                                    <i className="fas fa-flask"></i>
                                    <span>Model: {item.model}</span>
                                    <span className="text-gray-300">|</span>
                                    <i className="fas fa-database"></i>
                                    <span>Trained on: {item.trained}</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Action button */}
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                        style={{
                            background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)`,
                            color: 'white',
                        }}
                    >
                        Close Details
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── GRAPH DETAIL MODAL ─────────────────────────────────

export default DetailModal;
