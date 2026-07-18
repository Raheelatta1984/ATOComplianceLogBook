"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { fmtOdo } from "@/lib/format";

interface Trip {
  id: string;
  tripDate: string;
  startTime: string;
  endTime: string | null;
  distanceKm: string | null;
  pickupAddress: string;
  dropoffAddress: string;
  isBusinessTrip: boolean;
  source: string;
  startOdometer: number;
  endOdometer: number | null;
}

export default function HistoryPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "business">("all");

  const fetchTrips = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: "30" });
      if (filter === "business") params.set("businessOnly", "true");
      const res = await fetch(`/api/trips?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTrips(data.trips);
        setTotal(data.pagination?.total || 0);
      }
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchTrips(page); }, [page, fetchTrips]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this trip?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/trips/${id}`, { method: "DELETE" });
      setTrips((t) => t.filter((x) => x.id !== id));
      setTotal((t) => t - 1);
    } catch {} finally { setDeleting(null); }
  };

  // Group by date
  const grouped = trips.reduce<Record<string, Trip[]>>((acc, trip) => {
    (acc[trip.tripDate] = acc[trip.tripDate] || []).push(trip);
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-32 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trip History</h1>
          <p className="text-slate-500 text-sm">{total} total trips</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "business"] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === f ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {f === "all" ? "All Trips" : "Business Only"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <span className="text-4xl">📋</span>
          <p className="mt-3 text-slate-500">No trips found</p>
          <Link href="/trip" className="mt-4 inline-block text-indigo-600 font-medium text-sm">
            Start your first trip →
          </Link>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayTrips]) => (
          <div key={date}>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider px-1 mb-2">
              {new Date(date + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </p>
            <div className="space-y-2">
              {dayTrips.map((trip, i) => (
                <div key={trip.id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold text-slate-600 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {trip.startTime}{trip.endTime ? ` – ${trip.endTime}` : ""}
                        </span>
                        {trip.isBusinessTrip && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">BIZ</span>
                        )}
                        {trip.distanceKm && (
                          <span className="text-xs text-slate-500">{trip.distanceKm} km</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">📍 {trip.pickupAddress}</p>
                      <p className="text-xs text-slate-500 truncate">📍 {trip.dropoffAddress}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Odo: {fmtOdo(trip.startOdometer)} → {fmtOdo(trip.endOdometer)} km
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(trip.id)}
                      disabled={deleting === trip.id}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      {deleting === trip.id ? "⏳" : "🗑"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Pagination */}
      {total > 30 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm disabled:opacity-40"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-500">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={trips.length < 30}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
