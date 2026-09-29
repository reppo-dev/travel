"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import LandingHero from "@/components/landing/LandingHero";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If user is already authenticated with valid token/session, redirect directly to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Show Landing Hero for visitors & travelers
  return <LandingHero />;
}
