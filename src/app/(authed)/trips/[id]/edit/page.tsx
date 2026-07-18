"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  pickupLat: string | null;
  pickupLng: string | null;
  pickupSuburb: string | null;
  pickupState: string | null;
  pickupPostcode: string | null;
  dropoffAddress: string;
  dropoffLat: string | null;
  dropoffLng: string | null;
  dropoffSuburb: string | null;
  dropoffState: string | null;
  dropoffPostcode: string | null;
  isBusinessTrip: boolean;
  tripPurpose: string | null;
  fareAmount: string | null;
  source: string;
  notes: string | null;
}

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  
  const [trip, setTrip] = useState<Trip | null>(null);

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  const fetchTrip = async () => {
    try {
      const response = await fetch(`/api/trips/${tripId}`);
      if (!response.ok) {
        throw new Error("Trip not found");
      }
      const data = await response.json();
      setTrip(data.trip);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    
    setError("");
    setSaving(true);

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripDate: trip.tripDate,
          startTime: trip.startTime,
          endTime: trip.endTime || undefined,
          startOdometer: parseInt(trip.startOdometer.toString()),
          endOdometer: trip.endOdometer ? parseInt(trip.endOdometer.toString()) : undefined,
          pickupAddress: trip.pickupAddress,
          pickupLat: trip.pickupLat || undefined,
          pickupLng: trip.pickupLng || undefined,
          pickupSuburb: trip.pickupSuburb || undefined,
          pickupState: trip.pickupState || undefined,
          pickupPostcode: trip.pickupPostcode || undefined,
          dropoffAddress: trip.dropoffAddress,
          dropoffLat: trip.dropoffLat || undefined,
          dropoffLng: trip.dropoffLng || undefined,
          dropoffSuburb: trip.dropoffSuburb || undefined,
          dropoffState: trip.dropoffState || undefined,
          dropoffPostcode: trip.dropoffPostcode || undefined,
          isBusinessTrip: trip.isBusinessTrip,
          tripPurpose: trip.tripPurpose || undefined,
          fareAmount: trip.fareAmount ? parseFloat(trip.fareAmount) : undefined,
          notes: trip.notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update trip");
      }

      router.push("/trips");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    
    setDeleting(true);
    try {
      const response = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
      if (response.ok) {
        router.push("/trips");
        router.refresh();
      } else {
        throw new Error("Failed to delete trip");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const updateTrip = (field: keyof Trip, value: any) => {
    if (!trip) return;
    setTrip({ ...trip, [field]: value });
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-12 w-64 skeleton rounded-lg" />
        <div className="h-64 skeleton rounded-2xl" />
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <span className="text-5xl">❓</span>
        <h2 className="mt-4 text-xl font-semibold">Trip not found</h2>
        <Link href="/trips" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700">
          ← Back to trips
        </Link>
      </div>
    );
  }

  const calculatedDistance = trip.startOdometer && trip.endOdometer 
    ? trip.endOdometer - trip.startOdometer
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/trips"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Trip</h1>
            <p className="text-slate-500">Trip from {trip.tripDate}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "🗑️ Delete"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* Date & Time */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📅 Date & Time</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Trip Date *</label>
              <input
                type="date"
                value={trip.tripDate}
                onChange={(e) => updateTrip("tripDate", e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
              <input
                type="time"
                value={trip.startTime}
                onChange={(e) => updateTrip("startTime", e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <input
                type="time"
                value={trip.endTime || ""}
                onChange={(e) => updateTrip("endTime", e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Odometer */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📏 Odometer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start (km) *</label>
              <input
                type="number"
                value={trip.startOdometer}
                onChange={(e) => updateTrip("startOdometer", parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End (km)</label>
              <input
                type="number"
                value={trip.endOdometer || ""}
                onChange={(e) => updateTrip("endOdometer", e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Distance</label>
              <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700">
                {calculatedDistance ? `${calculatedDistance} km` : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Pickup Location */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📍 Pickup Location</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
              <input
                type="text"
                value={trip.pickupAddress}
                onChange={(e) => updateTrip("pickupAddress", e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Suburb</label>
                <input
                  type="text"
                  value={trip.pickupSuburb || ""}
                  onChange={(e) => updateTrip("pickupSuburb", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <select
                  value={trip.pickupState || "NSW"}
                  onChange={(e) => updateTrip("pickupState", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="NSW">NSW</option>
                  <option value="VIC">VIC</option>
                  <option value="QLD">QLD</option>
                  <option value="SA">SA</option>
                  <option value="WA">WA</option>
                  <option value="TAS">TAS</option>
                  <option value="ACT">ACT</option>
                  <option value="NT">NT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Postcode</label>
                <input
                  type="text"
                  value={trip.pickupPostcode || ""}
                  onChange={(e) => updateTrip("pickupPostcode", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coordinates</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={trip.pickupLat || ""}
                    onChange={(e) => updateTrip("pickupLat", e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                    placeholder="Lat"
                  />
                  <input
                    type="text"
                    value={trip.pickupLng || ""}
                    onChange={(e) => updateTrip("pickupLng", e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                    placeholder="Lng"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dropoff Location */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📍 Dropoff Location</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
              <input
                type="text"
                value={trip.dropoffAddress}
                onChange={(e) => updateTrip("dropoffAddress", e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Suburb</label>
                <input
                  type="text"
                  value={trip.dropoffSuburb || ""}
                  onChange={(e) => updateTrip("dropoffSuburb", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <select
                  value={trip.dropoffState || "NSW"}
                  onChange={(e) => updateTrip("dropoffState", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="NSW">NSW</option>
                  <option value="VIC">VIC</option>
                  <option value="QLD">QLD</option>
                  <option value="SA">SA</option>
                  <option value="WA">WA</option>
                  <option value="TAS">TAS</option>
                  <option value="ACT">ACT</option>
                  <option value="NT">NT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Postcode</label>
                <input
                  type="text"
                  value={trip.dropoffPostcode || ""}
                  onChange={(e) => updateTrip("dropoffPostcode", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Coordinates</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={trip.dropoffLat || ""}
                    onChange={(e) => updateTrip("dropoffLat", e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                    placeholder="Lat"
                  />
                  <input
                    type="text"
                    value={trip.dropoffLng || ""}
                    onChange={(e) => updateTrip("dropoffLng", e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                    placeholder="Lng"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">💼 Trip Details</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={trip.isBusinessTrip}
                onChange={(e) => updateTrip("isBusinessTrip", e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded"
              />
              <div>
                <p className="font-medium text-slate-900">Business Trip</p>
                <p className="text-xs text-slate-500">Mark for ATO tax claims</p>
              </div>
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Trip Purpose</label>
                <input
                  type="text"
                  value={trip.tripPurpose || ""}
                  onChange={(e) => updateTrip("tripPurpose", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fare Amount (AUD)</label>
                <input
                  type="number"
                  value={trip.fareAmount || ""}
                  onChange={(e) => updateTrip("fareAmount", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={trip.notes || ""}
                onChange={(e) => updateTrip("notes", e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700">
                {trip.source === "manual" ? "✏️ Manual Entry" : trip.source === "google_maps" ? "🗺️ Google Maps" : "📍 Waze"}
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/trips"
            className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : (
              "💾 Save Changes"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
