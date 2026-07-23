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
    const modeLabel = isAi ? 'LifeLink AI' : 'Database Search';

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit?.();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all duration-200 w-full overflow-hidden group focus-within:ring-2 focus-within:ring-[#2563EB]/20 ${
                isAi
                    ? 'bg-gradient-to-r from-purple-50/80 to-indigo-50/80 border-purple-200 focus-within:border-purple-400'
                    : 'bg-white border-[#E5E7EB] focus-within:border-[#2563EB] hover:border-gray-300'
            }`}
        >
            {showModeToggle ? (
                <button
                    type="button"
                    onClick={() => onModeChange?.(isAi ? 'db' : 'ai')}
                    className={`text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full transition-all duration-200 shrink-0 ${
                        isAi
                            ? 'bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                >
                    {modeLabel}
                </button>
            ) : (
                <span className="text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">
                    {modeLabel}
                </span>
            )}
            <div className="relative flex-1 min-w-0">
                <input
                    className="w-full bg-transparent outline-none text-[15px] text-gray-700 placeholder:text-gray-400 transition-all duration-200"
                    placeholder={isAi ? 'Ask LifeLink AI…' : 'Search records…'}
                    value={query}
                    onChange={(e) => onQueryChange?.(e.target.value)}
                    aria-label={isAi ? 'Ask LifeLink AI' : 'Search records'}
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className={`text-xs font-semibold px-4 py-1.5 rounded-full transition-all duration-200 shrink-0 active:scale-95 ${
                    isAi
                        ? 'bg-gradient-to-r from-[#7C3AED] to-[#2563EB] text-white hover:shadow-md'
                        : 'bg-gradient-to-r from-[#2563EB] to-[#6366F1] text-white hover:shadow-md'
                } ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
                aria-label="Search"
            >
                {loading ? (
                    <span className="flex items-center gap-1.5">
                        <i className="fas fa-spinner fa-spin text-[10px]"></i>
                        Search
                    </span>
                ) : (
                    <span className="flex items-center gap-1.5">
                        <i className="fas fa-arrow-right text-[10px]"></i>
                        Go
                    </span>
                )}
            </button>
        </form>
    );
};

export default SearchBar;
