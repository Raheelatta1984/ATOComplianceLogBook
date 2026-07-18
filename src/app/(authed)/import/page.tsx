"use client";

import { useState, useRef } from "react";

export default function ImportPage() {
  const [selectedSource, setSelectedSource] = useState<"google_maps" | "waze" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedSource) return;
    
    setImporting(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", selectedSource);
      
      const response = await fetch("/api/trips/import", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }
      
      setResult({
        success: true,
        message: `Successfully imported ${data.importedCount} trips${data.errors ? ` (${data.errors.length} errors)` : ""}`,
        count: data.importedCount,
      });
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setResult({
        success: false,
        message: (err as Error).message,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Import Trips</h1>
        <p className="text-slate-500">Import your trip history from Google Maps or Waze</p>
      </div>

      {/* Import Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google Maps */}
        <button
          onClick={() => { setSelectedSource("google_maps"); setResult(null); }}
          className={`p-6 bg-white rounded-2xl border-2 transition-all text-left ${
            selectedSource === "google_maps"
              ? "border-indigo-500 shadow-md"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl">
              🗺️
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Google Maps Timeline</h3>
              <p className="text-sm text-slate-500">
                Import from Google Maps location history export
              </p>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            <p className="font-medium text-slate-700 mb-1">How to export from Google Maps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to Google Takeout (takeout.google.com)</li>
              <li>Select &ldquo;Location History&rdquo; or &ldquo;Timeline&rdquo;</li>
              <li>Export as JSON format</li>
              <li>Upload the JSON file here</li>
            </ol>
          </div>
        </button>

        {/* Waze */}
        <button
          onClick={() => { setSelectedSource("waze"); setResult(null); }}
          className={`p-6 bg-white rounded-2xl border-2 transition-all text-left ${
            selectedSource === "waze"
              ? "border-indigo-500 shadow-md"
              : "border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-3xl">
              📍
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Waze Trip History</h3>
              <p className="text-sm text-slate-500">
                Import from Waze trip data export
              </p>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            <p className="font-medium text-slate-700 mb-1">How to export from Waze:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open Waze app and go to Settings</li>
              <li>Select &ldquo;Privacy&rdquo; then &ldquo;My Trips&rdquo;</li>
              <li>Export or download your trip history</li>
              <li>Upload the JSON file here</li>
            </ol>
          </div>
        </button>
      </div>

      {/* File Upload */}
      {selectedSource && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Upload {selectedSource === "google_maps" ? "Google Maps" : "Waze"} Data
          </h2>
          
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-indigo-300 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.geojson"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            
            {file ? (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                  📄
                </div>
                <div>
                  <p className="font-medium text-slate-900">{file.name}</p>
                  <p className="text-sm text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <label
                    htmlFor="file-upload"
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Choose Different File
                  </label>
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {importing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Importing...
                      </span>
                    ) : (
                      "📥 Import Now"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mx-auto">
                  📁
                </div>
                <p className="mt-4 text-slate-700">
                  <span className="text-indigo-600 font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="mt-1 text-sm text-slate-500">JSON files only</p>
              </label>
            )}
          </div>

          {/* Result Message */}
          {result && (
            <div
              className={`mt-4 p-4 rounded-xl ${
                result.success
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              <p className="font-medium">
                {result.success ? "✅ " : "❌ "}
                {result.message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sample Format */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">📋 Supported Format</h2>
        <p className="text-slate-600 mb-4">
          Your JSON file should contain trip data with location information. The app will extract:
        </p>
        <ul className="space-y-2 text-slate-600">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">✓</span>
            Start and end dates/times
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">✓</span>
            Pickup and dropoff locations (addresses and coordinates)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">✓</span>
            Trip distance (if available)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500">✓</span>
            Vehicle usage (for in-vehicle activities)
          </li>
        </ul>
        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <p className="text-sm text-amber-700">
            <strong>Note:</strong> Odometer readings will be set to 0. You may need to edit imported trips 
            to add your actual odometer readings for ATO compliance.
          </p>
        </div>
      </div>
    </div>
  );
}
