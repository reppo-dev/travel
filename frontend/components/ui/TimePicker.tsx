"use client";

import React, { useState, useRef, useEffect } from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";

export interface TimePickerProps {
  value?: string; // "HH:mm" (24-hour)
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value = "12:00",
  onChange,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hours, minutes] = (value && value.includes(":") ? value.split(":") : ["12", "00"]).map(
    (val) => parseInt(val, 10) || 0
  );

  // Close popover when clicking outside
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

  const setHour = (newHour: number) => {
    const clamped = (newHour + 24) % 24;
    const formatted = `${clamped.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    onChange(formatted);
  };

  const setMinute = (newMin: number) => {
    const clamped = (newMin + 60) % 60;
    const formatted = `${hours.toString().padStart(2, "0")}:${clamped.toString().padStart(2, "0")}`;
    onChange(formatted);
  };

  const formattedDisplay = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

  const QUICK_TIMES = ["08:00", "10:00", "12:00", "14:00", "18:00", "20:30"];

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
          <Clock className="w-3.5 h-3.5 text-[#9d3d26] shrink-0" />
          <span className="text-xs font-mono font-medium text-[#2a2421]">
            {formattedDisplay}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#9e8c81] shrink-0 bg-[#f2edeb] px-1.5 py-0.5 rounded">
          {hours >= 12 ? "PM" : "AM"}
        </span>
      </button>

      {/* Time Popover */}
      {isOpen && (
        <div className="absolute z-50 left-0 mt-2 bg-white rounded-2xl border border-[#e8dfd8] shadow-xl p-3 w-56 max-w-[90vw] animate-in fade-in zoom-in-95 duration-100">
          <div className="text-[11px] font-mono font-bold text-[#715c50] mb-2 px-1">
            SELECT TIME
          </div>

          <div className="flex items-center justify-center gap-3 py-2 bg-[#fdf8f6] rounded-xl border border-[#f2edeb]">
            {/* Hours Stepper */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setHour(hours + 1)}
                className="p-1 hover:bg-[#f2edeb] rounded text-[#715c50] cursor-pointer"
                aria-label="Increment hour"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <span className="text-base font-mono font-bold text-[#2a2421] w-8 text-center my-0.5">
                {hours.toString().padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => setHour(hours - 1)}
                className="p-1 hover:bg-[#f2edeb] rounded text-[#715c50] cursor-pointer"
                aria-label="Decrement hour"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-base font-mono font-bold text-[#9e8c81] pb-1">:</span>

            {/* Minutes Stepper */}
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => setMinute(minutes + 5)}
                className="p-1 hover:bg-[#f2edeb] rounded text-[#715c50] cursor-pointer"
                aria-label="Increment minute"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <span className="text-base font-mono font-bold text-[#2a2421] w-8 text-center my-0.5">
                {minutes.toString().padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => setMinute(minutes - 5)}
                className="p-1 hover:bg-[#f2edeb] rounded text-[#715c50] cursor-pointer"
                aria-label="Decrement minute"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="mt-2.5 pt-2 border-t border-[#f2edeb]">
            <div className="text-[10px] font-mono text-[#9e8c81] mb-1.5 px-0.5">Presets:</div>
            <div className="grid grid-cols-3 gap-1">
              {QUICK_TIMES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    onChange(t);
                    setIsOpen(false);
                  }}
                  className={`text-[10px] font-mono py-1 rounded transition-colors cursor-pointer ${
                    value === t
                      ? "bg-[#9d3d26] text-white font-bold"
                      : "bg-[#f2edeb] hover:bg-[#ebdcd3] text-[#715c50]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePicker;
