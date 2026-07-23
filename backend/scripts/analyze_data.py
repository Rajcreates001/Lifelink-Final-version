"""Quick diagnostic: check why ETA and Inventory models have negative R2."""
import pandas as pd, numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score

# === ETA ===
df = pd.read_csv("backend/ml/eta_expanded.csv")
tod_map = {"morning": 8, "afternoon": 14, "evening": 19, "night": 23}
wmap = {"clear": (0,5), "sunny": (0,5), "cloudy": (0.5,10),
        "rain": (3,15), "heavy rain": (8,20), "storm": (15,30),
        "snow": (5,10), "fog": (1,8)}

df["hour"] = df["time_of_day"].map(tod_map)
df["precip"] = df["weather_condition"].apply(lambda w: wmap.get(str(w).lower().strip(), (0,5))[0])
df["wind"] = df["weather_condition"].apply(lambda w: wmap.get(str(w).lower().strip(), (0,5))[1])

print("=== ETA Correlation with actual_time_minutes ===")
for c in ["distance_km", "hour", "precip", "wind", "base_time_minutes"]:
    print(f"  {c}: r = {df[c].corr(df['actual_time_minutes']):.4f}")

# Train a bare XGBoost
import xgboost as xgb
feats = ["distance_km", "hour", "precip", "wind"]
X_tr, X_te, y_tr, y_te = train_test_split(df[feats], df["actual_time_minutes"], test_size=0.2, random_state=42)
m = xgb.XGBRegressor(n_estimators=100, random_state=42)
m.fit(X_tr, y_tr)
print(f"\n  XGBoost R2 on (distance_km, hour, precip, wind): {r2_score(y_te, m.predict(X_te)):.4f}")

# Try with base_time_minutes added (even though prediction can't use it)
feats2 = ["distance_km", "hour", "precip", "wind", "base_time_minutes"]
X_tr2, X_te2, y_tr2, y_te2 = train_test_split(df[feats2], df["actual_time_minutes"], test_size=0.2, random_state=42)
m2 = xgb.XGBRegressor(n_estimators=100, random_state=42)
m2.fit(X_tr2, y_tr2)
print(f"  XGBoost R2 with base_time_minutes: {r2_score(y_te2, m2.predict(X_te2)):.4f}")

# === INVENTORY ===
print("\n=== INVENTORY ===")
df2 = pd.read_csv("backend/ml/inventory_expanded.csv")
df2["next_week"] = df2["daily_usage"] * 7  # deterministic target

feats3 = ["current_stock", "daily_usage", "lead_time_days", "reorder_point", "supplier_reliability"]
target = "next_week"
X_tr3, X_te3, y_tr3, y_te3 = train_test_split(df2[feats3], df2[target], test_size=0.2, random_state=42)

m3 = xgb.XGBRegressor(n_estimators=100, random_state=42)
m3.fit(X_tr3, y_tr3)
print(f"  XGBoost R2 predicting daily_usage*7: {r2_score(y_te3, m3.predict(X_te3)):.4f}")

# Also try predicting days_until_stockout with just (quantity, minThreshold, category-like)
df2["quantity"] = df2["current_stock"]
df2["minThreshold"] = df2["reorder_point"]
feats4 = ["quantity", "minThreshold"]
X_tr4, X_te4, y_tr4, y_te4 = train_test_split(df2[feats4], df2["days_until_stockout"], test_size=0.2, random_state=42)
m4 = xgb.XGBRegressor(n_estimators=100, random_state=42)
m4.fit(X_tr4, y_tr4)
print(f"  XGBoost R2 predicting days_until_stockout from (qty, minThreshold): {r2_score(y_te4, m4.predict(X_te4)):.4f}")

print("\nDone.")
