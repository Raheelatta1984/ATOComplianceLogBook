"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fmtOdo } from "@/lib/format";

export default function ManualTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastOdoEnd, setLastOdoEnd] = useState<number | null>(null);
  const [tripDate, setTripDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(new Date().toTimeString().slice(0, 5));
  const [endTime, setEndTime] = useState("");
  const [startOdometer, setStartOdometer] = useState("");
  const [endOdometer, setEndOdometer] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [isBusinessTrip, setIsBusinessTrip] = useState(true);
  const [tripPurpose, setTripPurpose] = useState("");
  const [fareAmount, setFareAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/daily-odo").then(r => r.json()).then(data => {
      if (data.lastEndOdometer) {
        setLastOdoEnd(data.lastEndOdometer);
        setStartOdometer(String(data.lastEndOdometer));
      }
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripDate, startTime, endTime: endTime || undefined,
          startOdometer: parseFloat(startOdometer),
          endOdometer: endOdometer ? parseFloat(endOdometer) : undefined,
          pickupAddress, dropoffAddress,
          isBusinessTrip, tripPurpose: tripPurpose || undefined,
          fareAmount: fareAmount ? parseFloat(fareAmount) : undefined,
          notes: notes || undefined,
          source: "manual",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const dist = startOdometer && endOdometer ? parseInt(endOdometer) - parseInt(startOdometer) : null;

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-32 animate-fadeIn">
      <div className="flex items-center gap-4">
        <Link href="/trip" className="p-2 text-slate-400 hover:text-slate-600 rounded-xl">←</Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manual Trip Entry</h1>
          <p className="text-slate-500 text-sm">Enter trip details after the fact</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      {lastOdoEnd && (
        <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-700 border border-indigo-200">
          💡 Last odometer reading: <strong>{fmtOdo(lastOdoEnd)} km</strong> — auto-filled below
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date & Time */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3">📅 Date & Time</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date *</label>
              <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start *</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
        </div>

        {/* Odometer */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3">📏 Odometer (km)</h3>
          <div className="grid grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start *</label>
              <input type="number" step="0.1" value={startOdometer} onChange={e => setStartOdometer(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" required min="0" placeholder="0.0" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End</label>
              <input type="number" step="0.1" value={endOdometer} onChange={e => setEndOdometer(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" min="0" placeholder="0.0" />
            </div>
            <div className="text-center p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-xs text-slate-500">Distance</p>
              <p className="font-bold text-slate-900">{dist ? `${dist} km` : "—"}</p>
            </div>
          </div>
        </div>

        {/* Locations */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3">📍 Locations</h3>
          <div className="space-y-3">
            <input type="text" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)}
              placeholder="Pickup address *" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
            <input type="text" value={dropoffAddress} onChange={e => setDropoffAddress(e.target.value)}
              placeholder="Dropoff address *" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3">💼 Details</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input type="checkbox" checked={isBusinessTrip} onChange={e => setIsBusinessTrip(e.target.checked)} className="w-5 h-5 text-indigo-600 rounded" />
              <div><p className="font-medium text-sm text-slate-900">Business Trip</p><p className="text-xs text-slate-500">For ATO tax claims</p></div>
            </label>
            <input type="text" value={tripPurpose} onChange={e => setTripPurpose(e.target.value)}
              placeholder="Trip purpose (optional)" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="number" value={fareAmount} onChange={e => setFareAmount(e.target.value)}
              placeholder="Fare amount AUD (optional)" step="0.01" min="0"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Notes (optional)" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "💾 Save Trip"}
        </button>
      </form>
    </div>
  );
}
