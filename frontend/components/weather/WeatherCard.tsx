"use client";

import React, { useEffect, useState } from "react";
import { api, WeatherData } from "@/lib/api";

interface WeatherCardProps {
  latitude: number;
  longitude: number;
  city?: string;
  destination?: string;
  country?: string;
}

export default function WeatherCard({
  latitude,
  longitude,
  city,
  destination,
  country,
}: WeatherCardProps) {
  const cityName = city || destination || "Destination";
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchWeather() {
      try {
        setLoading(true);
        const res = await api.geo.getWeather(latitude, longitude);
        if (isMounted) {
          setWeather(res.data);
        }
      } catch (err) {
        console.warn("Failed to fetch weather:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (latitude && longitude) {
      fetchWeather();
    }
    return () => {
      isMounted = false;
    };
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="bg-[var(--surface-container-lowest)] p-4 rounded-xl border border-[var(--surface-container-highest)] animate-pulse flex flex-col gap-3">
        <div className="h-4 bg-[var(--surface-container-high)] rounded w-1/3"></div>
        <div className="h-8 bg-[var(--surface-container-high)] rounded w-1/2"></div>
        <div className="h-12 bg-[var(--surface-container-high)] rounded w-full"></div>
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="bg-[var(--surface-container-lowest)] p-4 rounded-xl border border-[var(--surface-container-highest)] shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--primary)] text-[20px]">
            {weather.icon || "wb_sunny"}
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--on-surface-variant)]">
            Live Weather · {cityName}
          </span>
        </div>
        <span className="text-[11px] font-mono text-[var(--tertiary)] bg-[var(--surface-container)] px-2 py-0.5 rounded">
          Open-Meteo Verified
        </span>
      </div>

      <div className="flex items-baseline justify-between border-b border-[var(--surface-container-high)] pb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-[var(--on-surface)] tracking-tight">
            {Math.round(weather.temperature)}°C
          </span>
          <span className="text-xs text-[var(--on-surface-variant)] font-medium">
            {weather.condition}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--on-surface-variant)] font-mono">
          <span>Feels {Math.round(weather.feels_like)}°C</span>
          <span>•</span>
          <span>Humidity {weather.humidity}%</span>
          <span>•</span>
          <span>Wind {weather.wind_speed} km/h</span>
        </div>
      </div>

      {/* 5-7 Day Forecast Strip */}
      <div className="grid grid-cols-5 gap-2 pt-1">
        {weather.daily_forecast.slice(0, 5).map((d, i) => {
          const dateObj = new Date(d.date);
          const dayName = i === 0 ? "Today" : dateObj.toLocaleDateString("en-US", { weekday: "short" });

          return (
            <div
              key={d.date}
              className="flex flex-col items-center p-1.5 rounded bg-[var(--surface-container-low)] text-center text-xs"
            >
              <span className="text-[11px] font-mono text-[var(--on-surface-variant)]">
                {dayName}
              </span>
              <span className="text-xs font-semibold text-[var(--on-surface)] mt-1">
                {Math.round(d.max_temp)}°
              </span>
              <span className="text-[10px] text-[var(--on-surface-variant)]">
                {Math.round(d.min_temp)}°
              </span>
              <span className="text-[10px] text-[var(--tertiary)] mt-0.5 truncate max-w-[50px]">
                {d.condition}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
