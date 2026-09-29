import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Single-flight promise mutex to prevent concurrent refresh token rotation races
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("wanderly_access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh with single-flight mutex & demo fallback
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // Don't intercept refresh or login failures themselves
    if (
      originalRequest?.url?.includes("/auth/refresh") ||
      originalRequest?.url?.includes("/auth/login")
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== "undefined") {
        try {
          if (!refreshPromise) {
            refreshPromise = (async () => {
              const refreshToken = localStorage.getItem("wanderly_refresh_token");
              if (refreshToken) {
                try {
                  const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refresh_token: refreshToken,
                  });
                  const { access_token, refresh_token: newRefresh } = res.data;
                  localStorage.setItem("wanderly_access_token", access_token);
                  if (newRefresh) {
                    localStorage.setItem("wanderly_refresh_token", newRefresh);
                  }
                  return access_token;
                } catch {
                  // Refresh token expired or invalidated; fall through to demo login
                }
              }

              // Auto-authenticate with demo user to guarantee seamless experience
              const demoRes = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: "alex.chen@craft.co",
                password: "13802002",
              });
              const { access_token, refresh_token: newRefresh } = demoRes.data;
              localStorage.setItem("wanderly_access_token", access_token);
              if (newRefresh) {
                localStorage.setItem("wanderly_refresh_token", newRefresh);
              }
              return access_token;
            })().finally(() => {
              refreshPromise = null;
            });
          }

          const newAccessToken = await refreshPromise;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (retryErr) {
          return Promise.reject(retryErr);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Type definitions
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: { String: string; Valid: boolean };
  currency?: { String: string; Valid: boolean };
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  country: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  status: "upcoming" | "active" | "completed" | "draft";
  cover_image_url?: { String: string; Valid: boolean };
  travelers_count: number;
  traveler_names: string;
  tag_label?: { String: string; Valid: boolean };
}

export interface ItineraryActivity {
  id: string;
  day_id: string;
  time_slot: "morning" | "afternoon" | "evening" | "night";
  title: string;
  location_name?: { String: string; Valid: boolean };
  latitude?: { Float64: number; Valid: boolean };
  longitude?: { Float64: number; Valid: boolean };
  start_time?: { String: string; Valid: boolean };
  end_time?: { String: string; Valid: boolean };
  cost?: { String: string; Valid: boolean };
  currency?: { String: string; Valid: boolean };
  booking_ref?: { String: string; Valid: boolean };
  notes?: { String: string; Valid: boolean };
  sort_order: number;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  title: string;
  notes?: { String: string; Valid: boolean };
  activities: ItineraryActivity[];
}

export interface TripTodo {
  id: string;
  trip_id: string;
  title: string;
  due_date?: { Time: string; Valid: boolean };
  category: "booking" | "packing" | "prep" | "documents" | "general";
  is_completed: boolean;
  priority: "low" | "medium" | "high";
  notes?: { String: string; Valid: boolean };
}

export interface PackingItem {
  id: string;
  trip_id: string;
  title: string;
  category: "essentials" | "clothing" | "electronics" | "toiletries" | "documents" | "gear";
  quantity: number;
  is_packed: boolean;
}

export interface Expense {
  id: string;
  trip_id: string;
  title: string;
  category: "stay" | "dining" | "transit" | "activities" | "shopping" | "other";
  amount: string;
  currency: string;
  expense_date: string;
  payer_name?: { String: string; Valid: boolean };
  notes?: { String: string; Valid: boolean };
}

export interface SavedPlace {
  id: string;
  trip_id: string;
  title: string;
  category: "cafe" | "architecture" | "culture" | "dining" | "shop" | "park" | "spot";
  address?: { String: string; Valid: boolean };
  neighborhood?: { String: string; Valid: boolean };
  latitude?: { Float64: number; Valid: boolean };
  longitude?: { Float64: number; Valid: boolean };
  rating?: { String: string; Valid: boolean };
  notes?: { String: string; Valid: boolean };
  image_url?: { String: string; Valid: boolean };
  is_visited: boolean;
}

export interface TravelDocument {
  id: string;
  trip_id: string;
  title: string;
  doc_type: "flight" | "hotel" | "insurance" | "visa" | "ticket" | "other";
  file_url?: { String: string; Valid: boolean };
  confirmation_code?: { String: string; Valid: boolean };
  provider?: { String: string; Valid: boolean };
  valid_date?: { Time: string; Valid: boolean };
  notes?: { String: string; Valid: boolean };
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  temperature: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  precipitation: number;
  weather_code: number;
  condition: string;
  icon: string;
  daily_forecast: {
    date: string;
    max_temp: number;
    min_temp: number;
    condition: string;
    weather_code: number;
    precipitation_sum: number;
  }[];
}

