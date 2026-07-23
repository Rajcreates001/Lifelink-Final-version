"""Inject ReportDownloadButton instances into GovernmentCommandModules.jsx components.
This script uses byte-exact string matching to find and replace component endings."""

FILE = "client/src/components/GovernmentCommandModules.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# ═══════════════════════════════════════════════════════════════
# 1. GovernmentCommandCenter ending pattern
# ═══════════════════════════════════════════════════════════════
cc_old = (
    '                </DashboardCard>\n'
    '            </div>\n'
    '        </div>\n'
    '    );\n'
    '};\n'
    '\n'
    'export const GovernmentLiveMonitoring'
)

cc_new = (
    '                </DashboardCard>\n'
    '            </div>\n'
    '\n'
    '            {/* Reports Section */}\n'
    '            <DashboardCard>\n'
    '                <div className="flex items-center justify-between mb-3">\n'
    '                    <div>\n'
    '                        <h3 className="text-lg font-bold text-slate-900">Download Reports</h3>\n'
    '                        <p className="text-sm text-slate-500">Generate and download PDF reports.</p>\n'
    '                    </div>\n'
    '                </div>\n'
    '                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">\n'
    '                    <ReportDownloadButton\n'
    '                        endpoint="/api/reports/government/incident"\n'
    '                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}\n'
    '                        filename="gov_incident_report.pdf"\n'
    '                        label="Incident Report"\n'
    '                        variant="primary"\n'
    '                        size="sm"\n'
    '                        icon="fa-file-alt"\n'
    '                    />\n'
    '                    <ReportDownloadButton\n'
    '                        endpoint="/api/reports/government/resource"\n'
    '                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}\n'
    '                        filename="gov_resource_report.pdf"\n'
    '                        label="Resource Report"\n'
    '                        variant="secondary"\n'
    '                        size="sm"\n'
    '                        icon="fa-boxes"\n'
    '                    />\n'
    '                    <ReportDownloadButton\n'
    '                        endpoint="/api/reports/simulation/after-action"\n'
    '                        data={{ summary: { total: 0 }, recommendations: [] }}\n'
    '                        filename="gov_simulation_report.pdf"\n'
    '                        label="Simulation Report"\n'
    '                        variant="secondary"\n'
    '                        size="sm"\n'
    '                        icon="fa-atom"\n'
    '                    />\n'
    '                    <ReportDownloadButton\n'
    '                        endpoint="/api/reports/hospital/daily-ops"\n'
    '                        data={{ hospital_id: "national", report_date: new Date().toISOString().split("T")[0] }}\n'
    '                        filename="gov_daily_ops_report.pdf"\n'
    '                        label="Daily Ops"\n'
    '                        variant="ghost"\n'
    '                        size="sm"\n'
    '                        icon="fa-calendar-day"\n'
    '                    />\n'
    '                </div>\n'
    '            </DashboardCard>\n'
    '        </div>\n'
    '    );\n'
    '};\n'
    '\n'
    'export const GovernmentLiveMonitoring'
)

if cc_old in content:
    content = content.replace(cc_old, cc_new, 1)
    replacements.append("GovernmentCommandCenter")
    print("[OK] GovernmentCommandCenter")
else:
    print("[WARN] GovernmentCommandCenter: NOT found")

# ═══════════════════════════════════════════════════════════════
# 2. GovernmentLiveMonitoring ending pattern
# ═══════════════════════════════════════════════════════════════
lm_old = (
    "            <SimpleBarChart title=\"Top Hospital Load\" data={hospitalLoadData} barColorClass=\"bg-sky-500\" />\n"
    "        </div>\n"
    "    );\n"
    "};\n"
    "\n"
    "\n"
    "export const GovernmentEVA"
)

