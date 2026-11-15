"use client";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { ApiError, apiPost } from "@/lib/api";
import { useToast } from "@/lib/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setDebugOtp(null);
    try {
      const res = await apiPost<{
        message: string;
        sms_sent?: boolean;
        masked_phone?: string;
        debug_otp?: string;
      }>("/forgot-password", { email });

      if (res.masked_phone) setMaskedPhone(res.masked_phone);
      if (res.debug_otp) setDebugOtp(res.debug_otp);

      showToast(
        res.sms_sent
          ? `OTP sent to ${res.masked_phone ?? "your phone"}`
          : res.message
      );
      setStep("reset");
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to send OTP",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      showToast("Passwords do not match", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<{ message: string }>("/reset-password", {
        email,
        otp,
        password,
        password_confirmation: passwordConfirmation,
      });
      showToast(res.message);
      router.push("/login");
    } catch (err) {
      showToast(
        err instanceof ApiError ? err.message : "Failed to reset password",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-[var(--background)]">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Forgot Password</h1>
          <p className="text-slate-500 mt-2">
            {step === "email"
              ? "Enter your account email. We will send a 6-digit code via SMS."
              : `Enter the OTP sent to ${maskedPhone || "your phone"} and your new password.`}
          </p>
        </div>

        <div className="card space-y-5">
          {step === "email" ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
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
              <button
                type="submit"
                className="btn btn-primary w-full justify-center py-3"
                disabled={submitting}
              >
                {submitting ? "Sending..." : "Send OTP via SMS"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              {debugOtp && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <strong>Local debug OTP:</strong> {debugOtp}
                  <span className="block text-xs mt-1 text-amber-700">
                    (Shown only when SMS is disabled in local environment)
                  </span>
                </div>
              )}

              <div>
                <label className="form-label">Email</label>
                <input type="email" className="form-input bg-slate-50" value={email} readOnly />
              </div>

              <div>
                <label className="form-label">6-digit OTP *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  className="form-input tracking-widest text-center text-lg font-semibold"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  required
                />
              </div>

              <div>
                <label className="form-label">New Password *</label>
                <PasswordInput
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 8 characters"
                  required
                />
              </div>

              <div>
                <label className="form-label">Confirm New Password *</label>
                <PasswordInput
                  value={passwordConfirmation}
                  onChange={setPasswordConfirmation}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full justify-center py-3"
                disabled={submitting || otp.length !== 6}
              >
                {submitting ? "Updating..." : "Reset Password"}
              </button>

              <button
                type="button"
                className="btn btn-ghost w-full justify-center"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setPassword("");
                  setPasswordConfirmation("");
                  setDebugOtp(null);
                }}
              >
                Back / Resend code
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Remembered your password?{" "}
          <Link href="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
