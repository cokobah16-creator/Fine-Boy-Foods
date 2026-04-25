import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  ChatBubbleLeftEllipsisIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type {
  Retailer,
  RetailerNote,
  RetailerOutreachLog,
  RetailerStatus,
} from "@/types/retailer";
import {
  RETAILER_STATUS_LABELS,
  RETAILER_CATEGORY_LABELS,
} from "@/types/retailer";
import {
  getRetailerById,
  updateRetailer,
  deleteRetailer,
  getNotesForRetailer,
  addNote,
  getLogsForRetailer,
  addOutreachLog,
} from "@/services/retailerService";
import { StatusBadge } from "@/components/retailers/StatusBadge";
import { ScoreBadge, ScoreBar } from "@/components/retailers/ScoreBadge";
import { OutreachModal } from "@/components/retailers/OutreachModal";
import type { OutreachChannel } from "@/utils/retailerOutreach";

const PIPELINE_STEPS: RetailerStatus[] = [
  "not_contacted",
  "contacted",
  "interested",
  "sample_delivered",
  "negotiating",
  "supplied",
];

const STATUS_OPTIONS: RetailerStatus[] = [
  "not_contacted",
  "contacted",
  "interested",
  "sample_delivered",
  "negotiating",
  "supplied",
  "rejected",
  "do_not_contact",
];

