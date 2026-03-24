"use client";

import { useEffect, useState } from "react";

export function MobileBlock() {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const check = () => {
      // Only block on phones: narrow screen AND portrait, or very narrow landscape
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isNarrow = w < 500;
      const isPhoneLandscape = w < 850 && h < 420;
      setIsPhone(isNarrow || isPhoneLandscape);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isPhone) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#0a0a0f] p-8 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_20s_linear_infinite] opacity-[0.07]"
          style={{
            background: "conic-gradient(from 0deg, #6366f1, #8b5cf6, #a78bfa, #6366f1)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center text-center max-w-xs">

        {/* Device illustration */}
        <div className="relative mb-10">
          {/* Desktop mockup */}
          <div className="relative w-48 h-32 rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-sm shadow-2xl shadow-indigo-500/10 overflow-hidden">
            <div className="absolute inset-2 rounded bg-white/[0.04]">
              <div className="flex gap-1 p-1.5">
                <div className="h-1 w-1 rounded-full bg-red-400/40" />
                <div className="h-1 w-1 rounded-full bg-yellow-400/40" />
                <div className="h-1 w-1 rounded-full bg-green-400/40" />
              </div>
              <div className="px-2 pt-1 space-y-1">
                <div className="h-1 w-8 rounded-full bg-indigo-400/20" />
                <div className="flex gap-1">
                  <div className="h-3 w-3 rounded bg-indigo-400/10" />
                  <div className="h-3 w-3 rounded bg-indigo-400/10" />
                  <div className="h-3 w-3 rounded bg-indigo-400/10" />
                  <div className="h-3 w-3 rounded bg-indigo-400/10" />
                </div>
                <div className="h-6 w-full rounded bg-indigo-400/5" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent" />
          </div>
          <div className="mx-auto mt-0.5 h-3 w-16 rounded-b-lg bg-white/[0.03] border-x border-b border-white/10" />
          <div className="mx-auto h-1 w-24 rounded-b bg-white/[0.02] border-x border-b border-white/5" />

          {/* Checkmark */}
          <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Phone with X */}
          <div className="absolute -bottom-4 -right-6">
            <div className="relative w-8 h-14 rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-sm">
              <div className="absolute inset-1 rounded bg-white/[0.02]">
                <div className="flex flex-col items-center justify-center h-full gap-0.5">
                  <div className="h-0.5 w-3 rounded-full bg-white/10" />
                  <div className="h-0.5 w-4 rounded-full bg-white/10" />
                  <div className="h-0.5 w-3 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
            <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/30">
              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white">
          Built for bigger screens
        </h1>
        <p className="mt-3 text-sm text-white/40 leading-relaxed">
          RFM Portal is a professional merchant onboarding platform designed for desktop and tablet. Please switch to a larger device.
        </p>

        {/* Supported devices */}
        <div className="mt-8 w-full space-y-2">
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs text-white/60">Desktop & Laptop</span>
            <span className="ml-auto text-[10px] text-emerald-400 font-medium">Supported</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/5 px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10">
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs text-white/60">iPad & Tablets</span>
            <span className="ml-auto text-[10px] text-emerald-400 font-medium">Supported</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-red-500/10 px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10">
              <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs text-white/60">Mobile Phones</span>
            <span className="ml-auto text-[10px] text-red-400 font-medium">Not Supported</span>
          </div>
        </div>

        <p className="mt-10 text-[10px] text-white/20">
          RFM Loyalty Co.
        </p>
      </div>
    </div>
  );
}
