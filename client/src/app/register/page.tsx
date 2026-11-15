"use client";

import { PasswordInput } from "@/components/ui/PasswordInput";
import { ApiError, apiGet } from "@/lib/api";
import { useAuth, useAuthRedirect } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import type { Gender } from "@/lib/types";
import { MUNICIPALITY, TAPAZ_BARANGAYS } from "@/lib/tapaz-barangays";
import {
  Calendar,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RegisterPage() {
  const { register } = useAuth();
  const { loading, user } = useAuthRedirect();
  const { showToast } = useToast();
  const router = useRouter();
  const [genders, setGenders] = useState<Gender[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    phone: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    gender_id: "",
    barangay: "",
    address: "",
  });

  useEffect(() => {
    apiGet<Gender[]>("/genders")
      .then(setGenders)
      .catch(() =>
        setGenders([
          { id: 1, name: "Male" },
          { id: 2, name: "Female" },
        ])
      );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register({
        ...form,
        gender_id: Number(form.gender_id),
      });
      showToast("Account created successfully!");
      router.push("/portal");
    } catch (err) {
      if (err instanceof ApiError) {
        const msgs = err.errors
          ? Object.values(err.errors).flat().join(", ")
          : err.message;
        showToast(msgs, "error");
      } else {
        showToast("Registration failed", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleNameChange = (first: string, last: string) => {
    setForm((f) => ({
      ...f,
      first_name: first,
      last_name: last,
      name: first && last ? `${first} ${last}` : f.name,
    }));
  };

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div
        className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "var(--sidebar)" }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-40 h-40 rounded-2xl bg-white/4 flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/tapazlogo.png" alt="Tapaz Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-white font-bold text-xl">DentaGlow</div>
              <div className="text-blue-400 text-xs tracking-widest uppercase">
                Patient Portal
              </div>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Start your smile journey today
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
            Create your account to book appointments at the Municipal Dental
            Clinic of {MUNICIPALITY}.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            "Book appointments online 24/7",
            "Choose your preferred doctor & time slot",
            "Barangay verification for Tapaz residents",
            "No double booking — real-time availability",
          ].map((text) => (
            <div key={text} className="flex items-center gap-3 text-slate-300 text-sm">
              <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500 flex items-center justify-center text-blue-400 text-xs shrink-0">
                ✓
              </div>
              {text}
            </div>
          ))}
        </div>

        {/* Decorative circles */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-600/10" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-600/5" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center overflow-hidden">
              <img src="/tapazlogo.png" alt="Tapaz Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-slate-800">DentaFlow</div>
              <div className="text-xs text-blue-500">Create Account</div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800">Create Account</h2>
            <p className="text-slate-500 mt-2">
              Municipal Dental Clinic — {MUNICIPALITY}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User size={14} className="text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Personal Information
                </span>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">First Name</label>
                    <input
                      className="form-input"
                      value={form.first_name}
                      onChange={(e) =>
                        handleNameChange(e.target.value, form.last_name)
                      }
                      placeholder="Juan"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      className="form-input"
                      value={form.last_name}
                      onChange={(e) =>
                        handleNameChange(form.first_name, e.target.value)
                      }
                      placeholder="Dela Cruz"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label flex items-center gap-1">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.birth_date}
                      onChange={(e) => set("birth_date", e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Gender</label>
                    <select
                      className="form-input"
                      value={form.gender_id}
                      onChange={(e) => set("gender_id", e.target.value)}
                      required
                    >
                      <option value="">Select...</option>
                      {genders.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MapPin size={14} className="text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Address ({MUNICIPALITY})
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="form-label">Barangay *</label>
                  <select
                    className="form-input"
                    value={form.barangay}
                    onChange={(e) => set("barangay", e.target.value)}
                    required
                  >
                    <option value="">Select your barangay...</option>
                    {TAPAZ_BARANGAYS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Required for LGU patient verification
                  </p>
                </div>
                <div>
                  <label className="form-label">Street / Purok / Sitio</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="e.g. Purok 3, Sitio Malipayon"
                  />
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Lock size={14} className="text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Account Details
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="form-label flex items-center gap-1">
                    <Mail size={13} /> Email Address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="you@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="form-label flex items-center gap-1">
                    <Phone size={13} /> Phone Number
                  </label>
                  <input
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="09XX XXX XXXX"
                  />
                </div>
                <div>
                  <label className="form-label">Password</label>
                  <PasswordInput
                    value={form.password}
                    onChange={(v) => set("password", v)}
                    placeholder="Min. 8 characters"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Confirm Password</label>
                  <PasswordInput
                    value={form.password_confirmation}
                    onChange={(v) => set("password_confirmation", v)}
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full justify-center py-3.5 text-base gap-2"
              disabled={submitting}
            >
              <UserPlus size={18} />
              {submitting ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-blue-600 font-semibold hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}