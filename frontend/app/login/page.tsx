"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Compass, ArrowRight, Lock, Mail, Sparkles, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("alex.chen@craft.co");
  const [password, setPassword] = useState("13802002");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid credentials. Please verify email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setError("");
      await login("alex.chen@craft.co", "13802002");
      router.push("/dashboard");
    } catch (err: any) {
      setError("Failed to authenticate demo account.");
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
          Sign in to your travel workspace
        </h2>
        <p className="text-xs font-mono text-[#715c50]">
          Resume your Tokyo, Kyoto, or European expeditions
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
              <label className="block text-xs font-mono text-[#715c50] mb-1">EMAIL ADDRESS</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9e8c81] absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
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
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In</span>}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#f2eae4]" />
            </div>
            <div className="relative flex justify-center text-xs font-mono uppercase">
              <span className="bg-white px-2 text-[#9e8c81]">or one-click access</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#f7f3f0] hover:bg-[#ebdcd3] text-[#2a2421] text-xs font-medium border border-[#e8dfd8] transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#9d3d26]" />
            <span>Sign in as Alex Chen (Demo)</span>
          </button>

          <p className="text-center text-xs text-[#715c50] pt-2">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-[#9d3d26] font-medium hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
