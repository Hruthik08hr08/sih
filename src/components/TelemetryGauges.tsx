import React from "react";
import { OceanTelemetry } from "../types";
import { Thermometer, Droplet, Wind, Activity, TrendingUp, TrendingDown } from "lucide-react";

interface TelemetryGaugesProps {
  telemetry: OceanTelemetry | null;
  loading: boolean;
}

export default function TelemetryGauges({ telemetry, loading }: TelemetryGaugesProps) {
  if (!telemetry) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const sstAnomaly = telemetry.sst_anomaly;
  const isSstWarm = sstAnomaly > 0.5;
  const isSstCritical = sstAnomaly > 1.2;

  const isAcidicRisk = telemetry.ph < 7.95;
  const isModerateAcidic = telemetry.ph < 8.05;

  const isHypoxic = telemetry.oxygen < 4.8;
  const isHypoxicWarning = telemetry.oxygen < 5.6;

  // Percentage calculations for progress bars
  const sstProgress = Math.min(100, Math.max(10, ((telemetry.sst - 15) / (34 - 15)) * 100));
  const phProgress = Math.min(100, Math.max(10, ((telemetry.ph - 7.5) / (8.4 - 7.5)) * 100));
  const salinityProgress = Math.min(100, Math.max(10, ((telemetry.salinity - 30) / (40 - 30)) * 100));
  const oxygenProgress = Math.min(100, Math.max(10, ((telemetry.oxygen - 2) / (8.5 - 2)) * 100));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Sea Surface Temperature */}
      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Sea Surface Temp
          </p>
          <div className="p-1 rounded bg-slate-950 text-cyan-400">
            <Thermometer size={14} />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold font-mono ${isSstCritical ? "text-rose-400" : isSstWarm ? "text-orange-400" : "text-white"}`}>
              {telemetry.sst.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-mono">°C</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${isSstCritical ? "bg-rose-500" : isSstWarm ? "bg-orange-500" : "bg-cyan-500"}`}
              style={{ width: `${sstProgress}%` }}
            />
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Anomaly</span>
            <span className={`font-mono font-bold flex items-center gap-0.5 ${sstAnomaly > 0 ? (isSstCritical ? "text-rose-400" : "text-orange-400") : "text-emerald-400"}`}>
              {sstAnomaly > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {sstAnomaly > 0 ? `+${sstAnomaly.toFixed(2)}` : `${sstAnomaly.toFixed(2)}`}°C
            </span>
          </div>
        </div>
      </div>

      {/* 2. Ocean pH Level */}
      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Ocean pH
          </p>
          <div className="p-1 rounded bg-slate-950 text-orange-400">
            <Droplet size={14} />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold font-mono ${isAcidicRisk ? "text-rose-400" : isModerateAcidic ? "text-orange-400" : "text-emerald-400"}`}>
              {telemetry.ph.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 font-mono">pH</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${isAcidicRisk ? "bg-rose-500" : isModerateAcidic ? "bg-orange-500" : "bg-emerald-500"}`}
              style={{ width: `${phProgress}%` }}
            />
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Buffer</span>
            <span className={`font-semibold ${isAcidicRisk ? "text-rose-400" : isModerateAcidic ? "text-orange-400" : "text-emerald-400"}`}>
              {isAcidicRisk ? "Acidic" : isModerateAcidic ? "Elevated" : "Optimal"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Salinity */}
      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Salinity
          </p>
          <div className="p-1 rounded bg-slate-950 text-cyan-400">
            <Wind size={14} />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {telemetry.salinity.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-mono">PSU</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-500" style={{ width: `${salinityProgress}%` }} />
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Depth</span>
            <span className="text-slate-300 font-mono">{telemetry.depth_m}m</span>
          </div>
        </div>
      </div>

      {/* 4. Dissolved Oxygen */}
      <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between group hover:border-slate-700 transition-all">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Dissolved Oxygen
          </p>
          <div className="p-1 rounded bg-slate-950 text-emerald-400">
            <Activity size={14} />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold font-mono ${isHypoxic ? "text-rose-400" : isHypoxicWarning ? "text-orange-400" : "text-emerald-400"}`}>
              {telemetry.oxygen.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-mono">mg/L</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${isHypoxic ? "bg-rose-500" : isHypoxicWarning ? "bg-orange-500" : "bg-emerald-500"}`}
              style={{ width: `${oxygenProgress}%` }}
            />
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Aeration</span>
            <span className={`font-semibold ${isHypoxic ? "text-rose-400" : isHypoxicWarning ? "text-orange-400" : "text-emerald-400"}`}>
              {isHypoxic ? "Hypoxic" : isHypoxicWarning ? "Moderate" : "Nominal"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

