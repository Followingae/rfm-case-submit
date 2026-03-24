"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Boxes } from "@/components/ui/boxes";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState(0); // 0 = email, 1 = password
  const [loading, setLoading] = useState(false);

  const handleEmailNext = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (step === 0) handleEmailNext();
      else handleSubmit();
    }
  };

  return (
    <div className="w-full h-dvh relative overflow-hidden flex flex-col lg:flex-row p-4 sm:p-8 lg:p-12 gap-3 bg-white dark:bg-zinc-950">
      {/* ── Left: Form panel ── */}
      <div className="flex-1 lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-16 rounded-xl z-10">
        {/* Logo */}
        <img src="/rfm-logo.jpg" alt="RFM Loyalty" className="h-8 w-auto object-contain self-start" />

        {/* Main content — vertically centered */}
        <div className="flex-1 flex flex-col justify-center max-w-lg">
          {/* Big bold statement */}
          {step === 0 ? (
            <h1 className="text-3xl lg:text-[2.5rem] font-normal leading-[1.2] tracking-tight text-foreground">
              Enter your email address
              <br />
              to sign in.
            </h1>
          ) : (
            <h1 className="text-3xl lg:text-[2.5rem] font-normal leading-[1.2] tracking-tight text-foreground">
              Enter your password
              <br />
              to continue.
            </h1>
          )}

          {/* Inline input — no borders, just colored text */}
          <div className="mt-8">
            {step === 0 ? (
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="you@company.com"
                autoFocus
                autoComplete="email"
                className="w-full text-xl lg:text-2xl font-medium text-primary placeholder-primary/30 bg-transparent border-none outline-none caret-primary"
              />
            ) : (
              <>
                {/* Show email as static text */}
                <p className="text-primary font-medium text-lg mb-6">{email}</p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Password"
                  autoFocus
                  autoComplete="current-password"
                  className="w-full text-xl lg:text-2xl font-medium text-primary placeholder-primary/30 bg-transparent border-none outline-none caret-primary"
                />
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="mt-4 text-sm text-red-500">{error}</p>
          )}

          {/* Arrow button */}
          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={step === 0 ? handleEmailNext : handleSubmit}
              disabled={loading}
              className="flex h-11 w-11 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </button>

            {step === 1 && (
              <button
                onClick={() => { setStep(0); setPassword(""); setError(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>

        {/* Bottom spacer */}
        <div />
      </div>

      {/* ── Right: Boxes background panel ── */}
      <div className="hidden lg:block relative lg:w-1/2 rounded-xl overflow-hidden bg-zinc-900">
        <Boxes rows={30} cols={20} />
        <div className="pointer-events-none absolute inset-0 z-20 bg-zinc-900 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

        {/* Platform title */}
        <div className="absolute top-12 left-12 z-30">
          <h2 className="text-4xl xl:text-6xl font-normal leading-[1.1] tracking-tight text-white">
            Merchant Processing
            <br />
            & Management
          </h2>
        </div>

        {/* Gemini badge */}
        <div className="absolute bottom-8 left-12 z-30 flex items-center gap-2.5 text-sm text-white/80 font-medium">
          <img src="/gemini-logo.png" alt="Google Gemini" className="h-6 w-6" />
          Powered by Google Gemini
        </div>
      </div>
    </div>
  );
}
