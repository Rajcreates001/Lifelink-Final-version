const _toInt = (value, fallback = 0) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const _nowLabel = () => new Date().toLocaleString();

const buildQuery = (params) => {
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        const text = String(value).trim();
        if (!text) return;
        searchParams.set(key, text);
    });
    const qs = searchParams.toString();
    return qs ? `?${qs}` : '';
};


export { _toInt, _nowLabel, buildQuery };
