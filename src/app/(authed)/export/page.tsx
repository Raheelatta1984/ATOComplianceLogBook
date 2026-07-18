"use client";

import { useState } from "react";

export default function ExportPage() {
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [financialYear, setFinancialYear] = useState("2024-2025");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [useDateRange, setUseDateRange] = useState(false);
  const [businessOnly, setBusinessOnly] = useState(true);

  // Generate financial year options
  const currentYear = new Date().getFullYear();
  const financialYears = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    financialYears.push(`${y}-${y + 1}`);
  }

  const handleExport = async () => {
    setExporting(true);
    
    try {
      const params = new URLSearchParams({
        format,
        businessOnly: businessOnly.toString(),
      });
      
      if (useDateRange && startDate && endDate) {
        params.set("startDate", startDate);
        params.set("endDate", endDate);
      } else {
        params.set("financialYear", financialYear);
      }
      
      const response = await fetch(`/api/trips/export?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      if (format === "csv") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.headers.get("Content-Disposition")?.split("filename=")[1]?.replace(/"/g, "") || `travel-logbook-${financialYear}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `travel-logbook-${financialYear}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      alert("Failed to export. Please try again.");
      console.error("Export error:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Export Logbook</h1>
        <p className="text-slate-500">Export your travel logbook for ATO submission</p>
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Export Options</h2>
        
        <div className="space-y-6">
          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Export Format</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormat("csv")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  format === "csv"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="font-medium text-slate-900">CSV File</p>
                    <p className="text-xs text-slate-500">Opens in Excel/Google Sheets</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setFormat("json")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  format === "json"
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📄</span>
                  <div>
                    <p className="font-medium text-slate-900">JSON File</p>
                    <p className="text-xs text-slate-500">For data backup/integration</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Date Range</label>
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useDateRange}
                  onChange={(e) => setUseDateRange(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-slate-700">Use custom date range</span>
              </label>
            </div>
            
            {useDateRange ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year</label>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  {financialYears.map((fy) => (
                    <option key={fy} value={fy}>
                      FY {fy} (July {fy.split("-")[0]} - June {fy.split("-")[1]})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Filters */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Filters</label>
            <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={businessOnly}
                onChange={(e) => setBusinessOnly(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Business trips only</p>
                <p className="text-xs text-slate-500">Recommended for ATO tax claims</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {exporting ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Preparing Export...
          </>
        ) : (
          <>📤 Download {format.toUpperCase()} Export</>
        )}
      </button>

      {/* ATO Submission Guide */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">📋 ATO Submission Guide</h2>
        <div className="space-y-4 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <span className="text-lg">1️⃣</span>
            <div>
              <p className="font-medium text-slate-900">Keep a 12-week logbook</p>
              <p>The ATO requires a continuous 12-week logbook to establish your business use percentage.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">2️⃣</span>
            <div>
              <p className="font-medium text-slate-900">Record all required details</p>
              <p>Each trip entry must include: date, odometer readings, start/end addresses, and purpose of trip.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">3️⃣</span>
            <div>
              <p className="font-medium text-slate-900">Export before EOFY</p>
              <p>Download your logbook before June 30 and keep it for 5 years in case of audit.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">4️⃣</span>
            <div>
              <p className="font-medium text-slate-900">Calculate your claim</p>
              <p>Multiply total car expenses by your business use percentage (business km ÷ total km).</p>
            </div>
          </div>
        </div>
      </div>

      {/* File Contents Preview */}
      {format === "csv" && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">📊 CSV File Contents</h2>
          <p className="text-sm text-slate-600 mb-4">
            Your exported CSV will include the following columns:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              "Date", "Start Time", "End Time",
              "Pickup Address", "Pickup Lat/Lng", "Pickup Suburb",
              "Dropoff Address", "Dropoff Lat/Lng", "Dropoff Suburb",
              "Start Odometer", "End Odometer", "Distance (km)",
              "Business Trip", "Trip Purpose", "Fare Amount",
              "Source", "Notes"
            ].map((col) => (
              <span
                key={col}
                className="px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-600"
              >
                {col}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
