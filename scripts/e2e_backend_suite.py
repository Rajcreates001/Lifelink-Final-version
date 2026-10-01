"""LifeLink backend e2e suite — exercises every public-module data path live."""
import requests, io, json, time, sys

BASE = "http://localhost:3001"
results = []

def check(name, cond, extra=""):
    results.append((name, bool(cond), extra))
    print(f"{'PASS' if cond else 'FAIL'}  {name}" + (f"   [{extra}]" if extra and not cond else ""))

def extract_text_pdf():
    """Hand-craft a minimal valid PDF containing real text (extractable via pypdf)."""
    lines = ["Lab Report", "Patient: 45F", "BP 148/95 mmHg", "Glucose 156 mg/dL", "Hemoglobin 10.2 g/dL"]
    content = "BT /F1 12 Tf 50 750 Td 14 TL\n" + "\n".join(
        f"({ln}) Tj T*" for ln in lines) + "\nET"
    objs = []
    objs.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objs.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objs.append(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>")
    objs.append(b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content.encode("latin-1") + b"\nendstream")
    objs.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    out = io.BytesIO(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objs, start=1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode() + body + b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode())
    for off in offsets:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return out.getvalue()

def ocr_png():
    """PNG containing readable lab text for tesseract."""
    try:
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new("RGB", (700, 260), "white")
        d = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 34)
        except Exception:
            font = ImageFont.load_default()
        d.text((30, 30), "Lab Report Patient: 45F", fill="black", font=font)
        d.text((30, 100), "BP 148/95 mmHg", fill="black", font=font)
        d.text((30, 170), "Glucose 156 mg/dL", fill="black", font=font)
        buf = io.BytesIO(); img.save(buf, format="PNG")
        return buf.getvalue()
    except Exception as e:
        print(f"  (pillow unavailable: {e})")
        return None

# ── 1. Health & readiness ────────────────────────────────────────────
r = requests.get(f"{BASE}/api/health", timeout=10)
check("GET /api/health -> 200", r.status_code == 200, f"{r.status_code}")
r = requests.get(f"{BASE}/api/health/ready", timeout=10)
check("GET /api/health/ready -> 200", r.status_code == 200, f"{r.status_code}")

# ── 2. Auth: login via the client's real path ────────────────────────
r = requests.post(f"{BASE}/v2/auth/login", json={
    "email": "public.001@lifelink.demo", "password": "Demo@2026!", "role": "public"
}, timeout=15)
check("POST /v2/auth/login (demo public user) -> 200", r.status_code == 200, f"{r.status_code} {r.text[:150]}")
body = {}
try: body = r.json() or {}
except Exception: pass
tok = body.get("token", "")
u = body.get("user") or {}
uid = u.get("id") or u.get("_id") or u.get("userId") or ""
H = {"Authorization": f"Bearer {tok}"} if tok else {}
check("login returned token + user id", bool(tok) and bool(uid), f"tok={bool(tok)} uid={uid} keys={list(u.keys())}")

r = requests.post(f"{BASE}/v2/auth/login", json={
    "email": "public.001@lifelink.demo", "password": "wrong", "role": "public"
}, timeout=15)
check("POST /v2/auth/login (bad password) -> 401", r.status_code == 401, f"{r.status_code}")

# ── 3. Vitals ingest FIRST (so later prefill/dashboard checks see it) ─
r = requests.post(f"{BASE}/api/health/vitals", headers=H, json={
    "userId": uid, "heart_rate": 78, "blood_pressure": 124,
    "oxygen": 98, "temperature": 36.8, "steps": 4200, "source": "e2e-test"
}, timeout=15)
check("POST /api/health/vitals -> 201", r.status_code == 201, f"{r.status_code} {r.text[:150]}")

# ── 4. Dashboard full payload (the prefill source) ───────────────────
r = requests.get(f"{BASE}/api/dashboard/public/{uid}/full", headers=H, timeout=25)
check("GET /api/dashboard/public/{id}/full -> 200", r.status_code == 200, f"{r.status_code} {r.text[:150]}")
raw = r.text.lower() if r.status_code == 200 else ""
check("dashboard payload contains latestVitals (prefill source)", "latestvitals" in raw and "78" in raw, f"len={len(raw)}")

