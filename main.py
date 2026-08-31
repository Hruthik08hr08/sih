from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import datetime
import math

app = FastAPI(title="ORCA Engine API", description="Autonomous Multi-Agent Marine Ecosystem Reasoning & Forecasting")

# Enable CORS for React communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EvaluationRequest(BaseModel):
    lat: float
    lon: float
    location_name: str | None = None

def generate_ocean_telemetry(lat: float, lon: float):
    """Generates oceanographic telemetry based on geographic coordinates."""
    # Latitudinal temperature gradient (warmer near tropics ~0-15° latitude)
    equator_distance = abs(lat)
    base_sst = 29.2 - (equator_distance * 0.28) + (math.sin(lon * 0.1) * 0.4)
    sst = round(max(14.0, min(33.5, base_sst + random.uniform(-0.4, 0.6))), 2)
    
    # Anomaly against historical decadal baseline (~27.8°C in tropics)
    baseline_temp = 28.0 - (equator_distance * 0.25)
    sst_anomaly = round(sst - baseline_temp, 2)
    
    # Ocean pH (global baseline ~8.10, acidification drops it to 7.8-8.0)
    base_ph = 8.12 - (0.05 if sst_anomaly > 0.8 else 0.0) - (random.random() * 0.18)
    ph = round(max(7.70, min(8.25, base_ph)), 2)
    
    # Salinity in PSU (Practical Salinity Units, typically 33 - 37 PSU)
    salinity = round(34.8 + (math.cos(lat * 0.15) * 1.2) + random.uniform(-0.3, 0.3), 2)
    
    # Dissolved Oxygen (mg/L, 4.5 - 7.5 mg/L, lowers with high temp)
    do_base = 6.8 - (sst_anomaly * 0.45) + random.uniform(-0.25, 0.25)
    dissolved_oxygen = round(max(3.8, min(8.0, do_base)), 2)
    
    return {
        "sst": sst,
        "sst_anomaly": sst_anomaly,
        "baseline_sst": round(baseline_temp, 2),
        "ph": ph,
        "salinity": salinity,
        "oxygen": dissolved_oxygen,
        "depth_m": int(random.choice([18, 42, 85, 120, 310, 540])),
        "turbidity_ntu": round(random.uniform(0.8, 3.4), 2)
    }

def generate_forecast_trend(telemetry: dict):
    """Generates 30-day historical + 15-day ML projected trend with confidence bounds."""
    forecast = []
    base_temp = telemetry["sst"]
    start_date = datetime.date.today() - datetime.timedelta(days=30)
    
    # Generate 30 days of historical data
    for i in range(30):
        day_date = start_date + datetime.timedelta(days=i)
        # Slight historical fluctuations leading up to current temp
        day_temp = base_temp - (30 - i) * 0.04 + (math.sin(i * 0.4) * 0.35) + random.uniform(-0.2, 0.2)
        forecast.append({
            "date": day_date.strftime("%b %d"),
            "temp": round(day_temp, 2),
            "upper_bound": None,
            "lower_bound": None,
            "is_projected": False,
            "ph": round(telemetry["ph"] + ((30 - i) * 0.002) + random.uniform(-0.01, 0.01), 2)
        })
        
    # Generate 15 days of forward ML projections
    curr_date = datetime.date.today()
    trend_slope = 0.06 if telemetry["sst_anomaly"] > 0.5 else 0.02
    for j in range(1, 16):
        proj_date = curr_date + datetime.timedelta(days=j)
        proj_temp = base_temp + (j * trend_slope) + (math.sin(j * 0.5) * 0.2)
        uncertainty = j * 0.075 # Expanding confidence cone
        
        forecast.append({
            "date": proj_date.strftime("%b %d"),
            "temp": round(proj_temp, 2),
            "upper_bound": round(proj_temp + uncertainty, 2),
            "lower_bound": round(proj_temp - uncertainty, 2),
            "is_projected": True,
            "ph": round(telemetry["ph"] - (j * 0.004) + random.uniform(-0.01, 0.01), 2)
        })
        
    return forecast