export function RetailerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [notes, setNotes] = useState<RetailerNote[]>([]);
  const [logs, setLogs] = useState<RetailerOutreachLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getRetailerById(id),
      getNotesForRetailer(id),
      getLogsForRetailer(id),
    ]).then(([r, n, l]) => {
      setRetailer(r);
      setNotes(n);
      setLogs(l);
    }).finally(() => setLoading(false));
  }, [id]);

  async function handleStatusChange(status: RetailerStatus) {
    if (!retailer) return;
    const updated = await updateRetailer(retailer.id, { status });
    setRetailer(updated);
    setEditingStatus(false);
  }

  async function handleAddNote() {
    if (!retailer || !newNote.trim()) return;
    setAddingNote(true);
    const note = await addNote(retailer.id, newNote.trim());
    setNotes((prev) => [note, ...prev]);
    setNewNote("");
    setAddingNote(false);
  }

  async function handleLogOutreach(channel: OutreachChannel, message: string) {
    if (!retailer) return;
    const log = await addOutreachLog({
      retailerId: retailer.id,
      channel,
      message,
      outcome: null,
    });
    setLogs((prev) => [log, ...prev]);
    await handleStatusChange("contacted");
  }

  async function handleDelete() {
    if (!retailer) return;
    await deleteRetailer(retailer.id);
    navigate("/retailers");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!retailer) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500 mb-4">Retailer not found.</p>
        <Link to="/retailers" className="btn-secondary">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Retailers
        </Link>
      </div>
    );
  }

  const currentPipelineStep = PIPELINE_STEPS.indexOf(retailer.status as RetailerStatus);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back link */}
      <div className="mb-4">
        <Link to="/retailers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeftIcon className="h-4 w-4" />
          All Retailers
        </Link>
      </div>

      {/* Header */}
      <div className="card mb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{retailer.businessName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {RETAILER_CATEGORY_LABELS[retailer.category]} · {retailer.area}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ScoreBadge score={retailer.leadScore} />
            <button
              onClick={() => setOutreachOpen(true)}
              className="btn-primary"
            >
              <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
              Outreach
            </button>
          </div>
        </div>

        {/* Lead Score Bar */}
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-1.5 font-medium">Lead Score</p>
          <ScoreBar score={retailer.leadScore} />
          {retailer.scoreReason && (
            <p className="text-xs text-gray-500 mt-1.5">{retailer.scoreReason}</p>
          )}
        </div>

        {/* Contact Info */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {retailer.address && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPinIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-gray-400" />
              <span>{retailer.address}</span>
            </div>
          )}
          {retailer.phone && (
            <a
              href={`tel:${retailer.phone}`}
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <PhoneIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              {retailer.phone}
            </a>
          )}
          {retailer.email && (
            <a
              href={`mailto:${retailer.email}`}
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <EnvelopeIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              {retailer.email}
            </a>
          )}
          {retailer.website && (
            <a
              href={retailer.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <GlobeAltIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              {retailer.website}
            </a>
          )}
          {retailer.phone && (
            <a
              href={`https://wa.me/${retailer.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sm text-emerald-600 hover:underline"
            >
              <ChatBubbleLeftEllipsisIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
              WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Pipeline */}
      <div className="card mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Pipeline Status</h2>
          {!editingStatus ? (
            <button
              onClick={() => setEditingStatus(true)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 transition-colors"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              Change
            </button>
          ) : (
            <button
              onClick={() => setEditingStatus(false)}
              className="text-xs text-gray-400"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {editingStatus ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`rounded-lg px-3 py-2 text-xs font-medium text-left transition-colors ${
                  retailer.status === s
                    ? "bg-brand-600 text-white"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                }`}
              >
                {RETAILER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <StatusBadge status={retailer.status} />
            </div>

            {/* Visual pipeline (main flow only) */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {PIPELINE_STEPS.map((step, i) => {
                const done = currentPipelineStep > i;
                const active = currentPipelineStep === i;
                return (
                  <div key={step} className="flex items-center gap-1 min-w-0">
                    <div
                      className={`flex items-center justify-center h-6 w-6 rounded-full flex-shrink-0 text-xs font-bold transition-colors ${
                        done
                          ? "bg-brand-600 text-white"
                          : active
                            ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {done ? <CheckIcon className="h-3 w-3" /> : i + 1}
                    </div>
                    <span
                      className={`text-xs whitespace-nowrap ${
                        active ? "text-brand-700 font-medium" : "text-gray-400"
                      }`}
                    >
                      {RETAILER_STATUS_LABELS[step]}
                    </span>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div
                        className={`h-0.5 w-4 flex-shrink-0 rounded-full mx-1 ${
                          done ? "bg-brand-600" : "bg-gray-100"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pitch & Next Step */}
      {(retailer.suggestedPitch || retailer.recommendedNextStep) && (
        <div className="card mb-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Strategy</h2>
          <div className="space-y-3">
            {retailer.suggestedPitch && (
              <div className="bg-brand-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-brand-700 mb-1">Suggested Pitch</p>
                <p className="text-sm text-brand-900">{retailer.suggestedPitch}</p>
              </div>
            )}
            {retailer.recommendedNextStep && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">Recommended Next Step</p>
                <p className="text-sm text-gray-800">{retailer.recommendedNextStep}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="card mb-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Notes</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="input flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim() || addingNote}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No notes yet.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-800">{note.note}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(note.createdAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {note.createdBy && ` · ${note.createdBy}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Outreach Log */}
      <div className="card mb-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Outreach History</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            No outreach logged yet.{" "}
            <button
              onClick={() => setOutreachOpen(true)}
              className="text-brand-600 hover:underline"
            >
              Generate outreach scripts →
            </button>
          </p>
        ) : (
          <ul className="space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-700 capitalize">
                    {log.channel.replace("_", " ")}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(log.contactedAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {log.outcome && (
                    <span className="ml-auto text-xs text-brand-600 font-medium">
                      {log.outcome}
                    </span>
                  )}
                </div>
                {log.message && (
                  <p className="text-xs text-gray-500 line-clamp-2">{log.message}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card border-red-100">
        <h2 className="text-sm font-semibold text-red-700 mb-3">Danger Zone</h2>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-danger"
          >
            <TrashIcon className="h-4 w-4" />
            Delete Retailer
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-red-600">Are you sure? This cannot be undone.</p>
            <button onClick={handleDelete} className="btn-danger">
              <CheckIcon className="h-4 w-4" />
              Yes, Delete
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-secondary">
              Cancel
            </button>
          </div>
        )}
      </div>

      {outreachOpen && (
        <OutreachModal
          retailer={retailer}
          onClose={() => setOutreachOpen(false)}
          onLogOutreach={handleLogOutreach}
        />
      )}
    </div>
  );
}
