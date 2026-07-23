"""
Wire useEmergencyFeed() into GovernmentLiveMonitoring and HospitalLiveEmergencyFeed components.
"""
import re

PROJECT = r"D:\Black folder\Projects\Major Project\LifeLink-MERN-v4"

# ─── GovernmentCommandModules.jsx ────────────────────────────────────────────
with open(f"{PROJECT}/client/src/components/GovernmentCommandModules.jsx", "r", encoding="utf-8") as f:
    gov = f.read()

# 1. Add import if not present
if "import { useEmergencyFeed }" not in gov:
    gov = gov.replace(
        "import ReportDownloadButton from './ReportDownloadButton';",
        "import ReportDownloadButton from './ReportDownloadButton';\nimport { useEmergencyFeed } from '../hooks/useWebSocket';"
    )
    print("[OK] Added useEmergencyFeed import to GovernmentCommandModules.jsx")

# 2. Inside GovernmentLiveMonitoring, add useEmergencyFeed hook call + merge logic
# After: const disableLiveRefresh = true;
# We'll replace the refresh button and add the hook
old_live_monitoring_header = '''            <DashboardCard>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase text-slate-500">Live Monitoring</p>
                        <p className="text-lg font-bold text-slate-800">Operational feed and system health</p>
                    </div>
                    <button
                        className="px-3 py-2 text-xs font-bold bg-slate-300 text-slate-600 rounded cursor-not-allowed"
                        disabled
                        title="Live refresh paused"
                    >
                        Refresh paused
                    </button>
                </div>
            </DashboardCard>'''

new_live_monitoring_header = '''            <DashboardCard>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase text-slate-500">Live Monitoring</p>
                            <p className="text-lg font-bold text-slate-800">Operational feed and system health</p>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                wsConnected
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                            <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                    wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                            />
                            {wsConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>
                </div>
            </DashboardCard>'''

if old_live_monitoring_header in gov:
    gov = gov.replace(old_live_monitoring_header, new_live_monitoring_header)
    print("[OK] Replaced 'Refresh paused' button with live WebSocket indicator")
else:
    print("[WARN] Could not find the live monitoring header to replace")

# 3. Add useEmergencyFeed hook inside GovernmentLiveMonitoring function body
old_gov_hook_insert = """    const disableLiveRefresh = true;

    const hospitalLoadData = useMemo(() => ("""

new_gov_hook_insert = """    const disableLiveRefresh = true;

    // Real-time emergency feed via WebSocket
    const {
        feed: realtimeFeed,
        isConnected: wsConnected,
    } = useEmergencyFeed();

    // Merge WebSocket feed items into the polling feed
    useEffect(() => {
        if (realtimeFeed.length === 0) return;
        setFeed((prev) => {
            const existingIds = new Set(prev.map((a) => a.id || a._id));
            const newItems = realtimeFeed.filter(
                (item) => !existingIds.has(item.id || item._id || item.alertId)
            )
            .map((item) => ({
                ...item,
                id: item.id || item._id || `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                lat: Number(item.lat ?? item.latitude) || 12.9716,
                lng: Number(item.lng ?? item.longitude) || 77.5946,
                occurred_at: item.occurred_at || new Date().toISOString(),
                type: item.message || item.type || 'Emergency alert',
                severity: item.severity || 'High',
            }));
            if (newItems.length === 0) return prev;
            return [...newItems, ...prev].slice(0, FEED_LIMIT);
        });
    }, [realtimeFeed]);

    const hospitalLoadData = useMemo(() => ("""

if old_gov_hook_insert in gov:
    gov = gov.replace(old_gov_hook_insert, new_gov_hook_insert)
    print("[OK] Added useEmergencyFeed hook + merge logic to GovernmentLiveMonitoring")
else:
    print("[WARN] Could not find insertion point for useEmergencyFeed in GovernmentLiveMonitoring")

with open(f"{PROJECT}/client/src/components/GovernmentCommandModules.jsx", "w", encoding="utf-8") as f:
    f.write(gov)
print("[OK] GovernmentCommandModules.jsx saved")

# ─── HospitalOpsModules.jsx ───────────────────────────────────────────────────
with open(f"{PROJECT}/client/src/components/HospitalOpsModules.jsx", "r", encoding="utf-8") as f:
    hosp = f.read()

# 1. Add import if not present
if "import { useEmergencyFeed }" not in hosp:
    hosp = hosp.replace(
        "import ReportDownloadButton from './ReportDownloadButton';",
        "import ReportDownloadButton from './ReportDownloadButton';\nimport { useEmergencyFeed } from '../hooks/useWebSocket';"
    )
    print("[OK] Added useEmergencyFeed import to HospitalOpsModules.jsx")

# 2. Inside HospitalLiveEmergencyFeed, add useEmergencyFeed hook + merge logic
# After the imagingForms useState line, add the hook
old_hosp_hook_insert = """    const [imagingForms, setImagingForms] = useState({});
    const [dispatchForms, setDispatchForms] = useState({});"""

new_hosp_hook_insert = """    const [imagingForms, setImagingForms] = useState({});

    // Real-time emergency feed via WebSocket
    const {
        feed: realtimeFeed,
        isConnected: wsConnected,
    } = useEmergencyFeed();

    // Merge WebSocket feed items into alerts
    useEffect(() => {
        if (realtimeFeed.length === 0) return;
        setAlerts((prev) => {
            const existingIds = new Set(prev.map((a) => a._id || a.id));
            const newItems = realtimeFeed.filter(
                (item) => !existingIds.has(item._id || item.id || item.alertId)
            );
            if (newItems.length === 0) return prev;
            return [...newItems, ...prev].slice(0, 50);
        });
    }, [realtimeFeed]);

    const [dispatchForms, setDispatchForms] = useState({});"""

if old_hosp_hook_insert in hosp:
    hosp = hosp.replace(old_hosp_hook_insert, new_hosp_hook_insert)
    print("[OK] Added useEmergencyFeed hook + merge logic to HospitalLiveEmergencyFeed")
else:
    print("[WARN] Could not find insertion point for useEmergencyFeed in HospitalLiveEmergencyFeed")

# 3. Replace the "Updated" timestamp with a live indicator in HospitalLiveEmergencyFeed
old_hosp_header = """                    <h3 className=\"text-lg font-bold text-gray-900\">Live Emergency Feed</h3>
                    <p className=\"text-sm text-gray-500\">Incoming SOS and triage updates.</p>
                </div>
                <span className=\"text-xs text-gray-400\">Updated {_nowLabel()}</span>"""

new_hosp_header = """                    <div className=\"flex items-center gap-2\">
                        <h3 className=\"text-lg font-bold text-gray-900\">Live Emergency Feed</h3>
                        <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                wsConnected
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                            }`}
                        >
                            <span
                                className={`inline-block h-2 w-2 rounded-full ${
                                    wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                                }`}
                            />
                            {wsConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>
                    <p className=\"text-sm text-gray-500\">Incoming SOS and triage updates.</p>
                </div>
                <span className=\"text-xs text-gray-400\">Updated {_nowLabel()}</span>"""

if old_hosp_header in hosp:
    hosp = hosp.replace(old_hosp_header, new_hosp_header)
    print("[OK] Added live indicator badge to HospitalLiveEmergencyFeed header")
else:
    print("[WARN] Could not find HospitalLiveEmergencyFeed header to replace")

with open(f"{PROJECT}/client/src/components/HospitalOpsModules.jsx", "w", encoding="utf-8") as f:
    f.write(hosp)
print("[OK] HospitalOpsModules.jsx saved")

print("\n[DONE] All components wired!")
