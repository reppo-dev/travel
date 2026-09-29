"use client";

import React, { useState } from "react";
import { PackingItem } from "@/lib/api";
import {
  Luggage,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Shirt,
  Smartphone,
  Sparkles,
  ShieldCheck,
  FileText,
  Compass,
} from "lucide-react";

interface PackingWorkspaceProps {
  items: PackingItem[];
  tripId: string;
  onToggle: (itemId: string) => Promise<void>;
  onCreate: (item: { title: string; category?: string; quantity?: number }) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
}

const CATEGORIES = [
  { id: "all", label: "All Items", icon: Luggage },
  { id: "clothing", label: "Clothing", icon: Shirt },
  { id: "electronics", label: "Electronics", icon: Smartphone },
  { id: "toiletries", label: "Toiletries", icon: Sparkles },
  { id: "essentials", label: "Essentials", icon: ShieldCheck },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "gear", label: "Gear", icon: Compass },
];

export const PackingWorkspace: React.FC<PackingWorkspaceProps> = ({
  items,
  tripId,
  onToggle,
  onCreate,
  onDelete,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("clothing");
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const filteredItems = items.filter(
    (item) => selectedCategory === "all" || item.category === selectedCategory
  );

  const packedCount = items.filter((i) => i.is_packed).length;
  const packedPercent = items.length > 0 ? Math.round((packedCount / items.length) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      await onCreate({
        title: title.trim(),
        category,
        quantity,
      });
      setTitle("");
      setQuantity(1);
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add packing item", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fdfaf7] rounded-2xl p-6 border border-[#e8dfd8] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4c6156]/10 text-[#4c6156] flex items-center justify-center">
            <Luggage className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-serif text-[#2a2421] font-semibold">Packing Workspace</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f2eae4] text-[#715c50] font-mono">
                {packedCount}/{items.length} packed
              </span>
            </div>
            <p className="text-sm text-[#715c50]">
              Essential gear, lightweight apparel, and electronics checklist.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4c6156] text-white text-sm font-medium hover:bg-[#3d4f46] transition-all shadow-sm active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-[#715c50]">
          <span>Luggage Preparedness</span>
          <span className="font-semibold text-[#4c6156]">{packedPercent}%</span>
        </div>
        <div className="w-full h-2 bg-[#ebdcd3] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#6b8577] to-[#4c6156] transition-all duration-500 rounded-full"
            style={{ width: `${packedPercent}%` }}
          />
        </div>
      </div>

      {/* Categories Horizontal Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count =
            cat.id === "all" ? items.length : items.filter((i) => i.category === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#2a2421] text-white shadow-xs"
                  : "bg-[#f2eae4] text-[#715c50] hover:bg-[#ebdcd3]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
              <span className="text-[10px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Add Item Inline Card */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-4 rounded-xl bg-white border border-[#4c6156]/30 shadow-md space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#715c50] uppercase font-semibold">
              New Packing Item
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-[#9e8c81] hover:text-[#2a2421]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                required
                placeholder="Item name (e.g., Merino wool socks, Power bank)..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#4c6156] outline-hidden text-[#2a2421]"
              />
            </div>
            <div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#4c6156] outline-hidden bg-white text-[#2a2421]"
              >
                <option value="clothing">Clothing</option>
                <option value="electronics">Electronics</option>
                <option value="toiletries">Toiletries</option>
                <option value="essentials">Essentials</option>
                <option value="documents">Documents</option>
                <option value="gear">Gear</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-16 text-xs px-2.5 py-2 rounded-lg border border-[#e8dfd8] text-center text-[#2a2421]"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-[#4c6156] text-white hover:bg-[#3d4f46] disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Grid of Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-8 bg-[#f9f5f0] rounded-xl border border-dashed border-[#e8dfd8]">
            <p className="text-xs text-[#9e8c81]">No packing items in this category.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                item.is_packed
                  ? "bg-[#faf6f3]/60 border-[#ebe3dc] opacity-70"
                  : "bg-white border-[#e8dfd8] hover:border-[#4c6156]/30 shadow-2xs"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={`cursor-pointer transition-transform active:scale-90 ${
                    item.is_packed ? "text-[#4c6156]" : "text-[#b8a99e] hover:text-[#4c6156]"
                  }`}
                >
                  {item.is_packed ? (
                    <CheckCircle2 className="w-5 h-5 fill-[#4c6156]/15" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <div className="truncate">
                  <span
                    className={`text-xs font-medium ${
                      item.is_packed ? "line-through text-[#9e8c81]" : "text-[#2a2421]"
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.quantity > 1 && (
                    <span className="ml-1.5 text-[10px] font-mono text-[#9e8c81]">
                      ×{item.quantity}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => onDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#b8a99e] hover:text-red-600 transition-opacity"
                title="Remove item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default PackingWorkspace;
