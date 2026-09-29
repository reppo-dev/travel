"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, Trip } from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();

  const [activeNav, setActiveNav] = useState("profile");
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [handle, setHandle] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [transitPace, setTransitPace] = useState("balanced");
  const [weatherRadar, setWeatherRadar] = useState(true);
  const [emergencyContact, setEmergencyContact] = useState("Partner & Co-Traveler");
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripCount, setTripCount] = useState(0);

  useEffect(() => {
    if (user) {
      if (user.name) {
        const parts = user.name.trim().split(" ");
        setFirstName(parts[0] || "");
        setLastName(parts.slice(1).join(" ") || "");
        setHandle(user.name.toLowerCase().replace(/[^a-z0-9]/g, ""));
      }
      if (user.currency?.Valid && user.currency.String) {
        setCurrency(user.currency.String);
      }
    }
  }, [user]);

  useEffect(() => {
    api.trips.list().then((res) => {
      const list = res.data || [];
      setTrips(list);
      setTripCount(list.length);
    }).catch(() => {});
  }, []);

  // Active Sessions State
  const [sessions, setSessions] = useState([
    {
      id: "sess-1",
      device: "Browser Session (Current)",
      activeText: "Active Now",
      location: "Verified JWT Session",
      icon: "laptop_mac",
      isCurrent: true,
    },
  ]);

  // Modals
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isVjwModalOpen, setIsVjwModalOpen] = useState(false);
  const [isPnrProgramsModalOpen, setIsPnrProgramsModalOpen] = useState(false);
  const [isSecurityKeysModalOpen, setIsSecurityKeysModalOpen] = useState(false);
  const [isWeatherStationsModalOpen, setIsWeatherStationsModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Selected travel styles
  const [selectedStyles, setSelectedStyles] = useState<string[]>([
    "Adventure & Exploration",
    "Design & Architecture",
    "Culinary & Specialty Coffee",
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Keyboard shortcut ⌘S / Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [firstName, lastName, handle, currency, units, transitPace, weatherRadar, emergencyContact]);

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
      showToast(`Removed style: ${style}`);
    } else {
      setSelectedStyles([...selectedStyles, style]);
      showToast(`Added style: ${style}`);
    }
  };

  const handleSave = () => {
    setSavedFeedback(true);
    showToast("✓ All settings and telemetry preferences saved successfully!");
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleRevert = () => {
    setFirstName("Alex");
    setLastName("Chen");
    setHandle("alexchen");
    setCurrency("USD");
    setUnits("metric");
    setTransitPace("balanced");
    setWeatherRadar(true);
    setEmergencyContact("Maya Lin (+1 415-555-0192) — Partner & Co-Traveler");
    setAvatarRemoved(false);
    showToast("✓ Reverted all unsaved changes to defaults");
  };

  const scrollToSection = (id: string) => {
    setActiveNav(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-inverse-surface text-inverse-on-surface shadow-lg text-body-sm animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="p-space-lg max-w-[1360px] mx-auto w-full flex flex-col gap-space-lg">
        {/* Top Settings Banner & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-md border-b border-surface-variant">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
                Settings
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container border border-surface-variant text-on-surface-variant font-label-mono-sm text-label-mono-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
                All systems synced to cloud
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Manage your personal account, travel telemetry preferences, notification engines, security, and connected integrations.
            </p>
          </div>

          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <button
              type="button"
              onClick={handleRevert}
              className="px-3 py-1.5 bg-surface border border-surface-variant rounded hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-colors cursor-pointer"
            >
              Revert Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-on-primary rounded font-label-ui text-label-ui font-medium shadow-sm transition-all active:translate-y-0.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>{savedFeedback ? "Saved!" : "Save Changes"}</span>
              <span className="font-label-mono-sm text-label-mono-sm opacity-80 pl-1">⌘S</span>
            </button>
          </div>
        </div>

        {/* Dual Column Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* Left Sub-Navigation Rail (Col 1-3) */}
          <div className="lg:col-span-3 flex flex-col gap-space-md lg:sticky lg:top-20">
            <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-space-xs flex flex-col gap-0.5 shadow-sm">
              {[
                { id: "profile", label: "Profile & Account", icon: "person" },
                { id: "telemetry", label: "Travel Style & Telemetry", icon: "tune" },
                { id: "notifications", label: "Notification Engine", icon: "notifications_active", badge: "6 active" },
                { id: "integrations", label: "Connected Services", icon: "hub", badge: "4 Connected" },
                { id: "security", label: "Security & Sessions", icon: "shield", badge: "2FA Active" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                    activeNav === item.id
                      ? "bg-surface-container-high text-on-surface font-semibold border-l-2 border-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`material-symbols-outlined text-[18px] ${activeNav === item.id ? "text-primary" : ""}`}>
                      {item.icon}
                    </span>
                    <span className="font-body-md text-body-md">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="font-label-mono-sm text-label-mono-sm px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Membership Helper Status Card */}
            <div className="bg-surface-container-low border border-surface-variant rounded-xl p-space-base flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                  <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">Wanderly Pro</span>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
                  Annual
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-label-mono-sm font-label-mono-sm text-on-surface-variant">
                  <span>Cloud Vault Storage</span>
                  <span>48.2 MB / 10 GB</span>
                </div>
                <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: "5%" }} />
                </div>
              </div>
              <div className="pt-2 border-t border-surface-variant flex items-center justify-between font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                <span>Renews April 18, 2028</span>
                <button
                  type="button"
                  onClick={() => setIsBillingModalOpen(true)}
                  className="text-primary hover:underline font-medium cursor-pointer"
                >
                  Billing →
                </button>
              </div>
            </div>
          </div>

          {/* Right Content Canvas (Col 4-12) */}
          <div className="lg:col-span-9 flex flex-col gap-space-xl">
            {/* SECTION A: Account & Travel Identity */}
            <section className="flex flex-col gap-space-md" id="profile">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Account &amp; Travel Identity
                  </h2>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                  SEC-ID: WNDR-9941-AC
                </span>
              </div>

              <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
                {/* Profile Top Identity Strip */}
                <div className="p-space-base border-b border-surface-variant flex flex-col md:flex-row items-start md:items-center justify-between gap-space-base bg-surface-container-lowest">
                  <div className="flex items-center gap-space-md">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-headline-lg font-bold border border-surface-variant shadow-sm">
                        {avatarRemoved ? (user?.name?.slice(0, 2).toUpperCase() || "ME") : (user?.name ? user.name.slice(0, 2).toUpperCase() : "ME")}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-tertiary border-2 border-surface-container-lowest" title="Active" />
                    </div>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                          {firstName || user?.name || "Traveler"} {lastName}
                        </span>
                        <span className="material-symbols-outlined text-tertiary text-[18px]" title="Passport Verified">
                          verified_user
                        </span>
                        <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded font-label-mono-sm text-label-mono-sm">
                          Cloud Synced
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          {user?.email || "user@example.com"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="px-3 py-1.5 bg-surface border border-surface-variant rounded hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-colors cursor-pointer"
                      type="button"
                    >
                      Change Photo
                    </button>
                    <button
                      onClick={() => {
                        setAvatarRemoved(true);
                        showToast("Reset profile photo to default initials avatar");
                      }}
                      className="px-2.5 py-1.5 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded font-label-ui text-label-ui transition-colors cursor-pointer"
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Travel Vitals Telemetry Ribbon */}
                <div className="px-space-base py-2.5 bg-surface-container-low border-b border-surface-variant grid grid-cols-2 sm:grid-cols-4 gap-space-sm font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                  <div><span className="text-on-surface font-semibold">{tripCount}</span> Active &amp; Planned Trips</div>
                  <div><span className="text-on-surface font-semibold">{tripCount > 0 ? "Global" : "New"}</span> Explorer Level</div>
                  <div><span className="text-on-surface font-semibold">{user?.currency?.Valid ? user.currency.String : "USD"}</span> Preferred FX</div>
                  <div>Status: <span className="text-tertiary font-semibold">Active Session</span></div>
                </div>

                {/* Form Fields Grid */}
                <div className="p-space-base grid grid-cols-1 md:grid-cols-2 gap-space-base">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-ui text-label-ui font-medium text-on-surface flex items-center justify-between">
                      <span>First Name</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Legal ICAO</span>
                    </label>
                    <input
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-surface-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-ui text-label-ui font-medium text-on-surface flex items-center justify-between">
                      <span>Last Name</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Legal ICAO</span>
                    </label>
                    <input
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-surface-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-ui text-label-ui font-medium text-on-surface flex items-center justify-between">
                      <span>Public Handle &amp; Share ID</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-tertiary">wanderly.me/{handle}</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 font-label-mono-md text-label-mono-md text-on-surface-variant">@</span>
                      <input
                        className="w-full pl-7 pr-3 py-2 bg-surface-container-lowest border border-surface-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-ui text-label-ui font-medium text-on-surface flex items-center justify-between">
                      <span>Primary Passport Nationality</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">e-Passport Linked</span>
                    </label>
                    <div className="relative">
                      <input
                        className="w-full px-3 py-2 bg-surface-container-low border border-surface-variant rounded-lg font-body-md text-body-md text-on-surface cursor-not-allowed"
                        readOnly
                        type="text"
                        value="United States (USA) • Exp Oct 2030"
                      />
                      <span className="material-symbols-outlined text-[16px] absolute right-3 top-2.5 text-tertiary">lock</span>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col gap-1.5">
                    <label className="font-label-ui text-label-ui font-medium text-on-surface flex items-center justify-between">
                      <span>Emergency Travel Contact (Consular &amp; Medical Protocol)</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Encrypted</span>
                    </label>
                    <input
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-surface-variant rounded-lg font-body-md text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      type="text"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION B: Travel Intelligence & Experience Preferences */}
            <section className="flex flex-col gap-space-md" id="telemetry">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Travel Intelligence &amp; Experience Preferences
                  </h2>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Adaptive Engine v4.2</span>
              </div>

              <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm p-space-base flex flex-col gap-space-base">
                {/* Travel Archetype Tags */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-label-ui text-label-ui font-medium text-on-surface">Travel Style Archetypes</span>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                      Select focus tags for smart itinerary routing
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { name: "Adventure & Exploration", icon: "hiking" },
                      { name: "Design & Architecture", icon: "architecture" },
                      { name: "Culinary & Specialty Coffee", icon: "restaurant" },
                      { name: "Luxury & Boutique Lodging", icon: "hotel" },
                      { name: "Solo Backcountry", icon: "terrain" },
                      { name: "Family & Leisure", icon: "family_restroom" },
                    ].map((style) => {
                      const isSelected = selectedStyles.includes(style.name);
                      return (
                        <button
                          key={style.name}
                          type="button"
                          onClick={() => toggleStyle(style.name)}
                          className={`px-3 py-1.5 rounded-full font-label-ui text-label-ui font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-primary text-on-primary border border-primary shadow-sm"
                              : "bg-surface-container border border-surface-variant text-on-surface hover:bg-surface-container-high"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{style.icon}</span>
                          <span>{style.name}</span>
                          {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Telemetry Settings Grid */}
                <div className="pt-space-base border-t border-surface-variant grid grid-cols-1 md:grid-cols-2 gap-space-base">
                  {/* Default Currency */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-ui text-label-ui font-medium text-on-surface">
                      Base Accounting Currency
                    </label>
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={(e) => {
                          setCurrency(e.target.value);
                          showToast(`Default currency changed to ${e.target.value}`);
                        }}
                        className="w-full px-3 py-2 bg-surface-container-lowest border border-surface-variant rounded-lg font-body-md text-body-md text-on-surface appearance-none focus:outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="USD">USD ($) — United States Dollar</option>
                        <option value="EUR">EUR (€) — Euro</option>
                        <option value="JPY">JPY (¥) — Japanese Yen</option>
                        <option value="GBP">GBP (£) — British Pound</option>
                        <option value="CHF">CHF (Fr) — Swiss Franc</option>
                      </select>
                      <span className="material-symbols-outlined text-[18px] absolute right-3 top-2.5 pointer-events-none text-on-surface-variant">
                        expand_more
                      </span>
                    </div>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                      Realtime FX: 1 USD ≈ 154.20 JPY | 0.92 EUR
                    </span>
                  </div>

                  {/* Measurement Units */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-ui text-label-ui font-medium text-on-surface">Telemetry Units</label>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container rounded-lg border border-surface-variant">
                      <button
                        type="button"
                        onClick={() => {
                          setUnits("metric");
                          showToast("Set measurement units to Metric (km, °C, kg)");
                        }}
                        className={`py-1 px-3 rounded font-label-ui text-label-ui font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          units === "metric"
                            ? "bg-surface-container-lowest text-on-surface shadow-sm border border-surface-variant"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {units === "metric" && <span className="material-symbols-outlined text-[15px] text-primary">check_circle</span>}
                        <span>Metric (km, °C, kg)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUnits("imperial");
                          showToast("Set measurement units to Imperial (mi, °F, lb)");
                        }}
                        className={`py-1 px-3 rounded font-label-ui text-label-ui font-medium transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          units === "imperial"
                            ? "bg-surface-container-lowest text-on-surface shadow-sm border border-surface-variant"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        {units === "imperial" && <span className="material-symbols-outlined text-[15px] text-primary">check_circle</span>}
                        <span>Imperial (mi, °F, lb)</span>
                      </button>
                    </div>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                      Applied across route elevation, speed, and weather
                    </span>
                  </div>

                  {/* Transit Pace Bias */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label-ui text-label-ui font-medium text-on-surface">
                      Transit Buffer &amp; Scheduling Pace
                    </label>
                    <div className="relative">
                      <select
                        value={transitPace}
                        onChange={(e) => {
                          setTransitPace(e.target.value);
                          showToast(`Transit pace buffer updated to ${e.target.value}`);
                        }}
                        className="w-full px-3 py-2 bg-surface-container-lowest border border-surface-variant rounded-lg font-body-md text-body-md text-on-surface appearance-none focus:outline-none focus:border-primary cursor-pointer"
                      >
                        <option value="balanced">Balanced (20–30 min buffers between activities)</option>
                        <option value="tight">High Density (Tight transfers, max spots per day)</option>
                        <option value="leisure">Slow Leisure (45+ min dwell time, flexible stops)</option>
                      </select>
                      <span className="material-symbols-outlined text-[18px] absolute right-3 top-2.5 pointer-events-none text-on-surface-variant">
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Adaptive Weather Routing Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-surface-variant self-end">
                    <div className="flex flex-col pr-3">
                      <span className="font-label-ui text-label-ui font-medium text-on-surface">Precipitation Swap Radar</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Auto-suggest indoor venues when rain &gt; 50%</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={weatherRadar}
                        onChange={(e) => {
                          setWeatherRadar(e.target.checked);
                          showToast(e.target.checked ? "Precipitation Swap Radar ENABLED" : "Precipitation Swap Radar DISABLED");
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-surface-container-lowest after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:border-surface-variant after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                    </label>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION C: Notification Matrix */}
            <section className="flex flex-col gap-space-md" id="notifications">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Notification Matrix &amp; Dispatch Channels
                  </h2>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Priority Queues: Active</span>
              </div>

              <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-surface-variant font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                        <th className="py-2.5 px-4 font-medium">Event Categorization</th>
                        <th className="py-2.5 px-4 text-center font-medium w-28">Push</th>
                        <th className="py-2.5 px-4 text-center font-medium w-28">Email</th>
                        <th className="py-2.5 px-4 text-center font-medium w-28">In-App</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-variant font-body-md text-body-md text-on-surface">
                      {[
                        { title: "Severe Weather & Microclimate Alerts", desc: "Typhoon warnings, heat index triggers, transit shutdowns" },
                        { title: "Document & Visa Expiration Reminders", desc: "Passports < 6 months, JR Pass activation dates, ETA windows" },
                        { title: "Trip Budget & FX Threshold Warnings", desc: "Category budget breaches > 80%, currency spike triggers" },
                        { title: "Flight Delay & Gate Change Telemetry", desc: "Automated ACARS polling, baggage carousel announcements" },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-on-surface">{row.title}</div>
                            <div className="font-body-sm text-body-sm text-on-surface-variant">{row.desc}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              defaultChecked
                              type="checkbox"
                              onChange={(e) => showToast(`Updated Push preference for ${row.title}`)}
                              className="accent-primary w-4 h-4 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              defaultChecked={idx !== 2}
                              type="checkbox"
                              onChange={(e) => showToast(`Updated Email preference for ${row.title}`)}
                              className="accent-primary w-4 h-4 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              defaultChecked
                              type="checkbox"
                              onChange={(e) => showToast(`Updated In-App preference for ${row.title}`)}
                              className="accent-primary w-4 h-4 rounded cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* SECTION D: Connected Integrations */}
            <section className="flex flex-col gap-space-md" id="integrations">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Connected Integrations &amp; Ecosystem
                  </h2>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">4 / 8 Services Linked</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-base">
                {/* Google Calendar */}
                <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-space-base flex flex-col justify-between gap-space-base shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">Google Calendar &amp; iCal</span>
                        <span className="font-label-mono-sm text-label-mono-sm text-tertiary flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Connected &amp; Synced (3m ago)
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-surface-container rounded font-label-mono-sm text-label-mono-sm text-on-surface-variant">2-Way</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Bidirectional sync for flight blocks, hotel check-ins, and reservations directly into your personal calendar.
                  </p>
                  <div className="flex items-center justify-between pt-space-xs border-t border-surface-variant">
                    <Link href="/calendar" className="text-on-surface hover:text-primary font-label-ui text-label-ui transition-colors cursor-pointer">
                      Open Calendar →
                    </Link>
                    <button
                      onClick={() => showToast("Google Calendar connection verified and active")}
                      className="text-primary hover:underline font-label-ui text-label-ui cursor-pointer"
                      type="button"
                    >
                      Sync Now
                    </button>
                  </div>
                </div>

                {/* Visit Japan Web */}
                <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-space-base flex flex-col justify-between gap-space-base shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">Visit Japan Web &amp; Customs</span>
                        <span className="font-label-mono-sm text-label-mono-sm text-tertiary flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Active (Valid to Jul 2027)
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-surface-container rounded font-label-mono-sm text-label-mono-sm text-on-surface-variant">FastTrack</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Automatic biometric customs declarations and digital quarantine fast-lane QR generation for Tokyo/KIX ports.
                  </p>
                  <div className="flex items-center justify-between pt-space-xs border-t border-surface-variant">
                    <button
                      onClick={() => setIsVjwModalOpen(true)}
                      className="text-primary hover:underline font-label-ui text-label-ui font-medium cursor-pointer"
                      type="button"
                    >
                      View QR Pass
                    </button>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">ID: VJW-88219</span>
                  </div>
                </div>

                {/* Airline PNR */}
                <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-space-base flex flex-col justify-between gap-space-base shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">flight</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">Frequent Flyer &amp; PNR Auto-Pull</span>
                        <span className="font-label-mono-sm text-label-mono-sm text-tertiary flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> United Premier 1K &amp; ANA
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-surface-container rounded font-label-mono-sm text-label-mono-sm text-on-surface-variant">Live PNR</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Automatically extracts e-tickets from your inbox and loads seat assignments, upgrade lists, and boarding passes.
                  </p>
                  <div className="flex items-center justify-between pt-space-xs border-t border-surface-variant">
                    <button
                      onClick={() => setIsPnrProgramsModalOpen(true)}
                      className="text-on-surface hover:text-primary font-label-ui text-label-ui transition-colors cursor-pointer"
                      type="button"
                    >
                      Manage 2 Programs
                    </button>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Next sync in 12m</span>
                  </div>
                </div>

                {/* OpenWeather Radar */}
                <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-space-base flex flex-col justify-between gap-space-base shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-tertiary flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">radar</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">OpenWeatherMap Radar Telemetry</span>
                        <span className="font-label-mono-sm text-label-mono-sm text-tertiary flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> Tokyo / Kyoto Calibrated
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-surface-container rounded font-label-mono-sm text-label-mono-sm text-on-surface-variant">5min Feed</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Delivers 15-minute hyper-local rain precipitation models and pollen/UV indices for active itinerary coordinates.
                  </p>
                  <div className="flex items-center justify-between pt-space-xs border-t border-surface-variant">
                    <button
                      onClick={() => setIsWeatherStationsModalOpen(true)}
                      className="text-on-surface hover:text-primary font-label-ui text-label-ui transition-colors cursor-pointer"
                      type="button"
                    >
                      Configure Stations
                    </button>
                    <span className="font-label-mono-sm text-label-mono-sm text-tertiary">100% Signal</span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION E: Security & Biometrics */}
            <section className="flex flex-col gap-space-md mb-8" id="security">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Security &amp; Authorized Sessions
                  </h2>
                </div>
                <span className="font-label-mono-sm text-label-mono-sm text-tertiary font-medium">SOC-2 Type II Certified</span>
              </div>

              <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* 2FA Banner */}
                <div className="p-space-base border-b border-surface-variant flex items-center justify-between bg-surface-container-low">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-tertiary text-[24px]">verified</span>
                    <div className="flex flex-col">
                      <span className="font-label-ui text-label-ui font-medium text-on-surface">
                        Two-Factor Authentication (FIDO2 / YubiKey &amp; Authenticator App)
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Primary hardware token registered. Last verification: Today, 08:32 AM.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSecurityKeysModalOpen(true)}
                    className="px-3 py-1 bg-surface border border-surface-variant rounded text-on-surface font-label-ui text-label-ui hover:bg-surface-container transition-colors cursor-pointer"
                    type="button"
                  >
                    Configure Keys
                  </button>
                </div>

                {/* Active Sessions List */}
                <div className="p-space-base flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-1 border-b border-surface-variant font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                    <span>Active Client Devices ({sessions.length})</span>
                    {sessions.length > 1 && (
                      <button
                        onClick={() => {
                          setSessions([sessions[0]]);
                          showToast("✓ Terminated all other remote active sessions!");
                        }}
                        className="text-error hover:underline transition-colors cursor-pointer"
                        type="button"
                      >
                        Terminate All Other Sessions
                      </button>
                    )}
                  </div>

                  {sessions.map((sess) => (
                    <div
                      key={sess.id}
                      className="flex items-center justify-between py-2 border-b border-surface-variant/40 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-[18px]">{sess.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-body-md text-body-md font-medium text-on-surface">
                              {sess.device}
                            </span>
                            <span className="px-1.5 py-0.2 bg-tertiary-fixed text-on-tertiary-fixed rounded font-label-mono-sm text-[10px]">
                              {sess.activeText}
                            </span>
                          </div>
                          <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                            {sess.location}
                          </span>
                        </div>
                      </div>
                      {sess.isCurrent ? (
                        <span className="font-label-mono-sm text-label-mono-sm text-tertiary">Verified</span>
                      ) : (
                        <button
                          onClick={() => {
                            setSessions(sessions.filter((s) => s.id !== sess.id));
                            showToast(`Revoked session: ${sess.device}`);
                          }}
                          className="text-error hover:underline font-label-ui text-label-ui cursor-pointer"
                          type="button"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: Billing & Membership                               */}
      {/* ========================================================= */}
      {isBillingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">workspace_premium</span>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Wanderly Pro Plan</h3>
              </div>
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 font-body-sm text-body-sm">
              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-variant flex justify-between">
                <div>
                  <span className="font-semibold text-on-surface block">Annual Pro Plan</span>
                  <span className="text-on-surface-variant text-[12px]">$79.00 / year</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-tertiary text-on-tertiary font-label-mono-sm text-label-mono-sm self-start">
                  Active
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-variant font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                <span>Payment Card:</span>
                <span className="text-on-surface font-medium">Mastercard (•••• 9921)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-variant font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                <span>Next Invoice Date:</span>
                <span className="text-on-surface font-medium">April 18, 2028</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setIsBillingModalOpen(false);
                  showToast("Invoice #WNDR-2027 downloaded as PDF");
                }}
                className="w-full py-2 rounded bg-primary text-on-primary font-label-ui text-label-ui"
              >
                Download Latest Invoice
              </button>
              <button
                onClick={() => setIsBillingModalOpen(false)}
                className="w-full py-2 rounded bg-surface-container text-on-surface font-label-ui text-label-ui"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Visit Japan Web FastTrack QR                       */}
      {/* ========================================================= */}
      {isVjwModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-variant">
              <h3 className="font-semibold text-on-surface">Visit Japan Web FastTrack</h3>
              <button
                onClick={() => setIsVjwModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="mt-4 p-4 bg-white rounded-xl inline-block shadow-inner">
              <span className="material-symbols-outlined text-[100px] text-black">qr_code_2</span>
            </div>

            <p className="font-mono text-[13px] text-on-surface font-semibold mt-3">VJW-88219-CHEN</p>
            <p className="font-body-sm text-body-sm text-tertiary">Digital Customs &amp; Immigration Clearance Ready</p>

            <button
              onClick={() => {
                showToast("FastTrack QR saved to Apple Wallet!");
                setIsVjwModalOpen(false);
              }}
              className="w-full mt-4 py-2 rounded bg-primary text-on-primary font-label-ui text-label-ui"
            >
              Add to Wallet
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Frequent Flyer Programs                            */}
      {/* ========================================================= */}
      {isPnrProgramsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-variant">
              <h3 className="font-semibold text-on-surface">Frequent Flyer Programs</h3>
              <button
                onClick={() => setIsPnrProgramsModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 font-body-sm text-body-sm">
              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-variant flex justify-between items-center">
                <div>
                  <span className="font-semibold text-on-surface block">United MileagePlus</span>
                  <span className="font-mono text-[12px] text-on-surface-variant">#MP-98402102</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-label-mono-sm text-label-mono-sm">
                  Premier 1K
                </span>
              </div>

              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-variant flex justify-between items-center">
                <div>
                  <span className="font-semibold text-on-surface block">ANA Mileage Club</span>
                  <span className="font-mono text-[12px] text-on-surface-variant">#AMC-30918402</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-mono-sm text-label-mono-sm">
                  Diamond
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                showToast("Checked latest PNR seat maps for flight UA875");
                setIsPnrProgramsModalOpen(false);
              }}
              className="w-full py-2 rounded bg-primary text-on-primary font-label-ui text-label-ui"
            >
              Sync Flight Status Now
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Security Hardware Keys                             */}
      {/* ========================================================= */}
      {isSecurityKeysModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-variant">
              <h3 className="font-semibold text-on-surface">Hardware Security Keys</h3>
              <button
                onClick={() => setIsSecurityKeysModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3 font-body-sm text-body-sm">
              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-variant flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">key</span>
                  <div>
                    <span className="font-medium text-on-surface block">YubiKey 5C NFC (Primary)</span>
                    <span className="text-[11px] text-on-surface-variant font-mono">FIDO2 / WebAuthn</span>
                  </div>
                </div>
                <span className="text-tertiary font-label-mono-sm text-label-mono-sm">Registered</span>
              </div>
            </div>

            <button
              onClick={() => {
                showToast("Insert new hardware token into USB-C port to register");
                setIsSecurityKeysModalOpen(false);
              }}
              className="w-full py-2 rounded bg-primary text-on-primary font-label-ui text-label-ui"
            >
              Register Additional Key
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Weather Stations                                   */}
      {/* ========================================================= */}
      {isWeatherStationsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-variant">
              <h3 className="font-semibold text-on-surface">Weather Telemetry Stations</h3>
              <button
                onClick={() => setIsWeatherStationsModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="py-4 space-y-2 font-body-sm text-body-sm">
              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-variant flex justify-between items-center">
                <div>
                  <span className="font-medium text-on-surface block">
                    {trips.length > 0 ? `${trips[0].destination} Surface Station (Open-Meteo)` : "Global Surface Station (Open-Meteo)"}
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    {trips.length > 0 ? `${Number(trips[0].latitude || 0).toFixed(4)}° N, ${Number(trips[0].longitude || 0).toFixed(4)}° E` : "52.5200° N, 13.4050° E"}
                  </span>
                </div>
                <span className="text-tertiary font-label-mono-sm text-label-mono-sm">Active 100%</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low border border-surface-variant flex justify-between items-center">
                <div>
                  <span className="font-medium text-on-surface block">ECMWF Atmospheric Telemetry Grid</span>
                  <span className="text-[11px] text-on-surface-variant font-mono">Real-Time Global Forecast Model (11km resolution)</span>
                </div>
                <span className="text-tertiary font-label-mono-sm text-label-mono-sm">Active 99.8%</span>
              </div>
            </div>

            <button
              onClick={() => {
                showToast(trips.length > 0 ? `Recalibrated weather telemetry for ${trips[0].destination}` : "Recalibrated global weather telemetry network");
                setIsWeatherStationsModalOpen(false);
              }}
              className="w-full py-2 rounded bg-primary text-on-primary font-label-ui text-label-ui cursor-pointer"
            >
              Re-Calibrate Stations
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Change Profile Photo                               */}
      {/* ========================================================= */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="font-semibold text-on-surface mb-3">Update Profile Photo</h3>
            <div className="p-6 border-2 border-dashed border-surface-variant rounded-xl bg-surface-container-low/40 mb-4">
              <span className="material-symbols-outlined text-[36px] text-primary mb-1 block">add_a_photo</span>
              <span className="font-body-sm text-body-sm text-on-surface font-medium block">
                Drag and drop image or browse
              </span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">JPG, PNG up to 5MB</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setAvatarRemoved(false);
                  setIsPhotoModalOpen(false);
                  showToast("✓ Profile photo updated successfully!");
                }}
                className="w-full py-2 rounded bg-primary text-on-primary font-label-ui text-label-ui"
              >
                Upload Photo
              </button>
              <button
                onClick={() => setIsPhotoModalOpen(false)}
                className="w-full py-2 rounded bg-surface-container text-on-surface font-label-ui text-label-ui"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
