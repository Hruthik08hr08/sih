import React, { useState, useEffect } from "react";
import { AgentLog } from "../types";
import { Terminal, Cpu, Database, Scale, CheckCircle2, ShieldAlert, Sparkles, Filter, Copy, Check } from "lucide-react";

interface AgentConsensusConsoleProps {
  logs: AgentLog[];
  loading: boolean;
  liveAiData?: {
    anomaly_analyst_note?: string;
    rag_specialist_note?: string;
    decision_synthesizer_note?: string;
  };
}

export default function AgentConsensusConsole({ logs, loading, liveAiData }: AgentConsensusConsoleProps) {
  const [filterAgent, setFilterAgent] = useState<string>("all");
  const [copied, setCopied] = useState(false);
  const [streamIndex, setStreamIndex] = useState<number>(0);

  // Progressive streaming reveal animation when new logs arrive
  useEffect(() => {
    if (logs && logs.length > 0) {
      setStreamIndex(1);
      const interval = setInterval(() => {
        setStreamIndex((prev) => {
          if (prev < logs.length) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 350);
      return () => clearInterval(interval);
    }
  }, [logs]);

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.agent}]: ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAgentBadge = (agent: string) => {
    if (agent.includes("Anomaly")) {
      return {
        name: "Agent 1",
        label: "Anomaly Analyst",
        icon: <Cpu size={13} className="text-amber-400" />,
        badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      };
    }
    if (agent.includes("RAG")) {
      return {
        name: "Agent 2",
        label: "RAG Specialist",
        icon: <Database size={13} className="text-cyan-400" />,
        badgeClass: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
      };
    }
    return {
      name: "Agent 3",
      label: "Decision Synthesizer",
      icon: <Scale size={13} className="text-emerald-400" />,
      badgeClass: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    };
  };

  const visibleLogs = logs.slice(0, streamIndex);
  const filteredLogs = visibleLogs.filter((log) => {
    if (filterAgent === "all") return true;
    if (filterAgent === "agent1") return log.agent.includes("Anomaly");
    if (filterAgent === "agent2") return log.agent.includes("RAG");
    if (filterAgent === "agent3") return log.agent.includes("Decision");
    return true;
  });

  return (
    <div className="bg-black rounded-2xl border border-slate-800 p-4 shadow-2xl flex flex-col justify-between font-mono text-[11px] backdrop-blur-md relative overflow-hidden">
      {/* Terminal Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-900 mb-3 text-[10px]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          <span className="text-cyan-400 font-bold tracking-wider uppercase">
            CORE REASONING FEED
          </span>
          <span className="hidden sm:inline text-slate-600 uppercase text-[9px] tracking-wider pl-2 border-l border-slate-800">
            Live Multi-Agent Stream
          </span>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5 text-[9px]">
            <button
              onClick={() => setFilterAgent("all")}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                filterAgent === "all" ? "bg-slate-800 text-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilterAgent("agent1")}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                filterAgent === "agent1" ? "bg-slate-800 text-cyan-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              ANALYST
            </button>
            <button
              onClick={() => setFilterAgent("agent2")}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                filterAgent === "agent2" ? "bg-slate-800 text-emerald-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              RAG
            </button>
            <button
              onClick={() => setFilterAgent("agent3")}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                filterAgent === "agent3" ? "bg-slate-800 text-purple-400 font-bold" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              SYNTH
            </button>
          </div>

          <button
            onClick={handleCopyLogs}
            title="Copy logs"
            className="p-1 bg-slate-950 hover:bg-slate-900 text-slate-500 hover:text-slate-300 rounded border border-slate-800 transition-colors cursor-pointer"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          </button>
        </div>
      </div>

      {/* Console Feed Body */}
      <div className="space-y-2 max-h-56 min-h-[190px] overflow-y-auto pr-1 select-text">
        {filteredLogs.map((log, index) => {
          const isAnalyst = log.agent.includes("Anomaly");
          const isRag = log.agent.includes("RAG");
          const isSynth = log.agent.includes("Decision");
          const isLast = index === filteredLogs.length - 1;

          return (
            <div
              key={index}
              className={`p-2 rounded-lg border transition-all ${
                isLast
                  ? "border-l-2 border-cyan-500 pl-2.5 bg-cyan-950/20 border-slate-800/80"
                  : "bg-slate-950/70 border-slate-900/80 hover:border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between text-[9px] mb-1">
                <div className="flex items-center gap-1.5 font-bold">
                  {isAnalyst && <span className="text-cyan-400">[ANALYST]</span>}
                  {isRag && <span className="text-emerald-400">[RAG_SPEC]</span>}
                  {isSynth && <span className="text-purple-400">[SYNTH]</span>}
                  <span className="text-slate-500 font-normal">{log.role}</span>
                </div>
                <span className="text-slate-600 font-mono">{log.timestamp}</span>
              </div>

              <p className="text-slate-300 text-[10.5px] leading-relaxed pl-1 font-mono">
                {log.message}
              </p>
            </div>
          );
        })}

        {/* Live AI Data Enrichment (if available) */}
        {liveAiData && (
          <div className="p-2 bg-cyan-950/30 rounded-lg border border-cyan-900/40 flex flex-col gap-1 text-[10px]">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[9px]">
              <Sparkles size={10} className="text-cyan-400" />
              <span>LIVE GEMINI AGENT SYNTHESIS</span>
            </div>
            {liveAiData.anomaly_analyst_note && (
              <p className="text-cyan-200/90">
                <strong className="text-cyan-400">[Analyst]:</strong> {liveAiData.anomaly_analyst_note}
              </p>
            )}
            {liveAiData.rag_specialist_note && (
              <p className="text-emerald-200/90">
                <strong className="text-emerald-400">[RAG]:</strong> {liveAiData.rag_specialist_note}
              </p>
            )}
            {liveAiData.decision_synthesizer_note && (
              <p className="text-purple-200/90">
                <strong className="text-purple-400">[Synthesizer]:</strong> {liveAiData.decision_synthesizer_note}
              </p>
            )}
          </div>
        )}

        {/* Streaming / Finished Indicator */}
        {loading ? (
          <div className="flex items-center gap-2 text-cyan-400 text-[10px] py-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="animate-pulse">Collaborative agents arbitrating consensus across 3 nodes...</span>
          </div>
        ) : streamIndex < logs.length ? (
          <div className="flex items-center gap-2 text-slate-500 text-[10px]">
            <span className="inline-block w-1.5 h-3 bg-cyan-400 animate-pulse" />
            <span>Streaming consensus arbitration...</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-emerald-400/90 text-[10px] pt-1">
            <CheckCircle2 size={11} />
            <span>Consensus verified • 94.6% agreement lock</span>
          </div>
        )}
      </div>

      {/* Terminal Footer Info */}
      <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[9px] text-slate-600">
        <span>Autonomous Reasoning Loop</span>
        <span className="text-cyan-500/80">3 Nodes Active</span>
      </div>
    </div>
  );
}
