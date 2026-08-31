"""
LifeLink Report Generator — PDF Report Service

Generates professional PDF reports using WeasyPrint:
- Hospital Daily Ops Report
- Hospital Financial Report
- Hospital Compliance Report
- Government Incident Report
- Government Resource Report
- Government Audit Report

Usage:
    report = ReportGenerator()
    pdf_bytes = report.generate_hospital_daily_ops(hospital_data)
"""

import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger("lifelink.reports")

# Optional import — gracefully handle missing native DLLs on Windows
try:
    from weasyprint import HTML
    HAS_WEASYPRINT = True
except (ImportError, OSError) as exc:
    HAS_WEASYPRINT = False
    logger.warning("WeasyPrint not available (%s). PDF reports will show a fallback message.", exc)


class ReportGenerator:
    """Generate PDF reports using WeasyPrint from HTML templates."""

    def __init__(self) -> None:
        self.now = datetime.utcnow()

    # ── HTML Templates ──────────────────────────────────────────

    def _base_html(self, title: str, content: str) -> str:
        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
    @page {{
        size: A4;
        margin: 2cm 1.5cm;
        @top-center {{ content: "{title}"; font-size: 10px; color: #666; }}
        @bottom-center {{ content: "Page " counter(page) " of " counter(pages); font-size: 9px; color: #999; }}
    }}
    body {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1e293b; line-height: 1.5; }}
    h1 {{ font-size: 22px; color: #0f172a; border-bottom: 3px solid #2563eb; padding-bottom: 8px; margin-top: 0; }}
    h2 {{ font-size: 16px; color: #1e40af; margin-top: 24px; margin-bottom: 8px; }}
    h3 {{ font-size: 13px; color: #334155; margin-top: 16px; margin-bottom: 6px; }}
    .header {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }}
    .header-left h1 {{ border: none; margin: 0; }}
    .header-right {{ text-align: right; font-size: 10px; color: #64748b; }}
    .stats-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 16px 0; }}
    .stat-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; }}
    .stat-card .label {{ font-size: 9px; text-transform: uppercase; color: #64748b; letter-spacing: 1px; }}
    .stat-card .value {{ font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; }}
    table {{ width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10px; }}
    th {{ background: #1e40af; color: white; padding: 8px 10px; text-align: left; font-weight: 600; }}
    td {{ padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }}
    tr:nth-child(even) td {{ background: #f8fafc; }}
    .badge {{ display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; }}
    .badge-green {{ background: #dcfce7; color: #166534; }}
    .badge-red {{ background: #fee2e2; color: #991b1b; }}
    .badge-yellow {{ background: #fef9c3; color: #854d0e; }}
    .badge-blue {{ background: #dbeafe; color: #1e40af; }}
    .section {{ margin: 20px 0; padding: 0; }}
    .footer {{ margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #94a3b8; text-align: center; }}
    .meta {{ display: flex; gap: 20px; font-size: 10px; color: #64748b; margin-bottom: 16px; }}
    .meta span {{ background: #f1f5f9; padding: 4px 10px; border-radius: 4px; }}
    .kpi-row {{ display: flex; gap: 8px; margin: 8px 0; }}
    .kpi-item {{ flex: 1; background: #f1f5f9; border-radius: 6px; padding: 8px; text-align: center; }}
    .kpi-item .kpi-label {{ font-size: 8px; text-transform: uppercase; color: #64748b; }}
    .kpi-item .kpi-value {{ font-size: 14px; font-weight: 700; color: #0f172a; }}
</style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>🏥 LifeLink {title}</h1>
        </div>
        <div class="header-right">
            <p>Generated: {self.now.strftime('%B %d, %Y at %H:%M')}</p>
            <p>LifeLink Emergency Response System v1.0</p>
        </div>
    </div>
    {content}
    <div class="footer">
        <p>LifeLink — Smart Emergency Response and Coordination System</p>
        <p>This report was automatically generated. For questions, contact your system administrator.</p>
    </div>
</body>
</html>"""

    # ── Hospital Reports ─────────────────────────────────────────

    def generate_hospital_daily_ops(self, data: dict[str, Any]) -> bytes | None:
        """Generate Daily Operations Report PDF for a hospital."""
        if not HAS_WEASYPRINT:
            return self._error_no_weasyprint()

        beds = data.get("beds", {})
        patients = data.get("patients", {})
        staff = data.get("staff", {})
        revenue = data.get("revenue", {})
        emergency = data.get("emergency", {})
        departments = data.get("departments", [])

        dept_rows = "".join(
            f"<tr><td>{d.get('name', 'N/A')}</td>"
            f"<td>{d.get('patients', 0)}</td>"
            f"<td>{d.get('avgTreatmentMinutes', 0)} min</td>"
            f"<td>{d.get('dischargeRate', 0)}%</td>"
            f"<td><span class='badge {'badge-green' if d.get('score', 0) > 75 else 'badge-yellow'}'>"
            f"{d.get('score', 0)}</span></td></tr>"
            for d in departments[:20]
        )

        content = f"""
        <div class="meta">
            <span>🏛️ {data.get('hospital_name', 'Hospital')}</span>
            <span>📋 Daily Operations Summary</span>
            <span>📅 {self.now.strftime('%Y-%m-%d')}</span>
        </div>

        <h2>📊 Key Metrics</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Patients</div>
                <div class="value">{patients.get('total', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Bed Occupancy</div>
                <div class="value">{beds.get('occupied', 0)}/{beds.get('total', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Available Beds</div>
                <div class="value" style="color: {'#16a34a' if beds.get('available', 0) > 20 else '#dc2626'}">
                    {beds.get('available', 0)}
                </div>
            </div>
            <div class="stat-card">
                <div class="label">Staff Available</div>
                <div class="value">{staff.get('available', 0)}/{staff.get('total', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Active Emergencies</div>
                <div class="value" style="color: #dc2626">{emergency.get('active', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Daily Revenue</div>
                <div class="value">₹{revenue.get('daily', 0):,}</div>
            </div>
        </div>

        <h2>🏥 Bed Breakdown</h2>
        <div class="kpi-row">
            <div class="kpi-item"><div class="kpi-label">ICU</div><div class="kpi-value">{beds.get('icu', {}).get('occupied', 0)}/{beds.get('icu', {}).get('total', 0)}</div></div>
            <div class="kpi-item"><div class="kpi-label">Emergency</div><div class="kpi-value">{beds.get('emergency', {}).get('occupied', 0)}/{beds.get('emergency', {}).get('total', 0)}</div></div>
            <div class="kpi-item"><div class="kpi-label">General</div><div class="kpi-value">{beds.get('general', {}).get('occupied', 0)}/{beds.get('general', {}).get('total', 0)}</div></div>
        </div>

        <h2>📋 Department Performance</h2>
        <table>
            <tr><th>Department</th><th>Patients</th><th>Avg Time</th><th>Discharge Rate</th><th>Score</th></tr>
            {dept_rows if dept_rows else '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No department data available</td></tr>'}
        </table>

        <h2>⚠️ Emergency Activity</h2>
        <div class="kpi-row">
            <div class="kpi-item"><div class="kpi-label">Active</div><div class="kpi-value" style="color:#dc2626">{emergency.get('active', 0)}</div></div>
            <div class="kpi-item"><div class="kpi-label">Critical</div><div class="kpi-value" style="color:#dc2626">{emergency.get('critical', 0)}</div></div>
            <div class="kpi-item"><div class="kpi-label">Ambulance In</div><div class="kpi-value">{data.get('ambulance', {}).get('inbound', 0)}</div></div>
            <div class="kpi-item"><div class="kpi-label">Ambulance Out</div><div class="kpi-value">{data.get('ambulance', {}).get('outbound', 0)}</div></div>
        </div>
        """

        html = self._base_html("Hospital Daily Operations Report", content)
        return HTML(string=html).write_pdf()

    def generate_hospital_financial(self, data: dict[str, Any]) -> bytes | None:
        """Generate Financial Report PDF."""
        if not HAS_WEASYPRINT:
            return self._error_no_weasyprint()

        revenue = data.get("totalRevenue", 0)
        expenses = data.get("totalExpenses", 0)
        profit = data.get("profit", 0)
        margin = round((profit / revenue * 100), 1) if revenue else 0

        dept_breakdown = data.get("departmentBreakdown", [])
        dept_rows = "".join(
            f"<tr><td>{d.get('department', 'N/A')}</td><td>₹{d.get('amount', 0):,}</td></tr>"
            for d in dept_breakdown[:10]
        )

        expense_rows = "".join(
            f"<tr><td>{e.get('category', 'N/A')}</td><td>₹{e.get('amount', 0):,}</td>"
            f"<td>{round(e.get('amount', 0) / expenses * 100, 1) if expenses else 0}%</td></tr>"
            for e in data.get("expenseBreakdown", [])
        )

        content = f"""
        <div class="meta">
            <span>🏛️ {data.get('hospital_name', 'Hospital')}</span>
            <span>💰 Financial Report</span>
            <span>📅 {self.now.strftime('%B %Y')}</span>
        </div>

        <h2>📊 Financial Summary</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Revenue</div>
                <div class="value" style="color:#16a34a">₹{revenue:,}</div>
            </div>
            <div class="stat-card">
                <div class="label">Total Expenses</div>
                <div class="value" style="color:#dc2626">₹{expenses:,}</div>
            </div>
            <div class="stat-card">
                <div class="label">Net Profit</div>
                <div class="value" style="color:{'#16a34a' if profit >= 0 else '#dc2626'}">₹{profit:,}</div>
            </div>
            <div class="stat-card">
                <div class="label">Profit Margin</div>
                <div class="value">{margin}%</div>
            </div>
            <div class="stat-card">
                <div class="label">Payer Delay</div>
                <div class="value">{data.get('payerDelayDays', 0)} days</div>
            </div>
            <div class="stat-card">
                <div class="label">Delinquent Payers</div>
                <div class="value" style="color:#dc2626">{data.get('delinquentPayers', 0)}</div>
            </div>
        </div>

        <h2>💰 Revenue by Department</h2>
        <table>
            <tr><th>Department</th><th>Revenue</th></tr>
            {dept_rows if dept_rows else '<tr><td colspan="2" style="text-align:center;color:#94a3b8;">No data</td></tr>'}
        </table>

        <h2>📉 Expense Breakdown</h2>
        <table>
            <tr><th>Category</th><th>Amount</th><th>% of Total</th></tr>
            {expense_rows if expense_rows else '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No data</td></tr>'}
        </table>

        <h2>🚨 Fraud Alerts</h2>
        <ul>
            {"".join(f'<li style="color:#dc2626;font-size:10px;">⚠️ {alert}</li>' for alert in data.get('fraudAlerts', [])) or '<li style="color:#16a34a;">✅ No fraud alerts</li>'}
        </ul>
        """

        html = self._base_html("Hospital Financial Report", content)
        return HTML(string=html).write_pdf()

    def generate_hospital_compliance(self, data: dict[str, Any]) -> bytes | None:
        """Generate Compliance Report PDF."""
        if not HAS_WEASYPRINT:
            return self._error_no_weasyprint()

        items = data.get("compliance_items", [])
        passed = sum(1 for i in items if i.get("status") == "pass")
        failed = sum(1 for i in items if i.get("status") == "fail")

        rows = "".join(
            f"<tr><td>{item.get('category', 'N/A')}</td>"
            f"<td>{item.get('metric', 'N/A')}</td>"
            f"<td><span class='badge {'badge-green' if item.get('status') == 'pass' else 'badge-red'}'>{item.get('status', 'unknown')}</span></td>"
            f"<td>{item.get('details', '-')}</td></tr>"
            for item in items[:30]
        )

        content = f"""
        <div class="meta">
            <span>🏛️ {data.get('hospital_name', 'Hospital')}</span>
            <span>📋 Compliance Report</span>
            <span>📅 Q{self.now.month // 4 + 1} {self.now.year}</span>
        </div>

        <h2>📊 Compliance Summary</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Checks</div>
                <div class="value">{len(items)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Passed</div>
                <div class="value" style="color:#16a34a">{passed}</div>
            </div>
            <div class="stat-card">
                <div class="label">Failed</div>
                <div class="value" style="color:#dc2626">{failed}</div>
            </div>
            <div class="stat-card">
                <div class="label">Compliance Rate</div>
                <div class="value">{round(passed / len(items) * 100, 1) if items else 100}%</div>
            </div>
        </div>

        <h2>📋 Compliance Checklist</h2>
        <table>
            <tr><th>Category</th><th>Metric</th><th>Status</th><th>Details</th></tr>
            {rows if rows else '<tr><td colspan="4" style="text-align:center;color:#94a3b8;">No compliance data</td></tr>'}
        </table>
        """

        html = self._base_html("Hospital Compliance Report", content)
        return HTML(string=html).write_pdf()

    # ── Government Reports ───────────────────────────────────────

    def generate_government_incident(self, data: dict[str, Any]) -> bytes | None:
        """Generate Government Incident Report PDF."""
        if not HAS_WEASYPRINT:
            return self._error_no_weasyprint()

        incidents = data.get("incidents", [])
        severity_counts = {}
        for inc in incidents:
            sev = inc.get("severity", "unknown")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        sev_rows = "".join(
            f"<tr><td>{sev}</td><td>{count}</td>"
            f"<td><div style='height:12px;background:#e2e8f0;border-radius:6px;'>"
            f"<div style='height:12px;width:{count/max(len(incidents),1)*100}%;"
            f"background:#2563eb;border-radius:6px;'></div></div></td></tr>"
            for sev, count in sorted(severity_counts.items())
        )

        recent_rows = "".join(
            f"<tr><td>{inc.get('id', 'N/A')}</td>"
            f"<td>{inc.get('type', 'N/A')}</td>"
            f"<td><span class='badge {'badge-red' if inc.get('severity') in ('Critical','High') else 'badge-yellow'}'>{inc.get('severity', 'N/A')}</span></td>"
            f"<td>{inc.get('location', {}).get('area', 'N/A')}</td>"
            f"<td>{inc.get('responders', 'N/A')}</td></tr>"
            for inc in incidents[:20]
        )

        content = f"""
        <div class="meta">
            <span>🏛️ {data.get('region', 'National')} Command Center</span>
            <span>🚨 Incident Report</span>
            <span>📅 {self.now.strftime('%Y-%m-%d')}</span>
        </div>

        <h2>📊 Overview</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Incidents</div>
                <div class="value">{len(incidents)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Active Emergencies</div>
                <div class="value" style="color:#dc2626">{data.get('active_emergencies', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Avg Response</div>
                <div class="value">{data.get('avg_response_minutes', 0)} min</div>
            </div>
            <div class="stat-card">
                <div class="label">Resource Utilization</div>
                <div class="value">{data.get('resource_utilization', 0)}%</div>
            </div>
        </div>

        <h2>📊 Severity Distribution</h2>
        <table>
            <tr><th>Severity</th><th>Count</th><th>Distribution</th></tr>
            {sev_rows if sev_rows else '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No data</td></tr>'}
        </table>

        <h2>📋 Recent Incidents</h2>
        <table>
            <tr><th>ID</th><th>Type</th><th>Severity</th><th>Location</th><th>Responders</th></tr>
            {recent_rows if recent_rows else '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No incidents reported</td></tr>'}
        </table>
        """

        html = self._base_html("Government Incident Report", content)
        return HTML(string=html).write_pdf()

    def generate_government_resource(self, data: dict[str, Any]) -> bytes | None:
        """Generate Government Resource Report PDF."""
        if not HAS_WEASYPRINT:
            return self._error_no_weasyprint()

        hospitals = data.get("hospitals", [])
        ambulances = data.get("ambulances", [])

        hosp_rows = "".join(
            f"<tr><td>{h.get('name', 'N/A')}</td>"
            f"<td>{h.get('city', 'N/A')}</td>"
            f"<td>{h.get('beds_total', 0)}</td>"
            f"<td><span class='badge {'badge-red' if h.get('beds_available', 0) < 20 else 'badge-green'}'>{h.get('beds_available', 0)}</span></td>"
            f"<td>{h.get('load_score', 0)}</td></tr>"
            for h in hospitals[:30]
        )

        amb_rows = "".join(
            f"<tr><td>{a.get('code', 'N/A')}</td>"
            f"<td><span class='badge {'badge-green' if a.get('status') == 'available' else 'badge-yellow'}'>{a.get('status', 'N/A')}</span></td>"
            f"<td>{'✅' if a.get('verified') else '❌'}</td></tr>"
            for a in ambulances[:30]
        )

        content = f"""
        <div class="meta">
            <span>🏛️ {data.get('region', 'National')} Resource Management</span>
            <span>📦 Resource Report</span>
            <span>📅 {self.now.strftime('%Y-%m-%d')}</span>
        </div>

        <h2>📊 Resource Summary</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Hospitals</div>
                <div class="value">{len(hospitals)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Total Ambulances</div>
                <div class="value">{len(ambulances)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Available Ambulances</div>
                <div class="value">{sum(1 for a in ambulances if a.get('status') == 'available')}</div>
            </div>
        </div>

        <h2>🏥 Hospital Resources</h2>
        <table>
            <tr><th>Name</th><th>City</th><th>Total Beds</th><th>Available</th><th>Load</th></tr>
            {hosp_rows if hosp_rows else '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">No hospital data</td></tr>'}
        </table>

        <h2>🚑 Ambulance Fleet</h2>
        <table>
            <tr><th>Code</th><th>Status</th><th>Verified</th></tr>
            {amb_rows if amb_rows else '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No ambulance data</td></tr>'}
        </table>
        """

        html = self._base_html("Government Resource Report", content)
        return HTML(string=html).write_pdf()

    # ── Simulation After-Action Report ───────────────────────────

    def generate_simulation_report(self, data: dict[str, Any]) -> bytes | None:
        """Generate Simulation After-Action Report PDF."""
        if not HAS_WEASYPRINT:
            return self._error_no_weasyprint()

        summary = data.get("summary", {})
        recommendations = data.get("recommendations", [])

        rec_items = "".join(
            f'<li style="margin:6px 0;padding:8px;background:#f8fafc;border-radius:6px;'
            f'border-left:3px solid #2563eb;font-size:11px;">✅ {rec}</li>'
            for rec in recommendations[:10]
        )

        metrics = data.get("metrics", {})

        content = f"""
        <div class="meta">
            <span>🎯 Simulation Session</span>
            <span>📋 After-Action Report</span>
            <span>📅 {self.now.strftime('%Y-%m-%d %H:%M')}</span>
        </div>

        <h2>📊 Simulation Summary</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Incidents</div>
                <div class="value">{summary.get('total', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Critical</div>
                <div class="value" style="color:#dc2626">{summary.get('critical', 0)}</div>
            </div>
            <div class="stat-card">
                <div class="label">Response Gap</div>
                <div class="value" style="color:#dc2626">{summary.get('response_gap_minutes', 0)} min</div>
            </div>
            <div class="stat-card">
                <div class="label">Avg Response</div>
                <div class="value">{metrics.get('avg_response_time', 0)} min</div>
            </div>
            <div class="stat-card">
                <div class="label">Mortality Rate</div>
                <div class="value" style="color:#dc2626">{metrics.get('mortality_rate', 0)}%</div>
            </div>
            <div class="stat-card">
                <div class="label">Bed Utilization</div>
                <div class="value">{metrics.get('bed_utilization', 0)}%</div>
            </div>
        </div>

        <h2>📈 Performance Metrics</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Average Response Time</td><td>{metrics.get('avg_response_time', 'N/A')} min</td></tr>
            <tr><td>Max Response Time</td><td>{metrics.get('max_response_time', 'N/A')} min</td></tr>
            <tr><td>Min Response Time</td><td>{metrics.get('min_response_time', 'N/A')} min</td></tr>
            <tr><td>Patients Transported</td><td>{metrics.get('patients_transported', 0)}</td></tr>
            <tr><td>Beds Used at Peak</td><td>{metrics.get('beds_at_peak', 0)}</td></tr>
            <tr><td>Critical Patients</td><td style="color:#dc2626">{summary.get('critical', 0)}</td></tr>
        </table>

        <h2>💡 Recommendations</h2>
        <ul style="list-style:none;padding:0;">
            {rec_items if rec_items else '<li style="color:#94a3b8;">No recommendations generated.</li>'}
        </ul>
        """

        html = self._base_html("Simulation After-Action Report", content)
        return HTML(string=html).write_pdf()

    # ── Helper ───────────────────────────────────────────────────

    def _error_no_weasyprint(self) -> bytes:
        logger.error("WeasyPrint is not installed")
        msg = b"No report generated: WeasyPrint library is not installed. Run: pip install weasyprint"
        return msg
