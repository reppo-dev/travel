"use client";

import React, { useState } from "react";
import { TravelDocument } from "@/lib/api";
import { format, parseISO } from "date-fns";
import {
  FileText,
  Plane,
  Hotel,
  Shield,
  Ticket,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";

interface DocumentVaultProps {
  documents: TravelDocument[];
  tripId: string;
  onCreate: (doc: {
    title: string;
    doc_type: string;
    confirmation_code?: string;
    provider?: string;
    valid_date?: string;
    notes?: string;
    file_url?: string;
  }) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
}

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  flight: { label: "Flight Ticket", icon: Plane, color: "bg-blue-100 text-blue-800" },
  hotel: { label: "Hotel Voucher", icon: Hotel, color: "bg-amber-100 text-amber-800" },
  insurance: { label: "Insurance Policy", icon: Shield, color: "bg-emerald-100 text-emerald-800" },
  ticket: { label: "Activity Pass", icon: Ticket, color: "bg-purple-100 text-purple-800" },
  visa: { label: "Visa / Permit", icon: FileText, color: "bg-rose-100 text-rose-800" },
  other: { label: "Document", icon: FileText, color: "bg-stone-100 text-stone-800" },
};

export const DocumentVault: React.FC<DocumentVaultProps> = ({
  documents,
  tripId,
  onCreate,
  onDelete,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("flight");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [provider, setProvider] = useState("");
  const [validDate, setValidDate] = useState("");
  const [notes, setNotes] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const copyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setLoading(true);
      await onCreate({
        title: title.trim(),
        doc_type: docType,
        confirmation_code: confirmationCode.trim() || undefined,
        provider: provider.trim() || undefined,
        valid_date: validDate ? new Date(validDate).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });
      setTitle("");
      setConfirmationCode("");
      setProvider("");
      setNotes("");
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to add document", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fdfaf7] rounded-2xl p-6 border border-[#e8dfd8] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-serif text-[#2a2421] font-semibold">Travel Document Vault</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f2eae4] text-[#715c50] font-mono">
              {documents.length} verified records
            </span>
          </div>
          <p className="text-sm text-[#715c50]">
            Confirmation numbers, boarding references, and electronic visa copies.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#486172] text-white text-sm font-medium hover:bg-[#394e5c] transition-all shadow-sm active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
        </button>
      </div>

      {/* Add Document Form */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-5 rounded-xl bg-white border border-[#486172]/30 shadow-md space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-[#715c50] uppercase font-semibold">
              New Travel Record
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-[#9e8c81] hover:text-[#2a2421]"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">RECORD TITLE *</label>
              <input
                type="text"
                required
                placeholder="e.g. ANA Airlines Flight NH007..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#486172] outline-hidden text-[#2a2421]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">DOCUMENT TYPE</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] focus:border-[#486172] outline-hidden bg-white text-[#2a2421]"
              >
                <option value="flight">Flight Ticket</option>
                <option value="hotel">Hotel Voucher</option>
                <option value="insurance">Insurance Policy</option>
                <option value="ticket">Activity / Transit Pass</option>
                <option value="visa">Visa / Travel Permit</option>
                <option value="other">Other Record</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">CONFIRMATION CODE</label>
              <input
                type="text"
                placeholder="e.g. NH-982341..."
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] font-mono uppercase tracking-wider text-[#2a2421]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">PROVIDER / AIRLINE / HOTEL</label>
              <input
                type="text"
                placeholder="e.g. All Nippon Airways, Shibuya Stream..."
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-[#715c50] mb-1">VALIDITY / CHECK-IN DATE</label>
              <DatePicker
                value={validDate}
                onChange={setValidDate}
                placeholder="Pick validity date"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-[#715c50] mb-1">NOTES</label>
            <input
              type="text"
              placeholder="e.g. Terminal 1, Gate 42B. Must present physical passport."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-[#e8dfd8] outline-hidden text-[#2a2421]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-[#486172] text-white hover:bg-[#394e5c] disabled:opacity-50"
            >
              Save Record
            </button>
          </div>
        </form>
      )}

      {/* Document Records Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {documents.length === 0 ? (
          <div className="col-span-full text-center py-8 text-xs text-[#9e8c81] bg-[#f9f5f0] rounded-xl border border-dashed border-[#e8dfd8]">
            No travel records in vault.
          </div>
        ) : (
          documents.map((doc) => {
            const meta = TYPE_META[doc.doc_type] || TYPE_META.other;
            const Icon = meta.icon;
            const code = doc.confirmation_code?.Valid ? doc.confirmation_code.String : null;

            return (
              <div
                key={doc.id}
                className="group relative p-4 rounded-xl bg-white border border-[#e8dfd8] hover:border-[#486172]/40 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${meta.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-[#2a2421]">{doc.title}</h4>
                      {doc.provider?.Valid && (
                        <p className="text-xs text-[#715c50]">{doc.provider.String}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onDelete(doc.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-[#b8a99e] hover:text-red-600 transition-opacity"
                    title="Delete record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Confirmation Code Chip */}
                {code && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#f9f5f0] border border-[#ebdcd3]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-[#9e8c81] uppercase">Ref:</span>
                      <span className="text-xs font-mono font-bold tracking-wider text-[#2a2421]">
                        {code}
                      </span>
                    </div>

                    <button
                      onClick={() => copyCode(doc.id, code)}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-white border border-[#e8dfd8] text-[#715c50] hover:text-[#2a2421] cursor-pointer"
                    >
                      {copiedId === doc.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Additional details */}
                <div className="flex items-center justify-between text-[11px] text-[#715c50] pt-1">
                  {doc.valid_date?.Valid && (
                    <div className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#9e8c81]" />
                      <span>{format(parseISO(doc.valid_date.Time), "MMM dd, yyyy")}</span>
                    </div>
                  )}

                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#f2eae4]">
                    {meta.label}
                  </span>
                </div>

                {doc.notes?.Valid && (
                  <p className="text-xs text-[#715c50] font-sans border-t border-[#f2eae4] pt-2">
                    {doc.notes.String}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
export default DocumentVault;