# ── 4b. Health records / history / notifications / family ──────────
for ep in [f"/api/health/vitals/latest/{uid}", f"/api/health/risk/history/{uid}",
           f"/api/health/records/{uid}", f"/api/notifications/{uid}", f"/api/family/members/{uid}"]:
    r = requests.get(f"{BASE}{ep}", headers=H, timeout=15)
    check(f"GET {ep} -> 200", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

# vitals latest reflects the ingest
r = requests.get(f"{BASE}/api/health/vitals/latest/{uid}", headers=H, timeout=15)
latest = {}
try:
    j = r.json(); latest = j.get("data", j) or {}
except Exception: pass
lr = ((latest.get("metrics") or latest) or {}).get("heart_rate")
check("ingested vitals visible in latest (read-your-write)", lr == 78, f"latest={str(latest)[:150]}")

# ── 5. ML risk prediction (client field names) ───────────────────────
healthy = {"age": 28, "gender": "female", "blood_pressure": 112, "heart_rate": 66,
           "glucose": 88, "cholesterol": 165, "bmi": 21.5, "smoker": 0}
risky = {"age": 62, "gender": "male", "blood_pressure": 158, "heart_rate": 99,
         "glucose": 176, "cholesterol": 245, "bmi": 33.1, "smoker": 1}
def risk_of(resp):
    try:
        b = resp.json(); b = b.get("data", b)
        return b.get("risk_score", b.get("score"))
    except Exception:
        return None
r1 = requests.post(f"{BASE}/v2/ml/health-risk", headers=H, json=healthy, timeout=30)
check("POST /v2/ml/health-risk (healthy) -> 200", r1.status_code == 200, f"{r1.status_code} {r1.text[:150]}")
s1 = risk_of(r1)
r2 = requests.post(f"{BASE}/v2/ml/health-risk", headers=H, json=risky, timeout=30)
check("POST /v2/ml/health-risk (high-risk) -> 200", r2.status_code == 200, f"{r2.status_code} {r2.text[:150]}")
s2 = risk_of(r2)
check("risk scores differentiate (healthy < risky)", isinstance(s1, (int, float)) and isinstance(s2, (int, float)) and s1 < s2, f"healthy={s1} risky={s2}")

r = requests.post(f"{BASE}/api/predict_health_risk", headers=H, json={
    "userId": uid, "age": 41, "gender": "male", "blood_pressure": 132, "heart_rate": 84,
    "glucose": 112, "cholesterol": 210, "bmi": 26.4, "smoker": 0
}, timeout=30)
check("POST /api/predict_health_risk -> 200", r.status_code == 200, f"{r.status_code} {r.text[:150]}")

# ── 6. Donors / matching / summary / modules ─────────────────────────
r = requests.get(f"{BASE}/api/donors?limit=5", headers=H, timeout=15)
check("GET /api/donors -> 200", r.status_code == 200, f"{r.status_code} {r.text[:100]}")
r = requests.post(f"{BASE}/v2/public/donors/match", headers=H, json={
    "blood_group": "O+", "urgency": "high", "latitude": 12.9716, "longitude": 77.5946
}, timeout=25)
check("POST /v2/public/donors/match -> 200", r.status_code == 200, f"{r.status_code} {r.text[:150]}")
r = requests.get(f"{BASE}/v2/public/health/summary", headers=H, timeout=15)
check("GET /v2/public/health/summary -> 200", r.status_code == 200, f"{r.status_code}")
r = requests.get(f"{BASE}/v2/public/modules", headers=H, timeout=15)
check("GET /v2/public/modules -> 200", r.status_code == 200, f"{r.status_code} {r.text[:100]}")

# compatibility check (client body shape: requester_id + donor_id)
r = requests.post(f"{BASE}/api/check_compatibility", headers=H,
                  json={"requester_id": uid, "donor_id": uid, "organ_type": "Blood"}, timeout=15)
check("check_compatibility -> 200", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

# ── 7. Blood/resource request (write path used by RequestsTab) ───────
r = requests.post(f"{BASE}/api/requests", headers=H, json={
    "requester_id": uid, "request_type": "blood",
    "details": "Age: 30, Gender: F, e2e O+ 2 units", "urgency": "high"
}, timeout=15)
check("POST /api/requests -> 201", r.status_code == 201, f"{r.status_code} {r.text[:120]}")

# ── 8. Hospitals nearby ──────────────────────────────────────────────
r = requests.get(f"{BASE}/v2/hospital/nearby?lat=12.9716&lng=77.5946&limit=5&radius_km=50&include_eta=true",
                 headers=H, timeout=25)
check("GET /v2/hospital/nearby -> 200", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

# ── 9. AI agents ask ─────────────────────────────────────────────────
r = requests.post(f"{BASE}/v2/agents/ask", headers=H, json={
    "query": "What are the warning signs of high blood pressure?", "module": "public"
}, timeout=60)
check("POST /v2/agents/ask -> 200", r.status_code == 200, f"{r.status_code} {r.text[:150]}")

# ── 10. Report analysis: text + files (the headline feature) ─────────
report_text = ("Patient: 58-year-old male. BP 165/102 mmHg, fasting glucose 183 mg/dL, "
               "total cholesterol 258. BMI 31.2. Reports chest tightness on exertion.")
r = requests.post(f"{BASE}/api/analyze_report", headers=H,
                  json={"report_text": report_text}, timeout=60)
check("POST /api/analyze_report (text) -> 200", r.status_code == 200, f"{r.status_code} {r.text[:150]}")

files = {
    "txt": (b"Lab Report\nPatient: 45F\nBP 148/95 mmHg\nGlucose 156 mg/dL\nHemoglobin 10.2 g/dL\n",
            "report.txt", "text/plain"),
    "pdf": (extract_text_pdf(), "report.pdf", "application/pdf"),
    "png": None,
}
png = ocr_png()
if png: files["png"] = (png, "scan.png", "image/png")

for kind, data in files.items():
    if data is None:
        print(f"SKIP  analyze_report_file ({kind}) - generator unavailable")
        continue
    payload, fname, ctype = data
    t0 = time.time()
    r = requests.post(f"{BASE}/api/analyze_report_file", headers=H,
                      files={"file": (fname, payload, ctype)}, timeout=90)
    dt = time.time() - t0
    check(f"POST /api/analyze_report_file ({kind}) -> 200", r.status_code == 200,
          f"{r.status_code} {r.text[:200]}")
    if r.status_code == 200:
        check(f"  {kind} analyzed fast (<30s)", dt < 30, f"{dt:.1f}s")
        b = r.json(); b = b.get("data", b) if isinstance(b, dict) else {}
        check(f"  {kind} has real analysis fields",
              isinstance(b, dict) and bool(b.get("risk_score") or b.get("findings") or b.get("analysis") or b.get("risk_level")),
              json.dumps(list(b.keys()))[:150])

# garbage PDF must be honestly rejected (no fabricated result)
r = requests.post(f"{BASE}/api/analyze_report_file", headers=H,
                  files={"file": ("broken.pdf", b"%PDF-1.4 this is not a real pdf", "application/pdf")},
                  timeout=30)
check("garbage PDF -> honest 4xx (no fabricated result)", 400 <= r.status_code < 500, f"{r.status_code} {r.text[:120]}")

# ── Summary ──────────────────────────────────────────────────────────
passed = sum(1 for _, ok, _ in results if ok)
total = len(results)
print("\n" + "=" * 60)
print(f"E2E BACKEND SUITE: {passed}/{total} passed")
if passed < total:
    print("\nFailures:")
    for name, ok, extra in results:
        if not ok:
            print(f"  x {name}  {extra}")
sys.exit(0 if passed == total else 1)
