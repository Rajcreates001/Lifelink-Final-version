"""Fix GovernmentSimulationCenter after-action report download button."""

FILE = "client/src/components/GovernmentCommandModules.jsx"

with open(FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Exact pattern from the file (20 spaces indent)
sim_old = (
    '                    <h3 className="text-lg font-bold text-slate-900 mb-3">After-Action Report</h3>\n'
    '                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">\n'
    '                        <'
)

sim_new = (
    '                    <div className="flex items-center justify-between mb-2">\n'
    '                        <h3 className="text-lg font-bold text-slate-900 mb-0">After-Action Report</h3>\n'
    '                        <ReportDownloadButton\n'
    '                            endpoint="/api/reports/simulation/after-action"\n'
    '                            data={{ summary: afterAction.summary, recommendations: afterAction.recommendations }}\n'
    '                            filename="simulation_after_action_report.pdf"\n'
    '                            label="Download PDF"\n'
    '                            variant="danger"\n'
    '                            size="sm"\n'
    '                            icon="fa-file-pdf"\n'
    '                        />\n'
    '                    </div>\n'
    '                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">\n'
    '                        <'
)

if sim_old in content:
    content = content.replace(sim_old, sim_new, 1)
    print("[OK] GovernmentSimulationCenter after-action report button added!")
else:
    print("[WARN] Pattern still not matched!")
    # Additional debug
    pos = content.find('After-Action Report</h3>')
    if pos >= 0:
        # Show 30 chars before
        print("  Before:", repr(content[pos-30:pos]))

with open(FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("Done.")
