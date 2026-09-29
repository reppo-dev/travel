"use client";

import React, { useState } from "react";
import { ItineraryDay, ItineraryActivity, api } from "@/lib/api";
import { format, parseISO } from "date-fns";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Plus,
  Trash2,
  Navigation,
  Footprints,
  Car,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface DayPlannerProps {
  days: ItineraryDay[];
  tripId: string;
  onAddActivity: (activity: {
    day_id: string;
    time_slot: string;
    title: string;
    location_name?: string;
    latitude?: number;
    longitude?: number;
    start_time?: string;
    end_time?: string;
    cost?: string;
    notes?: string;
  }) => Promise<void>;
  onDeleteActivity: (activityId: string) => Promise<void>;
}

const TIME_SLOT_META: Record<string, { label: string; time: string }> = {
  morning: { label: "Morning", time: "09:00 - 12:00" },
  afternoon: { label: "Afternoon", time: "12:00 - 17:00" },
  evening: { label: "Evening", time: "17:00 - 21:00" },
  night: { label: "Night", time: "21:00 - 00:00" },
};

export const DayPlanner: React.FC<DayPlannerProps> = ({
  days,
  tripId,
  onAddActivity,
  onDeleteActivity,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [timeSlot, setTimeSlot] = useState("morning");
  const [locationName, setLocationName] = useState("");
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("11:00");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const activeDay = days[selectedDayIndex] || days[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !activeDay) return;

    try {
      setLoading(true);
      await onAddActivity({
        day_id: activeDay.id,
        time_slot: timeSlot,
        title: title.trim(),
        location_name: locationName.trim() || undefined,
        start_time: startTime || undefined,
        end_time: endTime || undefined,
        cost: cost.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setTitle("");
      setLocationName("");
      setCost("");
      setNotes("");
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add activity", err);
    } finally {
      setLoading(false);
    }
  };

  if (!days || days.length === 0) {
    return (
      <div className="bg-[#fdfaf7] rounded-2xl p-8 border border-[#e8dfd8] text-center">
        <p className="text-sm text-[#715c50]">No itinerary days created yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#fdfaf7] rounded-2xl p-6 border border-[#e8dfd8] shadow-sm space-y-6">
      {/* Header & Days Carousel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif text-[#2a2421] font-semibold">Itinerary & Rhythm</h3>
          <p className="text-sm text-[#715c50]">
            Paced daily flows, curated destinations, and walking routes.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9d3d26] text-white text-sm font-medium hover:bg-[#85331f] transition-all shadow-sm active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Activity</span>
        </button>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {days.map((d, idx) => {
          const dateObj = parseISO(d.date);
          const isSelected = selectedDayIndex === idx;

          return (
            <button
              key={d.id}
              onClick={() => setSelectedDayIndex(idx)}
              className={`flex flex-col items-start px-4 py-2.5 rounded-xl border text-left transition-all min-w-[120px] ${
                isSelected
                  ? "bg-[#2a2421] border-[#2a2421] text-white shadow-sm"
                  : "bg-white border-[#e8dfd8] text-[#715c50] hover:border-[#9d3d26]/40 hover:bg-[#fcf7f4]"
              }`}
            >
              <span className={`text-[10px] font-mono uppercase ${isSelected ? "text-[#e8dfd8]" : "text-[#9e8c81]"}`}>
                Day {d.day_number < 10 ? `0${d.day_number}` : d.day_number}
              </span>
              <span className="text-xs font-semibold mt-0.5 font-sans">
                {format(dateObj, "EEE, MMM dd")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Day Banner */}
      {activeDay && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#f2eae4] border border-[#ebdcd3]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold uppercase text-[#9d3d26]">
                Day {activeDay.day_number}
              </span>
              <h4 className="text-sm font-serif font-bold text-[#2a2421]">{activeDay.title}</h4>
            </div>
            {activeDay.notes?.Valid && (
              <p className="text-xs text-[#715c50] mt-0.5">{activeDay.notes.String}</p>
            )}
          </div>
          <span className="text-xs font-mono text-[#715c50]">
            {activeDay.activities?.length || 0} activities
          </span>
        </div>
      )}

      {/* Add Activity Inline Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-xl bg-white border border-[#9d3d26]/30 shadow-md space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#715c50] uppercase font-semibold">
              Add Activity to Day {activeDay?.day_number}
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
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">ACTIVITY TITLE *</label>
              <input
                type="text"
                required
                placeholder="e.g. Tsukiji Outer Market Breakfast, Shibuya Sky Sunset..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#9d3d26] outline-hidden text-[#2a2421]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">TIME SLOT</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#9d3d26] outline-hidden bg-white text-[#2a2421]"
              >
                <option value="morning">Morning (09:00 - 12:00)</option>
                <option value="afternoon">Afternoon (12:00 - 17:00)</option>
                <option value="evening">Evening (17:00 - 21:00)</option>
                <option value="night">Night (21:00 - 00:00)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">LOCATION NAME</label>
              <input
                type="text"
                placeholder="e.g. Tsukiji, Chuo City..."
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">TIME</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#e8dfd8] outline-hidden bg-white text-[#2a2421]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">ESTIMATED COST</label>
              <input
                type="text"
                placeholder="$25.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#715c50] mb-1">NOTES</label>
            <input
              type="text"
              placeholder="e.g. Bring cash for sushi stands; queue opens at 8am."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[#9d3d26] text-white hover:bg-[#85331f] disabled:opacity-50"
            >
              Add Activity
            </button>
          </div>
        </form>
      )}

      {/* Activities Timeline */}
      <div className="space-y-3">
        {!activeDay?.activities || activeDay.activities.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#9e8c81] bg-[#f9f5f0] rounded-xl border border-dashed border-[#e8dfd8]">
            No activities scheduled for this day yet. Click &quot;Add Activity&quot; above.
          </div>
        ) : (
          activeDay.activities.map((act, index) => {
            const slotMeta = TIME_SLOT_META[act.time_slot] || TIME_SLOT_META.morning;

            return (
              <div
                key={act.id}
                className="group relative flex items-start gap-4 p-4 rounded-xl bg-white border border-[#e8dfd8] hover:border-[#9d3d26]/30 shadow-xs hover:shadow-md transition-all"
              >
                {/* Time Indicator */}
                <div className="w-20 shrink-0 text-left">
                  <span className="text-xs font-mono font-bold text-[#2a2421]">
                    {act.start_time?.Valid ? act.start_time.String : slotMeta.time.split(" - ")[0]}
                  </span>
                  <span className="block text-[10px] font-mono text-[#9e8c81] uppercase mt-0.5">
                    {slotMeta.label}
                  </span>
                </div>

                {/* Vertical separator line with dot */}
                <div className="relative self-stretch flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#9d3d26] ring-4 ring-[#f9f5f0]" />
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-semibold text-[#2a2421]">{act.title}</h5>
                    <button
                      onClick={() => onDeleteActivity(act.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#b8a99e] hover:text-red-600 transition-opacity"
                      title="Delete activity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-[#715c50]">
                    {act.location_name?.Valid && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#9d3d26]" />
                        <span>{act.location_name.String}</span>
                      </div>
                    )}

                    {act.cost?.Valid && (
                      <div className="flex items-center gap-1 font-mono text-[#2a2421]">
                        <DollarSign className="w-3.5 h-3.5 text-[#4c6156]" />
                        <span>{act.cost.String}</span>
                      </div>
                    )}
                  </div>

                  {act.notes?.Valid && (
                    <p className="text-xs text-[#715c50] mt-2 font-sans bg-[#faf6f3] p-2 rounded-lg border border-[#f2eae4]">
                      {act.notes.String}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default DayPlanner;
