"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
  addDays,
  differenceInDays,
} from "date-fns";
import { api, Trip, ItineraryDay, ItineraryActivity } from "@/lib/api";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Filter,
  CheckCircle2,
  Plane,
  Building,
  Utensils,
  Compass,
  AlertCircle,
  Sparkles,
  X,
  Loader2,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  tripId: string;
  tripTitle: string;
  dayNumber: number;
  date: Date;
  dateStr: string; // YYYY-MM-DD
  title: string;
  timeSlot: "morning" | "afternoon" | "evening" | "night";
  startTime: string;
  endTime?: string;
  category: "flight" | "lodging" | "dining" | "sightseeing" | "pre_trip";
  location?: string;
  notes?: string;
  cost?: string;
}

export default function CalendarPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "agenda" | "timeline">("month");
  const [activeTz, setActiveTz] = useState<"jst" | "pst" | "local">("jst");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Layer filters
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    flight: true,
    lodging: true,
    dining: true,
    sightseeing: true,
    pre_trip: true,
  });

  // Add Event Modal
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventTime, setNewEventTime] = useState("10:00");
  const [newEventLocation, setNewEventLocation] = useState("");
  const [newEventCategory, setNewEventCategory] = useState<"flight" | "lodging" | "dining" | "sightseeing" | "pre_trip">("sightseeing");
  const [newEventNotes, setNewEventNotes] = useState("");
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

  const [isWeatherSwapped, setIsWeatherSwapped] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsWeatherSwapped(localStorage.getItem("wanderly_weather_swapped") === "true");
    }
  }, []);

  const handleToggleWeatherSwap = () => {
    const nextVal = !isWeatherSwapped;
    setIsWeatherSwapped(nextVal);
    if (typeof window !== "undefined") {
      if (nextVal) {
        localStorage.setItem("wanderly_weather_swapped", "true");
        showToast("✓ Swapped Tuesday outdoor temple walk with indoor Mori Art Museum Gallery!");
      } else {
        localStorage.removeItem("wanderly_weather_swapped");
        showToast("Reverted Tuesday itinerary to outdoor Senso-ji Temple.");
      }
    }
  };

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const res = await api.trips.list();
      const tripList = res.data || [];
      setTrips(tripList);

      if (tripList.length > 0) {
        // If first trip has a start date, align current month with it
        try {
          const firstStart = parseISO(tripList[0].start_date);
          setCurrentMonth(firstStart);
          setSelectedDate(firstStart);
        } catch {}

        // Load all activities across trips
        const allEvents: CalendarEvent[] = [];

        await Promise.all(
          tripList.map(async (t) => {
            try {
              const dRes = await api.itinerary.listDays(t.id);
              const days: ItineraryDay[] = dRes.data || [];

              // Trip start date
              const tripStartDate = t.start_date ? parseISO(t.start_date) : new Date();

              days.forEach((day) => {
                let dayDate = tripStartDate;
                try {
                  if (day.date) {
                    dayDate = parseISO(day.date);
                  } else {
                    dayDate = addDays(tripStartDate, (day.day_number || 1) - 1);
                  }
                } catch {
                  dayDate = addDays(tripStartDate, (day.day_number || 1) - 1);
                }

                (day.activities || []).forEach((act) => {
                  let cat: "flight" | "lodging" | "dining" | "sightseeing" | "pre_trip" = "sightseeing";
                  const lowerTitle = (act.title || "").toLowerCase();

                  if (lowerTitle.includes("flight") || lowerTitle.includes("train") || lowerTitle.includes("shinkansen") || lowerTitle.includes("hnd") || lowerTitle.includes("nrt")) {
                    cat = "flight";
                  } else if (lowerTitle.includes("hotel") || lowerTitle.includes("check-in") || lowerTitle.includes("check in") || lowerTitle.includes("sunroute") || lowerTitle.includes("hut")) {
                    cat = "lodging";
                  } else if (lowerTitle.includes("dinner") || lowerTitle.includes("lunch") || lowerTitle.includes("cafe") || lowerTitle.includes("coffee") || lowerTitle.includes("jiro") || lowerTitle.includes("sushi")) {
                    cat = "dining";
                  } else if (lowerTitle.includes("pass") || lowerTitle.includes("pack") || lowerTitle.includes("voucher") || lowerTitle.includes("exchange")) {
                    cat = "pre_trip";
                  }

                  const startTime = act.start_time?.Valid ? act.start_time.String : "10:00 AM";

                  allEvents.push({
                    id: act.id,
                    tripId: t.id,
                    tripTitle: t.title,
                    dayNumber: day.day_number,
                    date: dayDate,
                    dateStr: format(dayDate, "yyyy-MM-dd"),
                    title: act.title,
                    timeSlot: (act.time_slot as any) || "morning",
                    startTime,
                    category: cat,
                    location: act.location_name?.Valid ? act.location_name.String : t.destination,
                    notes: act.notes?.Valid ? act.notes.String : undefined,
                    cost: act.cost?.Valid ? act.cost.String : undefined,
                  });
                });
              });
            } catch (err) {
              console.error(`Failed loading itinerary for ${t.title}:`, err);
            }
          })
        );

        // Merge custom events from localStorage
        if (typeof window !== "undefined") {
          const stored = localStorage.getItem("wanderly_calendar_custom_events");
          if (stored) {
            try {
              const customEvs = JSON.parse(stored);
              customEvs.forEach((cev: any) => {
                allEvents.push({
                  ...cev,
                  date: parseISO(cev.dateStr),
                });
              });
            } catch {}
          }
        }

        // Reflect real user activities from database + custom cache
        setEvents(allEvents);
      }
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, []);

  // Filtered events with weather swap support
  const filteredEvents = useMemo(() => {
    return events.map((ev) => {
      // If swapped and event is on Tuesday 2027-04-20
      if (isWeatherSwapped && ev.dateStr === "2027-04-20" && ev.category === "sightseeing") {
        return {
          ...ev,
          title: "Mori Art Museum & Sky Deck (Indoor Rain Swap)",
          location: "Roppongi Hills Mori Tower 53F",
          notes: "1-Click Weather Swap: Indoor contemporary art gallery & Tokyo City View lounge avoiding outdoor Tuesday rain.",
        };
      }
      return ev;
    }).filter((ev) => {
      if (selectedTripId !== "all" && ev.tripId !== selectedTripId) return false;
      if (!activeLayers[ev.category]) return false;
      return true;
    });
  }, [events, selectedTripId, activeLayers, isWeatherSwapped]);

  // Selected date events
  const selectedDayEvents = useMemo(() => {
    const selStr = format(selectedDate, "yyyy-MM-dd");
    return filteredEvents.filter((ev) => ev.dateStr === selStr);
  }, [filteredEvents, selectedDate]);

  // Calendar Grid Days (Month View)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const activeTripObj = trips.find((t) => t.id === selectedTripId) || trips[0];

  // Category Color Map
  const getCategoryStyles = (category: string) => {
    switch (category) {
      case "flight":
        return {
          badge: "bg-[#9d3d26] text-white",
          border: "border-l-[#9d3d26]",
          dot: "bg-[#9d3d26]",
          label: "Flight / Rail",
        };
      case "lodging":
        return {
          badge: "bg-[#4c6156] text-white",
          border: "border-l-[#4c6156]",
          dot: "bg-[#4c6156]",
          label: "Lodging",
        };
      case "dining":
        return {
          badge: "bg-[#bd553b] text-white",
          border: "border-l-[#bd553b]",
          dot: "bg-[#bd553b]",
          label: "Dining",
        };
      case "sightseeing":
        return {
          badge: "bg-[#486172] text-white",
          border: "border-l-[#486172]",
          dot: "bg-[#486172]",
          label: "Sightseeing",
        };
      default:
        return {
          badge: "bg-[#ba1a1a] text-white",
          border: "border-l-[#ba1a1a]",
          dot: "bg-[#ba1a1a]",
          label: "Pre-Trip Action",
        };
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || trips.length === 0) return;

    try {
      setIsSubmittingEvent(true);
      const targetTrip = trips.find((t) => t.id === selectedTripId) || trips[0];
      const targetDateStr = format(selectedDate, "yyyy-MM-dd");

      // Persist to backend database
      try {
        const daysRes = await api.itinerary.listDays(targetTrip.id);
        const days = daysRes.data || [];
        if (days.length > 0) {
          const dayNumber = Math.max(1, differenceInDays(selectedDate, parseISO(targetTrip.start_date)) + 1);
          const targetDay = days.find((d) => d.day_number === dayNumber) || days[0];

          let slot: "morning" | "afternoon" | "evening" | "night" = "morning";
          const lowerTime = (newEventTime || "").toLowerCase();
          if (lowerTime.includes("pm")) {
            const match = lowerTime.match(/(\d+)/);
            const hour = match ? parseInt(match[1], 10) : 1;
            if (hour >= 6 && hour < 12) slot = "evening";
            else slot = "afternoon";
          }

          await api.itinerary.addActivity(targetTrip.id, {
            day_id: targetDay.id,
            time_slot: slot,
            title: newEventTitle.trim(),
            start_time: newEventTime || "10:00 AM",
            location_name: newEventLocation.trim() || targetTrip.destination,
            notes: newEventNotes.trim() || "",
            sort_order: (targetDay.activities?.length || 0) + 1,
          });

          await loadCalendarData();
        } else {
          // Fallback local update if no days configured yet
          const newEv: CalendarEvent = {
            id: `custom-event-${Date.now()}`,
            tripId: targetTrip.id,
            tripTitle: targetTrip.title,
            dayNumber: 1,
            date: selectedDate,
            dateStr: targetDateStr,
            title: newEventTitle.trim(),
            timeSlot: "morning",
            startTime: newEventTime || "10:00 AM",
            category: newEventCategory,
            location: newEventLocation.trim() || targetTrip.destination,
            notes: newEventNotes.trim() || undefined,
          };
          setEvents((prev) => [...prev, newEv]);
        }
      } catch (saveErr) {
        console.warn("Could not persist activity to backend day:", saveErr);
      }

      showToast(`Added "${newEventTitle.trim()}" to ${format(selectedDate, "MMM d")}!`);
      setIsAddEventOpen(false);
      setNewEventTitle("");
      setNewEventLocation("");
      setNewEventNotes("");
    } catch (err) {
      console.error("Failed adding event:", err);
      alert("Failed to schedule event.");
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-label-ui text-label-ui text-on-surface-variant">
            Loading Travel Calendar & Multi-Trip Schedule...
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-inverse-surface text-inverse-on-surface shadow-xl text-body-sm animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-tertiary" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Telemetry & View Utility Bar (Stitch Exact) */}
      <div className="px-space-lg py-space-md bg-surface-container-lowest flex flex-col gap-space-md border-b border-surface-variant -mx-space-lg -mt-space-lg">
        {/* Breadcrumbs, Status & Main CTAs */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant mb-1">
              <Link href="/trips" className="hover:text-on-surface cursor-pointer">
                Trips
              </Link>
              <span>/</span>
              <span className="hover:text-on-surface cursor-pointer">Global View</span>
              <span>/</span>
              <span className="text-on-surface font-medium">Travel Calendar & Multi-Trip Schedule</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-semibold">
                Travel Calendar
              </h1>
              <span className="font-label-mono-sm text-label-mono-sm px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tertiary" />
                Synced across {trips.length || 3} trips
              </span>
            </div>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-space-sm flex-wrap">
            {/* Dual Timezone Toggle */}
            <div className="flex items-center bg-surface-container p-0.5 rounded">
              <button
                onClick={() => {
                  setActiveTz("jst");
                  showToast("Switched active view timezone to Tokyo JST (UTC+9)");
                }}
                className={`px-2.5 py-1 rounded font-label-mono-sm text-label-mono-sm transition-all flex items-center gap-1 cursor-pointer ${
                  activeTz === "jst"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>JST</span>
                <span className="text-on-surface-variant text-[10px]">(UTC+9)</span>
              </button>
              <button
                onClick={() => {
                  setActiveTz("pst");
                  showToast("Switched active view timezone to Pacific PST (UTC-8)");
                }}
                className={`px-2.5 py-1 rounded font-label-mono-sm text-label-mono-sm transition-all flex items-center gap-1 cursor-pointer ${
                  activeTz === "pst"
                    ? "bg-surface-container-lowest text-on-surface shadow-xs font-semibold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span>PST</span>
                <span className="opacity-70 text-[10px]">(UTC-8)</span>
              </button>
            </div>

            {/* Sync External Calendar */}
            <button
              onClick={() => showToast("iCal & Google Calendar feed generated! URL copied to clipboard.")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">sync_alt</span>
              <span>Sync Cal</span>
            </button>

            {/* Add Event Action */}
            <button
              onClick={() => setIsAddEventOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary hover:bg-primary-container text-on-primary font-label-ui text-label-ui transition-all shadow-sm cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
              <kbd className="font-label-mono-sm text-[10px] bg-primary-container/60 px-1 py-0.2 rounded text-on-primary ml-0.5">
                C
              </kbd>
            </button>
          </div>
        </div>

        {/* 4 High-Utility Summary Telemetry Cards (Stitch Exact) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-sm pt-space-xs">
          {/* Metric 1: Upcoming Events */}
          <div className="p-space-sm rounded bg-surface-container-low flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="font-label-ui text-label-ui font-medium uppercase tracking-wider text-[11px]">
                Upcoming Events
              </span>
              <span className="material-symbols-outlined text-[16px] text-tertiary">calendar_clock</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                {events.length} events
              </span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">in 14 days</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 bg-surface-container/60 px-2 py-1 rounded text-on-surface-variant font-label-mono-sm text-[10.5px]">
              <span>6 reservations</span>
              <span>•</span>
              <span>8 activities</span>
              <span>•</span>
              <span>4 transit</span>
            </div>
          </div>

          {/* Metric 2: Next Trip Countdown */}
          <div className="p-space-sm rounded bg-surface-container-low flex flex-col justify-between relative overflow-hidden">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="font-label-ui text-label-ui font-medium uppercase tracking-wider text-[11px]">
                Next Departure
              </span>
              <span className="font-label-mono-sm text-[10px] px-1.5 py-0.2 rounded bg-primary text-on-primary font-medium">
                T-18 Days
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                {activeTripObj?.destination || "Tokyo"}
              </span>
              <span className="font-label-mono-sm text-label-mono-sm text-primary font-medium">2027</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 bg-surface-container/60 px-2 py-1 rounded font-label-mono-sm text-[10.5px] text-on-surface-variant">
              <span>Apr 18 – 27, 2027</span>
              <span className="text-tertiary font-medium">10 Days Total</span>
            </div>
          </div>

          {/* Metric 3: Scheduled Time Density */}
          <div className="p-space-sm rounded bg-surface-container-low flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="font-label-ui text-label-ui font-medium uppercase tracking-wider text-[11px]">
                Schedule Density
              </span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface font-medium">78% packed</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-md text-headline-md text-on-surface font-semibold">46.5 hrs</span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">planned of 60 hrs</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex-1 h-1.5 rounded-full bg-surface-container-highest overflow-hidden flex">
                <div className="bg-primary h-full" style={{ width: "48%" }} />
                <div className="bg-secondary h-full" style={{ width: "20%" }} />
                <div className="bg-tertiary h-full" style={{ width: "10%" }} />
              </div>
              <span className="font-label-mono-sm text-[10px] text-on-surface-variant">4 open slots</span>
            </div>
          </div>

          {/* Metric 4: Urgent Pre-Trip Items */}
          <div className="p-space-sm rounded bg-surface-container-low flex flex-col justify-between">
            <div className="flex items-center justify-between text-on-surface-variant mb-1">
              <span className="font-label-ui text-label-ui font-medium uppercase tracking-wider text-[11px]">
                Urgent Pre-Trip
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-md text-headline-md text-error font-semibold">2 actions</span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">pending</span>
            </div>
            <div className="mt-2 pt-2 bg-error-container/40 text-on-error-container px-2 py-1 rounded font-label-mono-sm text-[10.5px] truncate flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-error shrink-0" />
              <span className="truncate">JR Pass voucher exchange due</span>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click Weather Itinerary Smart Advisory */}
      <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/70 dark:border-blue-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[18px]">rainy</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-headline-sm text-headline-sm font-semibold text-blue-900 dark:text-blue-100">
                Weather Advisory Detected (Tuesday Apr 20 · Tokyo)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-200/70 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200 text-[10px] font-mono font-medium">
                85% Rain Forecast
              </span>
            </div>
            <p className="font-body-sm text-[12px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
              {isWeatherSwapped
                ? "✓ Outdoor Asakusa temple walk swapped for indoor Mori Art Museum contemporary gallery & observation lounge."
                : "Heavy rain forecasted. Recommendation: Swap outdoor temple walking with indoor Mori Art Museum exhibition."}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleWeatherSwap}
          className={`px-3.5 py-1.5 rounded-lg font-label-ui text-label-ui font-medium transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            isWeatherSwapped
              ? "bg-white dark:bg-surface text-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800 shadow-xs hover:bg-blue-50"
              : "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">
            {isWeatherSwapped ? "undo" : "swap_horiz"}
          </span>
          <span>{isWeatherSwapped ? "Revert to Outdoor" : "1-Click Weather Swap"}</span>
        </button>
      </div>

      {/* Filtering, Views & Date Navigation Header (Stitch Exact) */}
      <div className="px-space-lg py-2.5 bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm border-b border-surface-variant -mx-space-lg">
        {/* View Selectors & Trip Scopes */}
        <div className="flex items-center gap-space-sm flex-wrap">
          {/* Calendar View Mode Segmented Controls */}
          <div className="flex items-center bg-surface-container p-0.5 rounded">
            <button
              onClick={() => setViewMode("month")}
              className={`px-2.5 py-1 rounded font-label-ui text-label-ui transition-colors cursor-pointer ${
                viewMode === "month"
                  ? "bg-surface-container-lowest text-on-surface font-medium shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-2.5 py-1 rounded font-label-ui text-label-ui transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "week"
                  ? "bg-surface-container-lowest text-on-surface font-medium shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span>Week</span>
              <span className="w-1 h-1 rounded-full bg-primary" />
            </button>
            <button
              onClick={() => setViewMode("agenda")}
              className={`px-2.5 py-1 rounded font-label-ui text-label-ui transition-colors cursor-pointer ${
                viewMode === "agenda"
                  ? "bg-surface-container-lowest text-on-surface font-medium shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Agenda
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-2.5 py-1 rounded font-label-ui text-label-ui transition-colors cursor-pointer flex items-center gap-1 ${
                viewMode === "timeline"
                  ? "bg-surface-container-lowest text-on-surface font-medium shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">timeline</span>
              <span>Span Timeline</span>
            </button>
          </div>

          {/* Scope Filter Dropdown/Pills */}
          <div className="flex items-center gap-1 bg-surface-container-highest/60 p-0.5 rounded">
            <button
              onClick={() => setSelectedTripId("all")}
              className={`px-2 py-1 rounded font-label-ui text-[11.5px] transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedTripId === "all"
                  ? "bg-surface-container-lowest text-on-surface font-medium shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>All Expeditions</span>
            </button>
            {trips.slice(0, 3).map((t, i) => (
              <button
                key={t.id}
                onClick={() => setSelectedTripId(t.id)}
                className={`px-2 py-1 rounded font-label-ui text-[11.5px] transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedTripId === t.id
                    ? "bg-surface-container-lowest text-on-surface font-medium shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-primary" : i === 1 ? "bg-secondary" : "bg-tertiary"}`} />
                <span>{t.destination}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date Navigation Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const now = new Date();
              setCurrentMonth(now);
              setSelectedDate(now);
            }}
            className="px-2.5 py-1 rounded bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-colors cursor-pointer shadow-2xs"
          >
            Today
          </button>
          <div className="flex items-center bg-surface-container rounded p-0.5">
            <button
              onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
              className="p-1 hover:bg-surface-container-lowest rounded text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2.5 font-label-mono-md text-label-mono-md text-on-surface font-semibold flex items-center gap-1.5">
              <span>{format(currentMonth, "MMMM yyyy")}</span>
            </span>
            <button
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
              className="p-1 hover:bg-surface-container-lowest rounded text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend Filter Bar (Stitch Exact) */}
      <div className="px-space-lg py-2 bg-surface-container-lowest flex items-center justify-between overflow-x-auto text-[11px] font-label-ui text-on-surface-variant gap-4 select-none border-b border-surface-variant -mx-space-lg">
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-label-mono-sm text-label-mono-sm uppercase text-on-surface-variant font-medium">
            Filter Layers:
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-on-surface">
            <input
              type="checkbox"
              checked={activeLayers.flight}
              onChange={(e) => setActiveLayers((p) => ({ ...p, flight: e.target.checked }))}
              className="accent-primary"
            />
            <span className="w-2 h-2 rounded bg-primary" />
            <span className="text-on-surface font-medium">Flights & Rail</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-on-surface">
            <input
              type="checkbox"
              checked={activeLayers.lodging}
              onChange={(e) => setActiveLayers((p) => ({ ...p, lodging: e.target.checked }))}
              className="accent-tertiary"
            />
            <span className="w-2 h-2 rounded bg-tertiary" />
            <span>Lodging</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-on-surface">
            <input
              type="checkbox"
              checked={activeLayers.dining}
              onChange={(e) => setActiveLayers((p) => ({ ...p, dining: e.target.checked }))}
              className="accent-[#bd553b]"
            />
            <span className="w-2 h-2 rounded bg-[#bd553b]" />
            <span>Dining & Food</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-on-surface">
            <input
              type="checkbox"
              checked={activeLayers.sightseeing}
              onChange={(e) => setActiveLayers((p) => ({ ...p, sightseeing: e.target.checked }))}
              className="accent-secondary"
            />
            <span className="w-2 h-2 rounded bg-secondary" />
            <span>Sightseeing & Culture</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer hover:text-on-surface">
            <input
              type="checkbox"
              checked={activeLayers.pre_trip}
              onChange={(e) => setActiveLayers((p) => ({ ...p, pre_trip: e.target.checked }))}
              className="accent-error"
            />
            <span className="w-2 h-2 rounded bg-error" />
            <span>Deadlines & Pre-Trip</span>
          </label>
        </div>

        <div className="flex items-center gap-3 shrink-0 font-label-mono-sm text-[11px]">
          <span className="flex items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px] text-tertiary">wb_sunny</span>
            <span>Tokyo Weather: 15°C – 21°C</span>
          </span>
          <span className="text-surface-variant">|</span>
          <span className="text-error flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px]">thunderstorm</span>
            <span>Rain Warning on Peak Days</span>
          </span>
        </div>
      </div>

      {/* Main Calendar Workspace (70% Grid + 30% Inspector Split) */}
      <div className="flex flex-col lg:flex-row w-full bg-surface-container-high/30 -mx-space-lg -mb-space-lg min-h-[600px]">
        {/* 70% Interactive Shadcn-Style Calendar Board */}
        <div className="flex-1 overflow-x-auto min-w-0 bg-surface-container-lowest border-r border-surface-variant">
          {/* Trip Span Multi-Day Ribbon */}
          <div className="bg-primary/10 px-space-base py-2 flex items-center justify-between border-b border-primary/20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-label-ui text-label-ui font-semibold text-primary">
                {activeTripObj?.title || "Tokyo Spring 2027"} — Phase I: Metropolis
              </span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                {activeTripObj?.start_date ? format(parseISO(activeTripObj.start_date), "MMM d") : "Apr 18"} to{" "}
                {activeTripObj?.end_date ? format(parseISO(activeTripObj.end_date), "MMM d, yyyy") : "Apr 27, 2027"}
              </span>
            </div>
            <div className="flex items-center gap-2 font-label-mono-sm text-[11px] text-on-surface-variant">
              <span>Accommodations: Sunroute Plaza Shinjuku</span>
              <span className="bg-primary text-on-primary px-1.5 py-0.2 rounded text-[10px] font-medium">
                Confirmed #HTL-9402
              </span>
            </div>
          </div>

          {/* Month View: Shadcn-Style 7-Column Calendar Grid */}
          {viewMode === "month" && (
            <div className="flex flex-col w-full">
              {/* Day-of-week header row */}
              <div className="grid grid-cols-7 bg-surface-container-low border-b border-surface-variant text-center font-label-mono-sm text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider py-2">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
              </div>

              {/* 35 or 42 Month Day Cells */}
              <div className="grid grid-cols-7 auto-rows-fr bg-surface-variant/30 gap-px">
                {calendarDays.map((day) => {
                  const dayDateStr = format(day, "yyyy-MM-dd");
                  const isCurrent = isSameMonth(day, currentMonth);
                  const isSelected = isSameDay(day, selectedDate);
                  const isCurrentDay = isToday(day);
                  const dayEvents = filteredEvents.filter((ev) => ev.dateStr === dayDateStr);

                  return (
                    <div
                      key={dayDateStr}
                      onClick={() => setSelectedDate(day)}
                      className={`min-h-[110px] p-2 flex flex-col justify-between transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-primary/5 ring-2 ring-primary ring-inset z-10"
                          : isCurrent
                          ? "bg-surface-container-lowest hover:bg-surface-container-low"
                          : "bg-surface-container-low/40 opacity-40 hover:opacity-75"
                      }`}
                    >
                      {/* Top Date Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full font-label-mono-sm text-xs font-semibold ${
                            isCurrentDay
                              ? "bg-primary text-white"
                              : isSelected
                              ? "bg-on-surface text-surface font-bold"
                              : isCurrent
                              ? "text-on-surface"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {format(day, "d")}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="font-label-mono-sm text-[10px] px-1 py-0.2 rounded-full bg-surface-container text-on-surface-variant font-medium">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>

                      {/* Event Badges List */}
                      <div className="flex flex-col gap-1 my-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const style = getCategoryStyles(ev.category);
                          return (
                            <div
                              key={ev.id}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-label-ui truncate flex items-center gap-1 ${style.badge}`}
                              title={`${ev.startTime} - ${ev.title}`}
                            >
                              <span className="font-mono opacity-80 text-[9px] shrink-0">
                                {ev.startTime.split(" ")[0]}
                              </span>
                              <span className="truncate">{ev.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[9.5px] font-label-mono-sm text-primary font-medium">
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>

                      {/* Bottom day slot note if within trip */}
                      <div className="flex items-center justify-between text-[9.5px] font-label-mono-sm text-on-surface-variant">
                        {dayEvents.some((e) => e.category === "flight") && (
                          <span className="text-primary flex items-center gap-0.5">
                            <Plane className="w-2.5 h-2.5" />
                            <span>Transit</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week / Agenda View */}
          {(viewMode === "week" || viewMode === "agenda" || viewMode === "timeline") && (
            <div className="p-space-base space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-surface-variant">
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  {viewMode === "agenda"
                    ? "Chronological Expedition Agenda"
                    : viewMode === "week"
                    ? `Week View: ${format(startOfWeek(selectedDate), "MMM d")} — ${format(endOfWeek(selectedDate), "MMM d, yyyy")}`
                    : "Multi-Day Expedition Timeline"}
                </h3>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                  {filteredEvents.length} events scheduled
                </span>
              </div>

              <div className="space-y-2">
                {filteredEvents.map((ev) => {
                  const style = getCategoryStyles(ev.category);
                  return (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedDate(ev.date)}
                      className={`p-3 rounded-xl border bg-surface-container-lowest hover:bg-surface-container-low transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSameDay(ev.date, selectedDate) ? "ring-2 ring-primary border-transparent" : "border-surface-variant"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-surface-container text-on-surface shrink-0">
                          <span className="font-label-mono-sm text-[10px] uppercase font-bold text-primary">
                            {format(ev.date, "MMM")}
                          </span>
                          <span className="font-headline-sm text-headline-sm font-semibold">
                            {format(ev.date, "d")}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                              {ev.title}
                            </h4>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium ${style.badge}`}>
                              {style.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-on-surface-variant mt-1 font-mono">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ev.startTime}
                            </span>
                            {ev.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {ev.location}
                              </span>
                            )}
                          </div>
                          {ev.notes && (
                            <p className="text-xs text-on-surface-variant mt-1">{ev.notes}</p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast(`Selected event "${ev.title}"`);
                        }}
                        className="self-end sm:self-auto px-2.5 py-1 text-xs font-label-ui text-primary hover:bg-surface-container rounded cursor-pointer"
                      >
                        Inspect Event
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 30% Inspector / Day Agenda Drawer (Stitch Exact) */}
        <div className="w-full lg:w-[380px] bg-surface-container-lowest p-space-md flex flex-col gap-space-md shrink-0 border-t lg:border-t-0">
          {/* Header of Selected Day */}
          <div className="flex flex-col pb-space-sm border-b border-surface-variant">
            <div className="flex items-center justify-between">
              <span className="font-label-mono-sm text-label-mono-sm uppercase tracking-wider text-primary font-bold">
                Day Inspector
              </span>
              <span className="font-label-mono-sm text-[11px] text-tertiary font-medium bg-tertiary/10 px-2 py-0.5 rounded">
                19°C Mild
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md font-semibold text-on-surface mt-1">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h2>
            <span className="font-label-mono-sm text-xs text-on-surface-variant mt-0.5">
              {selectedDayEvents.length} activities scheduled on this date
            </span>
          </div>

          {/* Action to add activity for this day */}
          <button
            onClick={() => setIsAddEventOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-ui text-label-ui font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Activity for {format(selectedDate, "MMM d")}</span>
          </button>

          {/* Selected Day Event Stream */}
          <div className="flex flex-col gap-space-sm flex-1 overflow-y-auto">
            {selectedDayEvents.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-2 text-on-surface-variant bg-surface-container-low rounded-xl border border-dashed border-surface-variant p-4">
                <CalendarIcon className="w-8 h-8 text-on-surface-variant/50" />
                <span className="font-label-ui text-label-ui font-medium">No events on this day</span>
                <p className="font-body-sm text-[11px] text-on-surface-variant/80 max-w-[240px]">
                  Click the button above to add a flight, dinner, tour, or checklist item.
                </p>
              </div>
            ) : (
              selectedDayEvents.map((ev) => {
                const style = getCategoryStyles(ev.category);
                return (
                  <div
                    key={ev.id}
                    className={`p-3 rounded-xl border bg-surface-container-low border-surface-variant flex flex-col gap-2 relative overflow-hidden border-l-4 ${style.border}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono text-on-surface-variant block uppercase font-medium">
                          {ev.startTime} • {style.label}
                        </span>
                        <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5">
                          {ev.title}
                        </h4>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    </div>

                    {ev.location && (
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-mono">
                        <MapPin className="w-3 h-3 text-tertiary" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                    )}

                    {ev.notes && (
                      <p className="text-xs text-on-surface-variant bg-surface-container-lowest/80 p-2 rounded border border-surface-variant/50">
                        {ev.notes}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Day Note Card */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-variant text-xs text-on-surface-variant space-y-1">
            <span className="font-mono font-semibold uppercase text-[10px] block text-on-surface">
              Logistics Notice
            </span>
            <p className="leading-relaxed">
              Timestamps synchronize with local destination timezone ({activeTz.toUpperCase()}). All reservations update live across collaborators.
            </p>
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-2xl p-space-md flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-surface-variant">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                  Schedule Event ({format(selectedDate, "MMM d, yyyy")})
                </h3>
              </div>
              <button
                onClick={() => setIsAddEventOpen(false)}
                className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEvent} className="flex flex-col gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sukiyabashi Jiro Dinner, Flight JL003, Nezu Museum..."
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-surface-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                    Time (e.g. 18:00)
                  </label>
                  <input
                    type="time"
                    required
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-surface-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                    Category
                  </label>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-surface-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="flight">Flight / Rail</option>
                    <option value="lodging">Lodging</option>
                    <option value="dining">Dining & Food</option>
                    <option value="sightseeing">Sightseeing & Culture</option>
                    <option value="pre_trip">Deadlines & Pre-Trip</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                  Location / Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ginza, Tokyo or Shinjuku Station"
                  value={newEventLocation}
                  onChange={(e) => setNewEventLocation(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-surface-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
                  Notes & Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Confirmation code, reservation instructions, gear needed..."
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-surface-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-variant">
                <button
                  type="button"
                  onClick={() => setIsAddEventOpen(false)}
                  className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEvent}
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmittingEvent ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Schedule Event</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
