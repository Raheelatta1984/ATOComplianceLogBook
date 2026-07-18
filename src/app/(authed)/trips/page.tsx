"use client";

import { useEffect, useState, useCallback } from "react";
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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [source, setSource] = useState("");
  const [businessOnly, setBusinessOnly] = useState(false);

  const fetchTrips = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      
      if (search) params.set("search", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (source) params.set("source", source);
      if (businessOnly) params.set("businessOnly", "true");
      
      const response = await fetch(`/api/trips?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTrips(data.trips);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate, source, businessOnly]);

  useEffect(() => {
    fetchTrips(1);
  }, [fetchTrips]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    
    setDeleting(id);
    try {
      const response = await fetch(`/api/trips/${id}`, { method: "DELETE" });
      if (response.ok) {
        setTrips(trips.filter((t) => t.id !== id));
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      }
    } catch (error) {
      console.error("Failed to delete trip:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrips(1);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trip History</h1>
          <p className="text-slate-500">{pagination.total} trips recorded</p>
        </div>
        <Link
          href="/trips/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
        >
          <span>➕</span> Log New Trip
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by address..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">All Sources</option>
              <option value="manual">Manual Entry</option>
              <option value="google_maps">Google Maps</option>
              <option value="waze">Waze</option>
            </select>
            <label className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={businessOnly}
                onChange={(e) => setBusinessOnly(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm">Business Only</span>
            </label>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
            >
              🔍 Search
            </button>
          </div>
        </form>
      </div>

      {/* Trips List */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 skeleton rounded-2xl" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <span className="text-5xl">🚗</span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No trips found</h3>
          <p className="mt-2 text-slate-500">
            {search || startDate || endDate || source || businessOnly
              ? "Try adjusting your filters"
              : "Start logging your trips for ATO compliance"}
          </p>
          <Link
            href="/trips/new"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
          >
            ➕ Log Your First Trip
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-white rounded-2xl p-4 lg:p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Source Icon */}
                  <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                    {trip.source === "google_maps" ? "🗺️" : trip.source === "waze" ? "📍" : "✏️"}
                  </div>

                  {/* Trip Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        📍 {trip.pickupAddress}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-sm text-slate-600 truncate">
                        📍 {trip.dropoffAddress}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>📅 {trip.tripDate}</span>
                      <span>🕐 {trip.startTime}{trip.endTime ? ` - ${trip.endTime}` : ""}</span>
                      {trip.distanceKm && <span>📏 {trip.distanceKm} km</span>}
                      {trip.fareAmount && <span className="font-medium text-emerald-600">${trip.fareAmount}</span>}
                      <span className={`px-2 py-0.5 rounded-full ${
                        trip.source === "manual" 
                          ? "bg-blue-100 text-blue-700" 
                          : trip.source === "google_maps"
                            ? "bg-green-100 text-green-700"
                            : "bg-purple-100 text-purple-700"
                      }`}>
                        {trip.source === "manual" ? "Manual" : trip.source === "google_maps" ? "Google Maps" : "Waze"}
                      </span>
                      {trip.isBusinessTrip && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                          Business
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link
                      href={`/trips/${trip.id}/edit`}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="Edit trip"
                    >
                      ✏️
                    </Link>
                    <button
                      onClick={() => handleDelete(trip.id)}
                      disabled={deleting === trip.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                      title="Delete trip"
                    >
                      {deleting === trip.id ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        "🗑️"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => fetchTrips(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                ← Previous
              </button>
              <span className="px-4 py-2 text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchTrips(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
