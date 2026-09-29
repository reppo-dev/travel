"use client";

import React, { useState } from "react";
import { SavedPlace } from "@/lib/api";
import {
  MapPin,
  Star,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ExternalLink,
  Coffee,
  Building,
  Landmark,
  UtensilsCrossed,
  ShoppingBag,
  Trees,
  Compass,
} from "lucide-react";

interface PlacesExplorerProps {
  places: SavedPlace[];
  tripId: string;
  onToggle: (placeId: string) => Promise<void>;
  onCreate: (place: {
    title: string;
    category: string;
    neighborhood?: string;
    address?: string;
    rating?: string;
    notes?: string;
    image_url?: string;
    latitude?: number;
    longitude?: number;
  }) => Promise<void>;
  onDelete: (placeId: string) => Promise<void>;
}

const CATEGORY_META: Record<string, { label: string; icon: any }> = {
  cafe: { label: "Cafe & Coffee", icon: Coffee },
  architecture: { label: "Architecture", icon: Building },
  culture: { label: "Culture & Museum", icon: Landmark },
  dining: { label: "Dining", icon: UtensilsCrossed },
  shop: { label: "Boutique & Craft", icon: ShoppingBag },
  park: { label: "Park & Garden", icon: Trees },
  spot: { label: "Scenic Spot", icon: Compass },
};

export const PlacesExplorer: React.FC<PlacesExplorerProps> = ({
  places,
  tripId,
  onToggle,
  onCreate,
  onDelete,
}) => {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("cafe");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [rating, setRating] = useState("4.8");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredPlaces = places.filter(
    (p) => selectedFilter === "all" || p.category === selectedFilter
  );

  const visitedCount = places.filter((p) => p.is_visited).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      await onCreate({
        title: title.trim(),
        category,
        neighborhood: neighborhood.trim() || undefined,
        address: address.trim() || undefined,
        rating: rating.trim() || undefined,
        notes: notes.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
      });
      setTitle("");
      setNeighborhood("");
      setAddress("");
      setNotes("");
      setImageUrl("");
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add place", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fdfaf7] rounded-2xl p-6 border border-[#e8dfd8] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-serif text-[#2a2421] font-semibold">Saved Places & Curations</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f2eae4] text-[#715c50] font-mono">
              {visitedCount}/{places.length} visited
            </span>
          </div>
          <p className="text-sm text-[#715c50]">
            Curated cafes, architectural landmarks, and hidden neighborhood gems.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2a2421] text-white text-sm font-medium hover:bg-black transition-all shadow-sm active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Spot</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedFilter("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            selectedFilter === "all"
              ? "bg-[#2a2421] text-white"
              : "bg-[#f2eae4] text-[#715c50] hover:bg-[#ebdcd3]"
          }`}
        >
          All Spots ({places.length})
        </button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const count = places.filter((p) => p.category === key).length;
          if (count === 0 && selectedFilter !== key) return null;
          return (
            <button
              key={key}
              onClick={() => setSelectedFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                selectedFilter === key
                  ? "bg-[#2a2421] text-white"
                  : "bg-[#f2eae4] text-[#715c50] hover:bg-[#ebdcd3]"
              }`}
            >
              <span>{meta.label}</span>
              <span className="text-[10px] font-mono opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Add Spot Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-xl bg-white border border-[#2a2421]/20 shadow-md space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#715c50] uppercase font-semibold">
              Save New Spot
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-[#9e8c81] hover:text-[#2a2421]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">PLACE NAME *</label>
              <input
                type="text"
                required
                placeholder="e.g. Bear Pond Espresso..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#2a2421] outline-hidden text-[#2a2421]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">CATEGORY</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#2a2421] outline-hidden bg-white text-[#2a2421]"
              >
                {Object.entries(CATEGORY_META).map(([k, meta]) => (
                  <option key={k} value={k}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">NEIGHBORHOOD</label>
              <input
                type="text"
                placeholder="e.g. Shimokitazawa, Minato-ku..."
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#2a2421] outline-hidden text-[#2a2421]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">IMAGE URL (OPTIONAL)</label>
              <input
                type="text"
                placeholder="/images/tokyo-coffee.png or https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">RATING</label>
              <input
                type="text"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#715c50] mb-1">NOTES</label>
            <textarea
              rows={2}
              placeholder="e.g. Famous for the Angel Stain espresso shot. Closes at 6 PM..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[#2a2421] text-white hover:bg-black disabled:opacity-50"
            >
              Add Spot
            </button>
          </div>
        </form>
      )}

      {/* Grid of Places */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlaces.length === 0 ? (
          <div className="col-span-full text-center py-10 bg-[#f9f5f0] rounded-xl border border-dashed border-[#e8dfd8]">
            <p className="text-xs text-[#9e8c81]">No saved spots found.</p>
          </div>
        ) : (
          filteredPlaces.map((place) => {
            const meta = CATEGORY_META[place.category] || CATEGORY_META.spot;
            const Icon = meta.icon;
            const img = place.image_url?.Valid ? place.image_url.String : null;

            return (
              <div
                key={place.id}
                className={`group rounded-xl border overflow-hidden transition-all duration-200 ${
                  place.is_visited
                    ? "bg-[#faf6f3]/80 border-[#e8dfd8] opacity-80"
                    : "bg-white border-[#e8dfd8] hover:border-[#2a2421]/30 shadow-xs hover:shadow-md"
                }`}
              >
                {/* Photo if available */}
                {img ? (
                  <div className="relative h-36 w-full overflow-hidden bg-[#ebdcd3]">
                    <img
                      src={img}
                      alt={place.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{place.rating?.Valid ? place.rating.String : "4.8"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-20 bg-gradient-to-r from-[#f2eae4] to-[#ebdcd3] flex items-center px-4">
                    <div className="p-2 rounded-lg bg-white/60 text-[#715c50]">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-serif font-semibold text-[#2a2421] line-clamp-1">
                      {place.title}
                    </h4>
                    <button
                      onClick={() => onToggle(place.id)}
                      className={`cursor-pointer transition-transform active:scale-90 ${
                        place.is_visited ? "text-[#4c6156]" : "text-[#b8a99e] hover:text-[#4c6156]"
                      }`}
                      title={place.is_visited ? "Mark unvisited" : "Mark visited"}
                    >
                      {place.is_visited ? (
                        <CheckCircle2 className="w-4 h-4 fill-[#4c6156]/15" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {place.neighborhood?.Valid && (
                    <div className="flex items-center gap-1 text-[11px] text-[#715c50]">
                      <MapPin className="w-3 h-3 text-[#9d3d26]" />
                      <span>{place.neighborhood.String}</span>
                    </div>
                  )}

                  {place.notes?.Valid && (
                    <p className="text-xs text-[#715c50] line-clamp-2 font-sans pt-1">
                      {place.notes.String}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#f2eae4]">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#f2eae4] text-[#715c50]">
                      {meta.label}
                    </span>
                    <button
                      onClick={() => onDelete(place.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#b8a99e] hover:text-red-600 transition-opacity"
                      title="Delete spot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default PlacesExplorer;
