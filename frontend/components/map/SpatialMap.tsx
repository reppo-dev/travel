"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";

export interface MapMarker {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  category?: string;
  subtitle?: string;
  isVisited?: boolean;
}

interface SpatialMapProps {
  latitude: number;
  longitude: number;
  destination?: string;
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
}

export const SpatialMap: React.FC<SpatialMapProps> = ({
  latitude,
  longitude,
  destination,
  zoom = 13,
  markers = [],
  className = "w-full h-80 rounded-2xl",
  onMarkerClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [latitude || 35.6762, longitude || 139.6503],
      zoom: zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
        maxZoom: 19,
        subdomains: "abcd",
      }
    ).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when props change
  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      mapRef.current.setView([latitude, longitude], zoom, { animate: true });
    }
  }, [latitude, longitude, zoom]);

  // Update Markers
  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    const bounds = L.latLngBounds([]);
    let hasValidBounds = false;

    // Center base pin
    if (latitude && longitude) {
      const baseIcon = L.divIcon({
        className: "custom-base-pin",
        html: `
          <div style="position: relative; width: 28px; height: 28px;">
            <div style="
              position: absolute;
              top: 0; left: 0; width: 28px; height: 28px;
              background: #9d3d26;
              color: white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(157, 61, 38, 0.4);
              border: 2px solid white;
            ">
              <span style="transform: rotate(45deg); font-size: 13px;">📍</span>
            </div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      L.marker([latitude, longitude], { icon: baseIcon })
        .bindPopup(`<strong style="font-family: sans-serif; font-size: 12px;">Expedition Hub</strong>`)
        .addTo(markersLayerRef.current);

      bounds.extend([latitude, longitude]);
      hasValidBounds = true;
    }

    // Additional place pins
    markers.forEach((m) => {
      if (!m.latitude || !m.longitude) return;

      const pinColor = m.isVisited ? "#4c6156" : "#9d3d26";
      const iconEmoji = m.category?.toLowerCase().includes("cafe")
        ? "☕"
        : m.category?.toLowerCase().includes("din")
        ? "🍽️"
        : m.category?.toLowerCase().includes("cult") || m.category?.toLowerCase().includes("museum")
        ? "🏛️"
        : m.category?.toLowerCase().includes("park")
        ? "🌲"
        : "📍";

      const pinIcon = L.divIcon({
        className: "custom-place-pin",
        html: `
          <div style="position: relative; width: 26px; height: 26px; cursor: pointer;">
            <div style="
              position: absolute;
              top: 0; left: 0; width: 26px; height: 26px;
              background: ${pinColor};
              color: white;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 3px 8px rgba(0,0,0,0.3);
              border: 1.5px solid white;
            ">
              <span style="transform: rotate(45deg); font-size: 11px;">${iconEmoji}</span>
            </div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });

      const markerInstance = L.marker([m.latitude, m.longitude], { icon: pinIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <div style="font-weight: 600; font-size: 13px; color: #1c1b1a;">${m.title}</div>
            ${m.subtitle ? `<div style="font-size: 11px; color: #56423d; margin-top: 2px;">${m.subtitle}</div>` : ""}
            <div style="font-size: 10px; color: ${m.isVisited ? '#4c6156' : '#9d3d26'}; font-weight: 500; margin-top: 4px;">
              ${m.isVisited ? "✓ Visited" : "• Planned Spot"}
            </div>
          </div>
        `)
        .addTo(markersLayerRef.current!);

      if (onMarkerClick) {
        markerInstance.on("click", () => onMarkerClick(m));
      }

      bounds.extend([m.latitude, m.longitude]);
      hasValidBounds = true;
    });

    if (markers.length > 0 && hasValidBounds && mapRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [markers, latitude, longitude, onMarkerClick]);

  return <div ref={containerRef} className={className} />;
};

export default SpatialMap;
