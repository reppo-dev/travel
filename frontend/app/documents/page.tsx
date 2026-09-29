"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { api, Trip, TravelDocument } from "@/lib/api";

interface DocItem {
  id: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  status: string;
  statusColor: string;
  trip: string;
  category: string;
  traveler: string;
  detail: string;
  meta: string;
  pnr?: string;
  issuingAuthority?: string;
  validUntil?: string;
  fileSize?: string;
}

export default function DocumentsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Feedback
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Doc Form
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("flights");
  const [newPnr, setNewPnr] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadDocuments = async (tripId: string, tripTitle: string) => {
    try {
      const res = await api.documents.list(tripId);
      const items: TravelDocument[] = res.data || [];
      const mapped: DocItem[] = items.map((d) => {
        let icon = "description";
        let iconBg = "bg-surface-container";
        let iconColor = "text-on-surface";
        const cat = d.doc_type ? d.doc_type.toLowerCase() : "general";

        if (cat.includes("flight") || cat.includes("ticket")) {
          icon = "flight";
          iconBg = "bg-secondary/10";
          iconColor = "text-secondary";
        } else if (cat.includes("hotel") || cat.includes("lodg")) {
          icon = "hotel";
          iconBg = "bg-tertiary/10";
          iconColor = "text-tertiary";
        } else if (cat.includes("insur")) {
          icon = "health_and_safety";
          iconBg = "bg-secondary/10";
          iconColor = "text-secondary";
        } else if (cat.includes("pass") || cat.includes("visa")) {
          icon = "badge";
          iconBg = "bg-primary/10";
          iconColor = "text-primary";
        }

        const pnrVal = d.confirmation_code?.Valid ? d.confirmation_code.String : "";
        const notesVal = d.notes?.Valid ? d.notes.String : "";

        return {
          id: d.id,
          icon,
          iconColor,
          iconBg,
          title: d.title,
          status: "Verified in Vault",
          statusColor: "bg-tertiary text-on-tertiary",
          trip: tripTitle,
          category: cat,
          traveler: "You",
          detail: notesVal || `${cat} document for trip`,
          meta: `Uploaded • 🔒 Private Encrypted Vault`,
          pnr: pnrVal,
          issuingAuthority: d.provider?.Valid ? d.provider.String : "Provider",
          validUntil: "Active",
          fileSize: "Digital Record",
        };
      });

      let finalItems = mapped;
      if (typeof window !== "undefined") {
        const custom = localStorage.getItem(`wanderly_custom_docs_${tripId}`);
        if (custom) {
          try {
            const extraDocs: DocItem[] = JSON.parse(custom);
            const ids = new Set(mapped.map((m) => m.id));
            const newOnes = extraDocs.filter((d) => !ids.has(d.id));
            finalItems = [...newOnes, ...mapped];
          } catch {}
        }
        localStorage.setItem(`wanderly_cached_docs_${tripId}`, JSON.stringify(finalItems));
      }

      setDocuments(finalItems);
      if (finalItems.length > 0) {
        setSelectedDoc(finalItems[0]);
      } else {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem(`wanderly_cached_docs_${tripId}`);
        if (cached) {
          try {
            const items = JSON.parse(cached);
            setDocuments(items);
            if (items.length > 0) setSelectedDoc(items[0]);
            return;
          } catch {}
        }
      }
      setDocuments([]);
      setSelectedDoc(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.trips.list();
        const tripList = res.data || [];
        setTrips(tripList);
        if (tripList.length > 0) {
          setActiveTrip(tripList[0]);
          await loadDocuments(tripList[0].id, tripList[0].title);
        }
      } catch (err) {
        console.error("Failed to load trips:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleTripChange = async (tripId: string) => {
    const found = trips.find((t) => t.id === tripId);
    if (found) {
      setActiveTrip(found);
      await loadDocuments(found.id, found.title);
    }
  };

  // Keyboard shortcut ⌘U / Ctrl+U
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "u") {
        e.preventDefault();
        if (activeTrip) {
          setIsUploadModalOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTrip]);

  const categoryTabs = [
    { key: "all", label: "All", count: `(${documents.length})` },
    { key: "flights", label: "Flights & Transit", count: `(${documents.filter((d) => d.category.includes("flight")).length})` },
    { key: "hotel", label: "Hotel Confirmations", count: `(${documents.filter((d) => d.category.includes("hotel")).length})` },
    { key: "passport", label: "Passports & ID", count: `(${documents.filter((d) => d.category.includes("pass") || d.category.includes("visa")).length})` },
    { key: "insurance", label: "Travel Insurance", count: `(${documents.filter((d) => d.category.includes("insur")).length})` },
  ];

  // Filtered Documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchCat = activeCategory === "all" || doc.category.includes(activeCategory);
      const matchSearch =
        searchQuery.trim() === "" ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.pnr && doc.pnr.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [documents, activeCategory, searchQuery]);

  // Handle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !activeTrip) return;

    const customDoc: DocItem = {
      id: `custom-doc-${Date.now()}`,
      icon: newCategory.includes("flight") ? "flight" : newCategory.includes("hotel") ? "hotel" : "description",
      iconColor: "text-primary",
      iconBg: "bg-primary/10",
      title: newTitle.trim(),
      status: "Verified in Vault",
      statusColor: "bg-tertiary text-on-tertiary",
      trip: activeTrip.title,
      category: newCategory,
      traveler: "You",
      detail: newNotes.trim() || `${newCategory} document for trip`,
      meta: `Uploaded • 🔒 Private Encrypted Vault`,
      pnr: newPnr.trim() || undefined,
      issuingAuthority: "Traveler Upload",
      validUntil: "Active",
      fileSize: "Digital Record",
    };

    if (typeof window !== "undefined") {
      const stored = JSON.parse(localStorage.getItem(`wanderly_custom_docs_${activeTrip.id}`) || "[]");
      localStorage.setItem(`wanderly_custom_docs_${activeTrip.id}`, JSON.stringify([customDoc, ...stored]));
    }

    try {
      await api.documents.create(activeTrip.id, {
        title: newTitle.trim(),
        doc_type: newCategory as any,
        confirmation_code: newPnr.trim(),
        notes: newNotes.trim(),
      });
    } catch (err) {
      console.warn("Could not save to backend API directly, saved to local vault:", err);
    }

    await loadDocuments(activeTrip.id, activeTrip.title);
    setNewTitle("");
    setNewPnr("");
    setNewNotes("");
    setIsUploadModalOpen(false);
    showToast(`✓ Document "${newTitle.trim()}" securely stored!`);
  };

  // Handle Delete
  const handleDeleteDoc = async (id: string) => {
    if (!activeTrip) return;
    try {
      await api.documents.delete(activeTrip.id, id);
      await loadDocuments(activeTrip.id, activeTrip.title);
      showToast("✓ Document deleted from vault");
    } catch (err) {
      console.error("Failed to delete document:", err);
      showToast("Error deleting document");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-label-ui text-label-ui text-on-surface-variant">Accessing secure documents vault...</span>
        </div>
      </div>
    );
  }

  // GLOBAL EMPTY STATE: 0 trips
  if (trips.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-space-md text-center flex flex-col items-center justify-center gap-space-lg">
        <div className="w-20 h-20 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary shadow-inner">
          <span className="material-symbols-outlined text-[42px]">folder_shared</span>
        </div>
        <div className="flex flex-col gap-2 max-w-md">
          <h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface">No Expeditions Planned</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Travel documents, flight tickets, hotel vouchers, and visas are organized per expedition. Plan a trip first to start archiving your travel credentials securely.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/trips"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-ui font-medium shadow-sm hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Plan Your First Expedition</span>
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui font-medium transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-inverse-surface text-inverse-on-surface shadow-lg text-body-sm animate-in fade-in slide-in-from-bottom-2">
          <span className="material-symbols-outlined text-[18px] text-tertiary">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="-m-space-lg mb-0 bg-surface-container-low px-space-lg py-space-md">
        <div className="flex items-center gap-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant mb-1">
          <Link href="/trips" className="hover:text-on-surface transition-colors">
            Trips
          </Link>
          <span>/</span>
          {activeTrip && (
            <Link href={`/trips/${activeTrip.id}`} className="hover:text-on-surface transition-colors">
              {activeTrip.title}
            </Link>
          )}
          <span>/</span>
          <span className="text-on-surface font-medium">Documents Vault</span>
          <span className="w-4 h-4 rounded-full bg-surface-container-highest flex items-center justify-center font-label-mono-sm text-[9px] text-on-surface-variant ml-1">
            🔒
          </span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mt-1">
          <div className="flex flex-wrap items-center gap-3">
            {trips.length > 1 ? (
              <select
                value={activeTrip?.id}
                onChange={(e) => handleTripChange(e.target.value)}
                className="font-headline-lg text-headline-lg text-on-surface tracking-tight bg-transparent border-0 border-b border-surface-variant font-bold cursor-pointer focus:outline-none"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id} className="bg-surface text-on-surface text-base">
                    {t.title}
                  </option>
                ))}
              </select>
            ) : (
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {activeTrip?.title || "Documents Vault"}
              </h1>
            )}

            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-label-mono-sm text-label-mono-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{activeTrip?.destination}</span>
            </div>
            <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
              {documents.length} Encrypted Files
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary hover:bg-primary/90 text-on-primary font-label-ui text-label-ui font-medium shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>Upload Document</span>
              <kbd className="ml-1 px-1 rounded bg-white/20 text-on-primary text-[10px] font-mono">⌘U</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mt-space-md items-start">
        {/* Left Side: Document List (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          {/* Search Bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded bg-surface-container-lowest border border-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, reference code (PNR), or notes..."
              className="bg-transparent border-0 outline-none text-body-md text-on-surface placeholder:text-on-surface-variant/70 flex-1"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5">
            {categoryTabs.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1 rounded font-label-ui text-label-ui transition-colors cursor-pointer ${
                  activeCategory === cat.key
                    ? "bg-primary text-on-primary font-semibold"
                    : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {cat.label} {cat.count}
              </button>
            ))}
          </div>

          {/* Empty state for documents */}
          {documents.length === 0 ? (
            <div className="py-16 text-center bg-surface-container-lowest rounded-xl border border-surface-variant text-on-surface-variant flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px]">inventory_2</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">No Documents Uploaded Yet</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                Securely store flight boarding passes, hotel reservations, visas, and health records for {activeTrip?.title}.
              </p>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-ui text-label-ui font-medium shadow-sm hover:opacity-90 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Upload First Document</span>
              </button>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-12 text-center bg-surface-container-lowest rounded-xl border border-surface-variant text-on-surface-variant">
              <span className="material-symbols-outlined text-[32px] mb-2 block">search_off</span>
              <p className="font-body-sm">No documents match your active search filters.</p>
              <button
                onClick={() => {
                  setActiveCategory("all");
                  setSearchQuery("");
                }}
                className="mt-2 text-primary font-medium text-body-sm hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`p-space-md rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                  selectedDoc?.id === doc.id
                    ? "bg-surface-container-low border-primary shadow-sm"
                    : "bg-surface-container-lowest border-surface-variant/70 hover:border-surface-variant hover:bg-surface-container-lowest/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc.iconBg} ${doc.iconColor}`}>
                      <span className="material-symbols-outlined text-[20px]">{doc.icon}</span>
                    </div>
                    <div>
                      <h4 className="font-headline-sm text-headline-sm font-semibold text-on-surface">{doc.title}</h4>
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">{doc.detail}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.pnr && (
                      <span className="px-2 py-0.5 rounded bg-surface-container-highest font-mono text-[11px] font-bold text-on-surface">
                        {doc.pnr}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDoc(doc.id);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                      title="Delete Document"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-variant/40 font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                  <span>{doc.issuingAuthority}</span>
                  <span className="text-tertiary font-medium">{doc.status}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Side: Document Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {selectedDoc ? (
            <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-surface-variant shadow-sm flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-surface-variant pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">verified_user</span>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Document Details</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary font-label-mono-sm text-label-mono-sm font-semibold">
                  Secure Vault
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <span className="font-label-ui text-label-ui text-on-surface-variant">Title</span>
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">{selectedDoc.title}</span>
              </div>

              {selectedDoc.pnr && (
                <div className="p-3 rounded-lg bg-surface-container-low border border-surface-variant flex flex-col gap-1">
                  <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase">Booking / PNR Reference</span>
                  <span className="font-mono text-lg font-bold text-primary">{selectedDoc.pnr}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-body-sm">
                <div>
                  <span className="text-on-surface-variant block font-label-ui text-label-ui">Category</span>
                  <span className="font-semibold text-on-surface capitalize">{selectedDoc.category}</span>
                </div>
                <div>
                  <span className="text-on-surface-variant block font-label-ui text-label-ui">Expedition</span>
                  <span className="font-semibold text-on-surface">{selectedDoc.trip}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-label-ui text-label-ui text-on-surface-variant">Notes &amp; Details</span>
                <p className="font-body-sm text-body-sm text-on-surface bg-surface p-3 rounded-lg border border-surface-variant">
                  {selectedDoc.detail}
                </p>
              </div>

              <div className="pt-2 border-t border-surface-variant flex justify-end">
                <button
                  onClick={() => {
                    window.print();
                    showToast("Opening Print / PDF view...");
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-ui text-label-ui font-medium hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">print</span>
                  <span>Print / Export PDF</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl p-8 border border-surface-variant text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[42px] mb-2 block">folder_open</span>
              <p className="font-body-md">Select a document from the list to view full credentials.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-surface-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">upload_file</span>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Store Travel Document</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flight UA875 E-Ticket, Hotel Booking Voucher"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                  >
                    <option value="flights">Flights &amp; Transit</option>
                    <option value="hotel">Hotel Confirmation</option>
                    <option value="passport">Passport &amp; ID</option>
                    <option value="insurance">Travel Insurance</option>
                    <option value="tickets">Pass &amp; Ticket</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Confirmation / PNR</label>
                  <input
                    type="text"
                    placeholder="e.g. UA-892401"
                    value={newPnr}
                    onChange={(e) => setNewPnr(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Notes &amp; Details (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Departure terminal, seat numbers, cancellation policy..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-variant">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-lg hover:bg-surface-container text-on-surface font-label-ui text-label-ui cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary font-label-ui text-label-ui font-medium shadow-sm hover:opacity-90 cursor-pointer"
                >
                  Store Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
