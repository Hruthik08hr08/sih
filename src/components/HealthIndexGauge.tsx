import React from "react";
import { ShieldCheck, ShieldAlert, AlertOctagon, HeartPulse, Info } from "lucide-react";

interface HealthIndexGaugeProps {
  score: number;
  riskLevel: "Healthy Status" | "Moderate Risk" | "Critical Risk";
  loading: boolean;
}

export default function HealthIndexGauge({ score, riskLevel, loading }: HealthIndexGaugeProps) {
  // Circular gauge math (radius 48, circumference ~ 301.6)
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, score || 0));
  const strokeDashoffset = circumference - (circumference * safeScore) / 100;

  const isCritical = safeScore < 60;
  const isModerate = safeScore >= 60 && safeScore < 80;

  const colorClass = isCritical
    ? "text-rose-500"
    : isModerate
    ? "text-amber-400"
    : "text-emerald-400";

  const glowClass = isCritical
    ? "shadow-rose-500/20"
    : isModerate
    ? "shadow-amber-500/20"
    : "shadow-emerald-500/20";

  const badgeBgClass = isCritical
    ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
    : isModerate
    ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-2xl flex flex-col items-center justify-between relative overflow-hidden">
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Ecosystem Health Index
        </p>

        {isCritical ? (
          <AlertOctagon size={14} className="text-rose-400 animate-pulse" />
        ) : isModerate ? (
          <ShieldAlert size={14} className="text-amber-400" />
        ) : (
          <ShieldCheck size={14} className="text-emerald-400" />
        )}
      </div>

      {/* Circular Gauge */}
      <div className="relative my-2 flex items-center justify-center">
        <svg className="w-36 h-36 transform -rotate-90">
          {/* Background Track */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            className="text-slate-800"
          />
          {/* Active Fill Arc */}
          <circle
            cx="72"
            cy="72"
            r={radius}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            className={`${colorClass} transition-all duration-1000 ease-out`}
          />
        </svg>

        {/* Center Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl lg:text-4xl font-black text-white font-mono tracking-tight">
            {safeScore}
            <span className="text-sm font-semibold text-slate-500">%</span>
          </span>
          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">
            COMPOSITE
          </span>
        </div>
      </div>

      {/* Risk Level Badge */}
      <div className="w-full mt-2 flex flex-col items-center gap-2">
        <div
          className={`w-full py-1.5 px-3 rounded-full border text-center text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${badgeBgClass}`}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isCritical ? "bg-rose-400 animate-ping" : isModerate ? "bg-amber-400" : "bg-emerald-400"
            }`}
          />
          <span>{riskLevel}</span>
        </div>

        <div className="w-full grid grid-cols-3 gap-1 text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-800 text-center">
          <div className="bg-slate-950 p-1 rounded border border-slate-900">
            <span className="block text-slate-500">Thermal</span>
            <span className={isCritical ? "text-rose-400 font-bold" : "text-slate-300"}>
              {isCritical ? "Severe" : isModerate ? "Elevated" : "Nominal"}
            </span>
          </div>
          <div className="bg-slate-950 p-1 rounded border border-slate-900">
            <span className="block text-slate-500">pH Buffer</span>
            <span className={isCritical ? "text-amber-400 font-bold" : "text-slate-300"}>
              {isCritical ? "Stressed" : "Stable"}
            </span>
          </div>
          <div className="bg-slate-950 p-1 rounded border border-slate-900">
            <span className="block text-slate-500">Hypoxia</span>
            <span className="text-slate-300">Safe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
