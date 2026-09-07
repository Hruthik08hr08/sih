export interface Coordinates {
  lat: number;
  lon: number;
}

export interface PresetLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region: string;
  ecosystemType: string;
  description: string;
}

export interface OceanTelemetry {
  sst: number; // Sea Surface Temp in °C
  sst_anomaly: number; // +/- against baseline
  baseline_sst: number;
  ph: number; // Ocean pH
  salinity: number; // PSU
  oxygen: number; // Dissolved Oxygen mg/L
  depth_m: number;
  turbidity_ntu?: number;
  chlorophyll_a: number; // Chlorophyll-a / Coral algal biomass concentration in mg/m³
  coral_symbiont_density?: string; // e.g. "Optimal Symbiont", "Bleaching Depletion", "Eutrophic Bloom"
}

export interface ForecastPoint {
  date: string;
  temp: number;
  upper_bound: number | null;
  lower_bound: number | null;
  is_projected: boolean;
  ph: number;
}

export interface AgentLog {
  agent: string;
  role: string;
  timestamp: string;
  type: "telemetry" | "alert" | "rag" | "consensus" | "info";
  message: string;
}

export interface Recommendation {
  title: string;
  action: string;
  urgency: string;
  impact: "High" | "Medium" | "Low";
}

export interface EvaluationResponse {
  status: string;
  timestamp: string;
  coordinates: Coordinates;
  location_name: string;
  telemetry: OceanTelemetry;
  forecast: ForecastPoint[];
  agent_logs: AgentLog[];
  health_score: number;
  risk_level: "Healthy Status" | "Moderate Risk" | "Critical Risk";
  recommendations: Recommendation[];
  live_ai_enhanced?: boolean;
  gee_configured?: boolean;
  live_ai_data?: {
    anomaly_analyst_note?: string;
    rag_specialist_note?: string;
    decision_synthesizer_note?: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  sectorContext?: {
    locationName: string;
    coordinates: Coordinates;
    sst?: number;
    anomaly?: number;
    risk?: string;
  };
}

