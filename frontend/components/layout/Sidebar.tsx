"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface SidebarProps {
  onOpenNewTrip?: () => void;
  activeTripsCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  onOpenNewTrip,
  activeTripsCount = 3,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [realTripsCount, setRealTripsCount] = useState<number | null>(null);
  const [realPackingPacked, setRealPackingPacked] = useState<number | null>(null);
  const [realPackingTotal, setRealPackingTotal] = useState<number | null>(null);

  useEffect(() => {
    api.trips.list().then((res) => {
      const tripsList = res.data || [];
      setRealTripsCount(tripsList.length);
      if (tripsList.length > 0) {
        api.packing.list(tripsList[0].id).then((pRes) => {
          const pItems = pRes.data || [];
          setRealPackingTotal(pItems.length);
          setRealPackingPacked(pItems.filter((i) => i.is_packed).length);
        }).catch(() => {
          setRealPackingTotal(0);
          setRealPackingPacked(0);
        });
      } else {
        setRealPackingTotal(0);
        setRealPackingPacked(0);
      }
    }).catch(() => setRealTripsCount(0));
  }, [pathname]);

  const navItems = [
    { label: "Overview", href: "/dashboard", icon: "dashboard" },
    {
      label: "My Trips",
      href: "/trips",
      icon: "flight_takeoff",
      badge: (realTripsCount !== null && realTripsCount > 0) ? `${realTripsCount} active` : undefined,
      badgeStyle: "bg-primary-container text-on-primary-container",
    },
    { label: "Itinerary", href: "/itinerary", icon: "view_timeline" },
    { label: "Calendar", href: "/calendar", icon: "calendar_month" },
    { label: "Places", href: "/places", icon: "pin_drop" },
    {
      label: "Smart Packing",
      href: "/packing",
      icon: "inventory_2",
      badge: (realPackingTotal !== null && realPackingTotal > 0) ? `${realPackingPacked}/${realPackingTotal}` : undefined,
      badgeStyle: "bg-surface-container-highest text-on-surface-variant",
    },
    { label: "Expenses", href: "/expenses", icon: "payments" },
    {
      label: "Documents",
      href: "/documents",
      icon: "description",
    },
    { label: "Settings", href: "/settings", icon: "tune" },
  ];

  // Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
      if (e.key === "Escape") {
        setShowSearchModal(false);
        setShowProfileMenu(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const searchResults = navItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSignOut = () => {
    logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-[240px] bg-surface-container-low border-r border-surface-variant z-50 flex flex-col justify-between select-none transition-transform duration-200 ease-in-out ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="p-space-base border-b border-surface-variant flex items-center justify-between">
            <Link
              href="/"
              onClick={() => onCloseMobile?.()}
              className="flex items-center gap-space-sm group"
            >
              <div className="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center font-headline-sm text-headline-sm font-semibold">
                <span className="material-symbols-outlined text-[18px]">explore</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface">
                  Wanderly
                </span>
                <span className="font-label-ui text-label-ui text-on-surface-variant flex items-center gap-1 cursor-pointer hover:text-on-surface">
                  Personal &amp; Trips{" "}
                  <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                </span>
              </div>
            </Link>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="md:hidden w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface cursor-pointer"
              aria-label="Close sidebar"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Quick Search Button */}
          <div className="p-space-base pb-space-xs">
            <button
              type="button"
              onClick={() => {
                setShowSearchModal(true);
                onCloseMobile?.();
              }}
              className="w-full flex items-center justify-between px-space-sm py-1.5 bg-surface-container-lowest border border-surface-variant rounded text-on-surface-variant hover:border-outline transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">search</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">Search...</span>
              </div>
              <span className="font-label-mono-sm text-label-mono-sm bg-surface-container px-1 py-0.5 rounded text-on-surface-variant">
                ⌘K
              </span>
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-0.5 px-space-sm pt-space-xs">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onCloseMobile?.()}
                  className={`flex items-center justify-between px-space-sm py-1.5 rounded transition-colors ${
                    isActive
                      ? "bg-surface-container-highest text-on-surface font-medium"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span className="font-body-md text-body-md">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`font-label-mono-sm text-label-mono-sm px-1.5 py-0.5 rounded-full ${item.badgeStyle}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions & User Profile */}
        <div className="p-space-sm border-t border-surface-variant flex flex-col gap-space-sm relative">
          <button
            onClick={onOpenNewTrip}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded font-label-ui text-label-ui font-medium transition-colors cursor-pointer shadow-xs active:scale-98"
          >
            <span className="material-symbols-outlined text-[16px]">add</span> New Trip
          </button>

          {/* User Profile Trigger */}
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-container transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-label-ui text-label-ui font-semibold">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "AC"}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-label-ui text-label-ui font-medium text-on-surface">
                  {user?.name || "Alex Chen"}
                </span>
                <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant truncate max-w-[110px]">
                  {user?.email || "alex.chen@craft.co"}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
              more_vert
            </span>
          </button>

          {/* User Profile Popover */}
          {showProfileMenu && (
            <div className="absolute bottom-14 left-2 right-2 bg-white rounded-xl border border-surface-variant shadow-xl p-1.5 flex flex-col gap-0.5 z-50">
              <Link
                href="/settings"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">tune</span>
                <span>Workspace Settings</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error-container/20 transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Quick Search Command Palette Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-surface-variant shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
            <div className="flex items-center px-4 py-3 border-b border-surface-variant gap-2">
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                search
              </span>
              <input
                autoFocus
                type="text"
                placeholder="Jump to page or trip (e.g. Tokyo, Packing, Calendar)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-sm outline-hidden text-on-surface bg-transparent"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-xs font-mono text-on-surface-variant hover:text-on-surface px-1.5 py-0.5 rounded bg-surface-container cursor-pointer"
              >
                ESC
              </button>
            </div>

            <div className="p-2 max-h-72 overflow-y-auto flex flex-col gap-1">
              {searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      setShowSearchModal(false);
                      router.push(item.href);
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-surface-container transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        {item.icon}
                      </span>
                      <span className="text-xs font-medium text-on-surface group-hover:text-primary transition-colors">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-on-surface-variant">
                      {item.href}
                    </span>
                  </button>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-on-surface-variant font-mono">
                  No matching destinations or tools found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
