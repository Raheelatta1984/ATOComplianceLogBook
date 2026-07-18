"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { fmtOdo } from "@/lib/format";

const TripMap = dynamic(() => import("@/components/TripMap"), { ssr: false });

type Phase = "idle" | "starting" | "odometer_start" | "driving" | "odometer_end" | "saving" | "done";
type SpeedAlertType = "camera" | "speed" | null;

interface GPSPoint {
  lat: number;
  lng: number;
  speed: number;
  timestamp: number;
  heading?: number;
}

interface ActiveTrip {
  startTime: string;
  startLat: number;
  startLng: number;
  startAddress: string;
  startOdometer: number;
  gpsTrack: GPSPoint[];
  maxSpeed: number;
  totalDistance: number;
}

// Speed limits by road type (approximate Australia)
const SPEED_LIMITS: Record<string, number> = {
  residential: 50,
  urban: 60,
  arterial: 80,
  highway: 110,
  school: 40,
};

export default function TripPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [trip, setTrip] = useState<ActiveTrip | null>(null);
  const [odometerInput, setOdometerInput] = useState("");
  const [endOdometerInput, setEndOdometerInput] = useState("");
  const [isBusinessTrip, setIsBusinessTrip] = useState(true);
  const [notes, setNotes] = useState("");
  const [todayCount, setTodayCount] = useState(0);
  const [elapsed, setElapsed] = useState("00:00");
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [currentAddress, setCurrentAddress] = useState("");
  const [speedAlert, setSpeedAlert] = useState<SpeedAlertType>(null);
  const [alertMsg, setAlertMsg] = useState("");
  const [stopSuggestion, setStopSuggestion] = useState(false);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [lastOdoEnd, setLastOdoEnd] = useState<number | null>(null);
  const [streetName, setStreetName] = useState("");
  const [liveLat, setLiveLat] = useState(-33.8688);
  const [liveLng, setLiveLng] = useState(151.2093);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastPosRef = useRef<GPSPoint | null>(null);
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const positionBufferRef = useRef<GPSPoint[]>([]);
  const speedHistoryRef = useRef<number[]>([]);

  // Fetch today count and last odometer
  const fetchLastOdo = useCallback(() => {
    fetch("/api/last-odo").then(r => r.json()).then(data => {
      if (data.lastOdometer) setLastOdoEnd(data.lastOdometer);
      if (data.todayCount !== undefined) setTodayCount(data.todayCount);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchLastOdo(); }, [fetchLastOdo]);

  // Timer
  useEffect(() => {
    if (phase === "driving") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const diff = Date.now() - startTimeRef.current;
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsed(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const reverseGeocode = async (lat: number, lng: number): Promise<{ address: string; street: string }> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": "TripLog-ATO/2.0" } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const street = addr.road || addr.pedestrian || addr.street || "";
      const suburb = addr.suburb || addr.city_district || addr.town || "";
      const state = addr.state || "";
      const postcode = addr.postcode || "";
      return {
        address: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        street: street ? `${street}${suburb ? ', ' + suburb : ''}` : suburb || "Unknown street",
      };
    } catch {
      return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, street: "Unknown street" };
    }
  };

  const calcDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Handle GPS position update
  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, speed } = pos.coords;
    const spd = speed ? speed * 3.6 : 0; // m/s to km/h
    const point: GPSPoint = { lat, lng, speed: spd, timestamp: Date.now() };

    setCurrentSpeed(spd);
    setLiveLat(lat);
    setLiveLng(lng);
    positionBufferRef.current.push(point);
    speedHistoryRef.current.push(spd);

    // Calculate GPS distance
    if (lastPosRef.current) {
      const segDist = calcDistance(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng);
      if (segDist > 0.005 && segDist < 2) { // Filter out GPS jitter and bad readings
        setGpsDistance(prev => prev + segDist);
      }
    }
    lastPosRef.current = point;

    // Speed limit alert (assume 50km/h default urban)
    if (spd > 55) {
      setSpeedAlert("speed");
      setAlertMsg(`⚠️ Speed: ${Math.round(spd)} km/h — Slow down!`);
    } else {
      if (speedAlert === "speed") setSpeedAlert(null);
    }

    // Auto-stop detection: if speed 0 for 3 seconds
    if (spd < 1) {
      if (!stopTimerRef.current) {
        stopTimerRef.current = setTimeout(() => {
          setStopSuggestion(true);
          // Auto-hide after 8 seconds
          setTimeout(() => setStopSuggestion(false), 8000);
        }, 3000);
      }
    } else {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      setStopSuggestion(false);
    }

    // Street name update (throttled)
    if (positionBufferRef.current.length % 5 === 0) {
      reverseGeocode(lat, lng).then(({ street }) => setStreetName(street));
    }
  }, [speedAlert]);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, () => {}, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 2000,
    });
  }, [handlePosition]);

  const stopGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopGPS();
  }, [stopGPS]);

  // Background handling
  useEffect(() => {
    const handleVisibility = () => {
      if (phase === "driving" && document.visibilityState === "visible") {
        // Re-check GPS when coming back to foreground
        if (!watchIdRef.current) startGPS();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase, startGPS]);

  // START TRIP — always fetch latest odometer first
  const handleStartTrip = async () => {
    setPhase("starting");

    // Fetch the highest odometer reading fresh
    let freshOdo: number | null = null;
    try {
      const odoRes = await fetch("/api/last-odo");
      const odoData = await odoRes.json();
      freshOdo = odoData.lastOdometer;
      if (odoData.todayCount !== undefined) setTodayCount(odoData.todayCount);
      if (freshOdo) setLastOdoEnd(freshOdo);
    } catch {}

    let lat = -33.8688, lng = 151.2093, address = "Sydney NSW";
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      const geo = await reverseGeocode(lat, lng);
      address = geo.address;
      setStreetName(geo.street);
    } catch { /* use defaults */ }

    setTrip({
      startTime: new Date().toTimeString().slice(0, 5),
      startLat: lat, startLng: lng, startAddress: address,
      startOdometer: 0, gpsTrack: [], maxSpeed: 0, totalDistance: 0,
    });
    // Always use the highest odometer — never show 0
    setOdometerInput(freshOdo ? String(freshOdo) : "");
    setCurrentAddress(address);
    setPhase("odometer_start");
  };

  // CONFIRM START ODO → BEGIN DRIVING
  const handleConfirmStartOdometer = () => {
    const odo = parseFloat(odometerInput);
    if (!odo || odo <= 0) return;
    setTrip(prev => prev ? { ...prev, startOdometer: odo } : null);
    setEndOdometerInput("");
    setGpsDistance(0);
    speedHistoryRef.current = [];
    positionBufferRef.current = [];
    lastPosRef.current = null;
    setPhase("driving");
    startGPS();
  };

  // STOP TRIP
  const handleStopTrip = () => {
    stopGPS();
    if (trip) {
      const estDist = Math.round(gpsDistance) || Math.round((parseFloat(elapsed) || 5) * 0.5);
      setEndOdometerInput(String(trip.startOdometer + Math.max(1, estDist)));
    }
    setPhase("odometer_end");
  };

  // SAVE TRIP
  const handleSaveTrip = async () => {
    if (!trip || !endOdometerInput) return;
    setPhase("saving");
    const endOdo = parseFloat(endOdometerInput);
    let endLat = trip.startLat, endLng = trip.startLng, endAddr = trip.startAddress;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
      });
      endLat = pos.coords.latitude;
      endLng = pos.coords.longitude;
      const geo = await reverseGeocode(endLat, endLng);
      endAddr = geo.address;
    } catch { /* use start location */ }

    const odoDist = endOdo - trip.startOdometer;
    const avgSpd = speedHistoryRef.current.length > 0
      ? speedHistoryRef.current.reduce((a, b) => a + b, 0) / speedHistoryRef.current.length
      : 0;

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripDate: new Date().toISOString().split("T")[0],
          startTime: trip.startTime,
          endTime: new Date().toTimeString().slice(0, 5),
          startOdometer: trip.startOdometer,
          endOdometer: endOdo,
          pickupAddress: trip.startAddress,
          pickupLat: trip.startLat,
          pickupLng: trip.startLng,
          dropoffAddress: endAddr,
          dropoffLat: endLat,
          dropoffLng: endLng,
          isBusinessTrip,
          tripPurpose: notes || undefined,
          notes: notes || undefined,
          source: "gps",
          gpsTrack: positionBufferRef.current.slice(-500),
          maxSpeed: Math.round(Math.max(trip.maxSpeed, ...speedHistoryRef.current) * 10) / 10,
          avgSpeed: Math.round(avgSpd * 10) / 10,
          gpsDistanceKm: Math.round(gpsDistance * 100) / 100,
        }),
      });

      if (res.ok) {
        // Save daily odometer end
        fetch("/api/daily-odo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endOdometer: endOdo }),
        });
        setPhase("done");
        setTodayCount(c => c + 1);
      } else {
        setPhase("odometer_end");
      }
    } catch {
      setPhase("odometer_end");
    }
  };

  const handleNextTrip = async () => {
    // Fetch the latest odometer before resetting
    try {
      const odoRes = await fetch("/api/last-odo");
      const odoData = await odoRes.json();
      if (odoData.lastOdometer) setLastOdoEnd(odoData.lastOdometer);
      if (odoData.todayCount !== undefined) setTodayCount(odoData.todayCount);
    } catch {}
    setTrip(null);
    setOdometerInput("");
    setEndOdometerInput("");
    setNotes("");
    setElapsed("00:00");
    setGpsDistance(0);
    setCurrentSpeed(0);
    setSpeedAlert(null);
    setStopSuggestion(false);
    speedHistoryRef.current = [];
    positionBufferRef.current = [];
    lastPosRef.current = null;
    setPhase("idle");
  };

  const nextTripOdo = lastOdoEnd || (trip?.startOdometer ? trip.startOdometer + Math.round(gpsDistance || 1) : 0);

  // ===== IDLE =====
  if (phase === "idle") {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center pb-32 animate-fadeIn">
        <p className="text-slate-400 text-sm mb-2">Trip #{todayCount + 1} today</p>
        {lastOdoEnd && (
          <p className="text-xs text-slate-400 mb-6">Last odometer: {fmtOdo(lastOdoEnd)} km</p>
        )}
        <button onClick={handleStartTrip}
          className="w-52 h-52 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-2xl active:scale-95 transition-all flex flex-col items-center justify-center">
          <span className="text-6xl mb-2">▶</span>
          <span className="text-2xl font-bold">START</span>
          <span className="text-sm opacity-80">Trip #{todayCount + 1}</span>
        </button>
        <div className="mt-8 flex gap-3">
          <button onClick={() => router.push("/manual-trip")}
            className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            ✏️ Manual Entry
          </button>
          <button onClick={() => router.push("/history")}
            className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            📋 History
          </button>
        </div>
      </div>
    );
  }

  // ===== STARTING =====
  if (phase === "starting") {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center pb-32 animate-fadeIn">
        <div className="w-44 h-44 rounded-full bg-amber-100 flex flex-col items-center justify-center animate-pulse-slow">
          <span className="text-5xl mb-2">📡</span>
          <span className="text-lg font-medium text-amber-700">Getting Location...</span>
        </div>
      </div>
    );
  }

  // ===== ODOMETER START =====
  if (phase === "odometer_start" && trip) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center pb-32 animate-fadeIn">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <span className="text-4xl">📏</span>
            <h2 className="mt-3 text-xl font-bold text-slate-900">Start Odometer</h2>
            <p className="text-sm text-slate-500 mt-1">Read your dashboard — enter current km</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setOdometerInput((parseFloat(odometerInput || "0") - 0.1).toFixed(1))}
                className="w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600 active:scale-95">−</button>
              <input type="number" step="0.1" value={odometerInput} onChange={e => setOdometerInput(e.target.value)}
                className="w-40 text-center text-4xl font-bold text-slate-900 bg-transparent border-b-4 border-indigo-500 outline-none py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.0" inputMode="decimal" autoFocus />
              <button onClick={() => setOdometerInput((parseFloat(odometerInput || "0") + 0.1).toFixed(1))}
                className="w-14 h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 text-2xl font-bold text-slate-600 active:scale-95">+</button>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {[0.1, 0.5, 1, 5, 10].map(inc => (
                <button key={inc} onClick={() => setOdometerInput((parseFloat(odometerInput || "0") + inc).toFixed(1))}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-medium">+{inc}</button>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500 mt-2">km</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
            <p>📍 {trip.startAddress.slice(0, 80)}</p>
            <p>🕐 {trip.startTime} • 🛰️ GPS Active</p>
          </div>
          <button onClick={handleConfirmStartOdometer} disabled={!odometerInput || parseFloat(odometerInput) <= 0}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-bold rounded-2xl disabled:opacity-40 active:scale-[0.98]">
            ✓ Confirm & Start Driving
          </button>
        </div>
      </div>
    );
  }

  // ===== DRIVING =====
  if (phase === "driving") {
    return (
      <div className="pb-32 animate-fadeIn">
        {/* Speed & Status Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900">{elapsed}</p>
                <p className="text-xs text-slate-500">{streetName || "Locating..."}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-bold ${currentSpeed > 50 ? "text-red-600" : "text-slate-900"}`}>
                {Math.round(currentSpeed)}
              </p>
              <p className="text-xs text-slate-500">km/h</p>
            </div>
          </div>
          {/* Speed bar */}
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${currentSpeed > 50 ? "bg-red-500" : currentSpeed > 30 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, (currentSpeed / 120) * 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-slate-400">
            <span>0</span><span>30</span><span>60</span><span>90</span><span>120</span>
          </div>
        </div>

        {/* Alert banner */}
        {speedAlert && (
          <div className={`px-4 py-3 rounded-xl mb-3 text-center font-medium text-sm animate-fadeIn ${
            speedAlert === "speed" ? "bg-red-100 text-red-700 border border-red-200" : "bg-amber-100 text-amber-700"
          }`}>{alertMsg}</div>
        )}

        {/* Map */}
        <div className="rounded-2xl overflow-hidden border border-slate-200 mb-3" style={{ height: "45vh" }}>
          <TripMap
            lat={liveLat} lng={liveLng}
            track={positionBufferRef.current.slice(-200)}
            currentSpeed={currentSpeed}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
            <p className="text-xs text-slate-500">GPS Dist</p>
            <p className="text-lg font-bold text-indigo-600">{gpsDistance.toFixed(1)}</p>
            <p className="text-[10px] text-slate-400">km</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
            <p className="text-xs text-slate-500">Start Odo</p>
            <p className="text-lg font-bold text-slate-900">{trip?.startOdometer}</p>
            <p className="text-[10px] text-slate-400">km</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center border border-slate-100">
            <p className="text-xs text-slate-500">Waypoints</p>
            <p className="text-lg font-bold text-slate-900">{positionBufferRef.current.length}</p>
            <p className="text-[10px] text-slate-400">pts</p>
          </div>
        </div>

        {/* Stop suggestion (auto-hide) */}
        {stopSuggestion && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 animate-fadeIn text-center">
            <p className="text-sm font-medium text-amber-700 mb-2">🚗 Vehicle stopped — End this trip?</p>
            <button onClick={handleStopTrip}
              className="px-6 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium">Yes, Stop Trip</button>
          </div>
        )}

        {/* Stop button */}
        <button onClick={handleStopTrip}
          className="w-full py-5 bg-red-600 hover:bg-red-700 text-white text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98] flex items-center justify-center gap-3">
          <span className="text-3xl">⏹</span> STOP TRIP
        </button>
      </div>
    );
  }

  // ===== ODOMETER END =====
  if (phase === "odometer_end" && trip) {
    const suggested = trip.startOdometer + Math.max(1, Math.round(gpsDistance));
    const endOdo = parseFloat(endOdometerInput) || 0;
    const dist = endOdo - trip.startOdometer;

    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center pb-32 animate-fadeIn">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <span className="text-4xl">📏</span>
            <h2 className="mt-3 text-xl font-bold text-slate-900">End Odometer</h2>
            <p className="text-sm text-slate-500 mt-1">Duration: {elapsed} • GPS: {gpsDistance.toFixed(1)} km</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setEndOdometerInput((Math.max(trip.startOdometer, parseFloat(endOdometerInput || String(suggested)) - 0.1)).toFixed(1))}
                className="w-14 h-14 rounded-2xl bg-slate-100 text-2xl font-bold text-slate-600 active:scale-95">−</button>
              <input type="number" step="0.1" value={endOdometerInput} onChange={e => setEndOdometerInput(e.target.value)}
                className="w-40 text-center text-4xl font-bold text-slate-900 bg-transparent border-b-4 border-emerald-500 outline-none py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder={String(suggested)} inputMode="decimal" autoFocus />
              <button onClick={() => setEndOdometerInput((parseFloat(endOdometerInput || String(suggested)) + 0.1).toFixed(1))}
                className="w-14 h-14 rounded-2xl bg-slate-100 text-2xl font-bold text-slate-600 active:scale-95">+</button>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              {[0.1, 0.5, 1, 5, 10].map(inc => (
                <button key={inc} onClick={() => setEndOdometerInput((parseFloat(endOdometerInput || String(suggested)) + inc).toFixed(1))}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium">+{inc}</button>
              ))}
            </div>
          </div>
          {dist > 0 && (
            <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-200">
              <p className="text-sm text-emerald-700">Distance: <span className="font-bold text-lg">{dist} km</span></p>
              <p className="text-xs text-emerald-600 mt-1">GPS tracked: {gpsDistance.toFixed(1)} km • Max speed: {trip.maxSpeed} km/h</p>
            </div>
          )}
          <label className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 cursor-pointer">
            <input type="checkbox" checked={isBusinessTrip} onChange={e => setIsBusinessTrip(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
            <div><p className="font-medium text-slate-900 text-sm">Business Trip</p><p className="text-xs text-slate-500">For ATO tax claims</p></div>
          </label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional note..." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={handleSaveTrip} disabled={!endOdometerInput || parseFloat(endOdometerInput) < trip.startOdometer}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold rounded-2xl disabled:opacity-40 active:scale-[0.98]">
            💾 Save Trip
          </button>
        </div>
      </div>
    );
  }

  // ===== SAVING =====
  if (phase === "saving") {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center pb-32 animate-fadeIn">
        <div className="w-44 h-44 rounded-full bg-blue-100 flex flex-col items-center justify-center animate-pulse-slow">
          <span className="text-5xl mb-2">💾</span>
          <span className="text-lg font-medium text-blue-700">Saving Trip...</span>
        </div>
      </div>
    );
  }

  // ===== DONE =====
  if (phase === "done") {
    const dist = trip ? parseFloat(endOdometerInput) - trip.startOdometer : 0;
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center pb-32 animate-fadeIn">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-28 h-28 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <span className="text-6xl">✅</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Trip Saved!</h2>
            <p className="text-slate-500 mt-1">Trip #{todayCount} • {dist} km driven</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-left space-y-2">
            {trip && <>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Duration</span><span className="font-medium">{elapsed}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Odometer</span><span className="font-medium">{fmtOdo(trip.startOdometer)} → {fmtOdo(endOdometerInput)} km</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">GPS Distance</span><span className="font-medium">{gpsDistance.toFixed(1)} km</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Max Speed</span><span className="font-medium">{trip.maxSpeed} km/h</span></div>
            </>}
          </div>
          <div className="flex gap-3">
            <button onClick={handleNextTrip} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl active:scale-[0.98]">
              ▶ Start Next Trip
            </button>
            <button onClick={() => router.push("/dashboard")} className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl">🏠</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
