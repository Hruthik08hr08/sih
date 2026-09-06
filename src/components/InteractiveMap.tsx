import React, { useEffect, useRef, useState } from "react";
import { Coordinates, PresetLocation } from "../types";
import { PRESET_LOCATIONS } from "../data/presets";
import { MapPin, Navigation, Compass, Layers, Crosshair, Search, Globe } from "lucide-react";
import L from "leaflet";

interface InteractiveMapProps {
  coordinates: Coordinates;
  onCoordinatesChange: (coords: Coordinates, presetName?: string) => void;
  activeLocationName: string;
  loading: boolean;
}

export default function InteractiveMap({
  coordinates,
  onCoordinatesChange,
  activeLocationName,
  loading,
}: InteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const darkLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.TileLayer | null>(null);

  const [customLat, setCustomLat] = useState(coordinates.lat.toString());
  const [customLon, setCustomLon] = useState(coordinates.lon.toString());
  const [mapLayer, setMapLayer] = useState<"dark" | "satellite">("dark");

  useEffect(() => {
    setCustomLat(coordinates.lat.toFixed(4));
    setCustomLon(coordinates.lon.toFixed(4));
  }, [coordinates]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [coordinates.lat, coordinates.lon],
      zoom: 6,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark Matter Tiles
    const darkTileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    });

    // Orbital High-Resolution Satellite Tiles
    const satelliteTileLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
      }
    );

    darkLayerRef.current = darkTileLayer;
    satelliteLayerRef.current = satelliteTileLayer;

    darkTileLayer.addTo(map);

    // Zoom control in bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Custom Target Reticle Icon
    const customIcon = L.divIcon({
      className: "custom-marine-marker",
      html: `
        <div class="relative flex items-center justify-center w-8 h-8 -ml-4 -mt-4">
          <div class="absolute w-8 h-8 rounded-full bg-cyan-500/20 animate-ping"></div>
          <div class="absolute w-6 h-6 rounded-full border border-cyan-400/80 bg-cyan-950/70 shadow-lg shadow-cyan-500/50 flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-cyan-400"></div>
          </div>
          <div class="absolute -top-1 w-2 h-0.5 bg-cyan-400"></div>
          <div class="absolute -bottom-1 w-2 h-0.5 bg-cyan-400"></div>
          <div class="absolute -left-1 w-0.5 h-2 bg-cyan-400"></div>
          <div class="absolute -right-1 w-0.5 h-2 bg-cyan-400"></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    const marker = L.marker([coordinates.lat, coordinates.lon], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    // Handle map click
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      const roundedLat = Number(lat.toFixed(4));
      const roundedLon = Number(lng.toFixed(4));
      marker.setLatLng([roundedLat, roundedLon]);
      onCoordinatesChange({ lat: roundedLat, lon: roundedLon });
    });

    // Handle marker drag
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      const roundedLat = Number(pos.lat.toFixed(4));
      const roundedLon = Number(pos.lng.toFixed(4));
      onCoordinatesChange({ lat: roundedLat, lon: roundedLon });
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map view when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - coordinates.lat) > 0.0001 ||
        Math.abs(currentPos.lng - coordinates.lon) > 0.0001
      ) {
        markerRef.current.setLatLng([coordinates.lat, coordinates.lon]);
        mapInstanceRef.current.setView([coordinates.lat, coordinates.lon], mapInstanceRef.current.getZoom(), {
          animate: true,
        });
      }
    }
  }, [coordinates]);

  // Switch between Dark and Satellite tile layers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (mapLayer === "satellite") {
      if (darkLayerRef.current) map.removeLayer(darkLayerRef.current);
      if (satelliteLayerRef.current) satelliteLayerRef.current.addTo(map);
    } else {
      if (satelliteLayerRef.current) map.removeLayer(satelliteLayerRef.current);
      if (darkLayerRef.current) darkLayerRef.current.addTo(map);
    }
  }, [mapLayer]);

  const handlePresetClick = (preset: PresetLocation) => {
    onCoordinatesChange({ lat: preset.lat, lon: preset.lon }, preset.name);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([preset.lat, preset.lon], 7, { duration: 1.2 });
    }
  };

  const handleManualCoordinateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(customLat);
    const lonNum = parseFloat(customLon);
    if (!isNaN(latNum) && !isNaN(lonNum) && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180) {
      onCoordinatesChange({ lat: Number(latNum.toFixed(4)), lon: Number(lonNum.toFixed(4)) });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([latNum, lonNum], 6, { duration: 1 });
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
      {/* Top Map Bar */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Compass size={15} />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
              Oceanic Spatial Telemetry
            </h2>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
              {activeLocationName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Layer Mode Toggle */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px] font-medium">
            <button
              onClick={() => setMapLayer("dark")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                mapLayer === "dark" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Radar
            </button>
            <button
              onClick={() => setMapLayer("satellite")}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                mapLayer === "satellite" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Globe size={10} />
              <span>Satellite</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-cyan-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            <Crosshair size={12} className="text-cyan-400 animate-pulse" />
            <span>
              {coordinates.lat >= 0 ? `${coordinates.lat.toFixed(2)}°N` : `${Math.abs(coordinates.lat).toFixed(2)}°S`},{" "}
              {coordinates.lon >= 0 ? `${coordinates.lon.toFixed(2)}°E` : `${Math.abs(coordinates.lon).toFixed(2)}°W`}
            </span>
          </div>
        </div>
      </div>

      {/* Preset Sector Selection Pills */}
      <div className="p-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800 text-[9px] font-bold text-cyan-400 uppercase tracking-wider shrink-0">
          SECTORS
        </div>
        {PRESET_LOCATIONS.map((preset) => {
          const isSelected =
            Math.abs(coordinates.lat - preset.lat) < 0.05 && Math.abs(coordinates.lon - preset.lon) < 0.05;
          return (
            <button
              key={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={`shrink-0 text-[10px] font-bold py-1 px-2.5 rounded border transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? "bg-cyan-600 text-white border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
            >
              <MapPin size={10} className={isSelected ? "text-white" : "text-slate-400"} />
              <span>{preset.name}</span>
            </button>
          );
        })}
      </div>

      {/* Map Container */}
      <div className="relative flex-1 min-h-[300px] w-full bg-[#020617]">
        {/* Background Dot Grid Layer */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none z-0"
          style={{
            backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div ref={mapContainerRef} className="h-full w-full z-0 relative" />

        {/* Live Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
            <span className="text-xs font-mono font-medium text-cyan-300 tracking-widest uppercase animate-pulse">
              Triangulating Sensor Ingress...
            </span>
          </div>
        )}

        {/* Floating Map Helper Badge */}
        <div className="absolute top-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2 pointer-events-none shadow-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Interactive Target Telemetry</span>
        </div>
      </div>

      {/* Bathymetry Scan Status Bar */}
      <div className="bg-slate-950 p-2.5 px-3.5 border-t border-slate-800 flex justify-between items-center text-[10px] font-bold">
        <span className="text-slate-500 uppercase tracking-wider">Bathymetry Scan</span>
        <span className="text-cyan-400 font-mono">4,200m depth • Sector Online</span>
      </div>

      {/* Bottom Manual Coordinates Form */}
      <form
        onSubmit={handleManualCoordinateSubmit}
        className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2"
      >
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-500 font-bold">
              LAT
            </span>
            <input
              type="number"
              step="0.0001"
              min="-90"
              max="90"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="10.5700"
            />
          </div>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-500 font-bold">
              LON
            </span>
            <input
              type="number"
              step="0.0001"
              min="-180"
              max="180"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-9 pr-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="72.6400"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
        >
          <Search size={12} />
          <span>Lock</span>
        </button>
      </form>
    </div>
  );
}
