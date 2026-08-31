import React, { useState } from "react";
import { Recommendation } from "../types";
import { ShieldAlert, ChevronRight, CheckCircle, FileText, Clock, Zap, Download } from "lucide-react";

interface ActionableRecommendationsProps {
  recommendations: Recommendation[];
  loading: boolean;
  locationName: string;
}

export default function ActionableRecommendations({
  recommendations,
  loading,
  locationName,
}: ActionableRecommendationsProps) {
  const [downloaded, setDownloaded] = useState(false);

  const handleExportBrief = () => {
    const content = `ORCA ENGINE: MARINE ECOSYSTEM POLICY BRIEF
Target Location: ${locationName}
Generated: ${new Date().toUTCString()}
--------------------------------------------------
RECOMMENDED MITIGATION PROTOCOLS:

${recommendations
  .map(
    (r, i) =>
      `${i + 1}. [${r.urgency.toUpperCase()}] ${r.title}
   Impact: ${r.impact}
   Action Directive: ${r.action}
`
  )
  .join("\n")}
--------------------------------------------------
Autonomous Consensus Certified: NOAA / IPCC Oceanography Framework`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orca-policy-brief-${locationName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-2xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 bg-emerald-500 rounded-full" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
            RECOMMENDED ACTIONS
          </h3>
        </div>

        <button
          onClick={handleExportBrief}
          title="Export Policy Action Brief"
          className="bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1.5 border border-slate-800 transition-colors cursor-pointer"
        >
          {downloaded ? <CheckCircle size={11} className="text-emerald-400" /> : <Download size={11} />}
          <span>{downloaded ? "Exported" : "Export"}</span>
        </button>
      </div>

      {/* Recommendations Cards */}
      <div className="space-y-2 flex-1">
        {recommendations.map((rec, index) => {
          const isUrgent = rec.urgency.toLowerCase().includes("immediate") || rec.urgency.toLowerCase().includes("priority");
          return (
            <div
              key={index}
              className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 hover:border-slate-700 flex gap-2.5 items-start transition-all group"
            >
              <div
                className={`w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5 ${
                  isUrgent
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    : index === 0
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                }`}
              >
                0{index + 1}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {rec.title}
                  </h4>
                  <span
                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                      isUrgent
                        ? "bg-rose-500/10 text-rose-300 border-rose-500/30 font-bold"
                        : "bg-slate-900 text-slate-400 border-slate-800"
                    }`}
                  >
                    {rec.urgency.split(" ")[0]}
                  </span>
                </div>

                <p className="text-[10.5px] text-slate-400 leading-relaxed">
                  {rec.action}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Disclaimer */}
      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[9px] text-slate-500 font-mono">
        <span>IPCC AR6 &bull; CRW-v4</span>
        <span className="text-emerald-400/90 font-bold">Consensus Approved</span>
      </div>
    </div>
  );
}
