"use client";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { ApiError } from "@/lib/api";
import { useAuth, useAuthRedirect } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const { login } = useAuth();
  const { loading, user } = useAuthRedirect();
  const { showToast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Redirecting...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      showToast("Welcome back!");
      router.push(
        loggedIn.role === "patient" ? "/portal" : "/admin/dashboard"
      );
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Login failed",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex flex-1 items-center justify-center p-12"
        style={{ background: "var(--sidebar)" }}
      >
       <div className="text-center text-white max-w-md">
            <div className="mb-6 flex justify-center">
              <img 
                src="/tapazlogo.png" 
                alt="Tapaz LGU Logo" 
                className="w-72 h-72 object-contain" 
              />
            </div>
            
            <div className="text-6xl mb-4"></div>
            <h1 className="text-4xl font-bold mb-4">DentaGlow Tapaz Capiz Lgu. Inc.</h1>
            <p className="text-slate-400 text-lg">
              Your trusted dental clinic management and appointment platform.
            </p>
          </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-slate-500 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="form-label mb-0">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 font-medium hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full justify-center py-3"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