def run_multi_agent_reasoning(telemetry: dict, lat: float, lon: float, location_name: str | None):
    """Simulates 3-Agent collaborative reasoning workflow."""
    loc_str = location_name or f"Sector [{lat:.2f}°N, {lon:.2f}°E]"
    sst = telemetry["sst"]
    anomaly = telemetry["sst_anomaly"]
    ph = telemetry["ph"]
    oxygen = telemetry["oxygen"]
    
    # Risk calculation
    bleaching_risk = "HIGH" if sst >= 29.8 or anomaly >= 1.2 else ("MODERATE" if sst >= 28.5 else "LOW")
    acid_risk = "CRITICAL" if ph < 7.90 else ("ELEVATED" if ph < 8.02 else "NORMAL")
    hypoxia_risk = "ELEVATED" if oxygen < 5.0 else "NOMINAL"
    
    # Calculate Health Index
    health_score = 100
    if anomaly > 0:
        health_score -= int(anomaly * 22)
    if ph < 8.10:
        health_score -= int((8.10 - ph) * 110)
    if oxygen < 6.0:
        health_score -= int((6.0 - oxygen) * 12)
    health_score = max(15, min(98, health_score))
    
    # Structured Agent Logs
    agent_logs = [
        {
            "agent": "Agent 1: Anomaly Analyst",
            "role": "Telemetry & Anomaly Detection",
            "timestamp": "T+0.12s",
            "type": "telemetry",
            "message": f"Multispectral satellite sweep complete for {loc_str}. SST measured at {sst}°C (Anomaly: {'+' if anomaly>=0 else ''}{anomaly}°C vs. 10-yr decadal mean)."
        },
        {
            "agent": "Agent 1: Anomaly Analyst",
            "role": "Telemetry & Anomaly Detection",
            "timestamp": "T+0.45s",
            "type": "alert" if anomaly > 0.8 else "info",
            "message": f"Biochemical sensor check: Ocean pH @ {ph} (Acidification index: {acid_risk}), Dissolved O₂ @ {oxygen} mg/L ({hypoxia_risk}). Forward ML trend indicates thermal escalation."
        },
        {
            "agent": "Agent 2: RAG Specialist",
            "role": "Marine Biology & Policy VectorDB",
            "timestamp": "T+0.88s",
            "type": "rag",
            "message": f"VectorDB query executed against NOAA Coral Reef Watch (CRW) & IPCC AR6 Marine Biosphere corpus. Identified dominant taxa: Acropora palmata & Porites lutea."
        },
        {
            "agent": "Agent 2: RAG Specialist",
            "role": "Marine Biology & Policy VectorDB",
            "timestamp": "T+1.32s",
            "type": "rag",
            "message": f"Degree Heating Weeks (DHW) threshold calibrated: {sst}°C exceeds calcification optimum threshold (29.2°C). Bleaching vulnerability rating: {bleaching_risk}."
        },
        {
            "agent": "Agent 3: Decision Synthesizer",
            "role": "Consensus & Action Arbitration",
            "timestamp": "T+1.85s",
            "type": "consensus",
            "message": f"Consensus achieved with 94.6% confidence. Health Index computed at {health_score}/100. Synthesizing multi-tier ecological intervention protocol."
        }
    ]
    
    # Actionable Conservation Recommendations
    recommendations = []
    if bleaching_risk in ["HIGH", "MODERATE"]:
        recommendations.append({
            "title": "Deploy Marine Heatwave Protection Protocol",
            "action": "Trigger autonomous surface shading and deep-water upwelling pumps in shallow coral nursery sectors to suppress surface thermal spikes by ~0.8°C.",
            "urgency": "Immediate (24-48h)",
            "impact": "High"
        })
    else:
        recommendations.append({
            "title": "Continuous Reef Thermal Profiling",
            "action": "Maintain automated glider autonomous monitoring on 6-hour tidal cycles for early thermal accumulation signals.",
            "urgency": "Routine",
            "impact": "Medium"
        })
        
    if acid_risk in ["CRITICAL", "ELEVATED"]:
        recommendations.append({
            "title": "Micro-Alkalinity Buffer Dispersion",
            "action": "Activate targeted micro-dispersion of ocean alkalinity enhancement (OAE) substrates around high-calcification coral clusters.",
            "urgency": "Priority (3-5 days)",
            "impact": "High"
        })
        
    recommendations.append({
        "title": "Maritime Zone Velocity & Effluent Restrictions",
        "action": "Issue temporary maritime deceleration directives in the 25km radius to reduce engine heat dissipation and agricultural nitrogen runoff.",
        "urgency": "Medium (7 days)",
        "impact": "Medium"
    })
    
    return agent_logs, health_score, recommendations

@app.post("/api/evaluate")
async def evaluate_ecosystem(req: EvaluationRequest):
    telemetry = generate_ocean_telemetry(req.lat, req.lon)
    forecast = generate_forecast_trend(telemetry)
    agent_logs, health_score, recommendations = run_multi_agent_reasoning(
        telemetry, req.lat, req.lon, req.location_name
    )
    
    return {
        "status": "success",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "coordinates": {"lat": req.lat, "lon": req.lon},
        "location_name": req.location_name or f"Ocean Coordinates [{req.lat:.2f}°, {req.lon:.2f}°]",
        "telemetry": telemetry,
        "forecast": forecast,
        "agent_logs": agent_logs,
        "health_score": health_score,
        "risk_level": "Critical Risk" if health_score < 60 else ("Moderate Risk" if health_score < 80 else "Healthy Status"),
        "recommendations": recommendations
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
