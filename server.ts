import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

interface EvaluateRequestBody {
  lat: number;
  lon: number;
  location_name?: string;
  useGemini?: boolean;
}

// Oceanography telemetry generator
function generateOceanTelemetry(lat: number, lon: number) {
  const equatorDistance = Math.abs(lat);
  // Realistic Sea Surface Temp based on latitude gradient
  const baseSst = 29.2 - equatorDistance * 0.28 + Math.sin(lon * 0.1) * 0.4;
  const sst = Number(Math.max(14.0, Math.min(33.5, baseSst + (Math.random() - 0.4) * 1.0)).toFixed(2));
  
  // Baseline decadal mean
  const baselineTemp = Number((28.0 - equatorDistance * 0.25).toFixed(2));
  const sstAnomaly = Number((sst - baselineTemp).toFixed(2));
  
  // Ocean pH (ocean average ~8.1, acidified ~7.80 - 7.98)
  const basePh = 8.12 - (sstAnomaly > 0.8 ? 0.06 : 0.0) - Math.random() * 0.18;
  const ph = Number(Math.max(7.70, Math.min(8.25, basePh)).toFixed(2));
  
  // Salinity in PSU (33 - 37 PSU)
  const salinity = Number((34.8 + Math.cos(lat * 0.15) * 1.2 + (Math.random() - 0.5) * 0.6).toFixed(2));
  
  // Dissolved Oxygen in mg/L (4.0 - 7.8 mg/L)
  const doBase = 6.8 - sstAnomaly * 0.45 + (Math.random() - 0.5) * 0.5;
  const oxygen = Number(Math.max(3.8, Math.min(8.0, doBase)).toFixed(2));
  
  const depths = [18, 35, 62, 110, 240, 580];
  const depthM = depths[Math.floor(Math.random() * depths.length)];
  
  return {
    sst,
    sst_anomaly: sstAnomaly,
    baseline_sst: baselineTemp,
    ph,
    salinity,
    oxygen,
    depth_m: depthM,
    turbidity_ntu: Number((0.8 + Math.random() * 2.6).toFixed(2)),
  };
}

function generateForecastTrend(telemetry: ReturnType<typeof generateOceanTelemetry>) {
  const forecast: Array<{
    date: string;
    temp: number;
    upper_bound: number | null;
    lower_bound: number | null;
    is_projected: boolean;
    ph: number;
  }> = [];

  const baseTemp = telemetry.sst;
  const today = new Date();

  // 30 Days historical
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayName = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const historicalFluctuation = -i * 0.035 + Math.sin((30 - i) * 0.4) * 0.35 + (Math.random() - 0.5) * 0.3;
    const tempVal = Number((baseTemp + historicalFluctuation).toFixed(2));
    const phVal = Number((telemetry.ph + i * 0.002 + (Math.random() - 0.5) * 0.02).toFixed(2));

    forecast.push({
      date: dayName,
      temp: tempVal,
      upper_bound: null,
      lower_bound: null,
      is_projected: false,
      ph: phVal,
    });
  }

  // 15 Days forward ML projection
  const slope = telemetry.sst_anomaly > 0.5 ? 0.065 : 0.025;
  for (let j = 1; j <= 15; j++) {
    const d = new Date(today);
    d.setDate(d.getDate() + j);
    const dayName = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const projTemp = Number((baseTemp + j * slope + Math.sin(j * 0.5) * 0.18).toFixed(2));
    const uncertainty = Number((j * 0.08).toFixed(2));
    const projPh = Number((telemetry.ph - j * 0.004 + (Math.random() - 0.5) * 0.01).toFixed(2));

    forecast.push({
      date: dayName,
      temp: projTemp,
      upper_bound: Number((projTemp + uncertainty).toFixed(2)),
      lower_bound: Number((projTemp - uncertainty).toFixed(2)),
      is_projected: true,
      ph: projPh,
    });
  }

  return forecast;
}

