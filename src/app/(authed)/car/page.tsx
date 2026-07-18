"use client";

import { useState, useEffect, useRef } from "react";
import { fmtOdo } from "@/lib/format";

type Tab = "profile" | "expenses" | "service" | "mechanics";

export default function CarPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({ cars: [], expenses: [], services: [], mechanics: [], currentOdometer: 0 });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const svcFileRef = useRef<HTMLInputElement>(null);

  // Forms
  const [carForm, setCarForm] = useState({ make: "", model: "", year: "", color: "", rego: "", vin: "" });
  const [expForm, setExpForm] = useState({ expenseDate: new Date().toISOString().split("T")[0], category: "maintenance", description: "", amount: "", vendor: "", odometerAt: "" });
  const [svcForm, setSvcForm] = useState({ serviceDate: new Date().toISOString().split("T")[0], odometer: "", serviceType: "General Service", amount: "", vendor: "", notes: "", nextDueDate: "", nextDueOdometer: "" });
  const [mechForm, setMechForm] = useState({ name: "", phone: "", email: "", address: "", suburb: "", state: "NSW", postcode: "", rating: "", notes: "" });

  const [expInvoice, setExpInvoice] = useState<string | null>(null);
  const [svcInvoice, setSvcInvoice] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState("");

  const load = () => {
    fetch("/api/car?type=all").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const post = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/car", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (res.ok) { load(); return true; }
    } catch {} finally { setSaving(false); }
    return false;
  };

  // Invoice upload + OCR via Tesseract CDN
  const handleInvoice = async (file: File, target: "exp" | "svc") => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (target === "exp") setExpInvoice(dataUrl); else setSvcInvoice(dataUrl);

      // OCR via Tesseract.js from CDN
      setOcrStatus("🔍 Scanning invoice...");
      try {
        // @ts-ignore
        if (!window.Tesseract) {
          await new Promise<void>((resolve) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
            s.onload = () => resolve();
            document.head.appendChild(s);
          });
        }
        // @ts-ignore
        const result = await window.Tesseract.recognize(dataUrl, "eng");
        const text: string = result.data.text;

        // Extract total amount (regex for $ amounts)
        const amounts = (text.match(/\$?\s?(\d{1,5}[.,]\d{2})/g) || [])
          .map(a => parseFloat(a.replace(/[$,\s]/g, "").replace(",", ".")))
          .filter(n => !isNaN(n) && n > 0);
        const maxAmount = amounts.length ? Math.max(...amounts) : null;
        // Extract date
        const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
        let ocrDate = null;
        if (dateMatch) {
          const parts = dateMatch[1].split(/[\/\-]/);
          if (parts.length === 3) {
            const d = parts[0].padStart(2, "0");
            const m = parts[1].padStart(2, "0");
            const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            ocrDate = `${y}-${m}-${d}`;
          }
        }

        if (target === "exp") {
          setExpForm(prev => ({
            ...prev,
            amount: maxAmount ? String(maxAmount) : prev.amount,
            expenseDate: ocrDate || prev.expenseDate,
          }));
        } else {
          setSvcForm(prev => ({
            ...prev,
            amount: maxAmount ? String(maxAmount) : prev.amount,
            serviceDate: ocrDate || prev.serviceDate,
          }));
        }
        setOcrStatus(`✅ Scanned! ${maxAmount ? `$${maxAmount} found` : "Amount not found — enter manually"}`);
        setTimeout(() => setOcrStatus(""), 5000);
      } catch {
        setOcrStatus("⚠️ OCR unavailable — enter details manually");
        setTimeout(() => setOcrStatus(""), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const nextDue = data.services?.[0];
  const kmToService = nextDue?.nextDueOdometer && data.currentOdometer
    ? parseFloat(nextDue.nextDueOdometer) - data.currentOdometer
    : null;
  const serviceUrgent = kmToService !== null && kmToService < 500;

  const TABS: { key: Tab; label: string; icon: string; badge?: boolean }[] = [
    { key: "profile", label: "Car Profile", icon: "🚗" },
    { key: "expenses", label: "Expenses", icon: "🧾" },
    { key: "service", label: "Service", icon: "🔧", badge: serviceUrgent },
    { key: "mechanics", label: "Mechanics", icon: "👨‍🔧" },
  ];

  return (
    <div className="space-y-4 pb-32 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">🚗 My Car</h1>
        <p className="text-slate-500 text-sm">Profile, expenses & maintenance</p>
      </div>

      {/* Service-due alert banner */}
      {serviceUrgent && nextDue && (
        <div className="bg-red-600 text-white rounded-2xl p-4 animate-fadeIn">
          <p className="font-bold">🔧 Service Due Soon!</p>
          <p className="text-sm text-white/90 mt-1">
            Only <strong>{kmToService?.toFixed(0)} km</strong> left until your next service (due at {fmtOdo(nextDue.nextDueOdometer)} km).
            Book your mechanic appointment now!
          </p>
          <button onClick={() => setTab("mechanics")} className="mt-2 px-4 py-2 bg-white text-red-600 rounded-xl text-sm font-bold">
            📞 Contact Mechanic
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-white rounded-2xl p-1 border border-slate-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 min-w-[80px] px-3 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all relative ${
              tab === t.key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}>
            {t.badge && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />}
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="h-40 skeleton rounded-2xl" />}

      {/* ===== PROFILE ===== */}
      {!loading && tab === "profile" && (
        <div className="space-y-4">
          {data.cars?.length > 0 ? (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-3xl font-bold">{data.cars[0].make} {data.cars[0].model}</p>
                  <p className="text-white/70 mt-1">{data.cars[0].year} • {data.cars[0].color || "—"}</p>
                  <p className="text-white/70">Rego: {data.cars[0].rego || "—"}</p>
                  {data.cars[0].vin && <p className="text-white/50 text-xs mt-1">VIN: {data.cars[0].vin}</p>}
                </div>
                <span className="text-5xl">🚗</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-sm">
                <span className="text-white/70">Current Odometer</span>
                <span className="font-bold">{fmtOdo(data.currentOdometer)} km</span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-semibold text-slate-900">Add Your Car</h3>
              <div className="grid grid-cols-2 gap-3">
                <input value={carForm.make} onChange={e => setCarForm({...carForm, make: e.target.value})} placeholder="Make * (e.g., Toyota)" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input value={carForm.model} onChange={e => setCarForm({...carForm, model: e.target.value})} placeholder="Model * (e.g., Camry)" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input value={carForm.year} onChange={e => setCarForm({...carForm, year: e.target.value})} placeholder="Year" type="number" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input value={carForm.color} onChange={e => setCarForm({...carForm, color: e.target.value})} placeholder="Color" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input value={carForm.rego} onChange={e => setCarForm({...carForm, rego: e.target.value})} placeholder="Rego plate" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                <input value={carForm.vin} onChange={e => setCarForm({...carForm, vin: e.target.value})} placeholder="VIN (optional)" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              </div>
              <button disabled={saving || !carForm.make || !carForm.model}
                onClick={() => post({ entity: "car", ...carForm }).then(ok => ok && setCarForm({ make: "", model: "", year: "", color: "", rego: "", vin: "" }))}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-40">
                {saving ? "Saving..." : "💾 Save Car"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== EXPENSES ===== */}
      {!loading && tab === "expenses" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-semibold text-slate-900">🧾 Add Expense</h3>

            {/* Invoice OCR upload */}
            <div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleInvoice(e.target.files[0], "exp")} />
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full py-3 bg-purple-50 border-2 border-dashed border-purple-300 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100">
                📸 Capture / Upload Invoice (auto-scan with OCR)
              </button>
              {expInvoice && <img src={expInvoice} alt="invoice" className="mt-2 h-20 object-cover rounded-xl border" />}
              {ocrStatus && <p className="text-xs text-purple-600 mt-1">{ocrStatus}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <select value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value})} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                <option value="maintenance">🔧 Maintenance</option>
                <option value="repair">🛠️ Repair</option>
                <option value="parts">⚙️ Parts</option>
                <option value="fuel">⛽ Fuel</option>
                <option value="registration">📋 Registration</option>
                <option value="insurance">🛡️ Insurance</option>
                <option value="other">📦 Other</option>
              </select>
              <input type="date" value={expForm.expenseDate} onChange={e => setExpForm({...expForm, expenseDate: e.target.value})} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input value={expForm.description} onChange={e => setExpForm({...expForm, description: e.target.value})} placeholder="Description *" className="col-span-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input type="number" step="0.01" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} placeholder="Amount AUD *" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input value={expForm.vendor} onChange={e => setExpForm({...expForm, vendor: e.target.value})} placeholder="Vendor/Shop" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
            </div>
            <button disabled={saving || !expForm.description || !expForm.amount}
              onClick={() => post({ entity: "expense", ...expForm, invoiceImage: expInvoice }).then(ok => {
                if (ok) { setExpForm({ expenseDate: new Date().toISOString().split("T")[0], category: "maintenance", description: "", amount: "", vendor: "", odometerAt: "" }); setExpInvoice(null); }
              })}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-40">
              {saving ? "Saving..." : "💾 Add Expense"}
            </button>
          </div>

          {/* Expense list */}
          {data.expenses?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-3">Recent Expenses</h3>
              <div className="space-y-2">
                {data.expenses.slice(0, 10).map((e: any) => (
                  <div key={e.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{e.description}</p>
                      <p className="text-xs text-slate-500">{e.expenseDate} • {e.category}{e.vendor ? ` • ${e.vendor}` : ""}</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900">${parseFloat(e.amount).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 pt-3 border-t text-right text-sm text-slate-500">
                Total tracked: <span className="font-bold text-slate-900">${data.expenses.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0).toFixed(2)}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===== SERVICE ===== */}
      {!loading && tab === "service" && (
        <div className="space-y-4">
          {/* Service status */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-semibold text-slate-900 mb-3">🔧 Service Status</h3>
            {data.services?.length > 0 ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="text-slate-500">Last service</span><span className="font-medium">{data.services[0].serviceDate} @ {fmtOdo(data.services[0].odometer)} km</span></div>
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="text-slate-500">Service type</span><span className="font-medium">{data.services[0].serviceType}</span></div>
                {data.services[0].nextDueDate && <div className="flex justify-between p-3 bg-blue-50 rounded-xl"><span className="text-slate-500">Next due (date)</span><span className="font-bold text-blue-700">{data.services[0].nextDueDate}</span></div>}
                {data.services[0].nextDueOdometer && (
                  <div className={`flex justify-between p-3 rounded-xl ${kmToService !== null && kmToService < 500 ? "bg-red-50" : "bg-emerald-50"}`}>
                    <span className="text-slate-500">Next due (odometer)</span>
                    <span className={`font-bold ${kmToService !== null && kmToService < 500 ? "text-red-700" : "text-emerald-700"}`}>
                      {fmtOdo(data.services[0].nextDueOdometer)} km
                      {kmToService !== null && ` (${kmToService.toFixed(0)} km left)`}
                    </span>
                  </div>
                )}
                {data.services[0].amount && <div className="flex justify-between p-3 bg-slate-50 rounded-xl"><span className="text-slate-500">Last cost</span><span className="font-medium">${parseFloat(data.services[0].amount).toFixed(2)}</span></div>}
                <div className="flex justify-between p-3 bg-amber-50 rounded-xl"><span className="text-slate-500">📊 Est. next service cost</span><span className="font-bold text-amber-700">${(parseFloat(data.services[0].amount || 0) * 1.08).toFixed(2)}</span></div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No service records yet. Log your first service below.</p>
            )}
          </div>

          {/* Log service */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-semibold text-slate-900">Log a Service</h3>
            <div>
              <input ref={svcFileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleInvoice(e.target.files[0], "svc")} />
              <button type="button" onClick={() => svcFileRef.current?.click()} className="w-full py-3 bg-purple-50 border-2 border-dashed border-purple-300 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100">
                📸 Scan Service Invoice (OCR)
              </button>
              {svcInvoice && <img src={svcInvoice} alt="invoice" className="mt-2 h-20 object-cover rounded-xl border" />}
              {ocrStatus && <p className="text-xs text-purple-600 mt-1">{ocrStatus}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={svcForm.serviceType} onChange={e => setSvcForm({...svcForm, serviceType: e.target.value})} className="col-span-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                <option>General Service</option><option>Log Book Service</option><option>Oil Change</option>
                <option>Brake Service</option><option>Tyre Replacement</option><option>Major Service</option>
              </select>
              <input type="date" value={svcForm.serviceDate} onChange={e => setSvcForm({...svcForm, serviceDate: e.target.value})} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input type="number" step="0.1" value={svcForm.odometer} onChange={e => setSvcForm({...svcForm, odometer: e.target.value})} placeholder="Odometer km *" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input type="number" step="0.01" value={svcForm.amount} onChange={e => setSvcForm({...svcForm, amount: e.target.value})} placeholder="Cost AUD" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input value={svcForm.vendor} onChange={e => setSvcForm({...svcForm, vendor: e.target.value})} placeholder="Mechanic/Workshop" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input type="date" value={svcForm.nextDueDate} onChange={e => setSvcForm({...svcForm, nextDueDate: e.target.value})} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input type="number" step="0.1" value={svcForm.nextDueOdometer} onChange={e => setSvcForm({...svcForm, nextDueOdometer: e.target.value})} placeholder="Next due odo km" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
            </div>
            <button disabled={saving || !svcForm.odometer}
              onClick={() => post({ entity: "service", ...svcForm, invoiceImage: svcInvoice }).then(ok => {
                if (ok) { setSvcForm({ serviceDate: new Date().toISOString().split("T")[0], odometer: "", serviceType: "General Service", amount: "", vendor: "", notes: "", nextDueDate: "", nextDueOdometer: "" }); setSvcInvoice(null); }
              })}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-40">
              {saving ? "Saving..." : "💾 Log Service"}
            </button>
          </div>

          {/* Service history */}
          {data.services?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold text-slate-900 mb-3">Service History</h3>
              <div className="space-y-2">
                {data.services.map((s: any) => (
                  <div key={s.id} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium text-slate-900">{s.serviceType}</p>
                      {s.amount && <p className="text-sm font-bold">${parseFloat(s.amount).toFixed(2)}</p>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{s.serviceDate} @ {fmtOdo(s.odometer)} km{s.vendor ? ` • ${s.vendor}` : ""}</p>
                    {s.invoiceImage && <img src={s.invoiceImage} alt="invoice" className="mt-2 h-16 object-cover rounded-lg border" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== MECHANICS ===== */}
      {!loading && tab === "mechanics" && (
        <div className="space-y-4">
          {data.mechanics?.length > 0 && (
            <div className="space-y-3">
              {data.mechanics.map((m: any) => (
                <div key={m.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-slate-900">{m.name}</h3>
                      {m.rating && <p className="text-amber-500 text-sm">{"★".repeat(Math.round(parseFloat(m.rating)))}{"☆".repeat(5 - Math.round(parseFloat(m.rating)))} {m.rating}</p>}
                      <p className="text-xs text-slate-500 mt-1">📍 {m.address}{m.suburb ? `, ${m.suburb}` : ""}</p>
                      {m.phone && <a href={`tel:${m.phone}`} className="text-sm text-indigo-600 font-medium">📞 {m.phone}</a>}
                    </div>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address + (m.suburb ? " " + m.suburb : "") + " Australia")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-medium whitespace-nowrap">
                      🗺️ Directions
                    </a>
                  </div>
                  {m.topReviews && Array.isArray(m.topReviews) && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase">Top Google Reviews</p>
                      {m.topReviews.slice(0, 3).map((r: any, i: number) => (
                        <div key={i} className="text-xs bg-slate-50 p-2 rounded-lg">
                          <span className="text-amber-500">{"★".repeat(r.rating || 5)}</span>
                          <span className="text-slate-700 ml-2 italic">&ldquo;{r.text}&rdquo;</span>
                          <span className="text-slate-400"> — {r.author}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Car+Service+at+${encodeURIComponent(m.name)}&details=Scheduled+via+TripLog&location=${encodeURIComponent(m.address)}`, "_blank")}
                    className="mt-3 w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-200">
                    📅 Schedule Appointment
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add mechanic */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
            <h3 className="font-semibold text-slate-900">👨‍🔧 Add Mechanic</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={mechForm.name} onChange={e => setMechForm({...mechForm, name: e.target.value})} placeholder="Workshop name *" className="col-span-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input value={mechForm.phone} onChange={e => setMechForm({...mechForm, phone: e.target.value})} placeholder="Phone" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input value={mechForm.rating} onChange={e => setMechForm({...mechForm, rating: e.target.value})} placeholder="Rating (1-5)" type="number" step="0.1" min="0" max="5" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input value={mechForm.address} onChange={e => setMechForm({...mechForm, address: e.target.value})} placeholder="Street address *" className="col-span-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <input value={mechForm.suburb} onChange={e => setMechForm({...mechForm, suburb: e.target.value})} placeholder="Suburb" className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
              <select value={mechForm.state} onChange={e => setMechForm({...mechForm, state: e.target.value})} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                <option>NSW</option><option>VIC</option><option>QLD</option><option>SA</option><option>WA</option><option>TAS</option><option>ACT</option><option>NT</option>
              </select>
            </div>
            <button disabled={saving || !mechForm.name || !mechForm.address}
              onClick={() => post({ entity: "mechanicProfile", ...mechForm }).then(ok => ok && setMechForm({ name: "", phone: "", email: "", address: "", suburb: "", state: "NSW", postcode: "", rating: "", notes: "" }))}
              className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-40">
              {saving ? "Saving..." : "💾 Save Mechanic"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
