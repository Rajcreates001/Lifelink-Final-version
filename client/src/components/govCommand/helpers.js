const severityColor = (value) => {
    const key = String(value || '').toLowerCase();
    if (key === 'critical' || key === 'high') return 'red';
    if (key === 'medium') return 'yellow';
    if (key === 'low') return 'green';
    return 'gray';
};

const impactColor = (value) => {
    const key = String(value || '').toLowerCase();
    if (key === 'high') return 'red';
    if (key === 'medium') return 'yellow';
    if (key === 'low') return 'green';
    return 'gray';
};

const formatNumber = (value) => (Number.isFinite(value) ? value : 0);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const buildSeverityData = (feed) => {
    const buckets = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    feed.forEach((item) => {
        const key = String(item.severity || '').toLowerCase();
        if (key === 'critical') buckets.Critical += 1;
        else if (key === 'high') buckets.High += 1;
        else if (key === 'medium') buckets.Medium += 1;
        else if (key === 'low') buckets.Low += 1;
    });
    return Object.entries(buckets).map(([label, value]) => ({ label, value }));
};

const normalizeFeed = (items, limit = FEED_LIMIT) => {
    const seen = new Set();
    const result = [];
    (items || []).forEach((item) => {
        const lat = Number(item.lat ?? item.latitude);
        const lng = Number(item.lng ?? item.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const key = item.id || item._id || `${lat.toFixed(5)}-${lng.toFixed(5)}-${item.occurred_at || ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        result.push({ ...item, lat, lng });
    });
    return result.slice(0, limit);
};

const normalizeHospitals = (items, limit = HOSPITAL_LIMIT) => {
    const seen = new Set();
    const result = [];
    (items || []).forEach((item) => {
        const lat = Number(item.lat ?? item.latitude);
        const lng = Number(item.lng ?? item.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        const key = item.id || item._id || `${lat.toFixed(5)}-${lng.toFixed(5)}-${item.name || ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        result.push({ ...item, lat, lng });
    });
    return result.slice(0, limit);
};

const pickCenter = (points) => {
    if (!points || points.length === 0) return [12.9716, 77.5946];
    const lat = points[0].lat ?? points[0].latitude ?? 12.9716;
    const lng = points[0].lng ?? points[0].longitude ?? 77.5946;
    return [lat, lng];
};

const buildSimulationGraph = (phases, afterAction) => {
    const nodes = [];
    const edges = [];
    const centerNode = {
        id: 'sim-core',
        position: { x: 0, y: 0 },
        data: { label: 'Simulation Core' },
        style: {
            background: '#0f172a',
            color: '#fff',
            borderRadius: 12,
            padding: 10,
            fontSize: 12,
            fontWeight: 700,
        },
    };
    nodes.push(centerNode);

    const total = phases.length || 0;
    const radius = 190;
    phases.forEach((phase, index) => {
        const angle = (index / Math.max(total, 1)) * Math.PI * 2;
        const id = `phase-${index}`;
        nodes.push({
            id,
            position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
            data: { label: `${phase.name || `Phase ${index + 1}`}\n${phase.count} incidents` },
            style: {
                background: '#e0f2fe',
                color: '#0f172a',
                borderRadius: 12,
                padding: 8,
                fontSize: 11,
                fontWeight: 600,
                border: '1px solid #bae6fd',
                textAlign: 'center',
                whiteSpace: 'pre-line',
            },
        });
        edges.push({
            id: `edge-core-${id}`,
            source: centerNode.id,
            target: id,
            animated: true,
            style: { stroke: '#38bdf8', strokeWidth: 2 },
        });
    });

    if (afterAction?.summary) {
        nodes.push({
            id: 'after-action',
            position: { x: 0, y: -240 },
            data: { label: `After-Action\nCritical ${afterAction.summary.critical || 0}` },
            style: {
                background: '#fee2e2',
                color: '#7f1d1d',
                borderRadius: 12,
                padding: 10,
                fontSize: 11,
                fontWeight: 700,
                border: '1px solid #fecaca',
                textAlign: 'center',
                whiteSpace: 'pre-line',
            },
        });
        edges.push({
            id: 'edge-after-action',
            source: centerNode.id,
            target: 'after-action',
            animated: true,
            style: { stroke: '#fb7185', strokeWidth: 2 },
        });
    }

    return { nodes, edges };
};

const severityScore = (value) => {
    const key = String(value || '').toLowerCase();
    if (key === 'critical') return 4;
    if (key === 'high') return 3;
    if (key === 'medium') return 2;
    if (key === 'low') return 1;
    return 0;
};

const buildDisasterGraph = (recent) => {
    const counts = recent.reduce((acc, item) => {
        const key = String(item.severity || 'low');
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
    const nodes = [
        {
            id: 'disaster-core',
            position: { x: 0, y: 0 },
            data: { label: 'Disaster Pulse' },
            style: {
                background: '#0f172a',
                color: '#fff',
                borderRadius: 14,
                padding: 10,
                fontSize: 12,
                fontWeight: 700,
            },
        },
    ];

    const severityKeys = ['Critical', 'High', 'Medium', 'Low'];
    const radius = 150;
    const edges = [];

    severityKeys.forEach((label, index) => {
        const id = `sev-${label.toLowerCase()}`;
        const angle = (index / severityKeys.length) * Math.PI * 2;
        nodes.push({
            id,
            position: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius },
            data: { label: `${label}\n${counts[label] || 0}` },
            style: {
                background: '#f8fafc',
                color: '#0f172a',
                borderRadius: 12,
                padding: 8,
                fontSize: 11,
                fontWeight: 600,
                border: '1px solid #e2e8f0',
                textAlign: 'center',
                whiteSpace: 'pre-line',
            },
        });
        edges.push({
            id: `edge-${id}`,
            source: 'disaster-core',
            target: id,
            animated: true,
            style: { stroke: '#fb7185', strokeWidth: 2 },
        });
    });

    return { nodes, edges };
};

const FEED_WINDOW_MINUTES = 120;

const FEED_LIMIT = 60;

const HOSPITAL_LIMIT = 60;

const MAX_MAP_POINTS = 80;

const VERIFICATION_FETCH_LIMIT = 120;

const VERIFICATION_RENDER_LIMIT = 60;

const VERIFICATION_PAGE_SIZE = 20;

const POLICY_PAGE_SIZE = 6;

const POLICY_RENDER_LIMIT = 36;

const POLICY_REFRESH_MS = 90000;
