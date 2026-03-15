"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="flex h-[700px] w-full max-w-4xl rounded-2xl overflow-hidden border border-border/40 bg-card shadow-[0_4px_24px_rgba(50,50,93,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_32px_rgba(0,0,0,0.4)]">
      {/* Left side — brand panel */}
      <div className="hidden w-full flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RFM Portal</h1>
          <p className="mt-1 text-sm text-primary-foreground/70">Merchant Case Submission Platform</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M0 .55.571 0H15.43l.57.55v9.9l-.571.55H.57L0 10.45zm1.143 1.138V9.9h13.714V1.69l-6.503 4.8h-.697zM13.749 1.1H2.25L8 5.356z" fill="currentColor" opacity="0.7" />
              </svg>
              <p className="text-sm font-medium">AI-Powered Document Analysis</p>
            </div>
            <p className="pl-6 text-xs text-primary-foreground/50">Automated extraction, validation, and readiness scoring</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 0a7 7 0 1 0 0 14A7 7 0 0 0 7 0Zm3.5 5.25-4.083 4.083a.583.583 0 0 1-.834 0L3.5 7.25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
              </svg>
              <p className="text-sm font-medium">End-to-End Workflow</p>
            </div>
            <p className="pl-6 text-xs text-primary-foreground/50">From submission to approval with full audit trail</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 8.5c0-.938-.729-1.7-1.625-1.7h-.812V4.25C10.563 1.907 8.74 0 6.5 0S2.438 1.907 2.438 4.25V6.8h-.813C.729 6.8 0 7.562 0 8.5v6.8c0 .938.729 1.7 1.625 1.7h9.75c.896 0 1.625-.762 1.625-1.7zM4.063 4.25c0-1.406 1.093-2.55 2.437-2.55s2.438 1.144 2.438 2.55V6.8H4.061z" fill="currentColor" opacity="0.7" />
              </svg>
              <p className="text-sm font-medium">Role-Based Access</p>
            </div>
            <p className="pl-6 text-xs text-primary-foreground/50">Sales, Processing, Management, and Admin roles</p>
          </div>
        </div>

        <p className="text-[11px] text-primary-foreground/30">
          Powered by Google Gemini
        </p>
      </div>

      {/* Right side — login form */}
      <div className="flex w-full flex-col items-center justify-center px-8">
        <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col items-center justify-center">
          <h2 className="text-3xl text-foreground font-semibold tracking-tight">Sign in</h2>
          <p className="text-sm text-muted-foreground mt-2">Welcome back! Please sign in to continue</p>

          <div className="w-full mt-8 flex flex-col gap-5">
            {/* Email */}
            <div className="flex items-center w-full bg-transparent border border-border h-12 rounded-full overflow-hidden pl-5 gap-2.5 focus-within:border-primary/50 transition-colors">
              <svg width="16" height="11" viewBox="0 0 16 11" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path fillRule="evenodd" clipRule="evenodd" d="M0 .55.571 0H15.43l.57.55v9.9l-.571.55H.57L0 10.45zm1.143 1.138V9.9h13.714V1.69l-6.503 4.8h-.697zM13.749 1.1H2.25L8 5.356z" fill="currentColor" className="text-muted-foreground" />
              </svg>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm w-full h-full pr-5"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="flex items-center w-full bg-transparent border border-border h-12 rounded-full overflow-hidden pl-5 gap-2.5 focus-within:border-primary/50 transition-colors">
              <svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <path d="M13 8.5c0-.938-.729-1.7-1.625-1.7h-.812V4.25C10.563 1.907 8.74 0 6.5 0S2.438 1.907 2.438 4.25V6.8h-.813C.729 6.8 0 7.562 0 8.5v6.8c0 .938.729 1.7 1.625 1.7h9.75c.896 0 1.625-.762 1.625-1.7zM4.063 4.25c0-1.406 1.093-2.55 2.437-2.55s2.438 1.144 2.438 2.55V6.8H4.061z" fill="currentColor" className="text-muted-foreground" />
              </svg>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent text-foreground placeholder-muted-foreground outline-none text-sm w-full h-full pr-5"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 w-full flex items-center gap-2 rounded-full bg-red-500/10 px-5 py-2.5 text-sm text-red-600 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full h-11 rounded-full text-white bg-primary hover:opacity-90 transition-opacity font-medium text-sm disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <p className="text-muted-foreground/60 text-xs mt-5 text-center">
            Contact your administrator if you need an account.
          </p>
        </form>
      </div>
    </div>
  );
}
