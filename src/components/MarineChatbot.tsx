import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { Coordinates, OceanTelemetry } from "../types";
import {
  MessageSquare,
  Send,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Compass,
  ArrowDownCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
  Zap,
} from "lucide-react";

interface MarineChatbotProps {
  locationName: string;
  coordinates: Coordinates;
  telemetry: OceanTelemetry | null;
  healthScore?: number;
  riskLevel?: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  sectorTag?: string;
}

const QUICK_PROMPTS = [
  "🔮 Predict future 30-day bleaching risk for this sector",
  "🌡️ Explain current thermal anomaly & GEE satellite data",
  "🛡️ What urgent interventions can save this reef?",
  "🧪 How does the current pH affect coral calcification here?",
];

export default function MarineChatbot({
  locationName,
  coordinates,
  telemetry,
  healthScore,
  riskLevel,
}: MarineChatbotProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevLocationRef = useRef<string>(locationName);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome-1",
          sender: "bot",
          text: `Welcome to **ORCA Marine Copilot**. I am connected directly to Google Earth Engine satellite telemetry and the NOAA/IPCC knowledge base.\n\nI am currently analyzing **${locationName}** (${coordinates.lat.toFixed(
            2
          )}°, ${coordinates.lon.toFixed(
            2
          )}°). Tap any location on the map to switch targets, or ask me anything to project future ecological risks!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sectorTag: locationName,
        },
      ]);
    }
  }, []);

  // Detect when user taps a new location on the map
  useEffect(() => {
    if (prevLocationRef.current !== locationName && messages.length > 0) {
      prevLocationRef.current = locationName;
      setMessages((prev) => [
        ...prev,
        {
          id: `sector-update-${Date.now()}`,
          sender: "bot",
          text: `📍 **Target Sector Synced**: Now tracking **${locationName}** (${coordinates.lat.toFixed(
            4
          )}°N, ${coordinates.lon.toFixed(
            4
          )}°E).\nSST: **${telemetry?.sst ?? "--"}°C** (${(telemetry?.sst_anomaly ?? 0) >= 0 ? "+" : ""}${
            telemetry?.sst_anomaly ?? "--"
          }°C) | Health: **${healthScore ?? "--"}/100** (${riskLevel ?? "--"}).\nAsk me about future bleaching risk or conservation protocols for this area.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sectorTag: locationName,
        },
      ]);
    }
  }, [locationName, coordinates, telemetry, healthScore, riskLevel]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputMessage.trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          location_name: locationName,
          coordinates,
          telemetry,
          health_score: healthScore,
          risk_level: riskLevel,
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: data.reply || "Telemetry processed. No additional risk detected.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sectorTag: locationName,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "bot",
          text: `⚠️ **Analysis Notice**: Unable to query the remote model. Based on local satellite readings for ${locationName}, current SST is ${telemetry?.sst}°C (${telemetry?.sst_anomaly}°C anomaly). Degree heating is accumulating.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Trigger Button in Bottom-Right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 px-4 py-3 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_25px_rgba(6,182,212,0.6)] backdrop-blur-md transition-all duration-300 cursor-pointer"
        >
          <div className="relative">
            <Bot size={22} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Ask AI Copilot</span>
              <Sparkles size={11} className="text-cyan-400" />
            </p>
            <p className="text-[10px] font-mono text-cyan-400/80 truncate max-w-[140px]">
              {locationName}
            </p>
          </div>
        </button>
      )}

      {/* Main Chat Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 flex flex-col bg-slate-950 border border-slate-800 shadow-[0_10px_40px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden backdrop-blur-xl transition-all duration-300 ${
            isExpanded
              ? "w-[calc(100vw-32px)] sm:w-[680px] h-[calc(100vh-80px)] max-h-[780px]"
              : "w-[calc(100vw-32px)] sm:w-[440px] h-[580px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="bg-slate-900/90 border-b border-slate-800 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Bot size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-100">ORCA Marine AI Copilot</h3>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">
                    RAG ACTIVE
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 truncate max-w-[240px]">
                  Sector: <span className="text-cyan-400">{locationName}</span>
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Chat"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Real-Time Telemetry Bar for Current Location */}
          <div className="bg-slate-900/50 border-b border-slate-800/80 px-3.5 py-1.5 flex items-center justify-between text-[10px] font-mono text-slate-300">
            <div className="flex items-center gap-3">
              <span>
                SST: <strong className="text-cyan-400">{telemetry?.sst ?? "--"}°C</strong>
              </span>
              <span>
                Anomaly:{" "}
                <strong
                  className={(telemetry?.sst_anomaly ?? 0) > 0 ? "text-rose-400" : "text-emerald-400"}
                >
                  {(telemetry?.sst_anomaly ?? 0) >= 0 ? "+" : ""}
                  {telemetry?.sst_anomaly ?? "--"}°C
                </strong>
              </span>
              <span>
                pH: <strong className="text-purple-400">{telemetry?.ph ?? "--"}</strong>
              </span>
            </div>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                riskLevel === "Critical Risk"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
              }`}
            >
              {riskLevel || "Monitoring"}
            </span>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((msg) => {
              const isBot = msg.sender === "bot";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isBot ? "items-start" : "items-end flex-row-reverse"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isBot
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {isBot ? <Bot size={13} /> : <User size={13} />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      isBot
                        ? "bg-slate-900 border border-slate-800 text-slate-200 shadow-sm"
                        : "bg-cyan-600 text-slate-950 font-medium"
                    }`}
                  >
                    {/* Render message with rich Markdown support */}
                    <div className="space-y-1 overflow-x-auto break-words [&>p]:my-1 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>h3]:font-bold [&>h3]:text-cyan-300 [&>h4]:font-semibold [&>h4]:text-slate-100 [&>table]:w-full [&>table]:text-[10px] [&>table]:border-collapse [&>table]:my-2 [&_th]:border [&_th]:border-slate-700 [&_th]:p-1.5 [&_td]:border [&_td]:border-slate-800 [&_td]:p-1.5">
                      <Markdown>{msg.text}</Markdown>
                    </div>

                    <div
                      className={`flex items-center justify-between gap-2 mt-1.5 text-[9px] font-mono ${
                        isBot ? "text-slate-500" : "text-slate-900/70"
                      }`}
                    >
                      {msg.sectorTag && <span>Target: {msg.sectorTag}</span>}
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shrink-0">
                  <Bot size={13} />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                  <span className="font-mono text-[10px] text-cyan-400 ml-1">
                    Synthesizing Earth observation telemetry...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="bg-slate-950 px-3.5 pt-2 pb-1.5 border-t border-slate-900 flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap text-[10px] font-mono text-slate-300 bg-slate-900 hover:bg-slate-800 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/40 px-2.5 py-1 rounded-full transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <div className="p-3 bg-slate-900 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${locationName} or future outlook...`}
                className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 text-xs text-slate-200 placeholder-slate-500 rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold p-2.5 rounded-xl transition-all shadow-[0_0_10px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
