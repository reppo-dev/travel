"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isValid,
  addDays,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";

export interface DatePickerProps {
  value?: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Select date",
  minDate,
  maxDate,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current selected date or fallback to today
  const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : null;
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Sync current month when value changes
  useEffect(() => {
    if (value && isValid(parseISO(value))) {
      setCurrentMonth(parseISO(value));
    }
  }, [value]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handleDayClick = (day: Date) => {
    const formatted = format(day, "yyyy-MM-dd");
    onChange(formatted);
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    onChange(format(today, "yyyy-MM-dd"));
    setCurrentMonth(today);
    setIsOpen(false);
  };

  const handleQuickAddDays = (daysToAdd: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const base = selectedDate || new Date();
    const target = addDays(base, daysToAdd);
    onChange(format(target, "yyyy-MM-dd"));
    setCurrentMonth(target);
    setIsOpen(false);
  };

  const formattedDisplay = selectedDate
    ? format(selectedDate, "MMM d, yyyy")
    : placeholder;

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all text-left cursor-pointer select-none ${
          isOpen
            ? "border-[#9d3d26] ring-2 ring-[#9d3d26]/15 bg-white"
            : "border-[#e8dfd8] bg-white hover:border-[#9d3d26]/40 hover:bg-[#fdf8f6]/50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-3.5 h-3.5 text-[#9d3d26] shrink-0" />
          <span
            className={`text-xs font-mono font-medium truncate ${
              selectedDate ? "text-[#2a2421]" : "text-[#9e8c81]"
            }`}
          >
            {formattedDisplay}
          </span>
        </div>
        {selectedDate && (
          <span className="text-[10px] font-mono text-[#9e8c81] shrink-0 bg-[#f2edeb] px-1.5 py-0.5 rounded">
            {format(selectedDate, "EEE")}
          </span>
        )}
      </button>

      {/* Popover Calendar Modal */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-2 bg-white rounded-2xl border border-[#e8dfd8] shadow-xl p-3.5 w-72 max-w-[90vw] animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-mono font-bold text-[#2a2421]">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-6 h-6 rounded-lg hover:bg-[#f2edeb] flex items-center justify-center text-[#715c50] transition-colors cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-6 h-6 rounded-lg hover:bg-[#f2edeb] flex items-center justify-center text-[#715c50] transition-colors cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((dayName, idx) => (
              <span key={idx} className="text-[10px] font-mono font-semibold text-[#9e8c81] py-1">
                {dayName}
              </span>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((day) => {
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-mono transition-all flex items-center justify-center cursor-pointer relative ${
                    isSelected
                      ? "bg-[#9d3d26] text-white font-bold shadow-xs"
                      : isCurrentDay
                      ? "border border-[#9d3d26] text-[#9d3d26] font-bold hover:bg-[#fdf8f6]"
                      : isCurrentMonth
                      ? "text-[#2a2421] hover:bg-[#f2edeb]"
                      : "text-[#c5b8af] hover:bg-[#f7f3f0]"
                  }`}
                >
                  {format(day, "d")}
                  {isCurrentDay && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#9d3d26]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Presets */}
          <div className="mt-3 pt-2.5 border-t border-[#f2edeb] flex items-center justify-between text-[10px] font-mono">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[#9d3d26] font-semibold hover:underline cursor-pointer"
            >
              Today
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => handleQuickAddDays(3, e)}
                className="px-1.5 py-0.5 rounded bg-[#f2edeb] hover:bg-[#ebdcd3] text-[#715c50] cursor-pointer"
              >
                +3d
              </button>
              <button
                type="button"
                onClick={(e) => handleQuickAddDays(7, e)}
                className="px-1.5 py-0.5 rounded bg-[#f2edeb] hover:bg-[#ebdcd3] text-[#715c50] cursor-pointer"
              >
                +1w
              </button>
              <button
                type="button"
                onClick={(e) => handleQuickAddDays(14, e)}
                className="px-1.5 py-0.5 rounded bg-[#f2edeb] hover:bg-[#ebdcd3] text-[#715c50] cursor-pointer"
              >
                +2w
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
