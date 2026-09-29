"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { api, Trip } from "@/lib/api";
import {
  searchLocationsRobust,
  reverseGeocodeCoordinates,
  fetchDestinationPhoto,
  GeoLocation,
  CURATED_DESTINATION_PHOTOS,
} from "@/lib/geocoding";
import {
  X,
  Search,
  MapPin,
  Calendar,
  Users,
  Image as ImageIcon,
  Cloud,
  Check,
  Sparkles,
  Loader2,
  Trash2,
  FileEdit,
  Send,
  RefreshCw,
} from "lucide-react";
import { format, addDays, isValid, parseISO } from "date-fns";
import { DatePicker, TimePicker } from "@/components/ui/DateTimePicker";

// Dynamic import for Leaflet map component (SSR false)
const MapLocationPicker = dynamic(
  () => import("./MapLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 rounded-2xl bg-[#f2edeb] animate-pulse flex items-center justify-center text-xs font-mono text-[#715c50]">
        Loading interactive map...
      </div>
    ),
  }
);

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (trip: Trip) => void;
  onTripCreated?: (trip?: Trip) => void;
  tripToEdit?: Trip | null;
  onUpdated?: (trip: Trip) => void;
}

export const NewTripModal: React.FC<NewTripModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  onTripCreated,
  tripToEdit,
  onUpdated,
}) => {
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [latitude, setLatitude] = useState(35.6762);
  const [longitude, setLongitude] = useState(139.6503);
  const [startDate, setStartDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [departureTime, setDepartureTime] = useState("10:00");
  const [endDate, setEndDate] = useState(() => format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [returnTime, setReturnTime] = useState("18:00");
  const [travelersCount, setTravelersCount] = useState(2);
  const [travelerNames, setTravelerNames] = useState("Alex Chen, Maya Lin");
  const [tagLabel, setTagLabel] = useState("Cherry Blossom Season · Slow Travel");
  const [coverImageUrl, setCoverImageUrl] = useState("/images/tokyo-tower.png");

  // Search & Geocoding states
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Weather preview
  const [weatherPreview, setWeatherPreview] = useState<{ temp: number; cond: string } | null>(null);

  // Custom photo picker modal state
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [customPhotoInput, setCustomPhotoInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or initialize default values when opened
  useEffect(() => {
    if (isOpen) {
      if (tripToEdit) {
        setTitle(tripToEdit.title || "");
        setDestination(tripToEdit.destination || "");
        setCountry(tripToEdit.country || "");
        setLatitude(tripToEdit.latitude || 35.6762);
        setLongitude(tripToEdit.longitude || 139.6503);
        setSearchQuery(tripToEdit.destination ? `${tripToEdit.destination}, ${tripToEdit.country}` : "");
        setTravelersCount(tripToEdit.travelers_count || 1);
        setTravelerNames(tripToEdit.traveler_names || "");
        setTagLabel(tripToEdit.tag_label?.Valid ? tripToEdit.tag_label.String : "");
        setCoverImageUrl(tripToEdit.cover_image_url?.Valid ? tripToEdit.cover_image_url.String : "/images/tokyo-tower.png");

        // Parse start date and departure time
        if (tripToEdit.start_date) {
          const parts = tripToEdit.start_date.split("T");
          setStartDate(parts[0]);
          if (parts[1]) {
            setDepartureTime(parts[1].substring(0, 5));
          } else {
            setDepartureTime("18:00");
          }
        }

        // Parse end date and return time
        if (tripToEdit.end_date) {
          const parts = tripToEdit.end_date.split("T");
          setEndDate(parts[0]);
          if (parts[1]) {
            setReturnTime(parts[1].substring(0, 5));
          } else {
            setReturnTime("20:30");
          }
        }
      } else {
        if (!destination) {
          const now = new Date();
          setDestination("Tokyo");
          setCountry("Japan");
          setTitle("Tokyo Expedition");
          setLatitude(35.6762);
          setLongitude(139.6503);
          setStartDate(format(now, "yyyy-MM-dd"));
          setDepartureTime("10:00");
          setEndDate(format(addDays(now, 7), "yyyy-MM-dd"));
          setReturnTime("18:00");
        }
      }
    }
  }, [isOpen, tripToEdit]);

  // Robust search handler with debouncing and aborting stale requests
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const results = await searchLocationsRobust(trimmed, controller.signal);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setHighlightedIndex(-1);
      } catch (err: any) {
        if (err.name !== "CanceledError" && !controller.signal.aborted) {
          console.error("Search error:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  // Handle selecting a location suggestion
  const handleSelectLocation = async (loc: GeoLocation) => {
    setDestination(loc.name);
    setCountry(loc.country);
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setSearchQuery(loc.display_name);
    setShowDropdown(false);

    if (!title || title.includes("Expedition") || title.includes("Adventure")) {
      setTitle(`${loc.name} Expedition`);
    }

    // Auto fetch destination photo
    try {
      const photo = await fetchDestinationPhoto(loc.name, loc.country);
      if (photo) setCoverImageUrl(photo);
    } catch (e) {
      // ignore
    }

    // Auto fetch live weather preview
    try {
      const res = await api.geo.getWeather(loc.latitude, loc.longitude);
      if (res.data) {
        setWeatherPreview({
          temp: res.data.temperature,
          cond: res.data.condition,
        });
      }
    } catch (e) {
      // ignore
    }
  };

  // Handle pin drop on map
  const handleMapLocationSelect = async (lat: number, lon: number) => {
    setLatitude(lat);
    setLongitude(lon);

    try {
      const geo = await reverseGeocodeCoordinates(lat, lon);
      setDestination(geo.city);
      setCountry(geo.country);
      setSearchQuery(geo.displayName);

      if (!title || title.includes("Expedition") || title.includes("Adventure") || title.includes("Location")) {
        setTitle(`${geo.city} Expedition`);
      }

      // Auto fetch destination photo
      const photo = await fetchDestinationPhoto(geo.city, geo.country);
      if (photo) setCoverImageUrl(photo);

      // Auto fetch weather
      const res = await api.geo.getWeather(lat, lon);
      if (res.data) {
        setWeatherPreview({
          temp: res.data.temperature,
          cond: res.data.condition,
        });
      }
    } catch (err) {
      console.error("Failed to reverse geocode:", err);
    }
  };

  // Keyboard navigation for search dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelectLocation(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Submit handler with status parameter (draft or upcoming)
  const handleSubmit = async (targetStatus: "upcoming" | "draft") => {
    let finalDest = destination.trim();
    let finalCountry = country.trim();
    if (searchQuery.trim()) {
      const parts = searchQuery.split(",").map((s) => s.trim());
      if (parts.length >= 2) {
        finalDest = parts[0];
        finalCountry = parts[parts.length - 1];
      } else if (parts.length === 1 && parts[0]) {
        finalDest = parts[0];
      }
    }

    if (!finalDest || !startDate || !endDate) {
      alert("Please specify a destination and trip travel dates.");
      return;
    }

    try {
      setIsSubmitting(true);
      const cleanCoverImage = coverImageUrl?.trim() || "/images/tokyo-tower.png";
      const depTime = departureTime.trim() || "18:00";
      const retTime = returnTime.trim() || "20:30";
      const finalStartDate = `${startDate}T${depTime}:00Z`;
      const finalEndDate = `${endDate}T${retTime}:00Z`;

      const payload = {
        title: title.trim() || `${finalDest} Expedition`,
        destination: finalDest,
        country: finalCountry || "Global",
        latitude: latitude || 35.6762,
        longitude: longitude || 139.6503,
        start_date: finalStartDate,
        end_date: finalEndDate,
        status: targetStatus,
        travelers_count: travelersCount || 1,
        traveler_names: travelerNames.trim() || "Traveler",
        tag_label: tagLabel.trim() || undefined,
        cover_image_url: cleanCoverImage,
      };

      if (tripToEdit) {
        const res = await api.trips.update(tripToEdit.id, payload);
        if (onUpdated) onUpdated(res.data);
        if (onTripCreated) onTripCreated(res.data);
      } else {
        const res = await api.trips.create(payload);
        if (onCreated) onCreated(res.data);
        if (onTripCreated) onTripCreated(res.data);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to save trip:", err);
      const errMsg = err.response?.data?.error || err.message || "Error saving trip. Please verify connection and try again.";
      alert(`Error saving trip: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#fdf8f6] rounded-3xl border border-[#e8dfd8] shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e8dfd8] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#9d3d26] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#2a2421]">
                {tripToEdit ? `Edit Expedition · ${tripToEdit.title}` : "Plan New Expedition"}
              </h2>
              <p className="text-[11px] font-mono text-[#715c50]">
                {tripToEdit
                  ? "Modify dates, departure time, destination, and itinerary parameters"
                  : "Interactive Map Pinning, Live Weather & Curated Itinerary"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-[#f2eae4] flex items-center justify-center text-[#715c50] hover:text-[#2a2421] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Section 1: Destination Search with Autocomplete & Map */}
          <div className="space-y-3">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#715c50] font-semibold">
              1. CHOOSE DESTINATION ON MAP OR SEARCH WORLDWIDE
            </label>

            {/* Search Input Box */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#9e8c81] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search any city or country (e.g. Tokyo, Paris, تهران, Kyoto)..."
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (val.trim()) {
                      const parts = val.split(",").map((s) => s.trim());
                      if (parts.length >= 2) {
                        setDestination(parts[0]);
                        setCountry(parts[parts.length - 1]);
                      } else if (parts.length === 1 && parts[0]) {
                        setDestination(parts[0]);
                      }
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowDropdown(true);
                  }}
                  className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-[#e8dfd8] bg-white focus:border-[#9d3d26] focus:ring-2 focus:ring-[#9d3d26]/10 outline-hidden text-[#2a2421] shadow-2xs font-sans"
                />
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-[#9d3d26] animate-spin absolute right-3.5" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSuggestions([]);
                      setShowDropdown(false);
                    }}
                    className="absolute right-3 text-[#9e8c81] hover:text-[#2a2421] p-0.5 rounded cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              {/* Autocomplete Dropdown with onMouseDown fix */}
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-[#e8dfd8] shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                  {suggestions.map((item, idx) => (
                    <div
                      key={item.id}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevents input blur from cancelling click!
                        handleSelectLocation(item);
                      }}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors border-b border-[#f2eae4] last:border-0 ${
                        highlightedIndex === idx ? "bg-[#fdf8f6] text-[#9d3d26]" : "hover:bg-[#faf6f3]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-[#9d3d26] shrink-0" />
                        <span className="text-xs font-medium text-[#2a2421] truncate">
                          {item.display_name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#9e8c81] shrink-0">
                        {item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Leaflet Map */}
            <MapLocationPicker
              latitude={latitude}
              longitude={longitude}
              onLocationSelect={handleMapLocationSelect}
              destinationName={destination}
            />

            {/* Selected Location Pill & Weather Teaser */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-[#e8dfd8]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#2a2421]">
                  {destination ? `${destination}, ${country}` : "Select destination"}
                </span>
                <span className="text-[10px] font-mono text-[#9e8c81]">
                  ({latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E)
                </span>
              </div>

              {weatherPreview && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#4c6156] bg-[#4c6156]/10 px-2.5 py-1 rounded-lg">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>
                    {weatherPreview.temp}°C · {weatherPreview.cond}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Destination Cover Photo with Auto-Detect & Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#715c50] font-semibold">
                2. EXPEDITION COVER PHOTO
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPhotoPicker(!showPhotoPicker)}
                  className="text-xs font-mono text-[#9d3d26] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Choose Photo</span>
                </button>
                {coverImageUrl && (
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl("")}
                    className="text-xs font-mono text-[#9e8c81] hover:text-red-600 cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cover Preview Card */}
            {coverImageUrl ? (
              <div className="relative h-36 rounded-xl overflow-hidden border border-[#e8dfd8] bg-[#f2eae4]">
                <img
                  src={coverImageUrl}
                  alt={destination}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                  <span className="text-white text-xs font-mono">
                    Cover Preview: {destination}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-24 rounded-xl border border-dashed border-[#e8dfd8] bg-white flex flex-col items-center justify-center text-xs text-[#9e8c81] space-y-1">
                <ImageIcon className="w-5 h-5 opacity-50" />
                <span>No cover image selected</span>
              </div>
            )}

            {/* Expanded Photo Picker Drawer */}
            {showPhotoPicker && (
              <div className="p-4 rounded-xl bg-white border border-[#9d3d26]/20 shadow-sm space-y-3">
                <p className="text-xs font-mono text-[#715c50]">
                  Select from curated editorial presets or enter image URL:
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {CURATED_DESTINATION_PHOTOS.general.map((imgUrl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCoverImageUrl(imgUrl);
                        setShowPhotoPicker(false);
                      }}
                      className="relative h-16 rounded-lg overflow-hidden border border-[#e8dfd8] hover:border-[#9d3d26] transition-all cursor-pointer"
                    >
                      <img src={imgUrl} alt="preset" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={customPhotoInput}
                    onChange={(e) => setCustomPhotoInput(e.target.value)}
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customPhotoInput.trim()) {
                        setCoverImageUrl(customPhotoInput.trim());
                        setCustomPhotoInput("");
                        setShowPhotoPicker(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#2a2421] text-white text-xs font-medium cursor-pointer"
                  >
                    Apply URL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Trip Details & Dates */}
          <div className="space-y-4">
            <label className="block text-xs font-mono uppercase tracking-wider text-[#715c50] font-semibold">
              3. JOURNEY DETAILS & DATES
            </label>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">TRIP TITLE *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tokyo Spring 2027, Alpine Expedition..."
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-[#e8dfd8] bg-white focus:border-[#9d3d26] outline-hidden text-[#2a2421]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-white border border-[#e8dfd8] space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-[#715c50] font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#9d3d26]" />
                    DEPARTURE DATE & TIME *
                  </label>
                  <span className="text-[10px] font-mono text-[#9d3d26] font-medium bg-[#9d3d26]/10 px-1.5 py-0.5 rounded">
                    Outbound
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-[#9e8c81] block mb-1">Departure Date</label>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select departure"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#9e8c81] block mb-1">Time</label>
                    <TimePicker
                      value={departureTime}
                      onChange={setDepartureTime}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#4c6156] block">
                  Departs on {startDate} at {departureTime}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-[#e8dfd8] space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono text-[#715c50] font-semibold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#486172]" />
                    RETURN DATE & TIME *
                  </label>
                  <span className="text-[10px] font-mono text-[#486172] font-medium bg-[#486172]/10 px-1.5 py-0.5 rounded">
                    Inbound
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-[#9e8c81] block mb-1">Return Date</label>
                    <DatePicker
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="Select return"
                      minDate={startDate}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-[#9e8c81] block mb-1">Time</label>
                    <TimePicker
                      value={returnTime}
                      onChange={setReturnTime}
                    />
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#4c6156] block">
                  Returns on {endDate} at {returnTime}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-[#715c50] mb-1">TRAVELERS</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={travelersCount}
                  onChange={(e) => setTravelersCount(parseInt(e.target.value) || 1)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#e8dfd8] bg-white text-[#2a2421]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-[#715c50] mb-1">TRAVELER NAMES</label>
                <input
                  type="text"
                  value={travelerNames}
                  onChange={(e) => setTravelerNames(e.target.value)}
                  placeholder="Alex Chen, Maya Lin"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-[#e8dfd8] bg-white text-[#2a2421]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">TAG / THEME</label>
              <input
                type="text"
                value={tagLabel}
                onChange={(e) => setTagLabel(e.target.value)}
                placeholder="Cherry Blossom Season · Slow Travel"
                className="w-full text-xs px-3 py-2 rounded-xl border border-[#e8dfd8] bg-white text-[#2a2421]"
              />
            </div>
          </div>
        </div>

        {/* Footer with Draft & Publish / Update Buttons */}
        <div className="px-6 py-4 border-t border-[#e8dfd8] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-mono text-[#715c50] hover:text-[#2a2421] cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {!tripToEdit && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit("draft")}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#e8dfd8] bg-[#f7f3f0] hover:bg-[#ebdcd3] text-[#715c50] hover:text-[#2a2421] text-xs font-medium transition-all shadow-2xs active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <FileEdit className="w-3.5 h-3.5 text-[#715c50]" />
                <span>Save as Draft</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(tripToEdit ? (tripToEdit.status as any) : "upcoming")}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#9d3d26] hover:bg-[#85331f] text-white text-xs font-medium transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : tripToEdit ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Update Expedition</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Expedition</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default NewTripModal;
