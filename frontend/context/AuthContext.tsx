"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api, User, apiClient } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const isExplicitLoggedOut = localStorage.getItem("wanderly_logged_out") === "true";
      const storedToken = localStorage.getItem("wanderly_access_token");
      const storedRefresh = localStorage.getItem("wanderly_refresh_token");

      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await api.auth.me();
          setUser(res.data);
          setIsLoading(false);
          return;
        } catch {
          // Token expired, attempt refresh
          if (storedRefresh) {
            try {
              const refreshRes = await apiClient.post("/auth/refresh", {
                refresh_token: storedRefresh,
              });
              const { access_token, refresh_token: newRefresh, user: refreshedUser } = refreshRes.data;
              localStorage.setItem("wanderly_access_token", access_token);
              if (newRefresh) {
                localStorage.setItem("wanderly_refresh_token", newRefresh);
              }
              setToken(access_token);
              if (refreshedUser) {
                setUser(refreshedUser);
              } else {
                const meRes = await api.auth.me();
                setUser(meRes.data);
              }
              setIsLoading(false);
              return;
            } catch {
              localStorage.removeItem("wanderly_access_token");
              localStorage.removeItem("wanderly_refresh_token");
            }
          }
        }
      }

      // If no token or token expired and user hasn't explicitly logged out,
      // auto-connect to demo account (Alex Chen) so workspace is immediately ready
      if (!isExplicitLoggedOut) {
        try {
          const demoRes = await api.auth.login("alex.chen@craft.co", "13802002");
          const { access_token, refresh_token, user: loggedUser } = demoRes.data;
          localStorage.setItem("wanderly_access_token", access_token);
          localStorage.setItem("wanderly_refresh_token", refresh_token);
          setToken(access_token);
          setUser(loggedUser);
          setIsLoading(false);
          return;
        } catch (demoErr) {
          console.warn("Could not auto-connect demo user:", demoErr);
        }
      }

      setUser(null);
      setToken(null);
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      localStorage.removeItem("wanderly_logged_out");
      const res = await api.auth.login(email, pass);
      const { access_token, refresh_token, user: loggedUser } = res.data;
      localStorage.setItem("wanderly_access_token", access_token);
      localStorage.setItem("wanderly_refresh_token", refresh_token);
      setToken(access_token);
      setUser(loggedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    try {
      localStorage.removeItem("wanderly_logged_out");
      const res = await api.auth.register(email, pass, name);
      const { access_token, refresh_token, user: loggedUser } = res.data;
      localStorage.setItem("wanderly_access_token", access_token);
      localStorage.setItem("wanderly_refresh_token", refresh_token);
      setToken(access_token);
      setUser(loggedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.setItem("wanderly_logged_out", "true");
    localStorage.removeItem("wanderly_access_token");
    localStorage.removeItem("wanderly_refresh_token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        loading: isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
