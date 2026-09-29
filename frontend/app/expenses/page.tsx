"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { api, Trip, Expense } from "@/lib/api";

interface DisplayExpense {
  id: string;
  date: string;
  time: string;
  merchant: string;
  detail: string;
  category: string;
  categoryColor: string;
  payment: string;
  split: string;
  amount: number;
  currency: string;
  usd: string;
  usdDetail: string;
}

export default function ExpensesPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"date" | "amount">("date");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isSettledWithMaya, setIsSettledWithMaya] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // OCR state
  const [ocrScanningName, setOcrScanningName] = useState<string | null>(null);
  const [ocrExtractedItem, setOcrExtractedItem] = useState<{
    merchant: string;
    amount: string;
    category: string;
    notes: string;
  } | null>(null);

  // New Expense Form State
  const [newMerchant, setNewMerchant] = useState("");
  const [newDetail, setNewDetail] = useState("");
  const [newCategory, setNewCategory] = useState("Dining");
  const [newAmount, setNewAmount] = useState("");
  const [newCurrency, setNewCurrency] = useState("USD");
  const [newPayment, setNewPayment] = useState("Credit Card");
  const [newSplit, setNewSplit] = useState("Personal");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSettledWithMaya(localStorage.getItem("wanderly_settled_with_maya") === "true");
    }
  }, []);

  const loadExpenses = async (tripId: string) => {
    try {
      const res = await api.expenses.list(tripId);
      let list = res.data || [];
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(`wanderly_extra_expenses_${tripId}`);
        if (stored) {
          try {
            const extra = JSON.parse(stored);
            const ids = new Set(list.map((e) => e.id));
            const newEntries = extra.filter((e: Expense) => !ids.has(e.id));
            list = [...newEntries, ...list];
          } catch {}
        }
      }
      setExpenses(list);
    } catch (err) {
      console.error("Failed to load expenses:", err);
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(`wanderly_extra_expenses_${tripId}`);
        if (stored) {
          try {
            setExpenses(JSON.parse(stored));
            return;
          } catch {}
        }
      }
      setExpenses([]);
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
          await loadExpenses(tripList[0].id);
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
      setCurrentPage(1);
      await loadExpenses(found.id);
    }
  };

  // Keyboard shortcut 'E'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === "e" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)
      ) {
        e.preventDefault();
        if (activeTrip) {
          setIsAddModalOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTrip]);

  // Transform backend expenses into DisplayExpenses
  const displayExpenses: DisplayExpense[] = useMemo(() => {
    return expenses.map((exp) => {
      const amountNum = parseFloat(exp.amount) || 0;
      const cat = exp.category ? exp.category.charAt(0).toUpperCase() + exp.category.slice(1) : "General";
      let catColor = "bg-primary";
      if (cat.toLowerCase().includes("din") || cat.toLowerCase().includes("food")) catColor = "bg-tertiary";
      else if (cat.toLowerCase().includes("act") || cat.toLowerCase().includes("tour")) catColor = "bg-secondary";
      else if (cat.toLowerCase().includes("trans") || cat.toLowerCase().includes("rail")) catColor = "bg-on-surface-variant";
      else if (cat.toLowerCase().includes("shop")) catColor = "bg-outline";

      const d = exp.expense_date ? new Date(exp.expense_date) : new Date();
      const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

      return {
        id: exp.id,
        date: dateStr,
        time: timeStr,
        merchant: exp.title || "Expense",
        detail: exp.notes?.Valid ? exp.notes.String : `${cat} item`,
        category: cat,
        categoryColor: catColor,
        payment: "Standard",
        split: "Personal",
        amount: amountNum,
        currency: exp.currency || "USD",
        usd: `$${amountNum.toFixed(2)}`,
        usdDetail: `$${amountNum.toFixed(2)} total`,
      };
    });
  }, [expenses]);

  // Derived financial metrics
  const totalDisbursed = useMemo(() => {
    return displayExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  }, [displayExpenses]);

  // Budget cap (from trip budget if available or 0)
  const budgetCap = 0; // standard fallback
  const remainingBuffer = budgetCap > 0 ? Math.max(0, budgetCap - totalDisbursed) : 0;

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return displayExpenses
      .filter((tx) => {
        const matchesCategory =
          activeCategory === "All" ||
          tx.category.toLowerCase() === activeCategory.toLowerCase();
        const matchesSearch =
          searchQuery.trim() === "" ||
          tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.category.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortOrder === "amount") {
          return b.amount - a.amount;
        }
        return 0; // retain chronological
      });
  }, [displayExpenses, activeCategory, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const pagedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Dynamic Category Breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of displayExpenses) {
      map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
    }
    const list: { name: string; amount: number; color: string }[] = [];
    const colors = ["bg-primary", "bg-tertiary", "bg-secondary", "bg-on-surface-variant", "bg-outline"];
    let i = 0;
    map.forEach((amt, name) => {
      list.push({ name, amount: amt, color: colors[i % colors.length] });
      i++;
    });
    return list;
  }, [displayExpenses]);

  // Handle Log Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchant.trim() || !newAmount.trim() || !activeTrip) return;

    const amt = parseFloat(newAmount) || 0;

    try {
      await api.expenses.create(activeTrip.id, {
        title: newMerchant.trim(),
        amount: amt.toFixed(2),
        currency: newCurrency,
        category: newCategory.toLowerCase(),
        expense_date: new Date().toISOString(),
        notes: newDetail.trim(),
      });

      await loadExpenses(activeTrip.id);
      setNewMerchant("");
      setNewDetail("");
      setNewAmount("");
      setIsAddModalOpen(false);
      showToast(`✓ Logged $${amt.toFixed(2)} for "${newMerchant}"`);
    } catch (err) {
      console.error("Failed to save expense:", err);
      showToast("Error saving expense to server");
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!activeTrip) return;
    try {
      await api.expenses.delete(activeTrip.id, expenseId);
      await loadExpenses(activeTrip.id);
      showToast("✓ Expense removed");
    } catch (err) {
      console.error("Failed to delete expense:", err);
      showToast("Error deleting expense");
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    if (displayExpenses.length === 0) {
      showToast("No expenses to export.");
      return;
    }
    const headers = ["Date", "Time", "Merchant", "Detail", "Category", "Payment", "Amount", "Currency"];
    const rows = displayExpenses.map((t) => [
      `"${t.date}"`,
      `"${t.time}"`,
      `"${t.merchant}"`,
      `"${t.detail}"`,
      `"${t.category}"`,
      `"${t.payment}"`,
      `"${t.amount}"`,
      `"${t.currency}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTrip?.title || "trip"}_expenses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("✓ Exported expenses to CSV");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-label-ui text-label-ui text-on-surface-variant">Loading financial records...</span>
        </div>
      </div>
    );
  }

  // GLOBAL EMPTY STATE: User has 0 trips
  if (trips.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-space-md text-center flex flex-col items-center justify-center gap-space-lg">
        <div className="w-20 h-20 rounded-2xl bg-surface-container-highest flex items-center justify-center text-primary shadow-inner">
          <span className="material-symbols-outlined text-[42px]">account_balance_wallet</span>
        </div>
        <div className="flex flex-col gap-2 max-w-md">
          <h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface">No Expeditions Planned</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Expenses and financial analytics are tied to your specific trips. Plan your first expedition to start logging transactions, tracking currency conversion, and managing budgets.
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

      {/* Header Strip */}
      <div className="-m-space-lg mb-0 bg-surface-container-low px-space-lg py-space-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          {/* Left Metadata */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant">
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
              <span className="text-on-surface font-medium">Expenses &amp; Treasury</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-0.5">
              {/* Trip selector */}
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
                  {activeTrip?.title || "Expenses & Treasury"}
                </h1>
              )}

              {activeTrip && (
                <>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-highest text-on-surface font-label-mono-sm text-label-mono-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{activeTrip.destination}</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {activeTrip.start_date ? new Date(activeTrip.start_date).toLocaleDateString() : ""} – {activeTrip.end_date ? new Date(activeTrip.end_date).toLocaleDateString() : ""}
                  </span>
                  <span className="text-surface-variant">•</span>
                  <div className="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
                    <span className="material-symbols-outlined text-[15px] text-tertiary">group</span>
                    <span>{activeTrip.travelers_count || 1} Travelers</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setIsSettleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-highest hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-all cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[16px] ${isSettledWithMaya ? "text-tertiary" : "text-primary"}`}>
                handshake
              </span>
              <span>{isSettledWithMaya ? "Maya: Settled ($0.00)" : "Settle with Maya ($412.50)"}</span>
            </button>
            <button
              onClick={() => setIsOcrModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-highest hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">document_scanner</span>
              <span>Receipt OCR</span>
            </button>
            <div className="relative inline-flex">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-highest hover:bg-surface-container text-on-surface font-label-ui text-label-ui transition-all cursor-pointer"
                title="Download CSV spreadsheet of all transactions"
              >
                <span className="material-symbols-outlined text-[16px]">ios_share</span>
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => {
                  window.print();
                  showToast("Opening Print dialog...");
                }}
                className="ml-1 flex items-center justify-center px-2 py-1.5 rounded bg-surface-container-highest hover:bg-surface-container text-on-surface text-label-ui cursor-pointer"
                title="Print or Save as PDF"
              >
                <span className="material-symbols-outlined text-[16px]">print</span>
              </button>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary hover:bg-primary/90 text-on-primary font-label-ui text-label-ui shadow-sm transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Log Expense</span>
              <kbd className="ml-1 px-1 rounded bg-white/20 text-on-primary text-[10px] font-mono">E</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Executive Financial Metrics Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {/* Total Disbursed */}
        <div className="bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-ui text-label-ui text-on-surface-variant uppercase tracking-wider">Total Disbursed</span>
            <span className="p-1 rounded bg-surface-container text-primary material-symbols-outlined text-[18px]">account_balance_wallet</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-on-surface">${totalDisbursed.toFixed(2)}</span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">USD</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-on-surface-variant font-label-mono-sm text-label-mono-sm">
              <span>{displayExpenses.length} Total Recorded Entries</span>
              <span className="text-primary font-semibold">{displayExpenses.length > 0 ? "Active" : "Zero Burn"}</span>
            </div>
          </div>
        </div>

        {/* Categories Logged */}
        <div className="bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-ui text-label-ui text-on-surface-variant uppercase tracking-wider">Active Categories</span>
            <span className="p-1 rounded bg-surface-container text-tertiary material-symbols-outlined text-[18px]">pie_chart</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-tertiary">{categoryStats.length}</span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">Tracked Verticals</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-on-surface-variant font-label-mono-sm text-label-mono-sm">
              <span>Trip Status: {activeTrip?.status || "active"}</span>
              <span className="text-tertiary font-medium">On Track</span>
            </div>
          </div>
        </div>

        {/* Average per Transaction */}
        <div className="bg-surface-container-lowest p-space-base rounded-xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-ui text-label-ui text-on-surface-variant uppercase tracking-wider">Average Ticket</span>
            <span className="p-1 rounded bg-surface-container text-secondary material-symbols-outlined text-[18px]">receipt_long</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-headline-lg text-on-surface">
                ${displayExpenses.length > 0 ? (totalDisbursed / displayExpenses.length).toFixed(2) : "0.00"}
              </span>
              <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">/ entry</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-on-surface-variant font-label-mono-sm text-label-mono-sm">
              <span>{activeTrip?.destination || "Expedition"}</span>
              <span className="text-secondary font-medium">Live sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Distribution */}
      {displayExpenses.length > 0 && categoryStats.length > 0 && (
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Category Breakdown</h3>
            <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">
              {displayExpenses.length} Total Entries · Click to Filter
            </span>
          </div>
          {/* Stacked bar */}
          <div className="w-full h-3 rounded-full overflow-hidden flex mb-4 bg-surface-container">
            {categoryStats.map((cat) => {
              const pct = totalDisbursed > 0 ? (cat.amount / totalDisbursed) * 100 : 0;
              return (
                <div
                  key={cat.name}
                  className={`${cat.color} h-full`}
                  style={{ width: `${pct}%` }}
                  title={`${cat.name}: $${cat.amount.toFixed(2)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          {/* Category Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categoryStats.map((cat) => {
              const pct = totalDisbursed > 0 ? ((cat.amount / totalDisbursed) * 100).toFixed(1) : "0";
              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    setActiveCategory(cat.name === activeCategory ? "All" : cat.name);
                  }}
                  className={`text-left flex items-start gap-3 p-3 rounded-lg border border-surface-variant/60 hover:bg-surface-container-low transition-colors cursor-pointer ${
                    activeCategory === cat.name ? "bg-surface-container-low ring-1 ring-primary" : ""
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${cat.color} mt-1.5 shrink-0`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-headline-sm text-headline-sm font-medium text-on-surface">{cat.name}</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant font-semibold">
                        ${cat.amount.toFixed(2)}
                      </span>
                    </div>
                    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">{pct}% of total</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        {/* Table Filter Tabs */}
        <div className="px-space-md py-3 border-b border-surface-variant flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center flex-wrap gap-1">
            {["All", ...categoryStats.map((c) => c.name)].map((tab) => {
              const count =
                tab === "All"
                  ? displayExpenses.length
                  : displayExpenses.filter((t) => t.category.toLowerCase() === tab.toLowerCase()).length;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveCategory(tab);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded font-label-ui text-label-ui transition-colors cursor-pointer ${
                    activeCategory === tab
                      ? "bg-surface-container-highest text-on-surface font-semibold"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-surface-container border border-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter merchants or tags..."
                className="bg-transparent border-0 outline-none text-body-sm text-on-surface placeholder:text-on-surface-variant w-44"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setSortOrder((prev) => (prev === "date" ? "amount" : "date"));
              }}
              className="px-2.5 py-1 flex items-center gap-1 rounded bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors font-label-mono-sm text-label-mono-sm cursor-pointer"
              title="Toggle Sort by Amount vs Date"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>{sortOrder === "date" ? "Date" : "Amount"}</span>
            </button>
          </div>
        </div>

        {/* Empty state for expenses in active trip */}
        {displayExpenses.length === 0 ? (
          <div className="py-16 px-space-md text-center flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-[36px]">receipt_long</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">No Expenses Logged Yet</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              Keep track of meals, lodging, train tickets, and activities for {activeTrip?.title || "this expedition"}.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-ui text-label-ui font-medium shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Log First Expense</span>
            </button>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px] mb-2 block">search_off</span>
            <p className="font-body-sm">No expenses match your active filter.</p>
            <button
              onClick={() => {
                setActiveCategory("All");
                setSearchQuery("");
              }}
              className="mt-2 text-primary font-medium text-body-sm hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {/* Table Header & Rows wrapped for mobile responsiveness */}
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-3 px-space-md py-2.5 bg-surface-container-low border-b border-surface-variant">
                  <div className="col-span-3 font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase tracking-wider">Date &amp; Time</div>
                  <div className="col-span-4 font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase tracking-wider">Merchant &amp; Activity</div>
                  <div className="col-span-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase tracking-wider">Category</div>
                  <div className="col-span-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase tracking-wider text-right">Amount</div>
                  <div className="col-span-1 font-label-mono-sm text-label-mono-sm text-on-surface-variant uppercase tracking-wider text-center">Actions</div>
                </div>

                {/* Table Rows */}
                {pagedTransactions.map((tx) => (
                  <div key={tx.id} className="grid grid-cols-12 gap-3 px-space-md py-3 border-b border-surface-variant/50 hover:bg-surface-container-low/50 transition-colors items-center">
                    <div className="col-span-3">
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface font-medium block">{tx.date}</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">{tx.time}</span>
                    </div>
                    <div className="col-span-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-primary">receipt</span>
                        <div>
                          <span className="font-label-ui text-label-ui font-semibold text-on-surface block">{tx.merchant}</span>
                          <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">{tx.detail}</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-mono-sm text-label-mono-sm text-on-primary ${tx.categoryColor}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                        {tx.category}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface font-medium block">{tx.usd}</span>
                      <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">{tx.currency}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <button
                        onClick={() => handleDeleteExpense(tx.id)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors cursor-pointer"
                        title="Delete Expense Entry"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Footer */}
            <div className="px-space-md py-3 flex items-center justify-between border-t border-surface-variant/40">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 font-label-mono-sm text-label-mono-sm text-primary hover:underline cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">add_circle_outline</span>
                <span>+ Add expense</span>
                <span className="ml-2 text-on-surface-variant">Shortcut: &apos;E&apos;</span>
              </button>
              <div className="flex items-center gap-2 font-label-mono-sm text-label-mono-sm text-on-surface-variant">
                <span>
                  Showing {pagedTransactions.length} of {filteredTransactions.length} transactions
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  </button>
                  <span>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-container disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-surface-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_circle</span>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Log New Expense</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="flex flex-col gap-4">
              <div>
                <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Merchant or Item</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Shinjuku Ramen, Airport Taxi, Museum Pass"
                  value={newMerchant}
                  onChange={(e) => setNewMerchant(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Currency</label>
                  <select
                    value={newCurrency}
                    onChange={(e) => setNewCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                  >
                    <option value="Dining">Dining</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Transport">Transport</option>
                    <option value="Activities">Activities</option>
                    <option value="Shopping">Shopping</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Payment Method</label>
                  <input
                    type="text"
                    value={newPayment}
                    onChange={(e) => setNewPayment(e.target.value)}
                    placeholder="e.g. Card, Cash"
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-ui text-label-ui text-on-surface-variant mb-1">Notes / Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional receipt details or location..."
                  value={newDetail}
                  onChange={(e) => setNewDetail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface border border-surface-variant text-on-surface text-body-md focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-variant">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg hover:bg-surface-container text-on-surface font-label-ui text-label-ui cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary font-label-ui text-label-ui font-medium shadow-sm hover:opacity-90 cursor-pointer"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Receipt OCR Modal */}
      {isOcrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-surface-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">document_scanner</span>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Receipt OCR Scanner</h3>
              </div>
              <button
                onClick={() => {
                  setIsOcrModalOpen(false);
                  setOcrScanningName(null);
                  setOcrExtractedItem(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">
              Select a sample travel receipt to simulate computer-vision receipt extraction, or drag your own receipt:
            </p>

            {/* Quick Sample Receipts */}
            <div className="space-y-2 mb-4">
              {[
                {
                  id: "afuri",
                  merchant: "Afuri Ramen Ebisu",
                  amount: "9.85",
                  jp: "¥1,480",
                  category: "dining",
                  notes: "Signature Yuzu Shio Ramen ticket via vending machine",
                  icon: "ramen_dining",
                },
                {
                  id: "metro",
                  merchant: "Tokyo Metro 72-Hour Pass",
                  amount: "10.00",
                  jp: "¥1,500",
                  category: "transit",
                  notes: "Unlimited subway rides on 13 Tokyo Metro & Toei lines",
                  icon: "subway",
                },
                {
                  id: "mori",
                  merchant: "Mori Art Museum & Sky Deck",
                  amount: "14.65",
                  jp: "¥2,200",
                  category: "activities",
                  notes: "Contemporary architectural exhibition ticket & observation deck",
                  icon: "museum",
                },
              ].map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => {
                    setOcrScanningName(sample.merchant);
                    setOcrExtractedItem(null);
                    setTimeout(() => {
                      setOcrScanningName(null);
                      setOcrExtractedItem({
                        merchant: sample.merchant,
                        amount: sample.amount,
                        category: sample.category,
                        notes: sample.notes,
                      });
                    }, 800);
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border border-surface-variant/70 hover:border-primary/50 hover:bg-surface-container-low transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[18px]">{sample.icon}</span>
                    </div>
                    <div>
                      <div className="font-headline-sm text-headline-sm font-medium text-on-surface">
                        {sample.merchant}
                      </div>
                      <div className="font-body-sm text-[11px] text-on-surface-variant">
                        {sample.notes}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-label-mono-sm text-label-mono-sm font-bold text-on-surface">
                      ${sample.amount}
                    </div>
                    <div className="font-label-mono-sm text-[10px] text-on-surface-variant">
                      {sample.jp}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Scanning indicator */}
            {ocrScanningName && (
              <div className="p-3 mb-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3 animate-pulse">
                <span className="material-symbols-outlined text-primary animate-spin">sync</span>
                <span className="font-label-ui text-label-ui text-primary font-medium">
                  Scanning {ocrScanningName} with Vision OCR...
                </span>
              </div>
            )}

            {/* Extracted preview box */}
            {ocrExtractedItem && (
              <div className="p-3.5 mb-4 rounded-xl bg-surface-container border border-surface-variant space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-mono text-tertiary">
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    OCR Scan Complete
                  </span>
                  <span>100% Match Confidence</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-on-surface-variant block">Merchant:</span>
                    <span className="font-medium text-on-surface">{ocrExtractedItem.merchant}</span>
                  </div>
                  <div>
                    <span className="text-on-surface-variant block">Extracted Amount:</span>
                    <span className="font-mono font-bold text-primary">${ocrExtractedItem.amount} USD</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-variant">
              <button
                type="button"
                onClick={() => {
                  setIsOcrModalOpen(false);
                  setOcrScanningName(null);
                  setOcrExtractedItem(null);
                }}
                className="px-4 py-2 rounded-lg hover:bg-surface-container text-on-surface font-label-ui text-label-ui cursor-pointer"
              >
                Close
              </button>
              {ocrExtractedItem && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeTrip || !ocrExtractedItem) return;
                    const newEntry: Expense = {
                      id: `ocr-${Date.now()}`,
                      trip_id: activeTrip.id,
                      title: ocrExtractedItem.merchant,
                      amount: ocrExtractedItem.amount,
                      currency: "USD",
                      category: ocrExtractedItem.category as any,
                      expense_date: new Date().toISOString(),
                      payer_name: { String: "Alex Chen", Valid: true },
                      notes: { String: ocrExtractedItem.notes, Valid: true },
                    };

                    const updated = [newEntry, ...expenses];
                    setExpenses(updated);
                    if (typeof window !== "undefined") {
                      localStorage.setItem(
                        `wanderly_extra_expenses_${activeTrip.id}`,
                        JSON.stringify(updated)
                      );
                    }

                    try {
                      await api.expenses.create(activeTrip.id, {
                        title: ocrExtractedItem.merchant,
                        amount: ocrExtractedItem.amount,
                        currency: "USD",
                        category: ocrExtractedItem.category,
                        expense_date: new Date().toISOString(),
                        notes: ocrExtractedItem.notes,
                      });
                    } catch {}

                    setIsOcrModalOpen(false);
                    setOcrExtractedItem(null);
                    showToast(`✓ Logged $${ocrExtractedItem.amount} for "${ocrExtractedItem.merchant}" via OCR`);
                  }}
                  className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-label-ui text-label-ui font-medium shadow-sm hover:opacity-90 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>Insert Scanned Expense</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settle with Maya Modal */}
      {isSettleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-surface-variant pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">handshake</span>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Shared Expense Split</h3>
              </div>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-low border border-surface-variant mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                ML
              </div>
              <div className="flex-1">
                <div className="font-headline-sm text-headline-sm font-semibold text-on-surface">Maya Lin</div>
                <div className="font-body-sm text-body-sm text-on-surface-variant">Co-Traveler • 50/50 Split Rule</div>
              </div>
              <div className="text-right">
                <div className={`font-headline-sm text-headline-sm font-bold ${isSettledWithMaya ? "text-tertiary" : "text-primary"}`}>
                  {isSettledWithMaya ? "$0.00" : "$412.50"}
                </div>
                <div className="font-label-mono-sm text-[10px] text-on-surface-variant">
                  {isSettledWithMaya ? "Settled" : "Maya Owes Alex"}
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-surface-variant/50">
                <span className="text-on-surface-variant">ANA Flight SFO-HND Share (50%):</span>
                <span className="text-on-surface font-semibold">$710.00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-variant/50">
                <span className="text-on-surface-variant">Cerulean Tower 5N Deposit Share (50%):</span>
                <span className="text-on-surface font-semibold">$475.00</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-variant/50">
                <span className="text-on-surface-variant">Shibuya Sky Observation Tickets (50%):</span>
                <span className="text-on-surface font-semibold">$21.00</span>
              </div>
              <div className="flex justify-between py-1 text-on-surface font-bold text-[13px] pt-1">
                <span>Net Outstanding Balance:</span>
                <span className={isSettledWithMaya ? "text-tertiary" : "text-primary"}>
                  {isSettledWithMaya ? "$0.00 (Fully Settled)" : "$412.50"}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-surface-variant">
              {!isSettledWithMaya ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettledWithMaya(true);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("wanderly_settled_with_maya", "true");
                      }
                      showToast("✓ Full settlement recorded! Maya Lin balance is now $0.00.");
                    }}
                    className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-label-ui text-label-ui font-semibold shadow-sm hover:opacity-90 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Record Full Payment & Mark Settled</span>
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        showToast("✓ Reminder notification ping sent to Maya Lin!");
                      }}
                      className="flex-1 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui text-label-ui font-medium cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">notifications_active</span>
                      <span>Initiate Ping</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          navigator.clipboard.writeText("https://wanderly.travel/pay/maya-settle-tokyo");
                          showToast("✓ Payment request link copied to clipboard!");
                        }
                      }}
                      className="flex-1 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-ui text-label-ui font-medium cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">link</span>
                      <span>Copy Pay Link</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-tertiary/10 border border-tertiary/20 text-center font-label-ui text-label-ui text-tertiary font-semibold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    All Shared Expenses Settled in Full
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettledWithMaya(false);
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("wanderly_settled_with_maya");
                      }
                      showToast("Settlement reset to pending ($412.50).");
                    }}
                    className="w-full py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-label-ui text-label-ui cursor-pointer"
                  >
                    Reset Balance for Demo ($412.50)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
