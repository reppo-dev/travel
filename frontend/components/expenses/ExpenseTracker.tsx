"use client";

import React, { useState } from "react";
import { Expense } from "@/lib/api";
import { format, parseISO } from "date-fns";
import {
  CreditCard,
  Plus,
  Trash2,
  PieChart,
  DollarSign,
  Receipt,
  Utensils,
  Hotel,
  Train,
  Camera,
  ShoppingBag,
  MoreHorizontal,
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";

interface ExpenseTrackerProps {
  expenses: Expense[];
  tripId: string;
  onCreate: (expense: {
    title: string;
    category: string;
    amount: string;
    currency: string;
    expense_date: string;
    payer_name?: string;
    notes?: string;
  }) => Promise<void>;
  onDelete: (expenseId: string) => Promise<void>;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  stay: { label: "Accommodation", icon: Hotel, color: "bg-blue-100 text-blue-800" },
  dining: { label: "Dining & Drinks", icon: Utensils, color: "bg-amber-100 text-amber-800" },
  transit: { label: "Transit & Flights", icon: Train, color: "bg-emerald-100 text-emerald-800" },
  activities: { label: "Activities & Tours", icon: Camera, color: "bg-purple-100 text-purple-800" },
  shopping: { label: "Shopping", icon: ShoppingBag, color: "bg-rose-100 text-rose-800" },
  other: { label: "Other", icon: MoreHorizontal, color: "bg-stone-100 text-stone-800" },
};

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses,
  tripId,
  onCreate,
  onDelete,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("dining");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [payerName, setPayerName] = useState("Alex Chen");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const totalAmount = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount || "0"), 0);

  // Group by category for breakdown
  const categoryTotals = expenses.reduce((acc: Record<string, number>, curr) => {
    const val = parseFloat(curr.amount || "0");
    acc[curr.category] = (acc[curr.category] || 0) + val;
    return acc;
  }, {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    try {
      setLoading(true);
      await onCreate({
        title: title.trim(),
        category,
        amount,
        currency,
        expense_date: expenseDate,
        payer_name: payerName.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setTitle("");
      setAmount("");
      setNotes("");
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add expense", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fdfaf7] rounded-2xl p-6 border border-[#e8dfd8] shadow-sm space-y-6">
      {/* Header & Total Spend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-serif text-[#2a2421] font-semibold">Budget & Expenses</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f2eae4] text-[#715c50] font-mono">
              {expenses.length} entries
            </span>
          </div>
          <p className="text-sm text-[#715c50]">
            Track shared group expenditures and trip balance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="block text-[10px] font-mono text-[#9e8c81] uppercase">Total Spent</span>
            <span className="text-2xl font-serif font-bold text-[#2a2421]">
              ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#486172] text-white text-sm font-medium hover:bg-[#394e5c] transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Category Breakdown Bar */}
      {totalAmount > 0 && (
        <div className="space-y-2 bg-white p-4 rounded-xl border border-[#e8dfd8]">
          <div className="flex justify-between text-xs font-mono text-[#715c50]">
            <span>Category Distribution</span>
            <span>{Object.keys(categoryTotals).length} categories</span>
          </div>
          <div className="h-3 w-full rounded-full flex overflow-hidden bg-[#f2eae4]">
            {Object.entries(categoryTotals).map(([cat, val]) => {
              const pct = (val / totalAmount) * 100;
              const meta = CATEGORY_META[cat] || CATEGORY_META.other;
              return (
                <div
                  key={cat}
                  style={{ width: `${pct}%` }}
                  title={`${meta.label}: $${val.toFixed(2)} (${pct.toFixed(0)}%)`}
                  className={`${meta.color.split(" ")[0]} h-full transition-all`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {Object.entries(categoryTotals).map(([cat, val]) => {
              const meta = CATEGORY_META[cat] || CATEGORY_META.other;
              return (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-[#715c50]">
                  <span className={`w-2 h-2 rounded-full ${meta.color.split(" ")[0]}`} />
                  <span>{meta.label}:</span>
                  <span className="font-mono font-semibold text-[#2a2421]">${val.toFixed(0)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-xl bg-white border border-[#486172]/30 shadow-md space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#715c50] uppercase font-semibold">
              Log Expense
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-[#9e8c81] hover:text-[#2a2421]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">DESCRIPTION *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dinner at Savoy Pizza, Subway day passes..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#486172] outline-hidden text-[#2a2421]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">AMOUNT *</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#486172] outline-hidden text-[#2a2421]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">CATEGORY</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#486172] outline-hidden bg-white text-[#2a2421]"
              >
                <option value="stay">Accommodation</option>
                <option value="dining">Dining & Food</option>
                <option value="transit">Transit & Transport</option>
                <option value="activities">Activities & Sightseeing</option>
                <option value="shopping">Shopping</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">DATE</label>
              <DatePicker
                value={expenseDate}
                onChange={setExpenseDate}
                placeholder="Pick date"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">PAID BY</label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="Payer name"
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">NOTES</label>
              <input
                type="text"
                placeholder="Optional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[#486172] text-white hover:bg-[#394e5c] disabled:opacity-50"
            >
              Save Expense
            </button>
          </div>
        </form>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-[#e8dfd8] overflow-hidden">
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-xs text-[#9e8c81]">No expenses logged yet.</div>
        ) : (
          <div className="divide-y divide-[#f2eae4]">
            {expenses.map((exp) => {
              const meta = CATEGORY_META[exp.category] || CATEGORY_META.other;
              const Icon = meta.icon;
              return (
                <div
                  key={exp.id}
                  className="group flex items-center justify-between p-3.5 hover:bg-[#faf6f3] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#2a2421] truncate">{exp.title}</p>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-[#9e8c81]">
                        <span>{format(parseISO(exp.expense_date), "MMM dd")}</span>
                        <span>•</span>
                        <span>{meta.label}</span>
                        {exp.payer_name?.Valid && (
                          <>
                            <span>•</span>
                            <span className="text-[#715c50]">{exp.payer_name.String}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-semibold text-[#2a2421]">
                      ${parseFloat(exp.amount).toFixed(2)}
                    </span>
                    <button
                      onClick={() => onDelete(exp.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#b8a99e] hover:text-red-600 transition-opacity"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default ExpenseTracker;
