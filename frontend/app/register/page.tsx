"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Compass, User, Lock, Mail, Loader2, Sparkles } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await register(email, password, name);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f6] flex flex-col justify-center py-12 px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#9d3d26] text-white flex items-center justify-center shadow-sm">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-serif font-bold text-2xl text-[#2a2421]">Wanderly</span>
        </Link>
        <h2 className="text-xl font-serif font-bold text-[#2a2421]">
          Create your travel workspace
        </h2>
        <p className="text-xs font-mono text-[#715c50]">
          Begin organizing your journeys with calm and intention
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-3xl border border-[#e8dfd8] shadow-lg space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-[#715c50] mb-1">FULL NAME</label>
              <div className="relative">
                <User className="w-4 h-4 text-[#9e8c81] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#e8dfd8] focus:border-[#9d3d26] outline-hidden text-[#2a2421]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#715c50] mb-1">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9e8c81] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="maya@craft.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#e8dfd8] focus:border-[#9d3d26] outline-hidden text-[#2a2421]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#715c50] mb-1">PASSWORD</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#9e8c81] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-[#e8dfd8] focus:border-[#9d3d26] outline-hidden text-[#2a2421]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#9d3d26] hover:bg-[#85331f] text-white text-xs font-medium transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
            </button>
          </form>

          <p className="text-center text-xs text-[#715c50] pt-2">
            Already have an account?{" "}
            <Link href="/login" className="text-[#9d3d26] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
