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
}

interface ActiveTrip {
  startTime: string;
  startLat: number;
  startLng: number;
  startAddress: string;
  startOdometer: number;
  pickupMode: boolean;
}

export default function TripPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [trip, setTrip] = useState<ActiveTrip | null>(null);
  const [odometerInput, setOdometerInput] = useState("");
  const [endOdometerInput, setEndOdometerInput] = useState("");
  const [isBusinessTrip, setIsBusinessTrip] = useState(true);
  const [pickupMode, setPickupMode] = useState(false);
  const [notes, setNotes] = useState("");
  const [todayCount, setTodayCount] = useState(0);
  const [elapsed, setElapsed] = useState("00:00");
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [speedAlert, setSpeedAlert] = useState<SpeedAlertType>(null);
  const [alertMsg, setAlertMsg] = useState("");
  const [stopSuggestion, setStopSuggestion] = useState(false);
  const [gpsDistance, setGpsDistance] = useState(0);
  const [lastOdoEnd, setLastOdoEnd] = useState<number | null>(null);
  const [streetName, setStreetName] = useState("");
  const [liveLat, setLiveLat] = useState(-33.8688);
  const [liveLng, setLiveLng] = useState(151.2093);
  const [movementBanner, setMovementBanner] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const idleWatchIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastPosRef = useRef<GPSPoint | null>(null);
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const positionBufferRef = useRef<GPSPoint[]>([]);
  const speedHistoryRef = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("idle");
  const moveDetectedCountRef = useRef(0);

  phaseRef.current = phase;

  // Fetch latest odometer + today's count
  const fetchLastOdo = useCallback(() => {
    fetch("/api/last-odo").then(r => r.json()).then(data => {
      if (data.lastOdometer) setLastOdoEnd(data.lastOdometer);
      if (data.todayCount !== undefined) setTodayCount(data.todayCount);
    }).catch(() => {});
  }, []);

  useEffect(() => { fetchLastOdo(); }, [fetchLastOdo]);

  // ===== Movement detection while IDLE (auto-start suggestion) =====
  useEffect(() => {
    if (phase !== "idle") {
      if (idleWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(idleWatchIdRef.current);
        idleWatchIdRef.current = null;
      }
      setMovementBanner(false);
      moveDetectedCountRef.current = 0;
      return;
    }
    if (!navigator.geolocation) return;

    idleWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const spd = pos.coords.speed ? pos.coords.speed * 3.6 : 0;
        // Only suggest if genuinely moving — 2 consecutive readings > 12 km/h
        if (spd > 12 && phaseRef.current === "idle") {
          moveDetectedCountRef.current++;
          if (moveDetectedCountRef.current >= 2) {
            setMovementBanner(true);
            setTimeout(() => setMovementBanner(false), 15000);
          }
        } else {
          moveDetectedCountRef.current = 0;
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 3000 }
    );

    return () => {
      if (idleWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(idleWatchIdRef.current);
        idleWatchIdRef.current = null;
      }
    };
  }, [phase]);

  // Timer for driving
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
        { headers: { "User-Agent": "TripLog-ATO/3.0" } }
      );
      const data = await res.json();
      const addr = data.address || {};
      const street = addr.road || addr.pedestrian || addr.street || "";
      const suburb = addr.suburb || addr.city_district || addr.town || "";
      return {
        address: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        street: street ? `${street}${suburb ? ", " + suburb : ""}` : suburb || "Unknown street",
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

  // GPS handler — only accumulates distance when actually moving
  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const { latitude: lat, longitude: lng, speed } = pos.coords;
    const spd = speed ? speed * 3.6 : 0;
    const point: GPSPoint = { lat, lng, speed: spd, timestamp: Date.now() };

    setCurrentSpeed(spd);
    setLiveLat(lat);
    setLiveLng(lng);
    positionBufferRef.current.push(point);
    speedHistoryRef.current.push(spd);

    // GPS distance ONLY grows when moving — stationary = no odo increment
    if (lastPosRef.current && spd > 3) {
      const segDist = calcDistance(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng);
      if (segDist > 0.003 && segDist < 2) {
        setGpsDistance(prev => prev + segDist);
      }
    }
    lastPosRef.current = point;

    // Speed alert
    if (spd > 55) {
      setSpeedAlert("speed");
      setAlertMsg(`⚠️ Speed: ${Math.round(spd)} km/h — Slow down!`);
    } else if (speedAlert === "speed") {
      setSpeedAlert(null);
    }

    // Stationary 3s → suggest stopping
    if (spd < 1) {
      if (!stopTimerRef.current) {
        stopTimerRef.current = setTimeout(() => {
          setStopSuggestion(true);
          setTimeout(() => setStopSuggestion(false), 10000);
        }, 3000);
      }
    } else {
      if (stopTimerRef.current) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      setStopSuggestion(false);
    }

    // Street name (throttled)
    if (positionBufferRef.current.length % 5 === 0) {
      reverseGeocode(lat, lng).then(({ street }) => setStreetName(street));
    }
  }, [speedAlert]);

  const startDrivingGPS = useCallback(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, () => {}, {
      enableHighAccuracy: true, timeout: 5000, maximumAge: 2000,
    });
  }, [handlePosition]);

  const stopDrivingGPS = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopDrivingGPS(), [stopDrivingGPS]);

  // START TRIP — fresh odometer fetch
  const handleStartTrip = useCallback(async (isPickup: boolean = false) => {
    setPickupMode(isPickup);
    setMovementBanner(false);
    setPhase("starting");
    let freshOdo: number | null = null;
    try {
      const odoRes = await fetch("/api/last-odo");
      const odoData = await odoRes.json();
      freshOdo = odoData.lastOdometer;
      if (odoData.todayCount !== undefined) setTodayCount(odoData.todayCount);
      if (freshOdo) setLastOdoEnd(freshOdo);
    } catch {}

    let lat = liveLat, lng = liveLng, address = "Locating...";
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      setLiveLat(lat);
      setLiveLng(lng);
      const geo = await reverseGeocode(lat, lng);
      address = geo.address;
      setStreetName(geo.street);
    } catch {}

    setTrip({
      startTime: new Date().toTimeString().slice(0, 5),
      startLat: lat, startLng: lng, startAddress: address,
      startOdometer: 0, pickupMode: isPickup,
    });
    setOdometerInput(freshOdo ? freshOdo.toFixed(1) : "");
    setPhase("odometer_start");
  }, [liveLat, liveLng]);

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
    startDrivingGPS();
  };

  const handleStopTrip = () => {
    stopDrivingGPS();
    if (trip) {
      const est = trip.startOdometer + Math.max(0.1, gpsDistance);
      setEndOdometerInput(est.toFixed(1));
    }
    setPhase("odometer_end");
  };

  const handleSaveTrip = async () => {
    if (!trip || !endOdometerInput) return;
    setPhase("saving");
    const endOdo = parseFloat(endOdometerInput);
    let endLat = liveLat, endLng = liveLng, endAddr = "End location";
    try {
      const geo = await reverseGeocode(endLat, endLng);
      endAddr = geo.address;
    } catch {}

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
          startOdometer: trip.startOdometer.toFixed(2),
          endOdometer: endOdo.toFixed(2),
          pickupAddress: trip.startAddress,
          pickupLat: trip.startLat,
          pickupLng: trip.startLng,
          dropoffAddress: endAddr,
          dropoffLat: endLat,
          dropoffLng: endLng,
          isBusinessTrip,
          tripPurpose: trip.pickupMode ? "🚕 Passenger pickup run" : (notes || undefined),
          notes: notes || undefined,
          source: "gps",
          gpsTrack: positionBufferRef.current.slice(-500),
          maxSpeed: Math.round(Math.max(...speedHistoryRef.current) * 10) / 10,
          avgSpeed: Math.round(avgSpd * 10) / 10,
          gpsDistanceKm: Math.round(gpsDistance * 100) / 100,
        }),
      });
      if (res.ok) {
        const tripJson = await res.json();
        // Save daily odometer end
        fetch("/api/daily-odo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endOdometer: endOdo.toFixed(2) }),
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

  const handleNextTrip = () => {
    setTrip(null);
    setOdometerInput("");
    setEndOdometerInput("");
    setNotes("");
    setPickupMode(false);
    setElapsed("00:00");
    setGpsDistance(0);
    setCurrentSpeed(0);
    setSpeedAlert(null);
    setStopSuggestion(false);
    speedHistoryRef.current = [];
    positionBufferRef.current = [];
    lastPosRef.current = null;
    fetchLastOdo();
    setPhase("idle");
  };

  // live estimated odometer while driving
  const liveOdo = trip ? trip.startOdometer + gpsDistance : 0;

  // ===== IDLE =====
  if (phase === "idle") {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center pb-32 animate-fadeIn">
        {movementBanner && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-fadeIn max-w-sm text-center">
            <p className="font-bold">🚗 You&apos;re moving!</p>
            <p className="text-sm text-white/80 mt-1">Want to start a trip?</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleStartTrip(false)}
                className="flex-1 py-2 bg-white text-indigo-700 rounded-xl text-sm font-bold">Start Trip</button>
              <button onClick={() => setMovementBanner(false)}
                className="px-4 py-2 bg-white/20 text-white rounded-xl text-sm">Ignore</button>
            </div>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">TripLog</h1>
          <p className="text-slate-500 text-sm mt-1">Trip #{todayCount + 1} today</p>
          {lastOdoEnd && (
            <p className="text-xs text-slate-400 mt-1">Odometer: {fmtOdo(lastOdoEnd)} km</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <button onClick={() => handleStartTrip(false)}
            className="h-40 rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center">
            <span className="text-4xl mb-2">▶</span>
            <span className="font-bold">START TRIP</span>
            <span className="text-xs opacity-80 mt-1">Passenger on board</span>
          </button>
          <button onClick={() => handleStartTrip(true)}
            className="h-40 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center">
            <span className="text-4xl mb-2">🚕</span>
            <span className="font-bold">PICKUP MODE</span>
            <span className="text-xs opacity-80 mt-1">Going to get passenger</span>
          </button>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => router.push("/manual-trip")}
            className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">✏️ Manual</button>
          <button onClick={() => router.push("/history")}
            className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">📋 History</button>
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
          <span className="text-lg font-medium text-amber-700">Getting GPS...</span>
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
            <span className="text-4xl">{pickupMode ? "🚕" : "📏"}</span>
            <h2 className="mt-3 text-xl font-bold text-slate-900">
              {pickupMode ? "Pickup Run — Start Odometer" : "Start Odometer"}
            </h2>
            <p className="text-sm text-slate-500 mt-1">Default: your last reading</p>
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
            <p>🕐 {trip.startTime} • 🛰️ GPS ready</p>
          </div>
          <button onClick={handleConfirmStartOdometer} disabled={!odometerInput || parseFloat(odometerInput) <= 0}
            className={`w-full py-4 text-white text-lg font-bold rounded-2xl disabled:opacity-40 active:scale-[0.98] ${
              pickupMode ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
            }`}>
            ✓ Confirm & {pickupMode ? "Go Pickup" : "Start Driving"}
          </button>
        </div>
      </div>
    );
  }

  // ===== DRIVING =====
  if (phase === "driving") {
    return (
      <div className="pb-32 animate-fadeIn">
        {pickupMode && (
          <div className="bg-amber-100 border border-amber-300 rounded-xl px-4 py-2 mb-3 text-center">
            <p className="text-sm font-medium text-amber-800">🚕 Pickup mode — heading to passenger</p>
          </div>
        )}

        {/* Speed & Status */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${currentSpeed > 1 ? "bg-red-500 animate-pulse" : "bg-slate-300"}`} />
              <div>
                <p className="font-mono text-2xl font-bold text-slate-900">{elapsed}</p>
                <p className="text-xs text-slate-500">{streetName || "Locating..."}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-bold ${currentSpeed > 50 ? "text-red-600" : currentSpeed > 30 ? "text-amber-600" : "text-slate-900"}`}>
                {Math.round(currentSpeed)}
              </p>
              <p className="text-xs text-slate-500">km/h</p>
            </div>
          </div>
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${currentSpeed > 50 ? "bg-red-500" : currentSpeed > 30 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, (currentSpeed / 120) * 100)}%` }} />
          </div>
        </div>

        {/* LIVE ODOMETER — increments in real time while driving */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-4 text-white mb-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-white/70">Est. Odometer (Live GPS)</p>
              <p className="text-3xl font-bold font-mono">{fmtOdo(liveOdo)}</p>
              <p className="text-xs text-white/70 mt-1">Start: {fmtOdo(trip?.startOdometer)} + GPS: {gpsDistance.toFixed(2)} km</p>
            </div>
            <div className="text-right">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${currentSpeed < 1 ? "bg-white/20" : "bg-white text-indigo-700"}`}>
                {currentSpeed < 1 ? "⏸ STATIONARY" : "▶ MOVING"}
              </div>
              <p className="text-xs text-white/60 mt-2">{liveLat.toFixed(5)}, {liveLng.toFixed(5)}</p>
            </div>
          </div>
        </div>

        {speedAlert && (
          <div className="bg-red-100 text-red-700 border border-red-200 px-4 py-3 rounded-xl mb-3 text-center font-medium text-sm animate-fadeIn">
            {alertMsg}
          </div>
        )}

        <div className="rounded-2xl overflow-hidden border border-slate-200 mb-3" style={{ height: "38vh" }}>
          <TripMap
            lat={liveLat} lng={liveLng}
            track={positionBufferRef.current.slice(-200)}
            currentSpeed={currentSpeed}
          />
        </div>

        {stopSuggestion && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 animate-fadeIn text-center">
            <p className="text-sm font-medium text-amber-700 mb-2">🚗 Vehicle stopped — End this trip?</p>
            <button onClick={handleStopTrip}
              className="px-6 py-2 bg-amber-600 text-white rounded-xl text-sm font-medium">Yes, Stop Trip</button>
          </div>
        )}

        <button onClick={handleStopTrip}
          className="w-full py-5 bg-red-600 hover:bg-red-700 text-white text-xl font-bold rounded-2xl shadow-lg active:scale-[0.98] flex items-center justify-center gap-3">
          <span className="text-3xl">⏹</span> STOP TRIP
        </button>
      </div>
    );
  }

  // ===== ODOMETER END =====
  if (phase === "odometer_end" && trip) {
    const suggested = trip.startOdometer + Math.max(0.1, gpsDistance);
    const endOdo = parseFloat(endOdometerInput) || 0;
    const dist = endOdo - trip.startOdometer;
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center pb-32 animate-fadeIn">
        <div className="w-full max-w-sm space-y-5">
          <div className="text-center">
            <span className="text-4xl">📏</span>
            <h2 className="mt-3 text-xl font-bold text-slate-900">End Odometer</h2>
            <p className="text-sm text-slate-500 mt-1">Duration: {elapsed} • GPS: {gpsDistance.toFixed(2)} km</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setEndOdometerInput((Math.max(trip.startOdometer, parseFloat(endOdometerInput || String(suggested)) - 0.1)).toFixed(1))}
                className="w-14 h-14 rounded-2xl bg-slate-100 text-2xl font-bold text-slate-600 active:scale-95">−</button>
              <input type="number" step="0.1" value={endOdometerInput} onChange={e => setEndOdometerInput(e.target.value)}
                className="w-40 text-center text-4xl font-bold text-slate-900 bg-transparent border-b-4 border-emerald-500 outline-none py-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder={String(suggested.toFixed(1))} inputMode="decimal" autoFocus />
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
              <p className="text-sm text-emerald-700">Distance: <span className="font-bold text-lg">{dist.toFixed(2)} km</span></p>
            </div>
          )}
          {!trip.pickupMode && (
            <label className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 cursor-pointer">
              <input type="checkbox" checked={isBusinessTrip} onChange={e => setIsBusinessTrip(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
              <div><p className="font-medium text-slate-900 text-sm">Business Trip</p><p className="text-xs text-slate-500">For ATO tax claims</p></div>
            </label>
          )}
          {trip.pickupMode && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-sm text-amber-700">
              🚕 Pickup run — marked as business automatically
            </div>
          )}
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
          <span className="text-lg font-medium text-blue-700">Saving...</span>
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
            <p className="text-slate-500 mt-1">{trip?.pickupMode ? "🚕 Pickup run" : "Trip"} #{todayCount} • {dist.toFixed(1)} km • Source: GPS</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-left space-y-2">
            {trip && <>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Duration</span><span className="font-medium">{elapsed}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Odometer</span><span className="font-medium">{fmtOdo(trip.startOdometer)} → {fmtOdo(endOdometerInput)} km</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">GPS Distance</span><span className="font-medium">{gpsDistance.toFixed(2)} km</span></div>
            </>}
          </div>
          <div className="flex gap-3">
            <button onClick={handleNextTrip} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl active:scale-[0.98]">
              ▶ Next Trip
            </button>
            <button onClick={() => router.push("/dashboard")} className="py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl">🏠</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
