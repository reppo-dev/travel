import axios from "axios";

export interface GeoLocation {
  id: string | number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  display_name: string;
}

// Curated high-res editorial photo presets for popular destinations
export const CURATED_DESTINATION_PHOTOS: Record<string, string[]> = {
  tokyo: [
    "/images/tokyo-tower.png",
    "/images/tokyo-coffee.png",
    "/images/nezu-museum.png",
    "/images/tsukiji-market.png",
  ],
  kyoto: [
    "/images/kyoto-machiya.png",
    "/images/nezu-museum.png",
  ],
  swiss: [
    "/images/swiss-alps.png",
  ],
  general: [
    "/images/tokyo-tower.png",
    "/images/kyoto-machiya.png",
    "/images/swiss-alps.png",
    "/images/packing-flatlay.png",
  ],
};

/**
 * Searches worldwide locations with dual engine:
 * 1. Open-Meteo Geocoding
 * 2. OpenStreetMap Nominatim (full Persian/multilingual coverage)
 */
export async function searchLocationsRobust(
  query: string,
  signal?: AbortSignal
): Promise<GeoLocation[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    // Engine 1: Open-Meteo Geocoding
    const openMeteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      trimmed
    )}&count=8&language=en&format=json`;

    const res = await axios.get(openMeteoUrl, { signal });
    if (res.data && res.data.results && res.data.results.length > 0) {
      return res.data.results.map((r: any) => ({
        id: `om-${r.id}`,
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        country: r.country || "",
        admin1: r.admin1 || "",
        display_name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
      }));
    }
  } catch (err: any) {
    if (axios.isCancel(err) || err.name === "CanceledError") {
      throw err;
    }
    // continue to fallback
  }

  // Engine 2: OpenStreetMap Nominatim fallback (handles Persian & international scripts)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      trimmed
    )}&format=json&addressdetails=1&limit=8`;

    const res = await axios.get(nominatimUrl, {
      signal,
      headers: { "Accept-Language": "en,fa;q=0.8" },
    });

    if (res.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data.map((r: any) => {
        const addr = r.address || {};
        const cityName =
          addr.city || addr.town || addr.village || addr.municipality || r.name || trimmed;
        const countryName = addr.country || "";
        const stateName = addr.state || addr.province || addr.county || "";

        return {
          id: `nom-${r.place_id}`,
          name: cityName,
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
          country: countryName,
          admin1: stateName,
          display_name: [cityName, stateName, countryName].filter(Boolean).join(", "),
        };
      });
    }
  } catch (err: any) {
    if (axios.isCancel(err) || err.name === "CanceledError") {
      throw err;
    }
    console.warn("Geocoding search fallback error:", err);
  }

  return [];
}

/**
 * Reverse-geocodes latitude and longitude into city, state, country
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<{ city: string; country: string; state?: string; displayName: string }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const res = await axios.get(url, {
      signal,
      headers: { "Accept-Language": "en,fa;q=0.8" },
    });

    if (res.data && res.data.address) {
      const addr = res.data.address;
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.suburb ||
        addr.county ||
        "Selected Location";
      const country = addr.country || "";
      const state = addr.state || addr.province || "";
      const displayName = [city, state, country].filter(Boolean).join(", ");

      return { city, country, state, displayName };
    }
  } catch (err: any) {
    if (axios.isCancel(err) || err.name === "CanceledError") {
      throw err;
    }
    console.warn("Reverse geocode failed, using coordinates fallback:", err);
  }

  return {
    city: `Location (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
    country: "",
    displayName: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
  };
}

/**
 * Automatically fetch destination photo or return curated image
 */
export async function fetchDestinationPhoto(
  cityName: string,
  countryName?: string
): Promise<string> {
  const normalized = cityName.toLowerCase();

  if (normalized.includes("tokyo")) return "/images/tokyo-tower.png";
  if (normalized.includes("kyoto") || normalized.includes("osaka")) return "/images/kyoto-machiya.png";
  if (normalized.includes("alps") || normalized.includes("swiss") || normalized.includes("zermatt"))
    return "/images/swiss-alps.png";

  try {
    // Search Wikimedia Commons / Wikipedia for a high-quality free destination image
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      cityName
    )}&prop=pageimages&format=json&pithumbsize=1200&origin=*`;

    const res = await axios.get(wikiUrl, { timeout: 4000 });
    const pages = res.data?.query?.pages;
    if (pages) {
      const firstPageId = Object.keys(pages)[0];
      const thumbnail = pages[firstPageId]?.thumbnail?.source;
      if (thumbnail) {
        return thumbnail;
      }
    }
  } catch (e) {
    // fallback
  }

  // Fallback to Unsplash source for the destination
  return `https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80`;
}
