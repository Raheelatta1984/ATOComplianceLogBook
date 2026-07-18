"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Trip {
  id: string;
  tripDate: string;
  startTime: string;
  endTime: string | null;
  startOdometer: number;
  endOdometer: number | null;
  distanceKm: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  isBusinessTrip: boolean;
  fareAmount: string | null;
  source: string;
}

export default function DashboardPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayTrips, setTodayTrips] = useState<Trip[]>([]);
  const [weekKm, setWeekKm] = useState(0);
  const [monthKm, setMonthKm] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [fyTrips, setFyTrips] = useState(0);
  const [fyKm, setFyKm] = useState(0);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      const res = await fetch("/api/trips?limit=100");
      if (res.ok) {
        const data = await res.json();
        const allTrips = data.trips || [];
        setTrips(allTrips);
        setTotalTrips(data.pagination?.total || 0);

        const today = new Date().toISOString().split("T")[0];
        setTodayTrips(allTrips.filter((t: Trip) => t.tripDate === today));

        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const fyStart = new Date(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1, 6, 1);

        let wKm = 0, mKm = 0, fKm = 0, fTrips = 0;
        for (const t of allTrips) {
          const d = new Date(t.tripDate);
          const km = t.distanceKm ? Number(t.distanceKm) : 0;
          if (d >= weekAgo) wKm += km;
          if (d >= monthAgo) mKm += km;
          if (d >= fyStart) { fKm += km; fTrips++; }
        }
        setWeekKm(wKm);
        setMonthKm(mKm);
        setFyKm(fKm);
        setFyTrips(fTrips);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-32">
        <div className="h-8 w-48 skeleton rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm">FY {new Date().getMonth() >= 6 ? `${new Date().getFullYear()}-${new Date().getFullYear()+1}` : `${new Date().getFullYear()-1}-${new Date().getFullYear()}`}</p>
      </div>

      {/* BIG Start Trip Button */}
      <Link href="/trip" className="block">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white text-center shadow-xl hover:shadow-2xl transition-all active:scale-[0.98]">
          <div className="text-6xl mb-3">🚗</div>
          <h2 className="text-3xl font-bold">Start Trip</h2>
          <p className="text-white/80 mt-2">Tap to begin recording your trip</p>
        </div>
      </Link>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Today</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{todayTrips.length}</p>
          <p className="text-xs text-slate-500">trips logged</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">This Week</p>
          <p className="mt-2 text-3xl font-bold text-indigo-600">{weekKm.toFixed(1)}</p>
          <p className="text-xs text-slate-500">km driven</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">This Month</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{monthKm.toFixed(1)}</p>
          <p className="text-xs text-slate-500">km driven</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Business</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{fyTrips}</p>
          <p className="text-xs text-slate-500">business trips FY</p>
        </div>
      </div>

      {/* Today's Trips */}
      {todayTrips.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-3">Today&apos;s Trips</h3>
          <div className="space-y-2">
            {todayTrips.map((trip, i) => (
              <div key={trip.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{trip.pickupAddress} → {trip.dropoffAddress}</p>
                  <p className="text-xs text-slate-500">{trip.startTime}{trip.endTime ? ` - ${trip.endTime}` : ""} {trip.distanceKm ? `• ${trip.distanceKm} km` : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Trips */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Recent Trips</h3>
          <Link href="/history" className="text-sm text-indigo-600">View All →</Link>
        </div>
        {trips.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl">📋</span>
            <p className="mt-2 text-slate-500 text-sm">No trips yet. Tap &quot;Start Trip&quot; above!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {trips.slice(0, 5).map((trip) => (
              <div key={trip.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className={`w-2 h-2 rounded-full ${trip.isBusinessTrip ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900 truncate">{trip.tripDate} • {trip.startTime}</p>
                  <p className="text-xs text-slate-500 truncate">{trip.pickupAddress} → {trip.dropoffAddress}</p>
                </div>
                <p className="text-xs font-medium text-slate-600">{trip.distanceKm ? `${trip.distanceKm} km` : "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/export" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
          <span className="text-2xl">📤</span>
          <p className="text-xs font-medium text-slate-700 mt-1">Export</p>
        </Link>
        <Link href="/import" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
          <span className="text-2xl">📥</span>
          <p className="text-xs font-medium text-slate-700 mt-1">Import</p>
        </Link>
        <Link href="/settings" className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center hover:bg-slate-50 transition-colors">
          <span className="text-2xl">⚙️</span>
          <p className="text-xs font-medium text-slate-700 mt-1">Settings</p>
        </Link>
      </div>
    </div>
  );
}
