import React from 'react';

const SearchBar = ({
    mode = 'db',
    showModeToggle = true,
    query = '',
    onQueryChange,
    onModeChange,
    onSubmit,
    loading = false,
}) => {
    const isAi = mode === 'ai';

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit?.();
            }}
            className="relative group"
        >
            {/* Animated glow ring */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-2xl opacity-0 group-hover:opacity-20 group-focus-within:opacity-30 blur transition-all duration-500 animate-gradient-shift" />

            <div className={`relative flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-200 w-full overflow-hidden group-focus-within:ring-2 group-focus-within:ring-indigo-300/40 ${
                isAi
                    ? 'bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border-indigo-200 group-focus-within:border-indigo-400'
                    : 'bg-white border-slate-200 group-focus-within:border-indigo-300 hover:border-slate-300'
            } shadow-sm`}>
                {/* Mode Badge */}
                {showModeToggle ? (
                    <button
                        type="button"
                        onClick={() => onModeChange?.(isAi ? 'db' : 'ai')}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-xl transition-all duration-200 shrink-0 flex items-center gap-1.5 ${
                            isAi
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                    >
                        <span>{isAi ? '🧠' : '🗄️'}</span>
                        {isAi ? 'AI Intelligence' : 'Database'}
                    </button>
                ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 shrink-0 flex items-center gap-1.5">
                        <span>{isAi ? '🧠' : '🗄️'}</span>
                        {isAi ? 'AI Intelligence' : 'Database'}
                    </span>
                )}

                {/* Input */}
                <div className="relative flex-1 min-w-0">
                    <input
                        className="w-full bg-transparent outline-none text-[14px] text-slate-700 placeholder:text-slate-400 transition-all duration-200 font-medium"
                        placeholder={isAi ? 'Ask LifeLink Intelligence Engine…' : 'Search patients, donors, hospitals…'}
                        value={query}
                        onChange={(e) => onQueryChange?.(e.target.value)}
                        aria-label={isAi ? 'Ask LifeLink Intelligence Engine' : 'Search records'}
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {query && (
                        <button type="button" onClick={() => onQueryChange?.('')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`px-3.5 py-2 rounded-xl text-[10px] font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5 ${
                            isAi
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-md hover:shadow-indigo-200'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-md hover:shadow-blue-200'
                        } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                        aria-label="Search"
                    >
                        {loading ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Searching
                            </span>
                        ) : (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                Search
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Keyboard shortcut hint */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[9px] text-slate-400 font-mono">⌘K</kbd>
            </div>
        </form>
    );
};

export default SearchBar;
