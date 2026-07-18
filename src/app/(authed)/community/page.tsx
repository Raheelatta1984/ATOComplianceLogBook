"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  userId: string;
  userName: string;
  message: string;
  lat: string | null;
  lng: string | null;
  createdAt: string;
}

export default function CommunityPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [popup, setPopup] = useState<{ name: string; msg: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // Get location for sharing
    navigator.geolocation?.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
    // Poll every 10s
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/community");
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setUserId(data.userId || "");
      }
    } catch {} finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim(), lat: location?.lat, lng: location?.lng }),
      });
      setInput("");
      fetchMessages();
    } catch {} finally { setSending(false); }
  };

  // Show popup for latest message from others
  useEffect(() => {
    if (messages.length > 0) {
      const latest = messages[0];
      if (latest.userId !== userId) {
        setPopup({ name: latest.userName, msg: latest.message });
        const t = setTimeout(() => setPopup(null), 4000);
        return () => clearTimeout(t);
      }
    }
  }, [messages, userId]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fadeIn">
      {/* Popup notification */}
      {popup && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-fadeIn max-w-sm text-center">
          <p className="text-xs text-white/70 mb-1">👋 {popup.name}</p>
          <p className="font-medium">{popup.msg}</p>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Community</h1>
          <p className="text-slate-500 text-sm">{messages.length} messages</p>
        </div>
        <a href="https://chat.whatsapp.com/" target="_blank" rel="noopener noreferrer"
          className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors">
          💬 WhatsApp Group
        </a>
      </div>

      {/* WhatsApp Community Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-4 text-white mb-4">
        <h3 className="font-bold">📢 TripLog Community</h3>
        <p className="text-sm text-white/80 mt-1">Join our WhatsApp group for latest updates, features & tips for rideshare drivers in Australia.</p>
        <a href="https://chat.whatsapp.com/" target="_blank" rel="noopener noreferrer"
          className="inline-block mt-2 px-4 py-2 bg-white text-emerald-700 text-sm font-medium rounded-xl hover:bg-white/90">
          Join WhatsApp Community →
        </a>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">💬</span>
            <p className="mt-3 text-slate-500">No messages yet. Say hi!</p>
          </div>
        ) : (
          [...messages].reverse().map((msg) => (
            <div key={msg.id} className={`p-3 rounded-2xl max-w-[85%] ${
              msg.userId === userId
                ? "bg-indigo-600 text-white ml-auto rounded-br-md"
                : "bg-white border border-slate-200 rounded-bl-md"
            }`}>
              {msg.userId !== userId && (
                <p className="text-xs font-medium text-indigo-600 mb-1">{msg.userName}</p>
              )}
              <p className={`text-sm ${msg.userId === userId ? "text-white" : "text-slate-900"}`}>{msg.message}</p>
              <p className={`text-[10px] mt-1 ${msg.userId === userId ? "text-white/60" : "text-slate-400"}`}>
                {new Date(msg.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Say hi to the community..."
          className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button onClick={handleSend} disabled={!input.trim() || sending}
          className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-indigo-700 transition-colors">
          {sending ? "..." : "→"}
        </button>
      </div>
    </div>
  );
}
