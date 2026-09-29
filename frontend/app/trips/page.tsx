"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, Trip } from "@/lib/api";
import NewTripModal from "@/components/trips/NewTripModal";
import EditTripModal from "@/components/trips/EditTripModal";
import { format, differenceInDays, parseISO } from "date-fns";

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "drafts">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadTrips = async () => {
    try {
      setLoading(true);
      const res = await api.trips.list();
      setTrips(res.data || []);
    } catch (err) {
      console.warn("Failed to load trips from API:", err);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  const formatDateWithTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = parseISO(dateStr);
      const dateFormatted = format(d, "MMM d, yyyy");
      if (dateStr.includes("T")) {
        const timePart = format(d, "HH:mm");
        return `${dateFormatted} at ${timePart}`;
      }
      return dateFormatted;
    } catch {
      return dateStr;
    }
  };

  const realTripCards = trips.map((t, idx) => {
    let days = 9;
    let dateLabel = "Dates TBD";
    let monthLabel = "Upcoming";
    try {
      days = differenceInDays(parseISO(t.end_date), parseISO(t.start_date)) || 9;
      const s = parseISO(t.start_date);
      const e = parseISO(t.end_date);
      const sTime = t.start_date.includes("T") ? ` at ${format(s, "HH:mm")}` : "";
      dateLabel = `${format(s, "MMM d")}${sTime} — ${format(e, "MMM d, yyyy")}`;
      monthLabel = format(s, "MMM yyyy");
    } catch {}

    const isDraft = t.status === "draft";
    const cost = idx === 0 ? "$3,850" : idx === 1 ? "$3,200" : "$1,800";
    const forecast =
      idx === 0
        ? "19°C • Mild"
        : idx === 1
        ? "22°C • Alpine Sun"
        : "26°C • Sunny";

    return {
      rawTrip: t,
      id: t.id,
      title: t.title,
      destination: t.destination,
      country: t.country,
      start_date: t.start_date,
      end_date: t.end_date,
      status: t.status,
      days,
      dateLabel,
      monthLabel,
      tags: [t.destination, t.country || "Expedition"],
      specialTag: isDraft ? "Draft Concept" : "Active Plan",
      specialTagStyle: isDraft
        ? "bg-surface-variant text-on-surface-variant font-label-mono-sm"
        : "bg-primary-fixed text-on-primary-fixed-variant font-label-mono-sm",
      progress: isDraft ? 20 : idx === 1 ? 90 : 42,
      progressItems: isDraft ? "20% (3/15 items)" : idx === 1 ? "90% (21/23 items)" : "42% (7/16 items)",
      progressColor: isDraft ? "bg-outline" : idx === 1 ? "bg-tertiary" : "bg-primary",
      forecast,
      forecastIcon: idx === 1 ? "wb_sunny" : "air",
      cost,
      activities: `${days * 2} activities staged`,
      action: isDraft ? "Continue draft" : "Manage trip",
      image:
        t.cover_image_url?.Valid && t.cover_image_url.String
          ? t.cover_image_url.String
          : "https://lh3.googleusercontent.com/aida-public/AB6AXuB-diY38AnqwUfnfILL9bxB29i3_sLMKHQzI7ZTfH3FUJoemKa-apa245adc9BTSkwUlX4Xj-PppAwkHNhW9FXamF8ibimabbTEYJ8wEUUDDuHaus_6rOII3jFoWtjfPVM_uvlEcdj7VCWPxT5lgpfX9To8YZkSW9d9Yof3kHQu1KLd6X-sSY7k5AijV6VTB3_V-iEQcV15PGCADwRYYB9Z-tTNLB2iKaoinKROU-pAhwzXZZ5-LO5M",
    };
  });

  const filteredTrips = realTripCards.filter((item) => {
    if (activeTab === "upcoming") return item.status !== "draft";
    if (activeTab === "drafts") return item.status === "draft";
    return true;
  });

  const featuredTrip = trips.length > 0 ? trips[0] : null;
  let featuredDaysUntil = 0;
  if (featuredTrip?.start_date) {
    try {
      const diff = differenceInDays(parseISO(featuredTrip.start_date), new Date());
      if (diff > 0) featuredDaysUntil = diff;
    } catch {}
  }

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-on-surface text-surface-container-lowest rounded-lg shadow-xl font-label-ui text-label-ui animate-in fade-in slide-in-from-bottom-4 duration-200">
          <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pb-space-sm border-b border-surface-variant">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant">
            <span>EXPEDITIONS</span>
            <span>•</span>
            <span className="text-primary font-medium">{trips.length} Active Itineraries</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold tracking-tight text-on-surface">
            My Travel Workspaces
          </h1>
        </div>

        <div className="flex items-center gap-space-sm">
          {/* Segmented Filter Pills */}
          <div className="flex items-center bg-surface-container-low p-1 rounded border border-surface-variant">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded font-label-ui text-label-ui transition-colors cursor-pointer ${
                activeTab === "all"
                  ? "bg-surface text-on-surface font-medium shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              All Trips ({trips.length})
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-3 py-1 rounded font-label-ui text-label-ui transition-colors cursor-pointer ${
                activeTab === "upcoming"
                  ? "bg-surface text-on-surface font-medium shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Upcoming ({trips.filter((t) => t.status !== "draft").length})
            </button>
            <button
              onClick={() => setActiveTab("drafts")}
              className={`px-3 py-1 rounded font-label-ui text-label-ui transition-colors cursor-pointer ${
                activeTab === "drafts"
                  ? "bg-surface text-on-surface font-medium shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Drafts ({trips.filter((t) => t.status === "draft").length})
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary hover:bg-primary-container text-on-primary font-label-ui text-label-ui font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Plan Expedition</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-12 text-on-surface-variant font-label-ui text-label-ui">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          <span>Loading expeditions...</span>
        </div>
      )}

      {/* Empty State for User with 0 Trips */}
      {!loading && trips.length === 0 && (
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-space-xl text-center flex flex-col items-center justify-center my-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
            <span className="material-symbols-outlined text-[34px]">flight_takeoff</span>
          </div>
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface mb-2">
            No expeditions planned yet
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-6">
            Start by planning your first journey — track day-by-day itineraries, interactive maps, weather forecasts, packing lists, and expenses in one unified workspace.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded font-label-ui text-label-ui font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
            <span>Plan Your First Expedition</span>
          </button>
        </div>
      )}

      {/* Featured Primary Workspace Card (Only when trips exist) */}
      {!loading && featuredTrip && (
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm overflow-hidden flex flex-col lg:flex-row">
          {/* Left Visual Area */}
          <div className="lg:w-5/12 relative min-h-[260px] bg-surface-container-high overflow-hidden">
            <div
              className="w-full h-full bg-cover bg-center min-h-[260px]"
              style={{
                backgroundImage: `url('${
                  featuredTrip?.cover_image_url?.Valid && featuredTrip.cover_image_url.String
                    ? featuredTrip.cover_image_url.String
                    : "https://lh3.googleusercontent.com/aida-public/AB6AXuB3zz0cqvGuvwFX6HZbmMQPX-5kovcf9e05w464ykKYxo6JgRnh9Ch8SbNArjHDPkntT7gMxPXnJIGsnbAFKYEtRxCIR_bVyY-F8pMyQF03qXJsUBCmSSszSEKTinjiy6Fiwx0UTS_0FTIe0YLuDWdo2cX0PdwgVGGay0HfyNVSKbW8UiIGCFRYYrSSneL4p3BypA1zA_BmTsxI2_zuN6oqn8SdqDr7Z4gztys27oN_MZNrf0_VChKM"
                }')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent flex flex-col justify-between p-space-base text-white">
              <div className="flex items-center justify-between">
                <span className="font-label-mono-sm text-label-mono-sm bg-black/40 backdrop-blur-md px-2 py-0.5 rounded border border-white/20">
                  {featuredDaysUntil > 0 ? `In ${featuredDaysUntil} Days` : "Upcoming Expedition"}
                </span>
                <span className="font-label-mono-sm text-label-mono-sm bg-primary/90 px-2 py-0.5 rounded">
                  PRIMARY ITINERARY
                </span>
              </div>
              <div>
                <span className="font-label-mono-sm text-label-mono-sm tracking-wider uppercase opacity-80">
                  {featuredTrip.country || "Expedition"} • {featuredTrip.destination}
                </span>
                <h2 className="font-headline-lg text-headline-lg font-bold text-white tracking-tight">
                  {featuredTrip.title}
                </h2>
                <span className="font-body-sm text-body-sm opacity-90 block mt-0.5">
                  {formatDateWithTime(featuredTrip.start_date)} — {formatDateWithTime(featuredTrip.end_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Telemetry & Actions */}
          <div className="lg:w-7/12 p-space-lg flex flex-col justify-between gap-space-md">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
              <div className="p-space-sm bg-surface-container-low rounded border border-surface-variant flex flex-col">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Countdown</span>
                <span className="font-headline-sm text-headline-sm font-semibold text-primary mt-0.5">
                  {featuredDaysUntil > 0 ? `${featuredDaysUntil} Days` : "Active"}
                </span>
                <span className="text-[10px] text-on-surface-variant font-mono truncate">{featuredTrip.destination}</span>
              </div>
              <div className="p-space-sm bg-surface-container-low rounded border border-surface-variant flex flex-col">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Travelers</span>
                <span className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5">
                  {featuredTrip.travelers_count}
                </span>
                <span className="text-[10px] text-tertiary font-mono truncate">
                  {featuredTrip.traveler_names || "Personal"}
                </span>
              </div>
              <div className="p-space-sm bg-surface-container-low rounded border border-surface-variant flex flex-col">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Status</span>
                <span className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5 capitalize">
                  {featuredTrip.status}
                </span>
                <span className="text-[10px] text-on-surface-variant font-mono">Synchronized</span>
              </div>
              <div className="p-space-sm bg-surface-container-low rounded border border-surface-variant flex flex-col">
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Destination</span>
                <span className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5 truncate">
                  {featuredTrip.destination}
                </span>
                <span className="text-[10px] text-on-surface-variant font-mono truncate">{featuredTrip.country}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-sm border-t border-surface-variant">
              <button
                onClick={() => {
                  setEditingTrip(featuredTrip);
                  setIsEditModalOpen(true);
                }}
                className="px-3 py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui text-label-ui font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Manage Trip Details</span>
              </button>

              <Link
                href={`/trips/${featuredTrip.id}`}
                className="w-full sm:w-auto px-4 py-2 rounded bg-primary hover:bg-primary-container text-on-primary font-label-ui text-label-ui font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <span>Open Expedition Workspace</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Trip Cards Grid */}
      {!loading && trips.length > 0 && (
        <div className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
              Active & Planned Expeditions
            </h2>
            <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
              {filteredTrips.length} expeditions found
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-base">
            {filteredTrips.map((tripItem) => {
              const workspaceUrl = `/trips/${tripItem.id}`;

              return (
                <div
                  key={tripItem.id}
                  className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between group"
                >
                  {/* Card Photo Header */}
                  <Link href={workspaceUrl} className="relative h-44 bg-surface-container-high overflow-hidden block cursor-pointer">
                    <div
                      className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                      style={{ backgroundImage: `url('${tripItem.image}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-space-base flex flex-col justify-between text-white">
                      <div className="flex items-center justify-between">
                        <span className="font-label-mono-sm text-label-mono-sm bg-black/40 backdrop-blur-md px-2 py-0.5 rounded border border-white/20">
                          {tripItem.monthLabel}
                        </span>
                        <span className={`font-label-mono-sm text-label-mono-sm px-2 py-0.5 rounded font-medium ${tripItem.specialTagStyle}`}>
                          {tripItem.specialTag}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm font-semibold text-white group-hover:text-primary transition-colors">
                          {tripItem.title}
                        </h3>
                        <span className="font-label-mono-sm text-[11px] opacity-90">
                          {tripItem.dateLabel}
                        </span>
                      </div>
                    </div>
                  </Link>

                  {/* Card Content Details */}
                  <div className="p-space-base flex flex-col gap-space-md flex-1 justify-between">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {tripItem.tags.map((tg) => (
                          <span
                            key={tg}
                            className="font-label-mono-sm text-[10px] px-2 py-0.5 rounded bg-surface-container text-on-surface-variant"
                          >
                            {tg}
                          </span>
                        ))}
                      </div>

                      {/* Stats Bar */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex justify-between font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                          <span>Planning progress</span>
                          <span className="font-medium text-on-surface">{tripItem.progressItems}</span>
                        </div>
                        <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
                          <div
                            className={`${tripItem.progressColor} h-full rounded-full transition-all duration-300`}
                            style={{ width: `${tripItem.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Forecast & Cost Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 bg-surface-container-low p-2 rounded">
                        <div className="flex flex-col">
                          <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase">
                            Forecast
                          </span>
                          <span className="font-label-ui text-label-ui font-medium text-on-surface mt-0.5 flex items-center gap-1 truncate">
                            <span className="material-symbols-outlined text-[13px] text-tertiary">
                              {tripItem.forecastIcon}
                            </span>
                            <span className="truncate">{tripItem.forecast}</span>
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase">
                            Estimated Cost
                          </span>
                          <span className="font-label-ui text-label-ui font-medium text-on-surface mt-0.5 font-label-mono-sm">
                            {tripItem.cost}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Vitals */}
                    <div className="pt-space-sm border-t border-surface-variant flex items-center justify-between">
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                        {tripItem.activities}
                      </span>

                      <button
                        onClick={() => {
                          setEditingTrip(tripItem.rawTrip);
                          setIsEditModalOpen(true);
                        }}
                        className="font-label-ui text-label-ui font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>{tripItem.action}</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Trip Modal */}
      <NewTripModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={(newTrip) => {
          setIsModalOpen(false);
          showToast(`Expedition "${newTrip.title}" planned!`);
          loadTrips();
        }}
      />

      {/* Edit Trip Modal */}
      <EditTripModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTrip(null);
        }}
        trip={editingTrip}
        onUpdated={(updated) => {
          setIsEditModalOpen(false);
          setEditingTrip(null);
          showToast(`Updated expedition "${updated.title}"!`);
          loadTrips();
        }}
      />
    </div>
  );
}