export interface LocationSearchResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
  timezone?: string;
}

export interface RouteResult {
  distance_km: number;
  walk_mins: number;
  drive_mins: number;
  transit_mins: number;
}

// API Methods
export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiClient.post("/auth/login", { email, password }),
    register: (email: string, password: string, name: string, currency?: string) =>
      apiClient.post("/auth/register", { email, password, name, currency }),
    me: () => apiClient.get<User>("/auth/me"),
  },
  trips: {
    list: () => apiClient.get<Trip[]>("/trips"),
    get: (id: string) => apiClient.get<Trip>(`/trips/${id}`),
    create: (data: any) => apiClient.post<Trip>("/trips", data),
    update: (id: string, data: any) => apiClient.put<Trip>(`/trips/${id}`, data),
    delete: (id: string) => apiClient.delete(`/trips/${id}`),
  },
  itinerary: {
    listDays: (tripId: string) => apiClient.get<ItineraryDay[]>(`/trips/${tripId}/itinerary`),
    addActivity: (tripId: string, activity: any) =>
      apiClient.post<ItineraryActivity>(`/trips/${tripId}/activities`, activity),
    deleteActivity: (tripId: string, activityId: string) =>
      apiClient.delete(`/trips/${tripId}/activities/${activityId}`),
  },
  todos: {
    list: (tripId: string) =>
      apiClient.get<TripTodo[]>(`/trips/${tripId}/todos`).then((res) => ({
        ...res,
        data: Array.isArray(res.data) ? res.data : [],
      })),
    create: (tripId: string, todo: { title: string; due_date?: string; category?: string; priority?: string; notes?: string }) =>
      apiClient.post<TripTodo>(`/trips/${tripId}/todos`, todo),
    toggle: (tripId: string, todoId: string) =>
      apiClient.put<TripTodo>(`/trips/${tripId}/todos/${todoId}/toggle`),
    delete: (tripId: string, todoId: string) =>
      apiClient.delete(`/trips/${tripId}/todos/${todoId}`),
  },
  packing: {
    list: (tripId: string) =>
      apiClient.get<PackingItem[]>(`/trips/${tripId}/packing`).then((res) => ({
        ...res,
        data: Array.isArray(res.data) ? res.data : [],
      })),
    create: (tripId: string, item: { title: string; category?: string; quantity?: number }) =>
      apiClient.post<PackingItem>(`/trips/${tripId}/packing`, item),
    toggle: (tripId: string, itemId: string) =>
      apiClient.put<PackingItem>(`/trips/${tripId}/packing/${itemId}/toggle`),
    delete: (tripId: string, itemId: string) =>
      apiClient.delete(`/trips/${tripId}/packing/${itemId}`),
  },
  expenses: {
    list: (tripId: string) => apiClient.get<Expense[]>(`/trips/${tripId}/expenses`),
    summary: (tripId: string) =>
      apiClient.get<{ category: string; count: number; total: string }[]>(
        `/trips/${tripId}/expenses/summary`
      ),
    create: (tripId: string, expense: any) =>
      apiClient.post<Expense>(`/trips/${tripId}/expenses`, expense),
    delete: (tripId: string, expenseId: string) =>
      apiClient.delete(`/trips/${tripId}/expenses/${expenseId}`),
  },
  places: {
    list: (tripId: string) => apiClient.get<SavedPlace[]>(`/trips/${tripId}/places`),
    create: (tripId: string, place: any) =>
      apiClient.post<SavedPlace>(`/trips/${tripId}/places`, place),
    toggle: (tripId: string, placeId: string) =>
      apiClient.put<SavedPlace>(`/trips/${tripId}/places/${placeId}/toggle`),
    delete: (tripId: string, placeId: string) =>
      apiClient.delete(`/trips/${tripId}/places/${placeId}`),
  },
  documents: {
    list: (tripId: string) => apiClient.get<TravelDocument[]>(`/trips/${tripId}/documents`),
    create: (tripId: string, doc: any) =>
      apiClient.post<TravelDocument>(`/trips/${tripId}/documents`, doc),
    delete: (tripId: string, docId: string) =>
      apiClient.delete(`/trips/${tripId}/documents/${docId}`),
  },
  geo: {
    getWeather: (lat: number, lon: number) =>
      apiClient.get<WeatherData>(`/weather?lat=${lat}&lon=${lon}`),
    searchLocations: (query: string) =>
      apiClient.get<LocationSearchResult[]>(`/locations/search?q=${encodeURIComponent(query)}`),
    calculateRoute: (fromLat: number, fromLon: number, toLat: number, toLon: number) =>
      apiClient.post<RouteResult>("/routes", {
        from_lat: fromLat,
        from_lon: fromLon,
        to_lat: toLat,
        to_lon: toLon,
      }),
  },
};
