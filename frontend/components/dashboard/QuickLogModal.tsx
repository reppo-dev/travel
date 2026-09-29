"use client";

import React, { useState } from "react";
import { Trip, api } from "@/lib/api";
import { X, Bolt, DollarSign, Calendar, MapPin, Check, Loader2 } from "lucide-react";

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  activeTrip: Trip | null;
  onLogged?: (msg: string) => void;
}

export const QuickLogModal: React.FC<QuickLogModalProps> = ({
  isOpen,
  onClose,
  trips,
  activeTrip,
  onLogged,
}) => {
  const [selectedTripId, setSelectedTripId] = useState<string>(activeTrip?.id || (trips[0]?.id ?? ""));
  const [logType, setLogType] = useState<"reservation" | "expense" | "place" | "todo">("reservation");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("dining");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !title.trim()) return;

    try {
      setLoading(true);
      const targetTrip = trips.find((t) => t.id === selectedTripId) || activeTrip;
      const tripName = targetTrip?.destination || "Trip";

      if (logType === "expense") {
        await api.expenses.create(selectedTripId, {
          title: title.trim(),
          amount: parseFloat(amount) || 0,
          currency: "USD",
          category: category as any,
          expense_date: new Date().toISOString(),
          notes: notes.trim() || undefined,
        });
        if (onLogged) onLogged(`Logged expense "$${amount || "0"} for ${title}" to ${tripName}`);
      } else if (logType === "place") {
        await api.places.create(selectedTripId, {
          title: title.trim(),
          category: category as any,
          notes: notes.trim() || undefined,
        });
        if (onLogged) onLogged(`Saved spot "${title}" in ${tripName}`);
      } else if (logType === "todo") {
        await api.todos.create(selectedTripId, {
          title: title.trim(),
          category: "prep",
          priority: "medium",
          notes: notes.trim() || undefined,
        });
        if (onLogged) onLogged(`Added checklist item "${title}" to ${tripName}`);
      } else {
        // Reservation / Activity
        await api.todos.create(selectedTripId, {
          title: `Reservation: ${title.trim()}`,
          category: "booking",
          priority: "high",
          notes: notes.trim() || "Quick logged reservation",
        });
        if (onLogged) onLogged(`Recorded reservation "${title}" for ${tripName}`);
      }

      onClose();
      setTitle("");
      setAmount("");
      setNotes("");
    } catch (err: any) {
      console.error("Failed to quick log:", err);
      alert("Failed to save entry. Please verify details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-2xl p-space-md flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-2 border-b border-surface-variant">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <Bolt className="w-4 h-4" />
            </div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Quick Telemetry Log</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Trip Selector */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">Target Expedition</label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-surface-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.destination})
                </option>
              ))}
            </select>
          </div>

          {/* Type Selector Tabs */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">Log Type</label>
            <div className="grid grid-cols-4 gap-1 p-1 bg-surface-container rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setLogType("reservation")}
                className={`py-1.5 rounded transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  logType === "reservation" ? "bg-surface-container-lowest text-primary shadow-xs font-semibold" : "text-on-surface-variant"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[10px]">Booking</span>
              </button>
              <button
                type="button"
                onClick={() => setLogType("expense")}
                className={`py-1.5 rounded transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  logType === "expense" ? "bg-surface-container-lowest text-primary shadow-xs font-semibold" : "text-on-surface-variant"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-[10px]">Expense</span>
              </button>
              <button
                type="button"
                onClick={() => setLogType("place")}
                className={`py-1.5 rounded transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  logType === "place" ? "bg-surface-container-lowest text-primary shadow-xs font-semibold" : "text-on-surface-variant"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[10px]">Place</span>
              </button>
              <button
                type="button"
                onClick={() => setLogType("todo")}
                className={`py-1.5 rounded transition-all flex flex-col items-center gap-1 cursor-pointer ${
                  logType === "todo" ? "bg-surface-container-lowest text-primary shadow-xs font-semibold" : "text-on-surface-variant"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span className="text-[10px]">Task</span>
              </button>
            </div>
          </div>

          {/* Title input */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">
              {logType === "reservation"
                ? "Reservation / Venue Name"
                : logType === "expense"
                ? "Expense Description"
                : logType === "place"
                ? "Place / Spot Name"
                : "Task Description"}
            </label>
            <input
              type="text"
              required
              placeholder={
                logType === "reservation"
                  ? "e.g. Sukiyabashi Jiro 19:30 Dinner"
                  : logType === "expense"
                  ? "e.g. Shinkansen Bullet Train Ticket"
                  : logType === "place"
                  ? "e.g. Fuglen Tokyo Coffee Roasters"
                  : "e.g. Exchange JR Pass voucher at airport"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-surface-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {/* If expense: amount */}
          {logType === "expense" && (
            <div>
              <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">Amount ($ USD)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-surface-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-on-surface-variant mb-1">Details & Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="Add confirmation #, address, or details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-surface-variant bg-surface text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-variant">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <Bolt className="w-3.5 h-3.5" />
                  <span>Log Telemetry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickLogModal;