lm_new = (
    "            <SimpleBarChart title=\"Top Hospital Load\" data={hospitalLoadData} barColorClass=\"bg-sky-500\" />\n"
    "\n"
    "            {/* Reports Section */}\n"
    "            <DashboardCard>\n"
    "                <div className=\"flex items-center justify-between mb-3\">\n"
    "                    <div>\n"
    "                        <h3 className=\"text-lg font-bold text-slate-900\">Download Reports</h3>\n"
    "                        <p className=\"text-sm text-slate-500\">Export monitoring snapshot as PDF.</p>\n"
    "                    </div>\n"
    "                </div>\n"
    "                <div className=\"grid grid-cols-1 sm:grid-cols-2 gap-3\">\n"
    "                    <ReportDownloadButton\n"
    '                        endpoint="/api/reports/government/incident"\n'
    '                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}\n'
    "                        filename=\"monitoring_incident_report.pdf\"\n"
    "                        label=\"Incident Snapshot\"\n"
    "                        variant=\"primary\"\n"
    "                        size=\"sm\"\n"
    "                        icon=\"fa-file-alt\"\n"
    "                    />\n"
    "                    <ReportDownloadButton\n"
    '                        endpoint="/api/reports/government/resource"\n'
    '                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}\n'
    "                        filename=\"monitoring_resource_report.pdf\"\n"
    "                        label=\"Resource Snapshot\"\n"
    "                        variant=\"secondary\"\n"
    "                        size=\"sm\"\n"
    "                        icon=\"fa-boxes\"\n"
    "                    />\n"
    "                </div>\n"
    "            </DashboardCard>\n"
    "        </div>\n"
    "    );\n"
    "};\n"
    "\n"
    "\n"
    "export const GovernmentEVA"
)

if lm_old in content:
    content = content.replace(lm_old, lm_new, 1)
    replacements.append("GovernmentLiveMonitoring")
    print("[OK] GovernmentLiveMonitoring")
else:
    print("[WARN] GovernmentLiveMonitoring: NOT found")

# ═══════════════════════════════════════════════════════════════
# 3. GovernmentSimulationCenter — add download button to after-action card
# ═══════════════════════════════════════════════════════════════
sim_old = (
    '                    {afterAction && (\n'
    '                        <DashboardCard>\n'
    '                            <h3 className="text-lg font-bold text-slate-900 mb-2">After-Action Report</h3>\n'
    '                            <div className="space-y-2 text-sm text-slate-600">\n'
    '                                <p>Total incidents: <span className="font-semibold">{afterAction.summary?.total || 0}</span></p>\n'
    '                                <p>Critical: <span className="font-semibold text-red-600">{afterAction.summary?.critical || 0}</span></p>\n'
    '                                <p>Response gap: <span className="font-semibold">{afterAction.summary?.response_gap_minutes || 0} min</span></p>'
)

sim_new = (
    '                    {afterAction && (\n'
    '                        <DashboardCard>\n'
    '                            <div className="flex items-center justify-between mb-3">\n'
    '                                <h3 className="text-lg font-bold text-slate-900 mb-2">After-Action Report</h3>\n'
    '                                <ReportDownloadButton\n'
    '                                    endpoint="/api/reports/simulation/after-action"\n'
    '                                    data={{ summary: afterAction.summary, recommendations: afterAction.recommendations }}\n'
    '                                    filename="simulation_after_action_report.pdf"\n'
    '                                    label="Download PDF"\n'
    '                                    variant="danger"\n'
    '                                    size="sm"\n'
    '                                    icon="fa-file-pdf"\n'
    '                                />\n'
    '                            </div>\n'
    '                            <div className="space-y-2 text-sm text-slate-600">\n'
    '                                <p>Total incidents: <span className="font-semibold">{afterAction.summary?.total || 0}</span></p>\n'
    '                                <p>Critical: <span className="font-semibold text-red-600">{afterAction.summary?.critical || 0}</span></p>\n'
    '                                <p>Response gap: <span className="font-semibold">{afterAction.summary?.response_gap_minutes || 0} min</span></p>'
)

if sim_old in content:
    content = content.replace(sim_old, sim_new, 1)
    replacements.append("GovernmentSimulationCenter")
    print("[OK] GovernmentSimulationCenter")
else:
    print("[WARN] GovernmentSimulationCenter: NOT found")

# ═══════════════════════════════════════════════════════════════
# Write back
# ═══════════════════════════════════════════════════════════════
with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n[DONE] Total replacements: {len(replacements)}")
if replacements:
    print("Modified:", ", ".join(replacements))
