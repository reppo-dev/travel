"use client";

import React from "react";
import { DatePicker, DatePickerProps } from "./DatePicker";
import { TimePicker, TimePickerProps } from "./TimePicker";

export { DatePicker } from "./DatePicker";
export { TimePicker } from "./TimePicker";

export interface DateTimePickerProps {
  dateValue?: string; // "YYYY-MM-DD"
  onDateChange: (val: string) => void;
  timeValue?: string; // "HH:mm"
  onTimeChange: (val: string) => void;
  datePlaceholder?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
  disabled?: boolean;
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  dateValue,
  onDateChange,
  timeValue,
  onTimeChange,
  datePlaceholder = "Select date",
  minDate,
  maxDate,
  className = "",
  disabled = false,
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${className}`}>
      <DatePicker
        value={dateValue}
        onChange={onDateChange}
        placeholder={datePlaceholder}
        minDate={minDate}
        maxDate={maxDate}
        disabled={disabled}
      />
      <TimePicker
        value={timeValue}
        onChange={onTimeChange}
        disabled={disabled}
      />
    </div>
  );
};

export default DateTimePicker;
