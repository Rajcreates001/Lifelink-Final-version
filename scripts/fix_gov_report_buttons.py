"""Fix remaining report button injections into GovernmentCommandModules.jsx."""

FILE = "client/src/components/GovernmentCommandModules.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

replacements = []

# ═══════════════════════════════════════════════════════════════
# 1. GovernmentLiveMonitoring
# ═══════════════════════════════════════════════════════════════
# Exact ending from repr: };\n\n  followed by export const GovernmentEVA
lm_old = (
    '            <SimpleBarChart title="Top Hospital Load" data={hospitalLoadData} barColorClass="bg-sky-500" />\n'
    '        </div>\n'
    '    );\n'
    '};\n'
    '\n'
    'export const GovernmentEVA'
)

lm_new = (
    '            <SimpleBarChart title="Top Hospital Load" data={hospitalLoadData} barColorClass="bg-sky-500" />\n'
    '\n'
    '            {/* Reports Section */}\n'
    '            <DashboardCard>\n'
    '                <div className="flex items-center justify-between mb-3">\n'
    '                    <div>\n'
    '                        <h3 className="text-lg font-bold text-slate-900">Download Reports</h3>\n'
    '                        <p className="text-sm text-slate-500">Export monitoring snapshot as PDF.</p>\n'
    '                    </div>\n'
    '                </div>\n'
    '                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">\n'
    '                    <ReportDownloadButton\n'
    '                        endpoint="/api/reports/government/incident"\n'
    '                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}\n'
    '                        filename="monitoring_incident_report.pdf"\n'
    '                        label="Incident Snapshot"\n'
    '                        variant="primary"\n'
    '                        size="sm"\n'
    '                        icon="fa-file-alt"\n'
    '                    />\n'
    '                    <ReportDownloadButton\n'
    '                        endpoint="/api/reports/government/resource"\n'
    '                        data={{ region: "National", report_date: new Date().toISOString().split("T")[0] }}\n'
    '                        filename="monitoring_resource_report.pdf"\n'
    '                        label="Resource Snapshot"\n'
    '                        variant="secondary"\n'
    '                        size="sm"\n'
    '                        icon="fa-boxes"\n'
    '                    />\n'
    '                </div>\n'
    '            </DashboardCard>\n'
    '        </div>\n'
    '    );\n'
    '};\n'
    '\n'
    'export const GovernmentEVA'
)

if lm_old in content:
    content = content.replace(lm_old, lm_new, 1)
    replacements.append("GovernmentLiveMonitoring")
    print("[OK] GovernmentLiveMonitoring")
else:
    print("[WARN] GovernmentLiveMonitoring pattern NOT matched")
    # Debug: find what's actually before GovernmentEVA
    eva_pos = content.find('export const GovernmentEVA')
    if eva_pos >= 0:
        debug = content[eva_pos-100:eva_pos]
        print("  Debug (last 100 chars before GovernmentEVA):")
        print(repr(debug))

# ═══════════════════════════════════════════════════════════════
# 2. GovernmentSimulationCenter after-action report
# ═══════════════════════════════════════════════════════════════
# From repr: title has mb-3 not mb-2 and different structure
sim_old = (
    '                            <h3 className="text-lg font-bold text-slate-900 mb-3">After-Action Report</h3>\n'
    '                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">\n'
    '                        <div>\n'
    '                            <p className="text-xs text-slate-500">Total Incidents</p>'
)

sim_new = (
    '                            <div className="flex items-center justify-between mb-2">\n'
    '                                <h3 className="text-lg font-bold text-slate-900 mb-0">After-Action Report</h3>\n'
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
    '                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">\n'
    '                        <div>\n'
    '                            <p className="text-xs text-slate-500">Total Incidents</p>'
)

if sim_old in content:
    content = content.replace(sim_old, sim_new, 1)
    replacements.append("GovernmentSimulationCenter")
    print("[OK] GovernmentSimulationCenter")
else:
    print("[WARN] GovernmentSimulationCenter pattern NOT matched")
    sim_pos = content.find('After-Action Report')
    if sim_pos >= 0:
        debug = content[sim_pos:sim_pos+200]
        print("  Debug (200 chars from 'After-Action Report'):")
        print(repr(debug))

# Write back
with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\n[DONE] Total: {len(replacements)} replacements")
for r in replacements:
    print(f"  + {r}")
