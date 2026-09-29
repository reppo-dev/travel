"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  api,
  Trip,
  ItineraryDay,
  TripTodo,
  PackingItem,
  Expense,
  SavedPlace,
  TravelDocument,
  WeatherData,
} from "@/lib/api";
import { format, differenceInDays, parseISO } from "date-fns";

const SpatialMap = dynamic(
  () => import("@/components/map/SpatialMap").then((mod) => mod.SpatialMap),
  { ssr: false }
);

export default function TripWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [todos, setTodos] = useState<TripTodo[]>([]);
  const [packing, setPacking] = useState<PackingItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [documents, setDocuments] = useState<TravelDocument[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  // Active UI states
  const [activeTab, setActiveTab] = useState<"itinerary" | "overview" | "places" | "packing" | "expenses" | "documents">("itinerary");
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [newActivityTitle, setNewActivityTitle] = useState("");
  const [newActivityTime, setNewActivityTime] = useState("10:00 AM");
  const [newActivityLocation, setNewActivityLocation] = useState("");
  const [viewMode, setViewMode] = useState<"timeline" | "map" | "kanban">("timeline");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [collaborator, setCollaborator] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const c = sp.get("collaborator");
      if (c) {
        setCollaborator(c);
        setToastMessage(`🤝 Connected with collaborator: ${c}`);
      }
    }
  }, []);
  const [bookmarkedIds, setBookmarkedIds] = useState<Record<string, boolean>>({});
  const [previewDoc, setPreviewDoc] = useState<{ title: string; type: "qr" | "pdf" | "details"; ref: string } | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleTodo = async (todoId: string) => {
    try {
      await api.todos.toggle(tripId, todoId);
      setTodos((prev) =>
        prev.map((item) =>
          item.id === todoId ? { ...item, is_completed: !item.is_completed } : item
        )
      );
      showToast("Task status updated");
    } catch (err) {
      console.error("Failed to toggle todo:", err);
    }
  };

  const loadTripData = async () => {
    try {
      setLoading(true);
      // Fetch trip details
      const [tripRes, daysRes, todosRes, packRes, expRes, placesRes, docsRes] =
        await Promise.allSettled([
          api.trips.get(tripId),
          api.itinerary.listDays(tripId),
          api.todos.list(tripId),
          api.packing.list(tripId),
          api.expenses.list(tripId),
          api.places.list(tripId),
          api.documents.list(tripId),
        ]);

      if (tripRes.status === "fulfilled" && tripRes.value.data) {
        const loadedTrip = tripRes.value.data;
        setTrip(loadedTrip);
        if (loadedTrip.latitude && loadedTrip.longitude) {
          api.geo.getWeather(loadedTrip.latitude, loadedTrip.longitude)
            .then((wRes) => {
              if (wRes.data) setWeather(wRes.data);
            })
            .catch((wErr) => console.warn("Live weather fetch failed:", wErr));
        }
      } else {
        setTrip(null);
      }

      if (daysRes.status === "fulfilled" && daysRes.value.data && daysRes.value.data.length > 0) {
        setDays(daysRes.value.data);
      }
      if (todosRes.status === "fulfilled" && todosRes.value.data) {
        setTodos(todosRes.value.data);
      }
      if (packRes.status === "fulfilled" && packRes.value.data) {
        setPacking(packRes.value.data);
      }
      if (expRes.status === "fulfilled" && expRes.value.data) {
        setExpenses(expRes.value.data);
      }
      if (placesRes.status === "fulfilled" && placesRes.value.data) {
        setPlaces(placesRes.value.data);
      }
      if (docsRes.status === "fulfilled" && docsRes.value.data) {
        setDocuments(docsRes.value.data);
      }
    } catch (err) {
      console.error("Workspace loading fallback invoked:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripData();
  }, [tripId]);

  // Derived dynamic itinerary days from backend database
  const daysList = React.useMemo(() => {
    if (days.length > 0) {
      return days.map((d) => {
        let dateFormatted = `Day ${d.day_number}`;
        try {
          dateFormatted = format(parseISO(d.date), "MMM d");
        } catch {
          // fallback
        }
        return {
          id: d.id,
          day: `DAY ${String(d.day_number).padStart(2, "0")}`,
          date: dateFormatted,
          sub: d.title || trip?.destination || "Exploration",
          icon: weather?.icon || "light_mode",
          title: d.title || `Day ${d.day_number} in ${trip?.destination || "Destination"}`,
          desc:
            d.notes?.Valid && d.notes.String
              ? d.notes.String
              : `Planned itinerary and exploration activities for ${trip?.destination || "the expedition"}.`,
          activeHours: d.activities?.length ? `${d.activities.length * 2}h scheduled` : "Self-paced",
          steps: `Est. ${d.activities?.length ? d.activities.length * 3200 + 4500 : 5000} steps`,
          destCount: d.activities?.length || 0,
          items: (d.activities || []).map((act) => {
            const timeStr = act.start_time?.Valid && act.start_time.String ? act.start_time.String : "10:00 AM";
            const locStr = act.location_name?.Valid && act.location_name.String ? act.location_name.String : (trip?.destination ? `${trip.destination} Center` : "City Center");
            const costStr = act.cost?.Valid && act.cost.String ? act.cost.String : "Free / Included";
            const noteStr = act.notes?.Valid && act.notes.String ? act.notes.String : "";
            const refStr = act.booking_ref?.Valid && act.booking_ref.String ? act.booking_ref.String : "Confirmed";
            return {
              id: act.id,
              time: timeStr,
              duration: "1h 30m",
              category: act.time_slot ? act.time_slot.toUpperCase() : "ACTIVITY",
              catColor: "bg-primary-fixed text-on-primary-fixed",
              title: act.title,
              location: locStr,
              ref: refStr,
              cost: costStr,
              note: noteStr,
            };
          }),
        };
      });
    }

    return [
      {
        id: "day-1-default",
        day: "DAY 01",
        date: trip?.start_date ? format(parseISO(trip.start_date), "MMM d") : "Day 1",
        sub: trip?.destination || "Arrival",
        icon: "flight_land",
        title: `Arrival in ${trip?.destination || "Destination"} & Exploration`,
        desc: `First day in ${trip?.destination || "destination"}. Check-in, get settled, and start exploring local neighborhoods.`,
        activeHours: "Flexible Schedule",
        steps: "Est. 6,000 steps",
        destCount: 0,
        items: [],
      },
    ];
  }, [days, trip, weather]);

  const currentDay = daysList[selectedDayIndex] || daysList[0];

  const formattedDateRange = React.useMemo(() => {
    if (!trip?.start_date || !trip?.end_date) return "Upcoming Expedition";
    try {
      const s = parseISO(trip.start_date);
      const e = parseISO(trip.end_date);
      return `${format(s, "MMMM d")} — ${format(e, "MMMM d, yyyy")}`;
    } catch {
      return `${trip.start_date} — ${trip.end_date}`;
    }
  }, [trip?.start_date, trip?.end_date]);

  const tripDurationDays = React.useMemo(() => {
    if (!trip?.start_date || !trip?.end_date) return 1;
    try {
      const diff = differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date));
      return Math.max(1, diff + 1);
    } catch {
      return 1;
    }
  }, [trip?.start_date, trip?.end_date]);

  const destinationCode = React.useMemo(() => {
    if (!trip?.destination) return "EXP";
    const words = trip.destination.trim().split(/\s+/);
    if (words.length >= 3) {
      return words.slice(0, 3).map((w) => w[0].toUpperCase()).join("");
    }
    return trip.destination.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "EXP";
  }, [trip?.destination]);

  const travelersText = React.useMemo(() => {
    if (trip?.traveler_names) return trip.traveler_names;
    const count = trip?.travelers_count || 1;
    return count > 1 ? `${count} Explorers` : "Solo Explorer";
  }, [trip?.traveler_names, trip?.travelers_count]);

  const mapMarkers = React.useMemo(() => {
    const list: any[] = [];
    if (trip?.latitude && trip?.longitude) {
      list.push({
        id: "destination-hub",
        title: `${trip.destination} Hub`,
        latitude: trip.latitude,
        longitude: trip.longitude,
        category: "Destination",
        subtitle: trip.country,
      });
    }
    places.forEach((p, idx) => {
      const lat = p.latitude?.Valid ? p.latitude.Float64 : (trip?.latitude ? trip.latitude + (idx * 0.007 - 0.015) : undefined);
      const lon = p.longitude?.Valid ? p.longitude.Float64 : (trip?.longitude ? trip.longitude + (idx * 0.009 - 0.012) : undefined);
      if (lat && lon) {
        list.push({
          id: p.id,
          title: p.title,
          latitude: lat,
          longitude: lon,
          category: p.category,
          subtitle: p.address?.Valid ? p.address.String : undefined,
          isVisited: p.is_visited,
        });
      }
    });
    return list;
  }, [trip, places]);

  const totalSpent = React.useMemo(() => {
    return expenses.reduce((sum, e) => {
      const val = parseFloat(e.amount) || 0;
      return sum + val;
    }, 0);
  }, [expenses]);

  const expensesByCategory = React.useMemo(() => {
    const map: Record<string, number> = {
      stay: 0,
      dining: 0,
      transit: 0,
      activities: 0,
      shopping: 0,
      other: 0,
    };
    expenses.forEach((e) => {
      const cat = (e.category || "other").toLowerCase();
      const val = parseFloat(e.amount) || 0;
      if (map[cat] !== undefined) map[cat] += val;
      else map["other"] += val;
    });
    return map;
  }, [expenses]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setShowAddActivityModal(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleAddActivitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityTitle.trim()) return;

    let slot: "morning" | "afternoon" | "evening" | "night" = "morning";
    const lowerTime = newActivityTime.toLowerCase();
    if (lowerTime.includes("pm")) {
      const match = lowerTime.match(/(\d+)/);
      const hour = match ? parseInt(match[1], 10) : 1;
      if (hour >= 6 && hour < 12) slot = "evening";
      else if (hour >= 10 && hour < 12) slot = "night";
      else slot = "afternoon";
    }

    const targetDayId = currentDay?.id && currentDay.id !== "day-1-default" ? currentDay.id : days[0]?.id;

    if (targetDayId) {
      try {
        await api.itinerary.addActivity(tripId, {
          day_id: targetDayId,
          time_slot: slot,
          title: newActivityTitle.trim(),
          start_time: newActivityTime || "10:00 AM",
          location_name: newActivityLocation || (trip?.destination ? `${trip.destination} Center` : "City Center"),
          cost: "Free",
          currency: "USD",
          sort_order: (currentDay?.items?.length || 0) + 1,
        });
        showToast(`Activity "${newActivityTitle.trim()}" added to ${currentDay.day}`);
        const freshDaysRes = await api.itinerary.listDays(tripId);
        if (freshDaysRes.data) {
          setDays(freshDaysRes.data);
        }
      } catch (err) {
        console.error("Failed to add activity to backend:", err);
        showToast("Error adding activity to server");
      }
    } else {
      showToast(`Activity "${newActivityTitle.trim()}" recorded`);
    }

    setShowAddActivityModal(false);
    setNewActivityTitle("");
    setNewActivityLocation("");
  };

  const [inlinePackingTitle, setInlinePackingTitle] = useState("");
  const [inlinePackingCategory, setInlinePackingCategory] = useState("clothing");
  const [inlinePackingQuantity, setInlinePackingQuantity] = useState(1);

  const handleTogglePacking = async (itemId: string) => {
    const item = packing.find((p) => p.id === itemId);
    if (!item) return;
    const nextState = !item.is_packed;
    setPacking((prev) =>
      prev.map((p) => (p.id === itemId ? { ...p, is_packed: nextState } : p))
    );
    showToast(nextState ? `Packed "${item.title}"` : `Unpacked "${item.title}"`);
    try {
      await api.packing.toggle(tripId, itemId);
    } catch (err) {
      console.error("Failed to toggle packing:", err);
      setPacking((prev) =>
        prev.map((p) => (p.id === itemId ? { ...p, is_packed: !nextState } : p))
      );
    }
  };

  const handleDeletePacking = async (itemId: string, title: string) => {
    setPacking((prev) => prev.filter((p) => p.id !== itemId));
    showToast(`Removed "${title}" from packing`);
    try {
      await api.packing.delete(tripId, itemId);
    } catch (err) {
      console.error("Failed to delete packing item:", err);
      api.packing.list(tripId).then((res) => setPacking(res.data || []));
    }
  };

  const handleAddPackingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlinePackingTitle.trim()) return;
    const titleToAdd = inlinePackingTitle.trim();
    setInlinePackingTitle("");
    try {
      const res = await api.packing.create(tripId, {
        title: titleToAdd,
        category: inlinePackingCategory.toLowerCase(),
        quantity: inlinePackingQuantity > 0 ? inlinePackingQuantity : 1,
      });
      if (res.data) {
        setPacking((prev) => [res.data, ...prev]);
      } else {
        const fresh = await api.packing.list(tripId);
        setPacking(fresh.data || []);
      }
      showToast(`Added "${titleToAdd}"`);
    } catch (err) {
      console.error("Failed to add packing item:", err);
      showToast("Error adding packing item");
    }
  };

  const handleGeneratePackingEssentials = async () => {
    const destination = trip?.destination || "Destination";
    const essentials = [
      { title: `Passport & Travel Visas (${trip?.country || destination})`, category: "documents", quantity: 1 },
      { title: "Universal Travel Power Adapter (Dual USB-C)", category: "electronics", quantity: 1 },
      { title: "High-Capacity Power Bank (10,000mAh)", category: "electronics", quantity: 1 },
      { title: "Weather-Resistant Windbreaker / Rain Shell", category: "clothing", quantity: 1 },
      { title: "Exploration Footwear & Walking Shoes", category: "clothing", quantity: 1 },
      { title: "Personal Toiletry Kit & Essential Medication", category: "toiletries", quantity: 1 },
      { title: "Physical Credit Cards & Local Currency Cash", category: "documents", quantity: 1 },
      { title: "Compact First Aid & Hydration Electrolytes", category: "gear", quantity: 1 },
    ];

    try {
      for (const item of essentials) {
        await api.packing.create(tripId, item);
      }
      const fresh = await api.packing.list(tripId);
      setPacking(fresh.data || []);
      showToast(`Generated ${essentials.length} packing essentials!`);
    } catch (err) {
      console.error("Failed to generate essentials:", err);
      showToast("Error generating essentials");
    }
  };

  let daysUntilDeparture = 18;
  if (trip?.start_date) {
    try {
      const diff = differenceInDays(parseISO(trip.start_date), new Date());
      if (diff > 0) daysUntilDeparture = diff;
    } catch {
      // fallback
    }
  }

  const completedTodosCount = todos.filter((t) => t.is_completed).length;
  const totalTodosCount = todos.length || 23;
  const prepPercentage = Math.round(((completedTodosCount || 18) / (totalTodosCount || 23)) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-on-surface-variant font-label-ui text-label-ui">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        <span>Loading expedition workspace...</span>
      </div>
    );
  }

  if (!loading && !trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8 bg-surface-container-lowest rounded-xl border border-surface-variant my-8 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-error-container/20 flex items-center justify-center text-error mb-2">
          <span className="material-symbols-outlined text-[36px]">lock</span>
        </div>
        <h1 className="font-headline-md text-headline-md font-bold text-on-surface">
          Expedition Not Found or Access Denied
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
          This expedition workspace does not exist, was deleted, or you do not have permission to access it.
        </p>
        <Link
          href="/trips"
          className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-on-primary rounded font-label-ui text-label-ui font-medium transition-all shadow-sm flex items-center gap-2 mt-2"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Return to All Expeditions</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full -mt-space-lg">
      {/* Subtle ambient canvas highlight */}
      <div className="relative w-full bg-surface pb-space-2xl">
        {/* Hero / Destination Mood Banner Strip */}
        <div className="relative w-full h-56 bg-surface-container-high overflow-hidden">
          <div
            className="w-full h-full bg-cover bg-center opacity-85"
            style={{
              backgroundImage: `url('${
                trip?.cover_image_url?.Valid && trip.cover_image_url.String
                  ? trip.cover_image_url.String
                  : "https://lh3.googleusercontent.com/aida-public/AB6AXuCPDyN2I54Dew7GWjDB64diweqMgf1vOP1bVvPwIdbnQzXqOfN-WWZv79EQMxld4TcrOIhVi0Y6XV5AZ0D99-bJxtpP7eGg7hoqsqAeSxxpaYR3E7abc2ss2oYXb6t3PNG7KEy0IX7hC2HbvgJ5ihOuBow3jT81WH3mhpJsnqh8J8sUklb6U2CP-OKPkfzNbboYvRGNGY5TWBd9IgpyK2oi5eHSUE91-zNiU8icZqI-y8ifM3a2s81M"
              }')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-transparent to-surface/40" />

          {/* Quick Floating Status on Visual Banner */}
          <div className="absolute bottom-space-md left-space-lg right-space-lg flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-label-mono-sm text-label-mono-sm uppercase tracking-widest text-on-surface-variant bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded shadow-sm">
                N {trip?.latitude ? trip.latitude.toFixed(2) : "0.00"}° • E {trip?.longitude ? trip.longitude.toFixed(2) : "0.00"}°
              </span>
              <span className="font-label-mono-sm text-label-mono-sm text-tertiary bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                {trip?.destination || "Telemetry Active"} • Live GPS
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded shadow-sm">
              <span className="material-symbols-outlined text-[16px] text-primary">
                {weather?.icon || "thermostat"}
              </span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface">
                {weather ? `${weather.condition} • ${Math.round(weather.temperature)}°C` : "Atmospheric Telemetry Connected"}
              </span>
            </div>
          </div>
        </div>

        {/* Main Workspace Container */}
        <div className="px-space-lg -mt-6 relative z-10 flex flex-col gap-space-lg">
          {/* Workspace Header Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col gap-space-md">
            {/* Breadcrumbs & Status Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                <Link href="/trips" className="hover:text-primary transition-colors">
                  Trips
                </Link>
                <span>/</span>
                <span className="text-on-surface font-medium">{trip?.title || trip?.destination || "Expedition"}</span>
                <span>/</span>
                <span className="text-on-surface-variant">Itinerary Workspace</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed font-label-ui text-label-ui font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Upcoming • In {daysUntilDeparture} Days
                </span>
                <span className="font-label-mono-sm text-label-mono-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                  TRIP-ID #{trip?.id ? trip.id.slice(0, 8).toUpperCase() : "EXP"}
                </span>
              </div>
            </div>

            {/* Main Title & Action Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-base">
              <div className="flex flex-col gap-1">
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold flex items-center gap-3">
                  {trip?.title || trip?.destination || "Expedition Workspace"}
                  <span className="text-on-surface-variant font-label-mono-md text-label-mono-md font-normal px-2 py-0.5 bg-surface-container rounded">
                    {destinationCode}
                  </span>
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="flex items-center gap-1 text-on-surface font-medium">
                    <span className="material-symbols-outlined text-[15px] text-primary">calendar_today</span>
                    {formattedDateRange}
                  </span>
                  <span>•</span>
                  <span>{tripDurationDays} Days Total</span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-secondary">group</span>
                    {(trip?.travelers_count || 1) + (collaborator ? 1 : 0)} Travelers ({travelersText}{collaborator ? `, ${collaborator}` : ""})
                  </span>
                  {collaborator && (
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-mono-sm text-label-mono-sm font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                      Shared Session Active
                    </span>
                  )}
                </div>
              </div>

              {/* Trip Progress Ring & Quick Actions */}
              <div className="flex flex-wrap items-center gap-space-md">
                {/* Mini Ring Progress */}
                <div className="flex items-center gap-3 px-3 py-1.5 bg-surface-container-low rounded">
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-surface-variant"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                      />
                      <path
                        className="text-primary"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeDasharray={`${prepPercentage}, 100`}
                        strokeLinecap="round"
                        strokeWidth="3.5"
                      />
                    </svg>
                    <span className="absolute font-label-mono-sm text-[9px] font-semibold text-on-surface">
                      {prepPercentage}%
                    </span>
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="font-label-ui text-label-ui font-medium text-on-surface">Prep Status</span>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                      {completedTodosCount}/{totalTodosCount} Tasks
                    </span>
                  </div>
                </div>

                {/* Workspace Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(window.location.href);
                        showToast("Trip workspace link copied to clipboard!");
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">ios_share</span>
                    <span>Share</span>
                  </button>
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        showToast("Opening PDF print dialog...");
                        window.print();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                    <span>Export PDF</span>
                  </button>
                  <button
                    onClick={() => setShowAddActivityModal(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary hover:bg-primary-container text-on-primary font-label-ui text-label-ui font-medium shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    <span>Add Activity</span>
                    <kbd className="font-label-mono-sm text-[10px] bg-black/20 px-1 py-0.2 rounded ml-0.5">N</kbd>
                  </button>
                </div>
              </div>
            </div>

            {/* Weather Context Alert Chip */}
            <div className="flex items-start sm:items-center gap-3 p-2.5 rounded bg-surface-container-high text-on-surface">
              <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5 sm:mt-0">
                {weather?.icon || "cloud"}
              </span>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="font-body-sm text-body-sm text-on-surface">
                  <strong className="font-medium text-on-surface">Live Weather Telemetry:</strong>{" "}
                  {weather ? (
                    <>
                      {Math.round(weather.temperature)}°C Current in {trip?.destination} ({weather.condition}) • Feels like {Math.round(weather.feels_like)}°C • Humidity {weather.humidity}% • Wind {weather.wind_speed} km/h • {weather.precipitation > 0 ? `Rain expected (${weather.precipitation}mm)` : "Optimal outdoor conditions"}
                    </>
                  ) : (
                    <>Live meteorological telemetry syncing for {trip?.destination || "destination"}...</>
                  )}
                </p>
                <Link
                  href="/packing"
                  className="shrink-0 self-start sm:self-auto font-label-mono-sm text-label-mono-sm text-primary hover:underline font-medium"
                >
                  Review Gear Checklist →
                </Link>
              </div>
            </div>
          </div>

          {/* Segmented Control Bar */}
          <div className="flex items-center justify-between p-1 bg-surface-container rounded shadow-sm overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 rounded font-label-ui text-label-ui transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-surface-container-lowest text-on-surface font-medium shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">overview</span>
                <span>Overview</span>
              </button>
              <button
                onClick={() => setActiveTab("itinerary")}
                className={`px-3.5 py-1.5 rounded font-label-ui text-label-ui font-medium flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "itinerary"
                    ? "bg-surface-container-lowest text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-primary">view_timeline</span>
                <span>Itinerary</span>
                <span className="font-label-mono-sm text-label-mono-sm bg-primary-fixed text-on-primary-fixed px-1.5 py-0.2 rounded-full font-semibold">
                  {days.length || tripDurationDays}d
                </span>
              </button>
              <Link
                href="/places"
                className="px-3 py-1.5 rounded text-on-surface-variant hover:text-on-surface font-label-ui text-label-ui transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                <span>Places</span>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant bg-surface-container-highest px-1.5 py-0.2 rounded-full">
                  {places.length}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setActiveTab("packing")}
                className={`px-3 py-1.5 rounded font-label-ui text-label-ui transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "packing"
                    ? "bg-surface-container-lowest text-on-surface font-semibold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">check_box</span>
                <span>Smart Packing</span>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant bg-surface-container-highest px-1.5 py-0.2 rounded-full">
                  {packing.filter((p) => p.is_packed).length}/{packing.length}
                </span>
              </button>
              <Link
                href="/expenses"
                className="px-3 py-1.5 rounded text-on-surface-variant hover:text-on-surface font-label-ui text-label-ui transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">attach_money</span>
                <span>Expenses</span>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant bg-surface-container-highest px-1.5 py-0.2 rounded-full">
                  {totalSpent > 0 ? `$${Math.round(totalSpent)}` : "$0"}
                </span>
              </Link>
              <Link
                href="/documents"
                className="px-3 py-1.5 rounded text-on-surface-variant hover:text-on-surface font-label-ui text-label-ui transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">folder</span>
                <span>Documents</span>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant bg-surface-container-highest px-1.5 py-0.2 rounded-full">
                  {documents.length}
                </span>
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-2 pr-2">
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">View:</span>
              <button
                onClick={() => {
                  setViewMode("timeline");
                  showToast("Switched to chronological timeline view");
                }}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewMode === "timeline"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest"
                }`}
                title="Chronological Timeline"
              >
                <span className="material-symbols-outlined text-[16px]">view_agenda</span>
              </button>
              <button
                onClick={() => {
                  setViewMode("map");
                  showToast("Switched to geospatial map overlay view");
                }}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewMode === "map"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest"
                }`}
                title="Map Split"
              >
                <span className="material-symbols-outlined text-[16px]">map</span>
              </button>
              <button
                onClick={() => {
                  setViewMode("kanban");
                  showToast("Switched to day-by-day kanban columns view");
                }}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  viewMode === "kanban"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest"
                }`}
                title="Kanban Columns"
              >
                <span className="material-symbols-outlined text-[16px]">view_kanban</span>
              </button>
            </div>
          </div>

          {/* Main Viewport Dual Column Architecture */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            {/* LEFT COLUMN: Detailed Timeline Itinerary, Spatial Map or Smart Packing (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-space-lg">
              {activeTab === "packing" ? (
                <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col gap-space-md border border-surface-variant/40">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-surface-variant/40">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[22px]">inventory_2</span>
                        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                          Smart Packing Checklist
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-primary text-on-primary font-label-mono-sm text-label-mono-sm font-semibold">
                          {packing.filter((p) => p.is_packed).length}/{packing.length} Packed
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        Manage gear and essentials directly in your {trip?.destination} expedition workspace.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/packing?tripId=${tripId}`}
                        className="px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-highest text-on-surface font-label-ui text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                        <span>Open Full Packing Assistant</span>
                      </Link>
                    </div>
                  </div>

                  {/* Inline Quick Add Item */}
                  <form
                    onSubmit={handleAddPackingSubmit}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 bg-surface-container-low rounded-xl border border-primary/30"
                  >
                    <div className="flex-1 flex items-center gap-2 px-2">
                      <span className="material-symbols-outlined text-[18px] text-primary shrink-0">add_circle</span>
                      <input
                        type="text"
                        placeholder="Add packing item (e.g. Passport, Rain Jacket, Power Adapter)..."
                        value={inlinePackingTitle}
                        onChange={(e) => setInlinePackingTitle(e.target.value)}
                        className="w-full text-sm py-1 bg-transparent text-on-surface placeholder:text-on-surface-variant outline-none font-medium"
                      />
                    </div>
                    <select
                      value={inlinePackingCategory}
                      onChange={(e) => setInlinePackingCategory(e.target.value)}
                      aria-label="Category"
                      className="text-xs px-2.5 py-1.5 rounded bg-surface border border-surface-variant text-on-surface outline-none cursor-pointer"
                    >
                      <option value="clothing">Clothing</option>
                      <option value="electronics">Tech &amp; Optics</option>
                      <option value="documents">Documents</option>
                      <option value="toiletries">Toiletries</option>
                      <option value="gear">Gear &amp; EDC</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={inlinePackingQuantity}
                      onChange={(e) => setInlinePackingQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-12 text-xs px-2 py-1.5 rounded bg-surface border border-surface-variant text-on-surface text-center outline-none"
                      title="Quantity"
                      aria-label="Item quantity"
                    />
                    <button
                      type="submit"
                      disabled={!inlinePackingTitle.trim()}
                      className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 text-on-primary text-xs font-medium cursor-pointer transition-all flex items-center gap-1 shrink-0 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>Add</span>
                    </button>
                  </form>

                  {/* Packing Items List */}
                  <div className="flex flex-col gap-1.5">
                    {packing.length === 0 ? (
                      <div className="py-12 px-4 text-center flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined text-[24px]">luggage</span>
                        </div>
                        <h4 className="font-label-ui text-sm font-semibold text-on-surface">No packing items yet</h4>
                        <p className="font-body-sm text-xs text-on-surface-variant max-w-sm">
                          Use the input bar above to add custom gear, or automatically generate essential checklist items for this trip.
                        </p>
                        <button
                          type="button"
                          onClick={handleGeneratePackingEssentials}
                          className="mt-2 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-on-primary rounded-lg text-xs font-medium transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                          <span>Generate Smart Essentials</span>
                        </button>
                      </div>
                    ) : (
                      packing.map((item) => {
                        const isPacked = item.is_packed;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleTogglePacking(item.id)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all cursor-pointer group ${
                              isPacked
                                ? "bg-surface-container-low/50 border-transparent opacity-70"
                                : "bg-surface border-surface-variant/40 hover:border-primary/40 hover:bg-surface-container-low"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePacking(item.id);
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                isPacked
                                  ? "bg-primary border-primary text-on-primary"
                                  : "border-outline-variant hover:border-primary"
                              }`}
                            >
                              {isPacked && <span className="material-symbols-outlined text-[14px]">check</span>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-sm font-medium ${
                                  isPacked ? "line-through text-on-surface-variant" : "text-on-surface"
                                }`}
                              >
                                {item.title}
                              </span>
                              <span className="font-label-mono-sm text-[10px] uppercase ml-2 px-1.5 py-0.2 rounded bg-surface-container text-on-surface-variant">
                                {item.category}
                              </span>
                              {item.quantity > 1 && (
                                <span className="font-label-mono-sm text-[10px] ml-1 text-on-surface-variant">
                                  ×{item.quantity}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePacking(item.id, item.title);
                              }}
                              className="w-7 h-7 rounded hover:bg-error-container/30 hover:text-error text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                              title="Delete item"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : viewMode === "map" ? (
                <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">map</span>
                      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                        Spatial Expedition Map — {trip?.destination}, {trip?.country}
                      </h3>
                    </div>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                      {mapMarkers.length} Spatial Pins
                    </span>
                  </div>
                  <SpatialMap
                    latitude={trip?.latitude || 35.6762}
                    longitude={trip?.longitude || 139.6503}
                    zoom={13}
                    markers={mapMarkers}
                    className="w-full h-[520px] rounded-xl border border-surface-variant overflow-hidden"
                  />
                  <div className="flex flex-wrap items-center justify-between text-on-surface-variant font-label-mono-sm text-label-mono-sm pt-1">
                    <span>Center: {trip?.destination} ({trip?.latitude?.toFixed(4)}, {trip?.longitude?.toFixed(4)})</span>
                    <span>Interactive OpenStreetMap + CartoDB tiles</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Day Selector Strip */}
                  <div className="bg-surface-container-lowest p-space-sm rounded shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between px-2 pt-1 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-label-ui text-label-ui uppercase tracking-wider text-on-surface-variant font-semibold">
                          Itinerary Days
                        </span>
                        <span className="text-on-surface-variant font-label-mono-sm text-label-mono-sm">
                          {daysList.length} segments planned
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedDayIndex((prev) => Math.max(0, prev - 1))}
                          className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                        </button>
                        <button
                          onClick={() => setSelectedDayIndex((prev) => Math.min(daysList.length - 1, prev + 1))}
                          className="p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Scrollable Day Cards */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 px-1">
                      {daysList.map((d, index) => {
                        const isActive = selectedDayIndex === index;
                        return (
                          <button
                            key={d.day}
                            onClick={() => setSelectedDayIndex(index)}
                            className={`relative flex flex-col items-center min-w-[100px] p-2.5 rounded transition-all text-left cursor-pointer ${
                              isActive
                                ? "bg-surface-container-highest text-on-surface ring-2 ring-primary shadow-xs"
                                : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`font-label-mono-sm text-label-mono-sm font-semibold ${isActive ? "text-primary font-bold" : ""}`}>
                                {d.day}
                              </span>
                              <span className={`material-symbols-outlined text-[14px] ${isActive ? "text-primary" : ""}`}>
                                {d.icon}
                              </span>
                            </div>
                            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">
                              {d.date}
                            </span>
                            <span className="font-label-mono-sm text-[10px] truncate w-full mt-0.5">
                              {d.sub}
                            </span>
                            {isActive && <div className="absolute -bottom-1 w-2 h-1 bg-primary rounded-full" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Day Header Card */}
                  <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col gap-space-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 bg-primary text-on-primary rounded font-label-mono-sm text-label-mono-sm font-semibold">
                          {currentDay.day}
                        </span>
                        <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                          {currentDay.title}
                        </h2>
                      </div>
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant bg-surface-container px-2.5 py-1 rounded">
                        {currentDay.date}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant pl-0.5 leading-relaxed">
                      {currentDay.desc}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-on-surface-variant font-label-mono-sm text-label-mono-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">schedule</span>
                        <span>{currentDay.activeHours}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-secondary">directions_walk</span>
                        <span>{currentDay.steps}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
                        <span>{currentDay.items.length} Activities Scheduled</span>
                      </div>
                    </div>
                  </div>

                  {/* Chronological Timeline Stream */}
                  <div className="relative pl-6 sm:pl-8 flex flex-col gap-6">
                    {/* Continuous Timeline Hairline Graphic */}
                    <div className="absolute left-2.5 sm:left-3 top-4 bottom-4 w-0.5 bg-surface-container-highest" />

                    {currentDay.items.length === 0 ? (
                      <div className="bg-surface-container-lowest p-8 rounded-xl border border-dashed border-surface-variant flex flex-col items-center justify-center text-center gap-3 my-2 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                          <span className="material-symbols-outlined text-[26px]">calendar_add_on</span>
                        </div>
                        <div className="flex flex-col gap-1 max-w-sm">
                          <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                            No Activities Scheduled for {currentDay.day}
                          </h4>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Start planning this day in {trip?.destination || "your destination"}. Add your first sight, cafe, or experience.
                          </p>
                        </div>
                        <button
                          onClick={() => setShowAddActivityModal(true)}
                          className="mt-2 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded font-label-ui text-label-ui font-medium flex items-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          <span>Add First Activity</span>
                        </button>
                      </div>
                    ) : (
                      currentDay.items.map((item) => (
                        <div key={item.id} className="relative group">
                          {/* Timeline Marker Node */}
                          <div className="absolute -left-6 sm:-left-8 top-4 w-5 h-5 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-xs">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary-fixed" />
                          </div>

                          {/* Content Node */}
                          <div className="bg-surface-container-lowest p-space-md rounded shadow-sm hover:shadow-md transition-shadow flex flex-col gap-space-sm">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-label-mono-sm text-label-mono-sm font-semibold text-primary">
                                    {item.time}
                                  </span>
                                  <span className="font-label-mono-sm text-[10px] text-on-surface-variant px-1.5 py-0.2 bg-surface-container rounded">
                                    {item.duration}
                                  </span>
                                  <span className={`font-label-mono-sm text-[10px] px-1.5 py-0.2 rounded font-medium ${item.catColor}`}>
                                    {item.category}
                                  </span>
                                </div>
                                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-1 flex items-center gap-2">
                                  {item.title}
                                </h3>
                              </div>
                              <div className="flex items-center gap-1 text-on-surface-variant">
                                <button
                                  onClick={() => {
                                    const next = !bookmarkedIds[item.id];
                                    setBookmarkedIds({ ...bookmarkedIds, [item.id]: next });
                                    showToast(next ? `Saved "${item.title}" to bookmarks` : `Removed "${item.title}" from bookmarks`);
                                  }}
                                  className="p-1 hover:text-primary rounded hover:bg-surface-container cursor-pointer transition-colors"
                                  title={bookmarkedIds[item.id] ? "Remove bookmark" : "Bookmark activity"}
                                >
                                  <span className={`material-symbols-outlined text-[18px] ${bookmarkedIds[item.id] ? "text-primary" : ""}`}>
                                    {bookmarkedIds[item.id] ? "bookmark" : "bookmark_border"}
                                  </span>
                                </button>
                                <button
                                  onClick={() => {
                                    showToast(`Activity details: "${item.title}" at ${item.time}`);
                                  }}
                                  className="p-1 hover:text-primary rounded hover:bg-surface-container cursor-pointer"
                                  title="More options"
                                >
                                  <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body-sm text-body-sm text-on-surface-variant">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">place</span>
                                {item.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">confirmation_number</span>
                                {item.ref}
                              </span>
                              <span className="flex items-center gap-1 text-tertiary font-medium">
                                {item.cost}
                              </span>
                            </div>

                            {item.note && (
                              <div className="p-2 rounded bg-surface-container-low font-body-sm text-body-sm text-on-surface flex items-start gap-2">
                                <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">info</span>
                                <span>{item.note}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Bottom Add Activity Action Field */}
                  <button
                    onClick={() => setShowAddActivityModal(true)}
                    className="w-full py-3 rounded bg-surface-container-low hover:bg-surface-container border-dashed border-2 border-surface-variant hover:border-outline text-on-surface font-label-ui text-label-ui font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">add_circle</span>
                    <span>Add New Activity to {currentDay.day}</span>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant bg-surface px-1.5 py-0.5 rounded shadow-xs">
                      Press &apos;N&apos;
                    </span>
                  </button>
                </>
              )}
            </div>

            {/* RIGHT COLUMN: Contextual Travel Intelligence (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-space-lg">
              {/* Widget A: Precision Weather Matrix */}
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col gap-space-sm">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">thermostat</span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                      {trip?.destination || "Expedition"} Weather Telemetry
                    </span>
                  </div>
                  <span className="font-label-mono-sm text-label-mono-sm text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded">
                    {weather ? weather.condition : "Live Telemetry"}
                  </span>
                </div>

                {/* Temperature Headline Display */}
                <div className="p-space-base rounded bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display-hero text-display-hero font-semibold text-on-surface tracking-tight">
                      {weather ? `${Math.round(weather.temperature)}°` : "20°"}
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface-variant font-normal">
                      {weather?.daily_forecast?.[0] ? `/ ${Math.round(weather.daily_forecast[0].max_temp)}° C` : "/ 22° C"}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-[24px]">
                        {weather?.icon || "sunny"}
                      </span>
                      <span className="font-label-ui text-label-ui font-medium text-on-surface">
                        {weather?.condition || "Clear Sky"}
                      </span>
                    </div>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                      Feels like: {weather ? `${Math.round(weather.feels_like)}°C` : "20°C"}
                    </span>
                  </div>
                </div>

                {/* Tabular Atmospheric Figures */}
                <div className="grid grid-cols-2 gap-2 font-label-mono-sm text-label-mono-sm">
                  <div className="p-2 rounded bg-surface-container flex flex-col">
                    <span className="text-on-surface-variant">Precipitation</span>
                    <span className="font-semibold text-on-surface text-[13px] mt-0.5">
                      {weather ? `${weather.precipitation}% • ${weather.precipitation > 20 ? "Precipitation Alert" : "Low Risk"}` : "0% • Dry"}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-surface-container flex flex-col">
                    <span className="text-on-surface-variant">Humidity / Wind</span>
                    <span className="font-semibold text-on-surface text-[13px] mt-0.5">
                      {weather ? `${weather.humidity}% • ${weather.wind_speed} km/h` : "55% • 12 km/h"}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-surface-container flex flex-col">
                    <span className="text-on-surface-variant">Coordinates</span>
                    <span className="font-semibold text-on-surface text-[13px] mt-0.5">
                      {trip?.latitude ? `${trip.latitude.toFixed(2)}°, ${trip.longitude.toFixed(2)}°` : "GPS Synced"}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-surface-container flex flex-col">
                    <span className="text-on-surface-variant">Destination Hub</span>
                    <span className="font-semibold text-primary text-[13px] mt-0.5 truncate">
                      {trip?.destination || "Expedition Base"}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-surface-container-high text-on-surface font-body-sm text-body-sm flex items-start gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">wb_shade</span>
                  <p className="leading-relaxed">
                    {weather
                      ? `Live meteorological data for ${trip?.destination || "destination"}: ${weather.condition} at ${Math.round(weather.temperature)}°C with wind at ${weather.wind_speed} km/h.`
                      : `Live Open-Meteo telemetry connection established for ${trip?.destination || "your expedition"}.`}
                  </p>
                </div>
              </div>

              {/* Widget B: Travel Checklist & Action Items */}
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col gap-space-sm">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-tertiary">checklist</span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                      Expedition Checklist
                    </span>
                  </div>
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                    {todos.filter((i) => i.is_completed).length} of {todos.length} done
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {todos.length === 0 ? (
                    <div className="p-4 rounded bg-surface-container-low text-center flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[24px] text-on-surface-variant">task_alt</span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        No checklist tasks recorded for this expedition yet.
                      </p>
                    </div>
                  ) : (
                    todos.slice(0, 5).map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleToggleTodo(c.id)}
                        className="flex items-center gap-3 p-2 rounded bg-surface-container-low cursor-pointer hover:bg-surface-container transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={c.is_completed}
                          readOnly
                          className="w-4 h-4 rounded text-primary accent-primary cursor-pointer pointer-events-none"
                        />
                        <div className="flex flex-col flex-1 leading-tight min-w-0">
                          <span
                            className={`font-body-md text-body-md truncate ${
                              c.is_completed ? "text-on-surface-variant line-through" : "text-on-surface font-medium"
                            }`}
                          >
                            {c.title}
                          </span>
                          <span className={`font-label-mono-sm text-[10px] ${c.is_completed ? "text-on-surface-variant" : "text-primary"}`}>
                            Priority: {c.priority} • {c.category}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => router.push("/packing")}
                  className="w-full mt-1 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui text-label-ui font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Manage Packing & Tasks</span>
                </button>
              </div>

              {/* Widget C: Spend Tracker */}
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col gap-space-sm">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">payments</span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                      Spend Tracker
                    </span>
                  </div>
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface font-medium">
                    {expenses.length} Logged
                  </span>
                </div>

                <div className="flex items-baseline justify-between p-space-sm rounded bg-surface-container-low">
                  <div className="flex flex-col">
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Total Logged Spend</span>
                    <span className="font-headline-lg text-headline-lg font-semibold text-on-surface">
                      ${totalSpent.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Transactions</span>
                    <span className="font-headline-sm text-headline-sm font-medium text-on-surface">{expenses.length} entries</span>
                  </div>
                </div>

                {expenses.length > 0 ? (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="w-full h-2 rounded-full bg-surface-container flex overflow-hidden">
                      <div className="bg-primary h-full" style={{ width: `${totalSpent > 0 ? (expensesByCategory.stay / totalSpent) * 100 : 0}%` }} title={`Stay: $${expensesByCategory.stay}`} />
                      <div className="bg-secondary h-full" style={{ width: `${totalSpent > 0 ? (expensesByCategory.dining / totalSpent) * 100 : 0}%` }} title={`Dining: $${expensesByCategory.dining}`} />
                      <div className="bg-tertiary h-full" style={{ width: `${totalSpent > 0 ? (expensesByCategory.transit / totalSpent) * 100 : 0}%` }} title={`Transit: $${expensesByCategory.transit}`} />
                    </div>
                    <div className="flex items-center justify-between font-label-mono-sm text-[11px] text-on-surface-variant">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Stay ${Math.round(expensesByCategory.stay)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary" /> Dining ${Math.round(expensesByCategory.dining)}</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary" /> Transit ${Math.round(expensesByCategory.transit)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="font-body-sm text-body-sm text-on-surface-variant text-center py-2">
                    No expenses logged yet. Keep your budget on track.
                  </p>
                )}

                <button
                  onClick={() => router.push("/expenses")}
                  className="w-full mt-1 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui text-label-ui font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Manage Expenses & Ledger</span>
                </button>
              </div>

              {/* Widget D: Travel Documents */}
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col gap-space-sm">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">badge</span>
                    <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                      Travel Documents
                    </span>
                  </div>
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                    {documents.length} Available
                  </span>
                </div>

                <div className="flex flex-col gap-2 font-body-sm text-body-sm">
                  {documents.length === 0 ? (
                    <div className="p-4 rounded bg-surface-container-low text-center flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-[24px] text-on-surface-variant">folder_open</span>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        No travel documents uploaded yet for this expedition.
                      </p>
                    </div>
                  ) : (
                    documents.slice(0, 3).map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2.5 rounded bg-surface-container-low hover:bg-surface-container transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px]">
                              {doc.doc_type === "flight" ? "flight" : doc.doc_type === "hotel" ? "hotel" : "description"}
                            </span>
                          </div>
                          <div className="flex flex-col truncate leading-tight">
                            <span className="font-medium text-on-surface truncate">{doc.title}</span>
                            <span className="font-label-mono-sm text-[10px] text-on-surface-variant">
                              {doc.confirmation_code?.Valid ? `Code: ${doc.confirmation_code.String}` : doc.doc_type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setPreviewDoc({
                              title: doc.title,
                              type: doc.doc_type === "flight" ? "qr" : "pdf",
                              ref: doc.confirmation_code?.Valid ? `Code: ${doc.confirmation_code.String}` : "Verified Document",
                            })
                          }
                          className="shrink-0 px-2 py-1 rounded bg-primary text-on-primary font-label-mono-sm text-label-mono-sm font-medium hover:bg-primary-container transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => router.push("/documents")}
                  className="w-full mt-1 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui text-label-ui font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">folder</span>
                  <span>Open Documents Vault</span>
                </button>
              </div>

              {/* Quick Rate Reference */}
              <div className="bg-surface-container-lowest p-space-md rounded shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-ui text-label-ui font-semibold text-on-surface">Quick Rate Reference</span>
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Mid-Market FX</span>
                </div>
                {trip?.country?.toLowerCase().includes("japan") ? (
                  <div className="grid grid-cols-3 gap-2 text-center font-label-mono-sm text-label-mono-sm">
                    <div className="p-1.5 rounded bg-surface-container">
                      <div className="text-on-surface font-semibold">¥1,000</div>
                      <div className="text-[10px] text-on-surface-variant">$6.48 USD</div>
                    </div>
                    <div className="p-1.5 rounded bg-surface-container">
                      <div className="text-on-surface font-semibold">¥5,000</div>
                      <div className="text-[10px] text-on-surface-variant">$32.42 USD</div>
                    </div>
                    <div className="p-1.5 rounded bg-surface-container">
                      <div className="text-on-surface font-semibold">¥10,000</div>
                      <div className="text-[10px] text-on-surface-variant">$64.85 USD</div>
                    </div>
                  </div>
                ) : trip?.country?.toLowerCase().includes("kingdom") || trip?.country?.toLowerCase().includes("uk") || trip?.country?.toLowerCase().includes("britain") ? (
                  <div className="grid grid-cols-3 gap-2 text-center font-label-mono-sm text-label-mono-sm">
                    <div className="p-1.5 rounded bg-surface-container">
                      <div className="text-on-surface font-semibold">£10</div>
                      <div className="text-[10px] text-on-surface-variant">$13.10 USD</div>
                    </div>
                    <div className="p-1.5 rounded bg-surface-container">
                      <div className="text-on-surface font-semibold">£50</div>
                      <div className="text-[10px] text-on-surface-variant">$65.50 USD</div>
                    </div>
                    <div className="p-1.5 rounded bg-surface-container">
                      <div className="text-on-surface font-semibold">£100</div>
                      <div className="text-[10px] text-on-surface-variant">$131.00 USD</div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-center font-label-mono-sm text-label-mono-sm">
                    <div className="p-1.5 rounded bg-surface-container">
                      <div className="text-on-surface font-semibold">€10</div>
                      <div className="text-[10px] text-on-surface-variant">$10.85 USD</div>
                    </div>
                    <div className="p-1.5 rounded bg-surface-container">
                      <div className="text-on-surface font-semibold">€50</div>
                      <div className="text-[10px] text-on-surface-variant">$54.25 USD</div>
                    </div>
                    <div className="p-1.5 rounded bg-surface-container">
                      <div className="text-on-surface font-semibold">€100</div>
                      <div className="text-[10px] text-on-surface-variant">$108.50 USD</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Activity Modal */}
      {showAddActivityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-surface-variant shadow-2xl p-6 max-w-md w-full flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                Add Activity to {currentDay.day}
              </h3>
              <button
                onClick={() => setShowAddActivityModal(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddActivitySubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-mono text-on-surface-variant mb-1">
                  ACTIVITY TITLE *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nezu Museum Garden Tea Ceremony"
                  value={newActivityTitle}
                  onChange={(e) => setNewActivityTitle(e.target.value)}
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-surface-variant bg-surface outline-hidden focus:border-primary text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono text-on-surface-variant mb-1">
                    START TIME
                  </label>
                  <input
                    type="text"
                    value={newActivityTime}
                    onChange={(e) => setNewActivityTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-surface-variant bg-surface outline-hidden focus:border-primary text-on-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-on-surface-variant mb-1">
                    LOCATION
                  </label>
                  <input
                    type="text"
                    placeholder="Minato City"
                    value={newActivityLocation}
                    onChange={(e) => setNewActivityLocation(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-surface-variant bg-surface outline-hidden focus:border-primary text-on-surface"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="px-4 py-2 text-xs font-mono text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-xs font-medium cursor-pointer transition-all shadow-sm"
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4 text-center">
            <div className="flex items-center justify-between">
              <span className="font-label-mono-sm text-label-mono-sm text-primary uppercase tracking-wider font-semibold">
                {previewDoc.type === "qr" ? "QR Fast Pass" : previewDoc.type === "pdf" ? "PDF Document" : "Reservation"}
              </span>
              <button
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant cursor-pointer"
              >
                ✕
              </button>
            </div>

            {previewDoc.type === "qr" ? (
              <div className="flex flex-col items-center gap-3 py-3">
                <div className="p-4 bg-white rounded-xl shadow-inner border border-surface-variant flex items-center justify-center">
                  <div className="w-40 h-40 bg-contain bg-no-repeat bg-center flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-black text-[120px]">qr_code_2</span>
                  </div>
                </div>
                <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {previewDoc.title}
                </h4>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                  {previewDoc.ref}
                </span>
                <span className="text-[11px] text-tertiary font-mono bg-tertiary-fixed px-2 py-0.5 rounded">
                  Ready for Gate Scanner / Turnstile
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-3">
                <div className="w-16 h-16 rounded-2xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-[36px]">
                    {previewDoc.type === "pdf" ? "picture_as_pdf" : "hotel"}
                  </span>
                </div>
                <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {previewDoc.title}
                </h4>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                  {previewDoc.ref}
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => {
                  showToast("Saved offline to device storage!");
                  setPreviewDoc(null);
                }}
                className="flex-1 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui text-label-ui font-medium transition-colors cursor-pointer"
              >
                Save Offline
              </button>
              <button
                onClick={() => setPreviewDoc(null)}
                className="flex-1 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-ui text-label-ui font-medium transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
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