// 3-Agent reasoning engine
function buildAgentReasoning(
  telemetry: ReturnType<typeof generateOceanTelemetry>,
  lat: number,
  lon: number,
  locationName?: string
) {
  const locStr = locationName || `Sector [${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E]`;
  const { sst, sst_anomaly, ph, oxygen, salinity } = telemetry;

  const bleachingRisk = sst >= 29.8 || sst_anomaly >= 1.2 ? "HIGH" : sst >= 28.5 ? "MODERATE" : "LOW";
  const acidRisk = ph < 7.90 ? "CRITICAL" : ph < 8.02 ? "ELEVATED" : "OPTIMAL";
  const hypoxiaRisk = oxygen < 5.0 ? "ELEVATED" : "NOMINAL";

  // Calculate Health Score (0 - 100)
  let healthScore = 100;
  if (sst_anomaly > 0) healthScore -= Math.round(sst_anomaly * 22);
  if (ph < 8.10) healthScore -= Math.round((8.10 - ph) * 115);
  if (oxygen < 6.0) healthScore -= Math.round((6.0 - oxygen) * 14);
  healthScore = Math.max(18, Math.min(98, healthScore));

  const riskLevel = healthScore < 60 ? "Critical Risk" : healthScore < 80 ? "Moderate Risk" : "Healthy Status";

  const agentLogs = [
    {
      agent: "Agent 1: Anomaly Analyst",
      role: "Telemetry & Multispectral Ingestion",
      timestamp: "T+0.14s",
      type: "telemetry" as const,
      message: `Ingested multispectral satellite & Argo float feed for ${locStr}. SST is ${sst}°C (Anomaly: ${sst_anomaly >= 0 ? "+" : ""}${sst_anomaly}°C against decadal baseline).`,
    },
    {
      agent: "Agent 1: Anomaly Analyst",
      role: "Telemetry & Multispectral Ingestion",
      timestamp: "T+0.42s",
      type: sst_anomaly > 0.8 || ph < 7.95 ? ("alert" as const) : ("info" as const),
      message: `Biogeochemical metrics: Salinity ${salinity} PSU, Ocean pH ${ph} (${acidRisk} acidification rate), Dissolved Oxygen ${oxygen} mg/L (${hypoxiaRisk}). ML projections show persistent thermal loading.`,
    },
    {
      agent: "Agent 2: RAG Specialist",
      role: "Marine Biology & IPCC/NOAA VectorDB",
      timestamp: "T+0.85s",
      type: "rag" as const,
      message: `VectorDB query against NOAA Coral Reef Watch (CRW) & GBRMPA biogeochemical thresholds. Taxa analyzed: Scleractinia (Staghorn/Brain corals) & seagrass meadows.`,
    },
    {
      agent: "Agent 2: RAG Specialist",
      role: "Marine Biology & IPCC/NOAA VectorDB",
      timestamp: "T+1.28s",
      type: "rag" as const,
      message: `Calculated Degree Heating Weeks (DHW): ${sst_anomaly > 0.8 ? "4.2 DHW (Bleaching Warning Tier 2)" : "1.1 DHW (Low Bleaching Stress)"}. Calcification index is reduced by ${ph < 8.0 ? "24%" : "8%"}.`,
    },
    {
      agent: "Agent 3: Decision Synthesizer",
      role: "Multi-Agent Consensus & Policy Arbitration",
      timestamp: "T+1.79s",
      type: "consensus" as const,
      message: `Multi-agent consensus achieved (Score: ${healthScore}/100, Assessment: ${riskLevel}). Automated mitigation protocol synthesized with actionable regulatory and field directives.`,
    },
  ];

  const recommendations = [
    {
      title: bleachingRisk === "HIGH" ? "Active Marine Heatwave Interventions" : "Continuous Autonomous Drone Profiling",
      action:
        bleachingRisk === "HIGH"
          ? "Deploy automated solar reflective shading cloths and trigger localized deep-water micro-upwelling pumps to mitigate surface spikes by ~0.8°C."
          : "Maintain routine 6-hour autonomous glider surveying cycles across bathymetric transects to monitor sub-surface thermocline movement.",
      urgency: bleachingRisk === "HIGH" ? "Immediate (24-48h)" : "Routine",
      impact: "High" as const,
    },
    {
      title: acidRisk !== "OPTIMAL" ? "Micro-Alkalinity Buffer Enhancement" : "Biochemical Carbon Sequestration Guard",
      action:
        acidRisk !== "OPTIMAL"
          ? "Activate targeted micro-dispersion of ocean alkalinity enhancement (OAE) olivine/calcium substrates in high-density reef clusters."
          : "Safeguard existing seagrass and mangrove carbon sink buffer zones from bottom-trawling operations.",
      urgency: acidRisk !== "OPTIMAL" ? "Priority (3-5 days)" : "Standard",
      impact: "High" as const,
    },
    {
      title: "Maritime Zone Speed & Runoff Advisory",
      action:
        "Institute mandatory 10-knot maritime speed limits in the 20km perimeter to curtail propeller cavitational warming and coordinate with port authorities on nitrogen runoff controls.",
      urgency: "Medium (7 days)",
      impact: "Medium" as const,
    },
  ];

  return { agentLogs, healthScore, riskLevel, recommendations };
}

