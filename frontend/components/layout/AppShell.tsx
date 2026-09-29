"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import NewTripModal from "@/components/trips/NewTripModal";
import { useAuth } from "@/context/AuthContext";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const isPublicPage =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/landing";

  const handleTripCreated = (trip: any) => {
    setIsNewTripOpen(false);
    if (trip && trip.id) {
      router.push(`/trips/${trip.id}`);
    }
  };

  // If public landing or auth page, render clean full-width canvas
  if (isPublicPage) {
    return (
      <div className="min-h-screen bg-surface text-on-surface">
        {children}
        <NewTripModal
          isOpen={isNewTripOpen}
          onClose={() => setIsNewTripOpen(false)}
          onTripCreated={handleTripCreated}
        />
      </div>
    );
  }

  // Dashboard & workspace pages: render sidebar & header
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <Sidebar
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenNewTrip={() => setIsNewTripOpen(true)}
      />

      <div className="pl-0 md:pl-[240px] transition-all">
        <Header onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />

        <main className="relative pt-14 bg-surface min-h-screen">
          <div className="flex flex-col w-full">
            <div className="p-3 sm:p-space-base lg:p-space-lg flex flex-col gap-space-base lg:gap-space-lg max-w-[1440px] mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>

      <NewTripModal
        isOpen={isNewTripOpen}
        onClose={() => setIsNewTripOpen(false)}
        onTripCreated={handleTripCreated}
      />
    </div>
  );
};
export default AppShell;
