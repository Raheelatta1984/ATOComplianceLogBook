"use client";

import { useState, useEffect } from "react";

export default function ChitFundPage() {
  const [pools, setPools] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [drawResult, setDrawResult] = useState<{ name: string; amount: number } | null>(null);
  const [newPoolName, setNewPoolName] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/chitfund").then(r => r.json()).then(d => {
      setPools(d.pools || []);
      setUserId(d.currentUserId || "");
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(load, []);

  const act = async (action: string, poolId?: string, extra?: Record<string, string>) => {
    setActing(true);
    setError("");
    setDrawResult(null);
    try {
      const res = await fetch("/api/chitfund", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, poolId, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed"); }
      if (action === "draw" && data.draw) {
        setDrawResult({ name: data.winnerName, amount: data.amount });
        setTimeout(() => setDrawResult(null), 8000);
      }
      load();
    } catch { setError("Network error"); } finally { setActing(false); }
  };

  const today = new Date().toISOString().split("T")[0];

  if (loading) return <div className="space-y-3 pb-32">{[...Array(3)].map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}</div>;

  return (
    <div className="space-y-4 pb-32 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">💰 Chit Fund</h1>
        <p className="text-slate-500 text-sm">$5/day • Max 30 drivers • Daily lucky draw</p>
      </div>

      {/* How it works */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-5">
        <h3 className="font-bold">How it works</h3>
        <ul className="mt-2 text-sm text-white/90 space-y-1">
          <li>💵 Everyone contributes $5 daily</li>
          <li>👥 Maximum 30 drivers per slot</li>
          <li>🎲 One lucky driver wins the pot EVERY day</li>
          <li>🏆 Each driver wins only ONCE (unique winners)</li>
          <li>💸 Winner can withdraw/transfer their winnings</li>
        </ul>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

      {/* Draw celebration */}
      {drawResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fadeIn">
          <div className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-3xl p-8 text-center max-w-xs mx-4 shadow-2xl">
            <span className="text-6xl">🎉</span>
            <h2 className="mt-3 text-2xl font-bold text-white">Lucky Winner!</h2>
            <p className="text-3xl font-bold text-white mt-1">{drawResult.name}</p>
            <p className="text-white/90 mt-2">won <span className="font-bold text-2xl">${drawResult.amount.toFixed(2)}</span></p>
            <button onClick={() => setDrawResult(null)} className="mt-4 px-6 py-2 bg-white text-amber-600 font-bold rounded-xl">Close</button>
          </div>
        </div>
      )}

      {/* Pools */}
      {pools.map(pool => {
        const isMember = pool.members.some((m: any) => m.userId === userId);
        const me = pool.members.find((m: any) => m.userId === userId);
        const iPaidToday = pool.entries.some((e: any) => e.userId === userId && e.entryDate === today);
        const todayDraw = pool.draws.find((d: any) => d.drawDate === today);
        const eligibleCount = pool.members.filter((m: any) => !m.hasWon).length;

        return (
          <div key={pool.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-slate-900">{pool.name}</h3>
                <p className="text-xs text-slate-500">{pool.members.length}/30 drivers • ${parseFloat(pool.dailyAmount)}/day</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${eligibleCount > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {eligibleCount} eligible
              </span>
            </div>

            {/* Pot today */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs text-emerald-600">Today's Pot</p>
                <p className="text-xl font-bold text-emerald-700">
                  ${pool.entries.filter((e: any) => e.entryDate === today).reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <p className="text-xs text-indigo-600">Total Collected</p>
                <p className="text-xl font-bold text-indigo-700">${pool.totalContrib.toFixed(2)}</p>
              </div>
            </div>

            {/* Today's winner */}
            {todayDraw && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 mb-3 text-center">
                <p className="text-sm">🏆 Today's winner: <strong>{todayDraw.userName}</strong> — ${parseFloat(todayDraw.amountWon).toFixed(2)}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {!isMember && pool.members.length < 30 && (
                <button onClick={() => act("join", pool.id)} disabled={acting}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm disabled:opacity-40">
                  ➕ Join ($5/day)
                </button>
              )}
              {isMember && !iPaidToday && !todayDraw && (
                <button onClick={() => act("pay", pool.id)} disabled={acting}
                  className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm disabled:opacity-40">
                  💵 I Paid $5 Today
                </button>
              )}
              {isMember && iPaidToday && (
                <div className="flex-1 py-3 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold text-center">✅ Paid Today</div>
              )}
              {isMember && !todayDraw && eligibleCount > 0 && pool.entries.length > 0 && (
                <button onClick={() => act("draw", pool.id)} disabled={acting}
                  className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl text-sm disabled:opacity-40">
                  🎲 Draw Winner
                </button>
              )}
            </div>

            {/* Members */}
            <div className="mt-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Members</p>
              <div className="flex flex-wrap gap-1">
                {pool.members.map((m: any) => (
                  <span key={m.id} className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    m.hasWon ? "bg-yellow-100 text-yellow-700" : m.userId === userId ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {m.hasWon ? "🏆 " : ""}{m.userName}{m.userId === userId ? " (you)" : ""}
                  </span>
                ))}
              </div>
            </div>

            {/* Winner history */}
            {pool.draws.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Winners History</p>
                <div className="space-y-1">
                  {pool.draws.slice(0, 5).map((d: any) => (
                    <div key={d.id} className="flex justify-between text-xs bg-slate-50 p-2 rounded-lg">
                      <span>{d.drawDate}</span>
                      <span className="font-medium">{d.userName}</span>
                      <span className="font-bold text-emerald-600">${parseFloat(d.amountWon).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Create pool */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-semibold text-slate-900">➕ Create New Chit Fund</h3>
        <input value={newPoolName} onChange={e => setNewPoolName(e.target.value)}
          placeholder="Pool name (e.g., Sydney Drivers Slot A)"
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
        <button onClick={() => act("create", undefined, { name: newPoolName })} disabled={acting || !newPoolName.trim()}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:opacity-40">
          Create Pool (you're auto-joined)
        </button>
      </div>
    </div>
  );
}
