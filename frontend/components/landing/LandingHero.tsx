"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  Compass,
  ArrowRight,
  MapPin,
  Cloud,
  CheckCircle2,
  Luggage,
  Calendar,
  Sparkles,
  ShieldCheck,
  Globe,
  Sliders,
  Play,
} from "lucide-react";

export const LandingHero: React.FC = () => {
  const { user, login } = useAuth();
  const router = useRouter();
  const [loggingInDemo, setLoggingInDemo] = useState(false);

  const handleQuickDemo = async () => {
    try {
      setLoggingInDemo(true);
      await login("alex.chen@craft.co", "13802002");
      router.push("/dashboard");
    } catch (err) {
      console.error("Demo login error:", err);
      router.push("/dashboard");
    } finally {
      setLoggingInDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf8f6] text-[#2a2421] selection:bg-[#9d3d26]/20 flex flex-col font-sans">
      {/* Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#fdf8f6]/85 backdrop-blur-xl border-b border-[#e8dfd8] z-50 flex items-center justify-between px-6 lg:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#9d3d26] text-white flex items-center justify-center shadow-xs">
            <Compass className="w-5 h-5 animate-[spin_12s_linear_infinite]" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-lg tracking-tight text-[#2a2421]">
              Wanderly
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#715c50]">
              Editorial Travel Workspace
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-mono text-[#715c50]">
          <a href="#features" className="hover:text-[#2a2421] transition-colors">
            Features
          </a>
          <a href="#geospatial" className="hover:text-[#2a2421] transition-colors">
            Map & Weather
          </a>
          <a href="#itinerary" className="hover:text-[#2a2421] transition-colors">
            Checklists
          </a>
          <a href="#preview" className="hover:text-[#2a2421] transition-colors">
            Tokyo 2027
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9d3d26] text-white text-xs font-medium hover:bg-[#85331f] transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-xs font-mono text-[#715c50] hover:text-[#2a2421] hover:bg-[#f2eae4] transition-all"
              >
                Sign In
              </Link>
              <button
                onClick={handleQuickDemo}
                disabled={loggingInDemo}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9d3d26] text-white text-xs font-medium hover:bg-[#85331f] transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>{loggingInDemo ? "Entering..." : "Explore Demo"}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-28 pb-16 px-6 lg:px-12 max-w-7xl mx-auto w-full space-y-20">
        <section className="text-center max-w-3xl mx-auto space-y-6 pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f2eae4] border border-[#e8dfd8] text-[11px] font-mono text-[#715c50]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9d3d26] animate-pulse" />
            <span>Next-Generation Travel Architecture · Spring 2027</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold tracking-tight text-[#2a2421] leading-[1.1]">
            Plan Journeys with Depth, Precision & Calm.
          </h1>

          <p className="text-base sm:text-lg text-[#715c50] font-sans max-w-2xl mx-auto leading-relaxed">
            A bespoke workspace combining live global meteorology, interactive geospatial pin-dropping,
            paced daily rhythms, and structured luggage choreography.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={handleQuickDemo}
              disabled={loggingInDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#9d3d26] hover:bg-[#85331f] text-white text-sm font-semibold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>Explore Tokyo Workspace Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#fcf7f4] border border-[#e8dfd8] text-[#2a2421] text-sm font-medium transition-all shadow-2xs cursor-pointer"
            >
              <span>Create Free Account</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-6 pt-4 text-xs font-mono text-[#9e8c81]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Free Open-Meteo Global Feeds
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Interactive Map Discovery
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Zero Spreadsheets
            </span>
          </div>
        </section>

        {/* Live Workspace Preview Card */}
        <section id="preview" className="relative rounded-3xl overflow-hidden border border-[#e8dfd8] bg-white shadow-xl group">
          <Link href="/dashboard" className="block relative h-80 sm:h-96 md:h-112 w-full overflow-hidden cursor-pointer">
            <Image
              src="/images/tokyo-tower.png"
              alt="Tokyo Skyline at dusk"
              fill
              priority
              className="object-cover brightness-95 group-hover:scale-102 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2a2421]/95 via-[#2a2421]/40 to-transparent" />
            <div className="absolute inset-0 bg-[#9d3d26]/15 mix-blend-multiply" />

            {/* Floating Telemetry Badges on Banner */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#2a2421] bg-white/90 backdrop-blur-md px-3 py-1 rounded-full shadow-xs">
                N 35° 41&apos; 22&quot; • E 139° 41&apos; 30&quot;
              </span>
              <span className="font-mono text-[11px] text-white bg-black/50 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                JST (UTC+9) · 14:42
              </span>
            </div>

            {/* Bottom Content Preview */}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-[#9d3d26] uppercase">
                    Featured Expedition
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-white/20 backdrop-blur-xs">
                    Spring Cherry Blossoms 2027
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 group-hover:bg-white/30 transition-colors flex items-center gap-1">
                    <span>Click to Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <h3 className="text-2xl sm:text-4xl font-serif font-bold tracking-tight">
                  Tokyo, Japan
                </h3>
                <p className="text-xs sm:text-sm text-stone-200">
                  April 18 — April 27, 2027 · 9 Days · 2 Travelers (Alex & Maya)
                </p>
              </div>

              {/* Mini Quad Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                <div className="p-2 rounded-lg bg-white/10">
                  <span className="block text-[10px] font-mono text-stone-300 uppercase">Countdown</span>
                  <span className="text-lg font-serif font-bold text-white">18 days</span>
                </div>
                <div className="p-2 rounded-lg bg-white/10">
                  <span className="block text-[10px] font-mono text-stone-300 uppercase">Forecast</span>
                  <span className="text-lg font-serif font-bold text-amber-300">19°C</span>
                </div>
                <div className="p-2 rounded-lg bg-white/10">
                  <span className="block text-[10px] font-mono text-stone-300 uppercase">Readiness</span>
                  <span className="text-lg font-serif font-bold text-emerald-300">78%</span>
                </div>
                <div className="p-2 rounded-lg bg-white/10">
                  <span className="block text-[10px] font-mono text-stone-300 uppercase">Budget</span>
                  <span className="text-lg font-serif font-bold text-sky-300">$3,850</span>
                </div>
              </div>
            </div>
          </Link>
        </section>

        {/* 3 Core Pillars Section */}
        <section id="features" className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#9d3d26] font-semibold">
              The Architecture of Mindful Travel
            </span>
            <h2 className="text-3xl font-serif font-bold text-[#2a2421]">
              Every tool crafted for intention, not exhaustion.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div id="geospatial" className="p-6 rounded-3xl bg-[#fdfaf7] border border-[#e8dfd8] space-y-4 hover:border-[#9d3d26]/30 transition-all shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#9d3d26]/10 text-[#9d3d26] flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#2a2421]">
                Geospatial Pin-Drop & Auto Photos
              </h3>
              <p className="text-xs text-[#715c50] leading-relaxed">
                Click anywhere on the world map to drop a pin. Wanderly automatically detects the city,
                province, country, pulls high-resolution editorial photography, and fetches live weather.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#fdfaf7] border border-[#e8dfd8] space-y-4 hover:border-[#4c6156]/30 transition-all shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#4c6156]/10 text-[#4c6156] flex items-center justify-center">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#2a2421]">
                Atmospheric Intelligence
              </h3>
              <p className="text-xs text-[#715c50] leading-relaxed">
                Real-time Open-Meteo feeds without paid API keys. Receive rain probability alerts and
                itinerary swap recommendations before bad weather interrupts your walking tour.
              </p>
            </div>

            <div id="itinerary" className="p-6 rounded-3xl bg-[#fdfaf7] border border-[#e8dfd8] space-y-4 hover:border-[#486172]/30 transition-all shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#486172]/10 text-[#486172] flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-[#2a2421]">
                Date-Specific Action Checklists
              </h3>
              <p className="text-xs text-[#715c50] leading-relaxed">
                Track visa deadlines, Shinkansen pass vouchers, and packing items with specific due dates,
                priority rankings, and one-click readiness meters.
              </p>
            </div>
          </div>
        </section>

        {/* Editorial Quote Banner */}
        <section className="p-8 sm:p-12 rounded-3xl bg-[#f2eae4] border border-[#ebdcd3] text-center space-y-4">
          <p className="font-serif italic text-xl sm:text-2xl text-[#2a2421] max-w-2xl mx-auto leading-relaxed">
            &ldquo;Travel planning should feel like curating an exhibition of moments, not managing an anxious corporate spreadsheet.&rdquo;
          </p>
          <span className="block text-xs font-mono text-[#715c50] uppercase tracking-widest">
            — The Wanderly Philosophy
          </span>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8dfd8] py-8 px-6 lg:px-12 bg-white mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#715c50]">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#9d3d26]" />
            <span>Wanderly © 2027 · Engineered for slow, deliberate exploration</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-[#2a2421]">
              Login
            </Link>
            <span>•</span>
            <Link href="/register" className="hover:text-[#2a2421]">
              Register
            </Link>
            <span>•</span>
            <Link href="/dashboard" className="hover:text-[#2a2421]">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default LandingHero;
