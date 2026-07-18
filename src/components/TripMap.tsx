"use client";

import { useEffect, useRef } from "react";

interface GPSPoint {
  lat: number;
  lng: number;
  speed: number;
  timestamp: number;
}

interface TripMapProps {
  lat: number;
  lng: number;
  track: GPSPoint[];
  currentSpeed: number;
}

export default function TripMap({ lat, lng, track, currentSpeed }: TripMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const trackLineRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamically import Leaflet
    const loadMap = async () => {
      const L = (await import("leaflet")).default;

      // Add Leaflet CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const map = L.map(mapRef.current!, {
        zoomControl: false,
        attributionControl: false,
      }).setView([lat, lng], 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Custom marker for current position
      const icon = L.divIcon({
        html: `<div style="width:20px;height:20px;background:#6366f1;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        className: "",
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      const trackLine = L.polyline([], { color: "#6366f1", weight: 4, opacity: 0.8 }).addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;
      trackLineRef.current = trackLine;

      // Fix map sizing
      setTimeout(() => map.invalidateSize(), 100);
    };

    loadMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng]);

  // Update position and track — always follow live GPS
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;

    markerRef.current.setLatLng([lat, lng]);
    mapInstanceRef.current.setView([lat, lng], mapInstanceRef.current.getZoom() || 17, { animate: true, duration: 0.5 });

    if (trackLineRef.current && track.length > 1) {
      const coords = track.map(p => [p.lat, p.lng] as [number, number]);
      trackLineRef.current.setLatLngs(coords);
    }
  }, [lat, lng, track]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      {/* Speed overlay */}
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg z-[1000]">
        <p className={`text-xl font-bold ${currentSpeed > 50 ? "text-red-600" : currentSpeed > 30 ? "text-amber-600" : "text-emerald-600"}`}>
          {Math.round(currentSpeed)} km/h
        </p>
      </div>
      {/* Street overlay */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg z-[1000]">
        <p className="text-xs text-slate-500">📍 Current Position</p>
        <p className="text-sm font-medium text-slate-900">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
      </div>
    </div>
  );
}
