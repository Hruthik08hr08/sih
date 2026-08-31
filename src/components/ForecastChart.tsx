import React, { useState } from "react";
import { ForecastPoint } from "../types";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Binary, Eye, Info, Sparkles } from "lucide-react";

interface ForecastChartProps {
  forecast: ForecastPoint[];
  loading: boolean;
}

export default function ForecastChart({ forecast, loading }: ForecastChartProps) {
  const [metricMode, setMetricMode] = useState<"temp" | "ph">("temp");

  if (!forecast || forecast.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 h-72 animate-pulse flex items-center justify-center text-slate-500 font-mono text-xs">
        Compiling Biogeochemical ML Forecast Model...
      </div>
    );
  }

  // Pre-process forecast data for chart
  const chartData = forecast.map((item, idx) => ({
    ...item,
    historicalTemp: !item.is_projected ? item.temp : null,
    projectedTemp: item.is_projected ? item.temp : null,
    // Connect the boundary point
    bridgeTemp: idx === 29 ? item.temp : idx === 30 ? item.temp : null,
    confidenceRange: item.upper_bound && item.lower_bound ? [item.lower_bound, item.upper_bound] : null,
    confidenceBound: item.upper_bound && item.lower_bound ? item.upper_bound - item.lower_bound : null,
    baseLower: item.lower_bound,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ForecastPoint;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono">
          <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-slate-800">
            <span className="font-bold text-slate-200">{label}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                data.is_projected
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              {data.is_projected ? "15-Day ML Projection" : "30-Day Historical"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-6">
              <span className="text-slate-400">Sea Surface Temp:</span>
              <span className="font-bold text-cyan-300">{data.temp.toFixed(2)} °C</span>
            </div>

            {data.is_projected && data.upper_bound && data.lower_bound && (
              <div className="flex items-center justify-between gap-6 text-[10px] text-slate-400">
                <span>95% Confidence Cone:</span>
                <span className="text-slate-300">
                  {data.lower_bound.toFixed(2)}° – {data.upper_bound.toFixed(2)}°C
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-6 pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Ocean pH:</span>
              <span className="font-bold text-blue-300">{data.ph.toFixed(2)} pH</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-cyan-500 rounded-full" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              ML Thermal Projection (15-Day Forward)
              <span className="text-[9px] font-mono text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 lowercase">
                lstm-v2
              </span>
            </h3>
          </div>
        </div>

        {/* Mode Toggle & Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 bg-cyan-500 rounded-full inline-block" /> Historical
            </span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 bg-cyan-500/30 rounded-full border border-cyan-400 inline-block" /> Predicted
            </span>
          </div>

          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px] font-medium">
            <button
              onClick={() => setMetricMode("temp")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                metricMode === "temp"
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Temp (°C)
            </button>
            <button
              onClick={() => setMetricMode("ph")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                metricMode === "ph"
                  ? "bg-cyan-500 text-slate-950 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              pH
            </button>
          </div>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="h-60 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="historicalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.6} />

            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={10}
              tickMargin={8}
              tickLine={false}
              interval={4}
            />

            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={metricMode === "temp" ? ["dataMin - 0.8", "dataMax + 0.8"] : ["dataMin - 0.05", "dataMax + 0.05"]}
              tickFormatter={(val) => (metricMode === "temp" ? `${val.toFixed(1)}°` : `${val.toFixed(2)}`)}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Threshold Reference Lines */}
            {metricMode === "temp" && (
              <ReferenceLine
                y={29.5}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{
                  value: "Bleaching Watch (29.5°C)",
                  fill: "#f43f5e",
                  fontSize: 9,
                  position: "insideTopRight",
                }}
              />
            )}

            {/* 30-Day Transition Divider */}
            <ReferenceLine
              x={forecast[29]?.date}
              stroke="#06b6d4"
              strokeDasharray="2 2"
              label={{
                value: "TODAY",
                fill: "#06b6d4",
                fontSize: 9,
                position: "insideTopLeft",
              }}
            />

            {metricMode === "temp" ? (
              <>
                {/* Historical Area */}
                <Area
                  type="monotone"
                  dataKey="historicalTemp"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fill="url(#historicalGrad)"
                  name="Historical"
                  connectNulls={false}
                />

                {/* Projected Area */}
                <Area
                  type="monotone"
                  dataKey="projectedTemp"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  fill="url(#projectedGrad)"
                  name="ML Projected"
                  connectNulls={false}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="ph"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                name="pH Level"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Indicator */}
      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <span>30-Day Sensor Baseline &bull; 15-Day Neural Trajectory</span>
        <span className="text-cyan-400 font-semibold">94.2% Confidence Cone</span>
      </div>
    </div>
  );
}