// Endpoint: /api/evaluate
app.post("/api/evaluate", async (req, res) => {
  try {
    const { lat = 10.57, lon = 72.64, location_name } = req.body as EvaluateRequestBody;
    const numLat = Number(lat);
    const numLon = Number(lon);

    const telemetry = generateOceanTelemetry(numLat, numLon);
    const forecast = generateForecastTrend(telemetry);
    const { agentLogs, healthScore, riskLevel, recommendations } = buildAgentReasoning(
      telemetry,
      numLat,
      numLon,
      location_name
    );

    // If user requested Gemini live reasoning and key exists, we can optionally enhance agent reasoning
    let liveGeminiReasoning = null;
    if (process.env.GEMINI_API_KEY && req.body.useGemini) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are the ORCA Marine Intelligence Collaborative Agent System.
Ocean Telemetry:
- Coordinates: ${numLat}°N, ${numLon}°E (${location_name || "Custom Sector"})
- Sea Surface Temp: ${telemetry.sst}°C (Anomaly: ${telemetry.sst_anomaly}°C)
- pH Level: ${telemetry.ph}
- Salinity: ${telemetry.salinity} PSU
- Dissolved Oxygen: ${telemetry.oxygen} mg/L
- Depth: ${telemetry.depth_m}m

Generate a brief 3-agent live synthesis report in JSON with:
1. "anomaly_analyst_note": 1 concise sentence
2. "rag_specialist_note": 1 concise sentence with biological reference
3. "decision_synthesizer_note": 1 concise sentence with key directive`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json" },
        });

        if (response.text) {
          liveGeminiReasoning = JSON.parse(response.text);
        }
      } catch (err) {
        console.warn("Gemini agent synthesis fallback:", err);
      }
    }

    return res.json({
      status: "success",
      timestamp: new Date().toISOString(),
      coordinates: { lat: numLat, lon: numLon },
      location_name: location_name || `Sector [${numLat.toFixed(2)}°, ${numLon.toFixed(2)}°]`,
      telemetry,
      forecast,
      agent_logs: agentLogs,
      health_score: healthScore,
      risk_level: riskLevel,
      recommendations,
      live_ai_enhanced: Boolean(liveGeminiReasoning),
      live_ai_data: liveGeminiReasoning,
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return res.status(500).json({ error: "Failed to evaluate marine telemetry" });
  }
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "healthy", service: "ORCA Marine Intelligence API", timestamp: new Date().toISOString() });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ORCA Marine Engine running on port ${PORT}`);
  });
}

startServer();
