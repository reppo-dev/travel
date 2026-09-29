"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { api, Trip, SavedPlace } from "@/lib/api";

const SpatialMap = dynamic(() => import("@/components/map/SpatialMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-surface-container-low text-on-surface-variant font-label-ui text-label-ui">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      <span>Initializing CartoDB Live Tiles...</span>
    </div>
  ),
});

interface PlaceItem {
  id: string;
  name: string;
  area: string;
  category: string;
  isVisited: boolean;
  isStarred: boolean;
  rating: number;
  description: string;
  image: string;
  notes: string[];
}

export default function PlacesPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Views
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisitedOnly, setFilterVisitedOnly] = useState(false);
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "compact">("cards");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPlaceNotes, setSelectedPlaceNotes] = useState<PlaceItem | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Clip input
  const [clipUrl, setClipUrl] = useState("");

  // New Place Form State
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newCategory, setNewCategory] = useState("Sightseeing");
  const [newDescription, setNewDescription] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadPlaces = async (tripId: string) => {
    try {
      const res = await api.places.list(tripId);
      const items: SavedPlace[] = res.data || [];

      // Read starred IDs and custom notes from localStorage
      const starredIds = new Set<string>();
      const customNotesMap: Record<string, string[]> = {};

      if (typeof window !== "undefined") {
        try {
          const starred = JSON.parse(localStorage.getItem("wanderly_starred_places") || "[]");
          starred.forEach((id: string) => starredIds.add(id));
          const notes = JSON.parse(localStorage.getItem("wanderly_places_notes") || "{}");
          Object.assign(customNotesMap, notes);
        } catch {}
      }

      let mapped: PlaceItem[] = items.map((p) => {
        const notesArr: string[] = [];
        if (p.notes?.Valid && p.notes.String) {
          notesArr.push(p.notes.String);
        }
        if (customNotesMap[p.id]) {
          notesArr.push(...customNotesMap[p.id]);
        }
        return {
          id: p.id,
          name: p.title,
          area: p.address?.Valid ? p.address.String : (p.neighborhood?.Valid ? p.neighborhood.String : "Nearby"),
          category: p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : "Spot",
          isVisited: p.is_visited,
          isStarred: starredIds.has(p.id),
          rating: 4.8,
          description: p.notes?.Valid ? p.notes.String : "Saved location for your itinerary.",
          image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80",
          notes: notesArr,
        };
      });

      // Merge custom clipped/added places from localStorage
      if (typeof window !== "undefined") {
        const customPlaces = localStorage.getItem(`wanderly_custom_places_${tripId}`);
        if (customPlaces) {
          try {
            const extra = JSON.parse(customPlaces);
            const ids = new Set(mapped.map((p) => p.id));
            const newPlaces = extra.filter((p: PlaceItem) => !ids.has(p.id));
            mapped = [...mapped, ...newPlaces];
          } catch {}
        }
        localStorage.setItem(`wanderly_cached_places_${tripId}`, JSON.stringify(mapped));
      }

      setPlaces(mapped);
    } catch (err) {
      console.error("Failed to load places:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(`wanderly_cached_places_${tripId}`);
        if (cached) {
          try {
            setPlaces(JSON.parse(cached));
            return;
          } catch {}
        }
      }
      setPlaces([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.trips.list();
        const tripList = res.data || [];
        setTrips(tripList);
        if (tripList.length > 0) {
          setActiveTrip(tripList[0]);
          await loadPlaces(tripList[0].id);
        }
      } catch (err) {
        console.error("Failed to load trips:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleTripChange = async (tripId: string) => {
    const found = trips.find((t) => t.id === tripId);
    if (found) {
      setActiveTrip(found);
      await loadPlaces(found.id);
    }
  };

  // Keyboard shortcut ⌘N / Ctrl+N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        if (activeTrip) {
          setIsAddModalOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTrip]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("All", places.length);
    for (const p of places) {
      counts.set(p.category, (counts.get(p.category) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [places]);

  // Filtered Places
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const matchCat = activeCategory === "All" || p.category.toLowerCase() === activeCategory.toLowerCase();
      const matchSearch =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchVisited = !filterVisitedOnly || p.isVisited;
      const matchStarred = !filterStarredOnly || p.isStarred;
      return matchCat && matchSearch && matchVisited && matchStarred;
    });
  }, [places, activeCategory, searchQuery, filterVisitedOnly, filterStarredOnly]);

  // Map markers for live interactive spatial map
  const mapMarkers = useMemo(() => {
    const lat = activeTrip?.latitude || 48.8566;
    const lon = activeTrip?.longitude || 2.3522;
    return places.map((p, idx) => {
      const offsetLat = (idx % 2 === 0 ? 1 : -1) * (0.005 + (idx * 0.003));
      const offsetLon = (idx % 3 === 0 ? -1 : 1) * (0.006 + (idx * 0.002));
      return {
        id: p.id,
        latitude: lat + offsetLat,
        longitude: lon + offsetLon,
        title: p.name,
        subtitle: `${p.category} • ${p.area}`,
        category: p.category.toLowerCase(),
      };
    });
  }, [places, activeTrip]);

  // Toggle Bookmark / Star with localStorage persistence
  const toggleBookmark = (id: string) => {
    setPlaces((prev) => {
      const updated = prev.map((p) => {
        if (p.id === id) {
          const nextVal = !p.isStarred;
          showToast(nextVal ? `★ Starred "${p.name}"` : `Removed star from "${p.name}"`);
          return { ...p, isStarred: nextVal };
        }
        return p;
      });

      if (typeof window !== "undefined") {
        const starred = updated.filter((p) => p.isStarred).map((p) => p.id);
        localStorage.setItem("wanderly_starred_places", JSON.stringify(starred));
      }
      return updated;
    });
  };

  // Add / Save Note for a place
  const handleSaveNote = (placeId: string, noteText: string) => {
    if (!noteText.trim()) return;
    setPlaces((prev) => {
      const updated = prev.map((p) => {
        if (p.id === placeId) {
          const newNotes = [...p.notes, noteText.trim()];
          return { ...p, notes: newNotes };
        }
        return p;
      });

      if (typeof window !== "undefined") {
        try {
          const existing = JSON.parse(localStorage.getItem("wanderly_places_notes") || "{}");
          existing[placeId] = [...(existing[placeId] || []), noteText.trim()];
          localStorage.setItem("wanderly_places_notes", JSON.stringify(existing));
        } catch {}
      }
      return updated;
    });

    // Also update selectedPlaceNotes in modal
    setSelectedPlaceNotes((prev) => {
      if (!prev) return null;
      return { ...prev, notes: [...prev.notes, noteText.trim()] };
    });

    setNewNoteText("");
    showToast("✓ Note added to place!");
  };

  // Toggle Visited Status
  const toggleVisited = async (id: string) => {
    if (!activeTrip) return;
    try {
      await api.places.toggle(activeTrip.id, id);
      await loadPlaces(activeTrip.id);
      showToast("✓ Updated visit status");
    } catch (err) {
      console.error("Failed to toggle visited:", err);
      showToast("Error updating status");
    }
  };

  // Delete Place
  const handleDeletePlace = async (id: string) => {
    if (!activeTrip) return;
    try {
      await api.places.delete(activeTrip.id, id);
      await loadPlaces(activeTrip.id);
      showToast("✓ Place deleted");
    } catch (err) {
      console.error("Failed to delete place:", err);
      showToast("Error deleting place");
    }
  };

  // Add New Place
  const handleAddPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !activeTrip) return;

    let cat = "spot";
    const lower = newCategory.toLowerCase();
    if (lower.includes("coffee") || lower.includes("cafe")) cat = "cafe";
    else if (lower.includes("din") || lower.includes("food")) cat = "dining";
    else if (lower.includes("cult") || lower.includes("museum")) cat = "culture";
    else if (lower.includes("shop")) cat = "shop";
    else if (lower.includes("nature") || lower.includes("park")) cat = "park";
    else if (lower.includes("arch")) cat = "architecture";

    try {
      await api.places.create(activeTrip.id, {
        title: newName.trim(),
        address: newArea.trim() || activeTrip.destination,
        category: cat,
        notes: newDescription.trim(),
      });

      await loadPlaces(activeTrip.id);
      setNewName("");
      setNewArea("");
      setNewDescription("");
      setIsAddModalOpen(false);
      showToast(`✓ Added "${newName.trim()}" to saved places!`);
    } catch (err) {
      console.error("Failed to add place:", err);
      showToast("Error adding place to server");
    }
  };

  // Quick Clip Parse
  const handleClipParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipUrl.trim() || !activeTrip) return;

    const extractedName = clipUrl.replace(/https?:\/\/(www\.)?/, "").split("/")[0] || "Web Discovery";
    try {
      await api.places.create(activeTrip.id, {
        title: `Clipped: ${extractedName}`,
        address: activeTrip.destination,
        category: "spot",
        notes: `Extracted from ${clipUrl}`,
      });
      await loadPlaces(activeTrip.id);
      setClipUrl("");
      showToast(`✓ Extracted and saved "${extractedName}"!`);
    } catch (err) {
      console.error("Failed to clip:", err);
      showToast("Error clipping place");
    }
  };

  // Export Places
  const handleExport = () => {
    if (places.length === 0) {
      showToast("No places to export.");
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(places, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeTrip?.title || "saved"}_places.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("✓ Exported saved spots to JSON");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-label-ui text-label-ui text-on-surface-variant">Loading saved places...</span>
        </div>
      </div>
    );
  }

  // GLOBAL EMPTY STATE: 0 trips
  if (trips.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-space-md text-center flex flex-col items-center justify-center gap-space-lg">
        <div className="w-20 h-20 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary shadow-inner">
          <span className="material-symbols-outlined text-[42px]">place</span>
        </div>
        <div className="flex flex-col gap-2 max-w-md">
          <h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface">No Expeditions Planned</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Saved places and bucket lists are tied to specific expeditions. Plan your first trip to start pinning architectural landmarks, coffee counters, and restaurants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/trips"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-ui font-medium shadow-sm hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Plan Your First Expedition</span>
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui font-medium transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-inverse-surface text-inverse-on-surface shadow-lg text-body-sm animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="-m-space-lg mb-0 bg-surface-container-low px-space-lg py-space-md">
        <div className="flex items-center gap-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant mb-1">
          <Link href="/trips" className="hover:text-on-surface transition-colors">
            Trips
          </Link>
          <span>/</span>
          {activeTrip && (
            <Link href={`/trips/${activeTrip.id}`} className="hover:text-on-surface transition-colors">
              {activeTrip.title}
            </Link>
          )}
          <span>/</span>
          <span className="text-primary font-medium">Places Explorer</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-1">
          <div className="flex flex-wrap items-center gap-3">
            {trips.length > 1 ? (
              <select
                value={activeTrip?.id}
                onChange={(e) => handleTripChange(e.target.value)}
                className="font-headline-lg text-headline-lg text-on-surface tracking-tight bg-transparent border-0 border-b border-surface-variant font-bold cursor-pointer focus:outline-none"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id} className="bg-surface text-on-surface text-base">
                    {t.title}
                  </option>
                ))}
              </select>
            ) : (
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {activeTrip?.title || "Saved Places & Curations"}
              </h1>
            )}

            <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
              {activeTrip?.destination}
            </span>
            <div className="flex items-center gap-3 font-label-mono-sm text-label-mono-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {places.length} saved spots
              </span>
              <span>{places.filter((p) => p.isVisited).length} visited</span>
              <span>{places.filter((p) => p.isStarred).length} starred</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-highest hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>Export</span>
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary hover:bg-primary/90 text-on-primary font-label-ui text-label-ui font-medium shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Place</span>
              <kbd className="ml-1 px-1 rounded bg-white/20 text-on-primary text-[10px] font-mono">⌘N</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Split Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg mt-space-md">
        {/* Left Content – 7 cols */}
        <div className="xl:col-span-7 flex flex-col gap-space-md">
          {/* Search & View Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded bg-surface-container-lowest border border-surface-variant">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Filter ${places.length} saved spots by name or area...`}
                className="bg-transparent border-0 outline-none text-body-md text-on-surface placeholder:text-on-surface-variant/70 flex-1"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setViewMode((prev) => (prev === "cards" ? "compact" : "cards"));
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-surface-container text-on-surface font-label-ui text-label-ui hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                {viewMode === "cards" ? "view_agenda" : "view_module"}
              </span>
              <span>{viewMode === "cards" ? "Compact" : "Cards"}</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = activeCategory === cat.label;
                return (
                  <button
                    key={cat.label}
                    onClick={() => setActiveCategory(cat.label)}
                    className={`px-3 py-1 rounded-full font-label-ui text-label-ui flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-primary text-on-primary font-medium"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {cat.label}
                    <span
                      className={`font-label-mono-sm text-label-mono-sm ${
                        isSelected ? "text-on-primary/80" : "text-on-surface-variant"
                      }`}
                    >
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-3 font-label-mono-sm text-label-mono-sm text-on-surface-variant">
            <button
              onClick={() => setFilterVisitedOnly(!filterVisitedOnly)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filterVisitedOnly ? "bg-primary/10 text-primary font-semibold" : "hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Visited Only ({places.filter((p) => p.isVisited).length})</span>
            </button>
            <button
              onClick={() => setFilterStarredOnly(!filterStarredOnly)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filterStarredOnly ? "bg-amber-500/10 text-amber-500 font-semibold" : "hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">star</span>
              <span>Starred Only</span>
            </button>
          </div>

          {/* Empty state for trip places */}
          {places.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-lowest rounded-xl border border-surface-variant text-on-surface-variant flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px]">explore</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">No Saved Places Yet</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                Start building your bucket list and pinned spots for {activeTrip?.title || "this expedition"}.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-ui text-label-ui font-medium shadow-sm hover:opacity-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_location</span>
                <span>Add First Place</span>
              </button>
            </div>
          ) : filteredPlaces.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-lowest rounded-xl border border-surface-variant text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px] mb-2 block">place</span>
              <p className="font-body-md font-medium">No places match your active filters.</p>
              <button
                onClick={() => {
                  setActiveCategory("All");
                  setSearchQuery("");
                  setFilterVisitedOnly(false);
                  setFilterStarredOnly(false);
                }}
                className="mt-3 text-primary font-medium text-body-sm hover:underline cursor-pointer"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            filteredPlaces.map((place) => (
              <div
                key={place.id}
                className="bg-surface-container-lowest rounded-xl p-space-md flex flex-col sm:flex-row gap-4 shadow-sm hover:shadow-md transition-all group border border-transparent hover:border-surface-variant"
              >
                {/* Content */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface tracking-tight group-hover:text-primary transition-colors flex items-center gap-1.5">
                        {place.name}
                        {place.isVisited && (
                          <span className="material-symbols-outlined text-[16px] text-tertiary" title="Visited">
                            check_circle
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleBookmark(place.id)}
                          className={`w-7 h-7 flex items-center justify-center rounded transition-colors cursor-pointer ${
                            place.isStarred
                              ? "text-amber-500 hover:text-amber-600"
                              : "text-on-surface-variant hover:text-primary"
                          }`}
                          title={place.isStarred ? "Unstar place" : "Star place"}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {place.isStarred ? "star" : "star_outline"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeletePlace(place.id)}
                          className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                          title="Delete Place"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{place.area}</span>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-label-mono-sm text-label-mono-sm">
                        {place.category}
                      </span>
                      <button
                        onClick={() => toggleVisited(place.id)}
                        className={`px-2 py-0.5 rounded font-label-mono-sm text-label-mono-sm transition-colors cursor-pointer ${
                          place.isVisited
                            ? "bg-tertiary/20 text-tertiary font-semibold"
                            : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                        }`}
                      >
                        {place.isVisited ? "✓ Visited" : "Mark Visited"}
                      </button>
                    </div>

                    <p className="font-body-md text-body-md text-on-surface-variant mt-2 line-clamp-2">
                      {place.description}
                    </p>
                  </div>

                  {/* Bottom Meta & Actions */}
                  <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-surface-variant font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                    <span className="truncate">{activeTrip?.destination || "Destination"}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedPlaceNotes(place)}
                        className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui text-label-ui flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit_note</span>
                        <span>Notes {place.notes.length > 0 ? `(${place.notes.length})` : ""}</span>
                      </button>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          place.name + " " + (activeTrip?.destination || "")
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded bg-primary text-on-primary font-label-ui text-label-ui font-medium flex items-center gap-1 transition-colors hover:bg-primary/90"
                      >
                        <span className="material-symbols-outlined text-[14px]">navigation</span>
                        <span>Navigate</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Sidebar – 5 cols */}
        <div className="xl:col-span-5 flex flex-col gap-space-lg">
          {/* Spatial Interactive Map */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">explore</span>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Spatial Exploration Map</h3>
              </div>
              <span className="font-label-mono-sm text-label-mono-sm text-primary font-medium">CartoDB Live Tiles</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Interactive Leaflet satellite &amp; street telemetry centered on {activeTrip?.destination || "Destination"}.
            </p>
            <div className="h-[280px] w-full rounded-lg overflow-hidden border border-surface-variant mt-1">
              <SpatialMap
                latitude={activeTrip?.latitude || 48.8566}
                longitude={activeTrip?.longitude || 2.3522}
                destination={activeTrip?.destination || "Destination"}
                markers={mapMarkers}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Quick Clip Parser */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm">
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-1">Quick Web Clip</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">
              Paste a URL or location link to quickly save a place to {activeTrip?.title}.
            </p>
            <form onSubmit={handleClipParse} className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Paste URL, Google Maps link, or restaurant name..."
                value={clipUrl}
                onChange={(e) => setClipUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-label-ui text-label-ui font-medium hover:opacity-90 transition-all cursor-pointer self-end"
              >
                Save from URL
              </button>
            </form>
          </div>

          {/* Expedition Summary Info Card */}
          <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">explore</span>
              <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Curator Overview</h4>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Every saved spot is securely stored in your personal database for {activeTrip?.title}. Only you can access or curate these locations.
            </p>
            <div className="pt-2 border-t border-surface-variant flex items-center justify-between font-label-mono-sm text-label-mono-sm text-on-surface-variant">
              <span>{places.length} Locations Pinned</span>
              <Link href={`/trips/${activeTrip?.id}`} className="text-primary hover:underline font-medium">
                View Expedition Map →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Add Place Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-surface-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_location</span>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Add New Place</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddPlace} className="flex flex-col gap-4">
              <div>
                <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Place Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Louvre Museum, Tsukiji Outer Market, Central Park"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                  >
                    <option value="Sightseeing">Sightseeing</option>
                    <option value="Dining">Dining</option>
                    <option value="Coffee">Coffee &amp; Bakeries</option>
                    <option value="Culture">Culture &amp; Museum</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Nature">Nature &amp; Outdoors</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Area / Neighborhood</label>
                  <input
                    type="text"
                    placeholder="e.g. Downtown, Shinjuku, 7th Arr."
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Curator Notes (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Tips, reservation links, best times to visit..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-variant">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg hover:bg-surface-container text-on-surface font-label-ui text-label-ui cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary font-label-ui text-label-ui font-medium shadow-sm hover:opacity-90 cursor-pointer"
                >
                  Save Place
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {selectedPlaceNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-surface-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">edit_note</span>
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
                    {selectedPlaceNotes.name}
                  </h3>
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    {selectedPlaceNotes.area} · Curator Field Notes
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlaceNotes(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* List of existing notes */}
            <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
              {selectedPlaceNotes.notes.length === 0 ? (
                <div className="py-6 text-center text-on-surface-variant text-body-sm">
                  No custom notes recorded for this location yet.
                </div>
              ) : (
                selectedPlaceNotes.notes.map((n, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-surface-container-low border border-surface-variant/70 text-body-sm text-on-surface font-body-sm flex items-start gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary shrink-0 mt-0.5">
                      sticky_note_2
                    </span>
                    <span className="flex-1">{n}</span>
                  </div>
                ))
              )}
            </div>

            {/* Inline add note input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveNote(selectedPlaceNotes.id, newNoteText);
              }}
              className="flex items-center gap-2 pt-2 border-t border-surface-variant"
            >
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Add tip (e.g. strict 18:00 seating, cash only)..."
                className="flex-1 px-3 py-2 rounded-xl bg-surface border border-surface-variant text-body-sm text-on-surface focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-ui text-label-ui font-medium disabled:opacity-40 cursor-pointer shadow-xs"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
