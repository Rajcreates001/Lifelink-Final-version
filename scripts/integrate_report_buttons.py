"""
Integrate ReportDownloadButton into Hospital & Government dashboard modules.
Runs in-place on the source files.
"""
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# -- 1. HospitalOpsModules.jsx -----------------------------------------
hospital_file = r"D:\Black folder\Projects\Major Project\LifeLink-MERN-v4\client\src\components\HospitalOpsModules.jsx"

with open(hospital_file, "r", encoding="utf-8") as f:
    content = f.read()

# Add import after the recharts import
if "import ReportDownloadButton from './ReportDownloadButton';" not in content:
    content = content.replace(
        "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';",
        "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';\nimport ReportDownloadButton from './ReportDownloadButton';",
        1
    )

# Add PDF Reports card right before the first "Reports Center" DashboardCard
pdf_card_marker = """            <DashboardCard>
                <h3 className=\"text-lg font-bold text-gray-900 mb-4\">Reports Center</h3>"""

pdf_card_new = """            {/* PDF Report Generation */}
            <DashboardCard>
                <div className=\"flex items-center justify-between mb-4\">
                    <div>
                        <h3 className=\"text-lg font-bold text-gray-900\">PDF Reports</h3>
                        <p className=\"text-sm text-gray-500\">Generate professional PDF reports with full formatting.</p>
                    </div>
                </div>
                <div className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3\">
                    <ReportDownloadButton
                        endpoint=\"/api/reports/hospital/daily-ops\"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`daily_ops_${hospitalId}.pdf`}
                        label=\"Daily Operations\"
                        variant=\"primary\"
                        size=\"sm\"
                        icon=\"fa-calendar-day\"
                    />
                    <ReportDownloadButton
                        endpoint=\"/api/reports/hospital/financial\"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`financial_report_${hospitalId}.pdf`}
                        label=\"Financial Report\"
                        variant=\"secondary\"
                        size=\"sm\"
                        icon=\"fa-chart-line\"
                    />
                    <ReportDownloadButton
                        endpoint=\"/api/reports/hospital/compliance\"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`compliance_${hospitalId}.pdf`}
                        label=\"Compliance\"
                        variant=\"secondary\"
                        size=\"sm\"
                        icon=\"fa-shield-alt\"
                    />
                    <ReportDownloadButton
                        endpoint=\"/api/reports/hospital/incident\"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`incident_report_${hospitalId}.pdf`}
                        label=\"Incident Report\"
                        variant=\"danger\"
                        size=\"sm\"
                        icon=\"fa-exclamation-triangle\"
                    />
                    <ReportDownloadButton
                        endpoint=\"/api/reports/hospital/resource\"
                        data={{ hospital_id: hospitalId, report_date: new Date().toISOString().split('T')[0] }}
                        filename={`resource_report_${hospitalId}.pdf`}
                        label=\"Resource Usage\"
                        variant=\"secondary\"
                        size=\"sm\"
                        icon=\"fa-boxes\"
                    />
                </div>
            </DashboardCard>

            <DashboardCard>
                <h3 className=\"text-lg font-bold text-gray-900 mb-4\">Reports Center</h3>"""

if pdf_card_new not in content:
    content = content.replace(pdf_card_marker, pdf_card_new, 1)

with open(hospital_file, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] HospitalOpsModules.jsx updated")

# -- 2. GovernmentCommandModules.jsx -----------------------------------
gov_file = r"D:\Black folder\Projects\Major Project\LifeLink-MERN-v4\client\src\components\GovernmentCommandModules.jsx"

with open(gov_file, "r", encoding="utf-8") as f:
    content = f.read()

# Add import right after reactflow import
if "import ReportDownloadButton from './ReportDownloadButton';" not in content:
    content = content.replace(
        "import { useDataMode } from '../context/DataModeContext';",
        "import { useDataMode } from '../context/DataModeContext';\nimport ReportDownloadButton from './ReportDownloadButton';",
        1
    )

# Add report button to the GovernmentLiveMonitoring header
live_marker_old = """                            <button
                        className="px-3 py-2 text-xs font-bold bg-slate-300 text-slate-600 rounded cursor-not-allowed"
                        disabled
                        title="Live refresh paused"
                    >
                        Refresh paused
                    </button>"""

live_marker_new = """                            <ReportDownloadButton
                                endpoint="/api/reports/government/monitoring"
                                data={{
                                    region: 'default',
                                    report_date: new Date().toISOString().split('T')[0],
                                    active_emergencies: summary?.active_emergencies || 0,
                                    avg_response_minutes: summary?.avg_response_minutes || 0,
                                    resource_utilization: summary?.resource_utilization || 0,
                                }}
                                filename={`gov_monitoring_${new Date().toISOString().split('T')[0]}.pdf`}
                                label="Download Report"
                                variant="primary"
                                size="sm"
                                icon="fa-file-pdf"
                            />
                            <button
                                className="px-3 py-2 text-xs font-bold bg-slate-300 text-slate-600 rounded cursor-not-allowed"
                                disabled
                                title="Live refresh paused"
                            >
                                Refresh paused
                            </button>"""

if live_marker_new not in content:
    content = content.replace(live_marker_old, live_marker_new, 1)

with open(gov_file, "w", encoding="utf-8") as f:
    f.write(content)

print("[OK] GovernmentCommandModules.jsx updated")
print("[DONE] All integrations complete!")
