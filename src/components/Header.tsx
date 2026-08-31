import React from "react";
import { Coordinates } from "../types";
import { RefreshCw, Waves, Activity } from "lucide-react";

interface HeaderProps {
  coordinates: Coordinates;
  locationName: string;
  loading: boolean;
  onRefresh: () => void;
  liveAiEnhanced?: boolean;
}

export default function Header({
  coordinates,
  locationName,
  loading,
  onRefresh,
  liveAiEnhanced,
}: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/50 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-md">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="bg-cyan-500 p-2.5 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center">
          <svg className="w-5 h-5 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tighter text-white">
              ORCA <span className="text-cyan-400">ENGINE</span>
            </h1>
            <span className="hidden sm:inline-block text-[9px] font-mono text-cyan-400/80 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40 uppercase">
              Autonomous
            </span>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">
            Marine Intelligence Synthesis
          </p>
        </div>
      </div>

      {/* Right Metadata & Status Bar */}
      <div className="flex flex-wrap items-center gap-5 sm:gap-8">
        {/* Active Sector Coordinates */}
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
            Active Sector
          </p>
          <p className="font-mono text-xs sm:text-sm text-cyan-400 font-semibold">
            {coordinates.lat >= 0 ? `${coordinates.lat.toFixed(4)}° N` : `${Math.abs(coordinates.lat).toFixed(4)}° S`},{" "}
            {coordinates.lon >= 0 ? `${coordinates.lon.toFixed(4)}° E` : `${Math.abs(coordinates.lon).toFixed(4)}° W`}
          </p>
        </div>

        {/* Live Systems Badge */}
        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            Systems Operational
          </span>
        </div>

        {/* Evaluation Trigger Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:shadow-[0_0_16px_rgba(6,182,212,0.5)] cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? "animate-spin text-slate-950" : "text-slate-950"} />
          <span className="font-semibold">{loading ? "Evaluating..." : "Scan Sector"}</span>
        </button>
      </div>
    </header>
  );
}

