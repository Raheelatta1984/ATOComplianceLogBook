"use client";

import { useState, useEffect } from "react";

export default function TransfersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendAmount, setSendAmount] = useState("1000");
  const [fromCur, setFromCur] = useState("AUD");
  const [toCur, setToCur] = useState("INR");
  const [adminMode, setAdminMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/transfers").then(r => r.json()).then(d => {
      setProviders(d.providers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveAdmin = async () => {
    setSaving(true);
    try {
      await fetch("/api/transfers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providers }),
      });
    } catch {} finally { setSaving(false); setAdminMode(false); }
  };

  const amt = parseFloat(sendAmount) || 0;

  if (loading) return <div className="space-y-3 pb-32">{[...Array(3)].map((_, i) => <div key={i} className="h-28 skeleton rounded-2xl" />)}</div>;

  return (
    <div className="space-y-4 pb-32 animate-fadeIn">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">💸 Money Transfer</h1>
          <p className="text-slate-500 text-sm">Compare rates & send via our partners</p>
        </div>
        <button onClick={() => setAdminMode(!adminMode)} className="px-3 py-2 text-xs bg-slate-100 rounded-xl">⚙️</button>
      </div>

      {/* Calculator */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl p-5">
        <p className="text-sm text-white/70 mb-2">You send</p>
        <div className="flex items-center gap-2">
          <input type="number" value={sendAmount} onChange={e => setSendAmount(e.target.value)}
            className="w-32 bg-white/20 text-3xl font-bold rounded-xl px-3 py-2 outline-none" />
          <select value={fromCur} onChange={e => setFromCur(e.target.value)}
            className="bg-white/20 rounded-xl px-3 py-2 text-lg font-bold outline-none">
            <option className="text-slate-900">AUD</option>
          </select>
        </div>
        <p className="text-sm text-white/70 mt-3">Recipient gets (approx)</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-3xl font-bold">{providers[0] ? (amt * parseFloat(providers[0].rate)).toLocaleString("en-AU", { maximumFractionDigits: 0 }) : "—"}</p>
          <select value={toCur} onChange={e => setToCur(e.target.value)}
            className="bg-white/20 rounded-xl px-3 py-2 text-lg font-bold outline-none">
            {["INR", "USD", "GBP", "PHP", "PKR", "BDT", "NPR", "LKR"].map(c => <option key={c} className="text-slate-900">{c}</option>)}
          </select>
        </div>
      </div>

      {/* Top 5 comparison */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase">🏆 Top 5 Providers — {fromCur} → {toCur}</p>
        {providers.map((p, i) => {
          const receives = (amt * parseFloat(p.rate || 0));
          return (
            <div key={p.name} className={`bg-white rounded-2xl p-4 shadow-sm border-2 ${i === 0 ? "border-emerald-400" : "border-slate-100"}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.logo}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{p.name}</p>
                    {i === 0 && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">BEST RATE</span>}
                  </div>
                  <p className="text-xs text-slate-500">Fee: {p.fee} • {p.speed} • Rate: {p.rate}</p>
                  {p.referralCode && (
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">🎁 Use code: <strong>{p.referralCode}</strong></p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{receives.toLocaleString("en-AU", { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-slate-500">{toCur}</p>
                </div>
              </div>
              <a href={p.referralCode ? `${p.url}?ref=${p.referralCode}` : p.url}
                target="_blank" rel="noopener noreferrer"
                className="mt-3 block w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-center font-bold rounded-xl text-sm">
                Send via {p.name} →
              </a>
            </div>
          );
        })}
      </div>

      {/* Earnings note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
        💡 <strong>Commission note:</strong> Each transfer made through TripLog links earns us a small partner commission at no cost to drivers — helping keep the app free.
      </div>

      {/* Admin panel — configurable referral codes */}
      {adminMode && (
        <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3">
          <h3 className="font-bold">⚙️ Master Setup — Referral Codes</h3>
          {providers.map((p, i) => (
            <div key={p.name} className="flex items-center gap-2">
              <span className="text-sm w-24">{p.name}</span>
              <input value={p.referralCode || ""} onChange={e => {
                const next = [...providers]; next[i] = { ...next[i], referralCode: e.target.value };
                setProviders(next);
              }} placeholder="Referral code" className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-sm outline-none" />
            </div>
          ))}
          <button onClick={saveAdmin} disabled={saving}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl disabled:opacity-40">
            {saving ? "Saving..." : "💾 Save Configuration"}
          </button>
        </div>
      )}
    </div>
  );
}
