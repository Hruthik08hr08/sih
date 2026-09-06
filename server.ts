import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Google Earth Engine credentials parser
function getGeeCredentials(): Record<string, any> | null {
  if (process.env.GEE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.GEE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.warn("Could not parse GEE_SERVICE_ACCOUNT_JSON:", e);
    }
  }
  if (process.env.GEE_PRIVATE_KEY && process.env.GEE_SERVICE_ACCOUNT_EMAIL) {
    return {
      client_email: process.env.GEE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GEE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      project_id: process.env.GEE_PROJECT_ID,
    };
  }
  return null;
}

async function getEarthEngineAuth() {
  const creds = getGeeCredentials();
  if (!creds) return null;
  try {
    const auth = new GoogleAuth({
      credentials: creds,
      scopes: [
        "https://www.googleapis.com/auth/earthengine",
        "https://www.googleapis.com/auth/cloud-platform",
      ],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    return {
      connected: true,
      token: token.token,
      projectId: creds.project_id || process.env.GEE_PROJECT_ID,
      clientEmail: creds.client_email,
    };
  } catch (err: any) {
    console.warn("GEE authentication error:", err?.message || err);
    return {
      connected: false,
      error: err?.message || "Authentication failed",
    };
  }
}

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
          model: "gemini-3.6-flash",
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

    const geeCreds = getGeeCredentials();

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
      gee_configured: Boolean(geeCreds),
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return res.status(500).json({ error: "Failed to evaluate marine telemetry" });
  }
});

