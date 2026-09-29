"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

interface HeaderProps {
  breadcrumb?: string;
  activeTripTitle?: string;
  activeTripId?: string;
  onOpenMobileSidebar?: () => void;
}

export default function Header({
  breadcrumb = "Expeditions",
  activeTripTitle,
  activeTripId,
  onOpenMobileSidebar,
}: HeaderProps) {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [currentTripTitle, setCurrentTripTitle] = useState(activeTripTitle || "");
  const [currentTripId, setCurrentTripId] = useState(activeTripId || "");

  React.useEffect(() => {
    if (activeTripTitle) {
      setCurrentTripTitle(activeTripTitle);
      if (activeTripId) setCurrentTripId(activeTripId);
      return;
    }
    api.trips.list().then((res) => {
      const list = res.data || [];
      if (list.length > 0) {
        setCurrentTripTitle(list[0].title);
        setCurrentTripId(list[0].id);
      } else {
        setCurrentTripTitle("");
        setCurrentTripId("");
      }
    }).catch(() => {});
  }, [activeTripTitle, activeTripId]);

  const [copied, setCopied] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: "n1",
      title: "Cloud Sync Active",
      desc: "All expedition telemetry and offline caches are synchronized.",
      time: "Just now",
      icon: "cloud_done",
      unread: false,
    },
  ]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header className="fixed top-0 left-0 md:left-[240px] right-0 h-14 bg-surface/80 backdrop-blur-xl border-b border-surface-variant z-40 flex items-center justify-between px-3 sm:px-space-lg transition-all">
      <div className="flex items-center gap-2 sm:gap-space-md min-w-0">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded text-on-surface hover:bg-surface-container cursor-pointer shrink-0"
          aria-label="Open sidebar navigation"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <div className="flex items-center gap-1.5 font-label-mono-sm text-label-mono-sm text-on-surface-variant truncate">
          <Link href="/trips" className="hover:text-primary transition-colors hidden sm:inline">
            Trips
          </Link>
          <span className="hidden sm:inline">/</span>
          <span className="text-on-surface font-medium truncate">{breadcrumb}</span>
        </div>
        {currentTripTitle && (
          <>
            <div className="h-3.5 w-px bg-surface-variant hidden sm:block shrink-0" />
            <Link
              href={`/trips/${currentTripId}`}
              className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container border border-surface-variant hover:border-primary transition-colors shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="font-label-ui text-label-ui font-medium text-on-surface max-w-[120px] md:max-w-none truncate">
                {currentTripTitle}
              </span>
            </Link>
          </>
        )}

        {/* Sync or Offline Status Badge */}
        {isOnline ? (
          <div className="hidden lg:flex items-center gap-1 text-on-surface-variant font-label-mono-sm text-label-mono-sm">
            <span className="material-symbols-outlined text-[14px] text-tertiary">cloud_done</span>
            <span>Synced</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 font-label-mono-sm text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="font-medium">Offline Cache</span>
          </div>
        )}
      </div>

      <div className="relative flex items-center gap-space-sm">
        {/* Share Button */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-surface border border-surface-variant font-label-ui text-label-ui text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">
            {copied ? "check" : "share"}
          </span>
          <span>{copied ? "Copied Link!" : "Share"}</span>
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer relative"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            {notifications.some((n) => n.unread) && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest border border-surface-variant rounded-2xl shadow-xl p-3 z-50 flex flex-col gap-2">
              <div className="flex items-center justify-between pb-2 border-b border-surface-variant">
                <span className="font-label-ui text-label-ui font-semibold text-on-surface">
                  Trip Notifications
                </span>
                <button
                  onClick={markAllRead}
                  className="font-label-mono-sm text-[10px] text-primary hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              </div>

              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-2 rounded-xl flex items-start gap-2.5 transition-colors ${
                      n.unread ? "bg-surface-container-low" : "opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center shrink-0 text-primary">
                      <span className="material-symbols-outlined text-[16px]">{n.icon}</span>
                    </div>
                    <div className="flex flex-col flex-1 leading-tight">
                      <div className="flex items-center justify-between">
                        <span className="font-label-ui text-label-ui font-medium text-on-surface">
                          {n.title}
                        </span>
                        <span className="font-label-mono-sm text-[9px] text-on-surface-variant">
                          {n.time}
                        </span>
                      </div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
                        {n.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar Link to Settings */}
        <Link
          href="/settings"
          title="Account Settings"
          className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface font-label-ui text-label-ui font-semibold border border-surface-variant ml-1 hover:border-primary transition-colors cursor-pointer"
        >
          {user?.name ? user.name.slice(0, 2).toUpperCase() : "AC"}
        </Link>
      </div>
    </header>
  );
}
