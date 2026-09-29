"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api, Trip, ItineraryDay, ItineraryActivity, WeatherData } from "@/lib/api";
import { format, parseISO, differenceInDays } from "date-fns";
import dynamic from "next/dynamic";

const SpatialMap = dynamic(
  () => import("@/components/map/SpatialMap").then((mod) => mod.SpatialMap),
  { ssr: false }
);

function ItineraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tripIdParam = searchParams.get("tripId");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"timeline" | "map" | "kanban">("timeline");
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Activity Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("10:00 AM");
  const [newLocation, setNewLocation] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const loadTrips = async () => {
      try {
        setLoading(true);
        const res = await api.trips.list();
        const tripList = res.data || [];
        setTrips(tripList);

        if (tripList.length > 0) {
          const selected = tripIdParam
            ? tripList.find((t) => t.id === tripIdParam) || tripList[0]
            : tripList[0];
          setActiveTrip(selected);
        } else {
          setActiveTrip(null);
          setDays([]);
        }
      } catch (err) {
        console.error("Failed to load trips:", err);
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };
    loadTrips();
  }, [tripIdParam]);

  useEffect(() => {
    if (!activeTrip) {
      setDays([]);
      setWeather(null);
      return;
    }

    const loadItinerary = async () => {
      try {
        const daysRes = await api.itinerary.listDays(activeTrip.id);
        setDays(daysRes.data || []);

        if (activeTrip.latitude && activeTrip.longitude) {
          api.geo
            .getWeather(activeTrip.latitude, activeTrip.longitude)
            .then((wRes) => {
              if (wRes.data) setWeather(wRes.data);
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error("Failed to load itinerary days:", err);
      }
    };

    loadItinerary();
  }, [activeTrip?.id]);

  const handleSelectTrip = (id: string) => {
    const found = trips.find((t) => t.id === id);
    if (found) {
      setActiveTrip(found);
      setSelectedDayIndex(0);
      router.push(`/itinerary?tripId=${found.id}`);
    }
  };

  const currentDay = days[selectedDayIndex] || days[0];

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !activeTrip || !currentDay || isSubmitting) return;

    setIsSubmitting(true);
    let slot: "morning" | "afternoon" | "evening" | "night" = "morning";
    const lowerTime = newTime.toLowerCase();
    if (lowerTime.includes("pm")) {
      const match = lowerTime.match(/(\d+)/);
      const hour = match ? parseInt(match[1], 10) : 1;
      if (hour >= 6 && hour < 12) slot = "evening";
      else slot = "afternoon";
    }

    try {
      await api.itinerary.addActivity(activeTrip.id, {
        day_id: currentDay.id,
        time_slot: slot,
        title: newTitle.trim(),
        start_time: newTime || "10:00 AM",
        location_name: newLocation.trim() || activeTrip.destination,
        notes: newNotes.trim() || "",
        sort_order: (currentDay.activities?.length || 0) + 1,
      });

      const fresh = await api.itinerary.listDays(activeTrip.id);
      setDays(fresh.data || []);
      showToast(`Added "${newTitle.trim()}" to Day ${currentDay.day_number}`);
      setShowAddModal(false);
      setNewTitle("");
      setNewLocation("");
      setNewNotes("");
    } catch (err) {
      console.error("Failed to add activity:", err);
      showToast("Error adding activity");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteActivity = async (activityId: string, title: string) => {
    if (!activeTrip) return;
    try {
      await api.itinerary.deleteActivity(activeTrip.id, activityId);
      const fresh = await api.itinerary.listDays(activeTrip.id);
      setDays(fresh.data || []);
      showToast(`Removed "${title}"`);
    } catch (err) {
      console.error("Failed to delete activity:", err);
      showToast("Error deleting activity");
    }
  };

  const tripDurationDays = activeTrip?.start_date && activeTrip?.end_date
    ? Math.max(1, Math.round((new Date(activeTrip.end_date).getTime() - new Date(activeTrip.start_date).getTime()) / (1000 * 60 * 60 * 24)))
    : days.length || 7;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-on-surface-variant font-label-ui text-label-ui">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        <span>Loading itinerary workspace...</span>
      </div>
    );
  }

  if (!loading && trips.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-space-xl text-center flex flex-col items-center justify-center my-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
          <span className="material-symbols-outlined text-[34px]">view_timeline</span>
        </div>
        <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">
          No Expeditions Found
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-6">
          Create an expedition to generate day-by-day structured itinerary timelines and map overlays.
        </p>
        <Link
          href="/trips"
          className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded font-label-ui text-label-ui font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
          <span>Plan an Expedition</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 -mt-space-lg">
      {/* Top Header Strip with Trip Switcher */}
      <div className="bg-surface-container-low px-space-lg py-3 flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant/40 -mx-space-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-surface-variant shadow-2xs">
            <span className="material-symbols-outlined text-[18px] text-primary">view_timeline</span>
            <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase">Trip:</span>
            <select
              value={activeTrip?.id || ""}
              onChange={(e) => handleSelectTrip(e.target.value)}
              aria-label="Select trip"
              className="bg-transparent font-label-ui text-label-ui font-semibold text-on-surface outline-hidden cursor-pointer"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.destination})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-mono text-on-surface-variant hidden sm:inline">
            {days.length} Days Planned • {activeTrip?.destination}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-on-primary font-label-ui text-xs font-medium shadow-xs hover:bg-primary/90 transition-all cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add Activity</span>
          </button>
          <Link
            href={`/trips/${activeTrip?.id}`}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-surface border border-outline-variant/30 text-on-surface font-label-ui text-xs font-medium hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            <span>Workspace</span>
          </Link>
        </div>
      </div>

      {/* Workspace Navigation Pills */}
      <div className="-mx-space-lg px-space-lg bg-surface flex items-center justify-between overflow-x-auto border-b border-surface-variant/30">
        <div className="flex items-center gap-1 py-2">
          <Link
            href={`/trips/${activeTrip?.id}`}
            className="px-3 py-1.5 rounded text-on-surface-variant font-label-ui text-label-ui hover:text-on-surface transition-colors"
          >
            Overview
          </Link>
          <div className="px-3 py-1.5 rounded bg-surface-container-highest text-on-surface font-label-ui text-label-ui font-semibold flex items-center gap-1.5 shadow-xs">
            <span className="material-symbols-outlined text-[16px] text-primary">view_timeline</span>
            <span>Itinerary</span>
            <span className="font-label-mono-sm text-label-mono-sm bg-primary text-on-primary px-1.5 py-0.2 rounded-full">
              {days.length || tripDurationDays}d
            </span>
          </div>
          <Link
            href="/places"
            className="px-3 py-1.5 rounded text-on-surface-variant font-label-ui text-label-ui hover:text-on-surface transition-colors"
          >
            Places
          </Link>
          <Link
            href={`/packing?tripId=${activeTrip?.id}`}
            className="px-3 py-1.5 rounded text-on-surface-variant font-label-ui text-label-ui hover:text-on-surface transition-colors"
          >
            Smart Packing
          </Link>
          <Link
            href="/expenses"
            className="px-3 py-1.5 rounded text-on-surface-variant font-label-ui text-label-ui hover:text-on-surface transition-colors"
          >
            Expenses
          </Link>
          <Link
            href="/documents"
            className="px-3 py-1.5 rounded text-on-surface-variant font-label-ui text-label-ui hover:text-on-surface transition-colors"
          >
            Documents
          </Link>
        </div>

        {/* View Mode Switchers */}
        <div className="flex items-center gap-1 pr-2">
          <button
            onClick={() => setViewMode("timeline")}
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              viewMode === "timeline" ? "bg-surface-container-highest text-on-surface shadow-2xs" : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Timeline View"
          >
            <span className="material-symbols-outlined text-[18px]">view_timeline</span>
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              viewMode === "map" ? "bg-surface-container-highest text-on-surface shadow-2xs" : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Spatial Map View"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={`p-1.5 rounded cursor-pointer transition-colors ${
              viewMode === "kanban" ? "bg-surface-container-highest text-on-surface shadow-2xs" : "text-on-surface-variant hover:bg-surface-container"
            }`}
            title="Kanban Board View"
          >
            <span className="material-symbols-outlined text-[18px]">view_kanban</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      {viewMode === "map" ? (
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-variant shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              Geospatial Expedition Map: {activeTrip?.destination}
            </h3>
            <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
              {days.flatMap((d) => d.activities || []).length} Scheduled Pins
            </span>
          </div>
          <SpatialMap
            latitude={activeTrip?.latitude || 35.6762}
            longitude={activeTrip?.longitude || 139.6503}
            zoom={13}
            markers={days.flatMap((d) =>
              (d.activities || []).map((a) => ({
                id: a.id,
                title: a.title,
                latitude: a.latitude?.Valid ? a.latitude.Float64 : (activeTrip?.latitude || 35.6762),
                longitude: a.longitude?.Valid ? a.longitude.Float64 : (activeTrip?.longitude || 139.6503),
                category: a.time_slot,
                subtitle: a.location_name?.Valid ? a.location_name.String : activeTrip?.destination,
              }))
            )}
            className="w-full h-[520px] rounded-xl border border-surface-variant overflow-hidden"
          />
        </div>
      ) : viewMode === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
          {days.map((day) => (
            <div
              key={day.id}
              className="w-80 shrink-0 bg-surface-container-lowest rounded-xl p-3 border border-surface-variant/50 shadow-xs flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-surface-variant/40">
                <span className="font-label-ui text-xs font-semibold text-on-surface">Day {day.day_number}</span>
                <span className="font-mono text-[11px] text-on-surface-variant">
                  {day.activities?.length || 0} items
                </span>
              </div>
              <div className="flex flex-col gap-2 min-h-[200px]">
                {(day.activities || []).map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-lg bg-surface border border-surface-variant/30 flex flex-col gap-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-primary uppercase">{act.time_slot}</span>
                      <span className="font-mono text-[10px] text-on-surface-variant">
                        {act.start_time?.Valid ? act.start_time.String : "10:00 AM"}
                      </span>
                    </div>
                    <span className="font-body-md text-xs font-medium text-on-surface">{act.title}</span>
                    {act.location_name?.Valid && (
                      <span className="font-mono text-[10px] text-on-surface-variant flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">pin_drop</span>
                        {act.location_name.String}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
          {/* Day Selector Strip & Day Timeline (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Days Horizontal Tabs */}
            <div className="bg-surface-container-lowest p-2 rounded-xl border border-surface-variant/40 shadow-xs flex items-center gap-2 overflow-x-auto">
              {days.map((day, idx) => (
                <button
                  key={day.id}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedDayIndex === idx
                      ? "bg-primary text-on-primary shadow-xs font-semibold"
                      : "bg-surface text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span>Day {day.day_number}</span>
                  {day.activities && day.activities.length > 0 && (
                    <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${
                      selectedDayIndex === idx ? "bg-white/20 text-white" : "bg-surface-container-highest text-on-surface-variant"
                    }`}>
                      {day.activities.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Activities List for Selected Day */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-variant/40 shadow-xs flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-surface-variant/40">
                <div>
                  <h4 className="font-label-ui text-sm font-semibold text-on-surface">
                    Day {currentDay?.day_number || 1} Schedule
                  </h4>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    {currentDay?.activities?.length || 0} activities scheduled
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1 rounded bg-surface hover:bg-surface-container border border-surface-variant text-xs font-medium text-primary flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Add Activity</span>
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {!currentDay || !currentDay.activities || currentDay.activities.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[32px]">event_available</span>
                    <span className="text-xs font-mono">No activities planned for this day yet.</span>
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-2 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-medium cursor-pointer"
                    >
                      Add Day {currentDay?.day_number || 1} Activity
                    </button>
                  </div>
                ) : (
                  currentDay.activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-surface border border-surface-variant/30 flex items-start justify-between gap-3 group hover:border-primary/40 transition-all shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[18px]">
                            {act.time_slot === "morning"
                              ? "wb_sunny"
                              : act.time_slot === "afternoon"
                              ? "light_mode"
                              : act.time_slot === "evening"
                              ? "dark_mode"
                              : "bedtime"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-body-md text-sm font-semibold text-on-surface">{act.title}</span>
                            <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-surface-container text-on-surface-variant">
                              {act.time_slot}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px]">schedule</span>
                              {act.start_time?.Valid ? act.start_time.String : "10:00 AM"}
                            </span>
                            {act.location_name?.Valid && (
                              <span className="flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[13px]">pin_drop</span>
                                {act.location_name.String}
                              </span>
                            )}
                          </div>
                          {act.notes?.Valid && act.notes.String && (
                            <p className="text-xs text-on-surface-variant/90 mt-1">{act.notes.String}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteActivity(act.id, act.title)}
                        className="w-7 h-7 rounded hover:bg-error-container/30 hover:text-error text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                        title="Delete activity"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column Context Cards (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Weather Card */}
            {weather && (
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-variant/40 shadow-xs flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-ui text-xs font-semibold text-on-surface">Destination Weather</span>
                  <span className="font-mono text-[11px] text-primary">{Math.round(weather.temperature)}°C</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-[24px] text-primary">{weather.icon}</span>
                  <span className="font-body-sm text-xs text-on-surface">{weather.condition} in {activeTrip?.destination}</span>
                </div>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  Humidity: {weather.humidity}% • Wind: {weather.wind_speed} km/h
                </span>
              </div>
            )}

            {/* Expedition Summary Card */}
            <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-variant/40 shadow-xs flex flex-col gap-2.5">
              <span className="font-label-ui text-xs font-semibold text-on-surface">Expedition Telemetry</span>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-surface border border-surface-variant/30 flex flex-col">
                  <span className="text-on-surface-variant text-[10px]">TOTAL DAYS</span>
                  <span className="font-semibold text-on-surface mt-0.5">{days.length} Days</span>
                </div>
                <div className="p-2 rounded bg-surface border border-surface-variant/30 flex flex-col">
                  <span className="text-on-surface-variant text-[10px]">ACTIVITIES</span>
                  <span className="font-semibold text-on-surface mt-0.5">
                    {days.flatMap((d) => d.activities || []).length} Items
                  </span>
                </div>
              </div>
              <Link
                href={`/trips/${activeTrip?.id}`}
                className="w-full py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-xs font-medium text-center transition-all shadow-xs mt-1"
              >
                Go to Full Trip Workspace
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-2xl p-6 max-w-md w-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Add Activity to Day {currentDay?.day_number || 1}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddActivity} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">Activity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meiji Shrine & Yoyogi Park Walking Tour"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-surface-variant bg-surface outline-hidden focus:border-primary text-on-surface"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">Start Time</label>
                  <input
                    type="text"
                    placeholder="10:00 AM"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-surface-variant bg-surface outline-hidden focus:border-primary text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Shibuya, Tokyo"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-surface-variant bg-surface outline-hidden focus:border-primary text-on-surface"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1 uppercase">Notes &amp; Details</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Meet guide at Harajuku station exit. Bring comfortable walking shoes."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-surface-variant bg-surface outline-hidden focus:border-primary text-on-surface"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-mono text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || isSubmitting}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary text-xs font-medium cursor-pointer transition-all shadow-sm"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-on-surface text-surface-container-lowest rounded-lg shadow-xl font-label-ui text-label-ui animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function ItineraryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-on-surface-variant font-label-ui text-label-ui">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          <span>Loading itinerary...</span>
        </div>
      }
    >
      <ItineraryContent />
    </Suspense>
  );
}
