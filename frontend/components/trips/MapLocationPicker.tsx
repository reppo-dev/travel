"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

interface MapLocationPickerProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (lat: number, lon: number) => void;
  destinationName?: string;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  latitude,
  longitude,
  onLocationSelect,
  destinationName,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = latitude || 35.6762;
    const initialLon = longitude || 139.6503;
    const initialZoom = latitude && longitude ? 9 : 3;

    // Create custom pin icon
    const customPinIcon = L.divIcon({
      className: "custom-travel-pin",
      html: `
        <div style="position: relative; width: 32px; height: 32px;">
          <div style="
            position: absolute;
            top: 0; left: 0; width: 32px; height: 32px;
            background: #9d3d26;
            color: white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(157, 61, 38, 0.4);
            border: 2px solid white;
          ">
            <span style="transform: rotate(45deg); font-size: 14px;">📍</span>
          </div>
          <div style="
            position: absolute;
            bottom: -4px; left: 10px;
            width: 12px; height: 6px;
            background: rgba(0,0,0,0.2);
            border-radius: 50%;
            filter: blur(1px);
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLon],
      zoom: initialZoom,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Warm, editorial CartoDB Voyager tiles matching Wanderly's warm aesthetics
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
        maxZoom: 19,
        subdomains: "abcd",
      }
    ).addTo(map);

    // Initial marker if coordinates exist
    if (latitude && longitude) {
      markerRef.current = L.marker([latitude, longitude], {
        icon: customPinIcon,
      }).addTo(map);
    }

    // Map click listener
    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: customPinIcon }).addTo(map);
      }
      onLocationSelect(lat, lng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update center and marker when props change from external search
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (!latitude || !longitude) return;

    const map = mapInstanceRef.current;
    map.flyTo([latitude, longitude], 10, { duration: 1.2 });

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const customPinIcon = L.divIcon({
        className: "custom-travel-pin",
        html: `
          <div style="position: relative; width: 32px; height: 32px;">
            <div style="
              position: absolute;
              top: 0; left: 0; width: 32px; height: 32px;
              background: #9d3d26;
              color: white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(157, 61, 38, 0.4);
              border: 2px solid white;
            ">
              <span style="transform: rotate(45deg); font-size: 14px;">📍</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });
      markerRef.current = L.marker([latitude, longitude], {
        icon: customPinIcon,
      }).addTo(map);
    }
  }, [latitude, longitude]);

  return (
    <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-[#e8dfd8] shadow-inner bg-[#f7f3f0]">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating map banner helper */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#e8dfd8] shadow-xs flex items-center gap-2 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#9d3d26] animate-ping" />
        <span className="text-[11px] font-mono font-medium text-[#2a2421]">
          Click anywhere on map to pin destination
        </span>
      </div>

      {destinationName && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-[#2a2421]/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-mono flex items-center gap-1.5 shadow-md pointer-events-none">
          <span>📍</span>
          <span>{destinationName}</span>
          <span className="text-[#9e8c81]">
            ({latitude.toFixed(2)}°, {longitude.toFixed(2)}°)
          </span>
        </div>
      )}
    </div>
  );
};
export default MapLocationPicker;
