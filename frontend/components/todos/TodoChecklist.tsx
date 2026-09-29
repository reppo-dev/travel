"use client";

import React, { useState } from "react";
import { TripTodo } from "@/lib/api";
import { format, parseISO, isPast } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Calendar,
  Tag,
  Plus,
  Trash2,
  AlertCircle,
  Filter,
  Check,
  Clock,
  Sparkles,
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";

interface TodoChecklistProps {
  todos: TripTodo[];
  tripId: string;
  onToggle: (todoId: string) => Promise<void>;
  onCreate: (todo: {
    title: string;
    due_date?: string;
    category?: string;
    priority?: string;
    notes?: string;
  }) => Promise<void>;
  onDelete: (todoId: string) => Promise<void>;
  tripStartDate?: string;
}

const CATEGORIES = [
  { id: "all", label: "All Tasks" },
  { id: "booking", label: "Bookings", color: "bg-orange-100 text-orange-800 border-orange-200" },
  { id: "packing", label: "Packing", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { id: "prep", label: "Prep", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { id: "documents", label: "Documents", color: "bg-purple-100 text-purple-800 border-purple-200" },
  { id: "general", label: "General", color: "bg-stone-100 text-stone-800 border-stone-200" },
];

const PRIORITIES = [
  { id: "low", label: "Low", color: "text-stone-500 bg-stone-100" },
  { id: "medium", label: "Medium", color: "text-amber-700 bg-amber-100" },
  { id: "high", label: "High", color: "text-red-700 bg-red-100" },
];

export const TodoChecklist: React.FC<TodoChecklistProps> = ({
  todos,
  tripId,
  onToggle,
  onCreate,
  onDelete,
  tripStartDate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<"booking" | "packing" | "prep" | "documents" | "general">("booking");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  const filteredTodos = todos.filter((todo) => {
    const matchesCat = selectedCategory === "all" || todo.category === selectedCategory;
    const matchesSearch =
      todo.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      (todo.notes?.Valid && todo.notes.String.toLowerCase().includes(filterQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const completedCount = todos.filter((t) => t.is_completed).length;
  const progressPercent = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      await onCreate({
        title: title.trim(),
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        category,
        priority,
        notes: notes.trim() || undefined,
      });
      setTitle("");
      setDueDate("");
      setNotes("");
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to create task", err);
    } finally {
      setLoading(false);
    }
  };

  const setQuickDueDate = (daysBeforeDeparture: number) => {
    if (tripStartDate) {
      const departure = new Date(tripStartDate);
      departure.setDate(departure.getDate() - daysBeforeDeparture);
      setDueDate(departure.toISOString().split("T")[0]);
    } else {
      const today = new Date();
      today.setDate(today.getDate() + 3);
      setDueDate(today.toISOString().split("T")[0]);
    }
  };

  return (
    <div className="bg-[#fdfaf7] rounded-2xl p-6 border border-[#e8dfd8] shadow-sm space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-serif text-[#2a2421] font-semibold">Pre-Trip Checklist</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f2eae4] text-[#715c50] font-mono font-medium">
              {completedCount}/{todos.length} done
            </span>
          </div>
          <p className="text-sm text-[#715c50] mt-1 font-sans">
            Keep track of visa preparations, reservations, and critical travel deadlines.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#9d3d26] text-white text-sm font-medium hover:bg-[#85331f] transition-all shadow-sm active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-[#715c50]">
          <span>Readiness Score</span>
          <span className="font-semibold text-[#9d3d26]">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-[#ebdcd3] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#d97757] to-[#9d3d26] transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#2a2421] text-white shadow-xs"
                  : "bg-[#f2eae4] text-[#715c50] hover:bg-[#ebdcd3]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-48">
          <input
            type="text"
            placeholder="Search tasks..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full text-xs px-3 py-1.5 pl-8 rounded-lg bg-white border border-[#e8dfd8] focus:outline-hidden focus:border-[#9d3d26] text-[#2a2421]"
          />
          <Filter className="w-3.5 h-3.5 text-[#9e8c81] absolute left-2.5 top-2" />
        </div>
      </div>

      {/* Add Task Modal / Expanded Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-xl bg-white border-2 border-[#d97757]/30 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-serif font-semibold text-[#2a2421]">New Travel Action</h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-[#9e8c81] hover:text-[#2a2421]"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#715c50] mb-1">TASK TITLE *</label>
            <input
              type="text"
              required
              placeholder="e.g., Reserve JR Shinkansen pass, Book team dinner..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm px-3.5 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#9d3d26] outline-hidden text-[#2a2421]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-[#715c50] mb-1">CATEGORY</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#9d3d26] outline-hidden bg-white text-[#2a2421]"
              >
                <option value="booking">Bookings</option>
                <option value="packing">Packing</option>
                <option value="prep">Preparation</option>
                <option value="documents">Documents</option>
                <option value="general">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#715c50] mb-1">PRIORITY</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#9d3d26] outline-hidden bg-white text-[#2a2421]"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-[#715c50] mb-1">DUE DATE</label>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Pick due date"
              />
            </div>
          </div>

          {/* Quick presets for due date */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-mono text-[#9e8c81]">Quick due:</span>
            <button
              type="button"
              onClick={() => setQuickDueDate(7)}
              className="text-[11px] px-2 py-0.5 rounded-md bg-[#f2eae4] text-[#715c50] hover:bg-[#ebdcd3]"
            >
              1 week before
            </button>
            <button
              type="button"
              onClick={() => setQuickDueDate(3)}
              className="text-[11px] px-2 py-0.5 rounded-md bg-[#f2eae4] text-[#715c50] hover:bg-[#ebdcd3]"
            >
              3 days before
            </button>
            <button
              type="button"
              onClick={() => setDueDate(new Date().toISOString().split("T")[0])}
              className="text-[11px] px-2 py-0.5 rounded-md bg-[#f2eae4] text-[#715c50] hover:bg-[#ebdcd3]"
            >
              Today
            </button>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#715c50] mb-1">NOTES / REFERENCE LINKS</label>
            <textarea
              rows={2}
              placeholder="e.g. Booking code #AB-9921, remember to download passport photo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#9d3d26] outline-hidden text-[#2a2421]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#f2eae4]">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-1.5 text-xs text-[#715c50] hover:text-[#2a2421]"
            >
              Dismiss
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[#9d3d26] text-white hover:bg-[#85331f] disabled:opacity-50"
            >
              {loading ? "Saving..." : "Create Task"}
            </button>
          </div>
        </form>
      )}

      {/* Todos List */}
      <div className="space-y-2.5">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-10 bg-[#f9f5f0] rounded-xl border border-dashed border-[#e8dfd8]">
            <CheckCircle2 className="w-8 h-8 text-[#9e8c81] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-[#715c50]">No tasks found</p>
            <p className="text-xs text-[#9e8c81] mt-0.5">
              Add your upcoming reservations, packing checklists, or visa requirements.
            </p>
          </div>
        ) : (
          filteredTodos.map((todo) => {
            const hasDueDate = todo.due_date?.Valid && todo.due_date.Time;
            const dueDateObj = hasDueDate ? parseISO(todo.due_date!.Time) : null;
            const isOverdue = dueDateObj && !todo.is_completed && isPast(dueDateObj);

            return (
              <div
                key={todo.id}
                className={`group flex items-start gap-3.5 p-3.5 rounded-xl border transition-all duration-200 ${
                  todo.is_completed
                    ? "bg-[#faf6f3]/60 border-[#ebe3dc] opacity-75"
                    : "bg-white border-[#e8dfd8] hover:border-[#d97757]/40 shadow-xs hover:shadow-sm"
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={() => onToggle(todo.id)}
                  className={`mt-0.5 rounded-full p-0.5 transition-transform active:scale-90 cursor-pointer ${
                    todo.is_completed ? "text-[#4c6156]" : "text-[#b8a99e] hover:text-[#9d3d26]"
                  }`}
                  aria-label={todo.is_completed ? "Mark as uncompleted" : "Mark as completed"}
                >
                  {todo.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 fill-[#4c6156]/15" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        todo.is_completed
                          ? "line-through text-[#9e8c81]"
                          : "text-[#2a2421]"
                      }`}
                    >
                      {todo.title}
                    </span>

                    {/* Priority badge */}
                    {todo.priority === "high" && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                        High
                      </span>
                    )}

                    {/* Category badge */}
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#f2eae4] text-[#715c50]">
                      {todo.category}
                    </span>
                  </div>

                  {/* Notes if available */}
                  {todo.notes?.Valid && todo.notes.String && (
                    <p className="text-xs text-[#715c50] mt-1 font-sans line-clamp-2">
                      {todo.notes.String}
                    </p>
                  )}

                  {/* Due date indicator */}
                  {dueDateObj && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#9e8c81]" />
                      <span
                        className={`${
                          isOverdue
                            ? "text-red-600 font-semibold"
                            : todo.is_completed
                            ? "text-[#9e8c81]"
                            : "text-[#715c50]"
                        }`}
                      >
                        {format(dueDateObj, "MMM dd, yyyy")}
                        {isOverdue && " (Overdue)"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Delete action */}
                <button
                  onClick={() => onDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#9e8c81] hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default TodoChecklist;