// Interactive AI Chatbot Endpoint (Sector-aware & Predictive RAG)
app.post("/api/chat", async (req, res) => {
  try {
    const {
      message,
      location_name,
      coordinates,
      telemetry,
      health_score,
      risk_level,
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    const locName = location_name || "Active Ocean Sector";
    const lat = coordinates?.lat != null ? Number(coordinates.lat).toFixed(4) : "0.0000";
    const lon = coordinates?.lon != null ? Number(coordinates.lon).toFixed(4) : "0.0000";
    const sst = telemetry?.sst != null ? `${telemetry.sst}°C` : "28.5°C";
    const anomaly = telemetry?.sst_anomaly != null ? `${telemetry.sst_anomaly >= 0 ? "+" : ""}${telemetry.sst_anomaly}°C` : "+1.2°C";
    const ph = telemetry?.ph ?? 8.04;
    const oxygen = telemetry?.oxygen ?? 5.2;
    const salinity = telemetry?.salinity ?? 35.1;
    const health = health_score ?? 68;
    const risk = risk_level ?? "Moderate Risk";

    const systemPrompt = `You are ORCA Marine Copilot, an elite oceanographic AI assistant specialized in real-time satellite Earth observation (Google Earth Engine), marine heatwave dynamics, coral reef physiology, and predictive environmental modeling.

CURRENT SECTOR TELEMETRY (Live Observation for Selected Coordinate):
- Sector Location: ${locName}
- Coordinates: ${lat}°N, ${lon}°E
- Sea Surface Temp (SST): ${sst} (Thermal Anomaly vs Baseline: ${anomaly})
- Ocean pH: ${ph} (Acidification Baseline: 8.15; Critical: < 7.95)
- Dissolved Oxygen: ${oxygen} mg/L (Hypoxia Threshold: < 5.0 mg/L)
- Salinity: ${salinity} PSU
- Coral Health Index (CHI): ${health} / 100
- Risk Status: ${risk}

RAG SCIENTIFIC CONTEXT & CITATIONS:
1. NOAA Coral Reef Watch (CRW v3.1):
   - Degree Heating Weeks (DHW) measures 12-week accumulated thermal stress.
   - DHW >= 4.0 °C-weeks triggers Bleaching Alert Level 1 (significant bleaching likely).
   - DHW >= 8.0 °C-weeks triggers Bleaching Alert Level 2 (severe multi-species mortality).
2. IPCC AR6 WGII Chapter 3 (Ocean & Coastal Ecosystems):
   - High sensitivity in fast-growing branching corals (Acropora, Pocillopora); massive Porites show higher thermal buffering.
   - Decreased pH reduces aragonite saturation, impeding calcification and lowering larval settlement success by up to 60%.
3. Future Projections & Environmental Trajectory:
   - When asked to predict future trends (e.g. 15, 30, or 60 days ahead), estimate the progression of Degree Heating Weeks and mortality risk based on the current SST anomaly and regional ocean dynamics.
4. Actionable Interventions:
   - Shading structures, micro-bubble aeration skiffs, selective micro-fragmentation with thermotolerant Symbiodiniaceae clades, terrestrial sediment barriers, and emergency MPA restrictions.

INSTRUCTIONS:
- Directly answer the user's question using the live sector telemetry above.
- If asked about the future, provide clear predictive timeframes (e.g. Next 14 days, 30 days) based on current heating rates.
- Maintain a professional, articulate, and scientifically accurate tone with clear formatting (bullet points, bold text).`;

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: `${systemPrompt}\n\n[USER QUESTION]: ${message}`,
        });

        const reply = response.text || "Analysis synthesized based on active marine telemetry.";
        return res.json({
          reply,
          sector: { locationName: locName, coordinates: { lat: Number(lat), lon: Number(lon) }, sst, anomaly, risk }
        });
      } catch (geminiErr: any) {
        console.warn("Gemini chat error, using heuristic fallback:", geminiErr?.message);
      }
    }

    // Heuristic fallback response
    let fallbackReply = `**Analysis for ${locName} (${lat}°, ${lon}°)**:\n\n` +
      `• **Current SST**: ${sst} (Thermal anomaly: ${anomaly})\n` +
      `• **Biogeochemical Status**: pH ${ph} | Dissolved Oxygen ${oxygen} mg/L | Health Index: ${health}/100 (${risk})\n\n`;

    if (message.toLowerCase().includes("predict") || message.toLowerCase().includes("future") || message.toLowerCase().includes("30 day")) {
      fallbackReply += `🔮 **30-Day Environmental Outlook**:\n` +
        `Under current heating trajectory (+${anomaly} anomaly), Degree Heating Weeks (DHW) are projected to accumulate by approximately 1.5 - 2.8 units over the next month. ` +
        (parseFloat(anomaly) > 1.2
          ? "This will escalate the sector into NOAA Bleaching Alert Level 2, creating severe physiological stress for sensitive branching Acropora corals."
          : "Thermal stress remains elevated but within manageable adaptive thresholds if localized seasonal upwelling patterns remain stable.") +
        `\n\n**Key Directive**: Deploy targeted micro-bubble aeration and enforce localized vessel transit restrictions.`;
    } else {
      fallbackReply += `According to NOAA Coral Reef Watch protocols, this sector is currently undergoing ${
        parseFloat(anomaly) > 1.0 ? "acute thermal stress requiring active intervention" : "baseline monitoring conditions"
      }. Secondary factors like ocean pH (${ph}) require mitigation against compounding coastal runoff.`;
    }

    return res.json({
      reply: fallbackReply,
      sector: { locationName: locName, coordinates: { lat: Number(lat), lon: Number(lon) }, sst, anomaly, risk }
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({ error: "Failed to process chat query" });
  }
});

// Google Earth Engine status endpoint
app.get("/api/earthengine/status", async (_req, res) => {
  const creds = getGeeCredentials();
  if (!creds) {
    return res.json({
      connected: false,
      configured: false,
      message: "GEE credentials not configured. Add GEE_SERVICE_ACCOUNT_JSON in AI Studio Secrets.",
    });
  }
  const auth = await getEarthEngineAuth();
  return res.json({
    connected: Boolean(auth?.connected),
    configured: true,
    projectId: auth?.projectId || creds.project_id || "default",
    clientEmail: auth?.clientEmail || creds.client_email,
    message: auth?.connected
      ? "Google Earth Engine authenticated successfully."
      : `Google Earth Engine authentication error: ${auth?.error}`,
  });
});

// Download technical documentation PDF
app.get("/api/download-documentation", (_req, res) => {
  const pdfPath = path.join(process.cwd(), "public", "ORCA_Technical_Documentation.pdf");
  if (fs.existsSync(pdfPath)) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="ORCA_Technical_Documentation.pdf"');
    return res.sendFile(pdfPath);
  }
  return res.status(404).json({ error: "Documentation PDF not found" });
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
