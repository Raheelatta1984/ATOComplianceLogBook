"use client";

import { useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerBusiness, setRegisterBusiness] = useState("");
  const [registerAbn, setRegisterAbn] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerEmail, password: registerPassword, name: registerName,
          businessName: registerBusiness || undefined, abn: registerAbn || undefined, phone: registerPhone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "demo@triplogger.com.au", password: "demo123456" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo login failed");
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-700 to-pink-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <span className="text-3xl">🚗</span>
          </div>
          <h1 className="text-3xl font-bold text-white">TripLog</h1>
          <p className="text-white/70 mt-1 text-sm">ATO Compliant Travel Logbook</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button onClick={() => { setIsLogin(true); setError(""); }} className={`flex-1 py-4 font-medium text-sm transition-colors ${isLogin ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500"}`}>
              Sign In
            </button>
            <button onClick={() => { setIsLogin(false); setError(""); }} className={`flex-1 py-4 font-medium text-sm transition-colors ${!isLogin ? "text-indigo-600 border-b-2 border-indigo-600" : "text-slate-500"}`}>
              Register
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          {isLogin ? (
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="you@example.com" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="••••••••" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-slate-400">or</span></div>
              </div>
              <button type="button" onClick={handleDemoLogin} disabled={loading}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                🚀 Try Demo Account
              </button>
              <p className="text-center text-xs text-slate-400 mt-2">demo@triplogger.com.au / demo123456</p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
              <input type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="Full Name *" required />
              <input type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="Email *" required />
              <input type="password" value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="Password * (min 6 chars)" minLength={6} required />
              <input type="text" value={registerBusiness} onChange={(e) => setRegisterBusiness(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="Business Name (optional)" />
              <input type="text" value={registerAbn} onChange={(e) => setRegisterAbn(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="ABN (optional)" maxLength={11} />
              <input type="tel" value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm" placeholder="Phone (optional)" />
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/50 text-xs mt-6">ATO compliant • Odometer tracking • Export anytime</p>
      </div>
    </div>
  );
}
