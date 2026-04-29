import { useEffect, useState } from "react";
import {
  ShieldCheckIcon,
  CheckBadgeIcon,
  XCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import { EmptyState } from "@/components/operations/EmptyState";
import { Modal } from "@/components/operations/Modal";
import { QCStatusPill } from "@/components/operations/StatusPill";
import {
  getQCStats,
  listQCRecords,
  recordQCInspection,
} from "@/services/qcService";
import { listInventoryBatches } from "@/services/inventoryService";
import { listProducts } from "@/services/productService";
import { recomputeAlerts } from "@/services/alertsService";
import type { InventoryBatch, Product, QCRecord } from "@/types/operations";
import { formatDateTime, relativeTime } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

const CRITERIA: { key: keyof QCRecord["criteria"]; label: string }[] = [
  { key: "appearance", label: "Appearance" },
  { key: "aroma", label: "Aroma" },
  { key: "crunch", label: "Crunch" },
  { key: "taste", label: "Taste" },
  { key: "packaging", label: "Packaging" },
];

export function QualityControlPage() {
  const { hasRole, session } = useAuth();
  const canInspect = hasRole(["admin", "production"]);
  const [records, setRecords] = useState<QCRecord[]>([]);
  const [pending, setPending] = useState<InventoryBatch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    passRate: 0,
  });
  const [inspectFor, setInspectFor] = useState<InventoryBatch | null>(null);

  async function load() {
    const [recs, batches, s, p] = await Promise.all([
      listQCRecords(),
      listInventoryBatches(),
      getQCStats(),
      listProducts(),
    ]);
    setRecords(recs);
    setPending(batches.filter((b) => b.qcStatus === "pending"));
    setStats(s);
    setProducts(p);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Quality Control"
        subtitle="Inspect production batches before they reach customers."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total inspections"
          value={stats.total}
          icon={<ShieldCheckIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Passed"
          value={stats.passed}
          tone="good"
          icon={<CheckBadgeIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          tone={stats.failed > 0 ? "bad" : "good"}
          icon={<XCircleIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Pass rate"
          value={`${(stats.passRate * 100).toFixed(0)}%`}
          tone={stats.passRate >= 0.9 ? "good" : "warn"}
        />
      </div>

      {pending.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-semibold text-charcoal-700 mb-2">
            Awaiting inspection ({pending.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pending.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-lg ring-1 ring-cream-300 p-4"
              >
                <p className="font-mono text-[11px] text-charcoal-400">
                  {b.batchCode}
                </p>
                <p className="text-sm font-bold text-charcoal-700 mt-1">
                  {b.quantity} units
                </p>
                <p className="text-[11px] text-charcoal-500 mt-1">
                  Produced {relativeTime(b.createdAt)}
                </p>
                {canInspect && (
                  <button
                    onClick={() => setInspectFor(b)}
                    className="btn-primary w-full mt-3 text-xs"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Inspect
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <h2 className="text-sm font-semibold text-charcoal-700 mb-2">
        Inspection history
      </h2>
      {records.length === 0 ? (
        <EmptyState
          title="No inspections yet"
          description="Inspect a production batch to log its quality."
        />
      ) : (
        <div className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
              <tr>
                <th className="text-left px-4 py-2">Batch</th>
                <th className="text-left px-4 py-2">Product</th>
                <th className="text-left px-4 py-2">Inspector</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Notes</th>
                <th className="text-left px-4 py-2">Inspected</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-charcoal-50">
                  <td className="px-4 py-2 font-mono text-xs">
                    {r.batchCode}
                  </td>
                  <td className="px-4 py-2 font-medium text-charcoal-700">
                    {r.productName}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {r.inspector}
                  </td>
                  <td className="px-4 py-2">
                    <QCStatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-2 text-charcoal-500 truncate max-w-xs">
                    {r.notes || "—"}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {formatDateTime(r.inspectedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {inspectFor && (
        <InspectModal
          batch={inspectFor}
          productName={
            products.find((p) => p.id === inspectFor.productId)?.name ??
            "Product"
          }
          inspector={session?.name ?? "Inspector"}
          onClose={() => setInspectFor(null)}
          onSaved={async () => {
            setInspectFor(null);
            await recomputeAlerts();
            await load();
          }}
        />
      )}
    </div>
  );
}

function InspectModal({
  batch,
  productName,
  inspector,
  onClose,
  onSaved,
}: {
  batch: InventoryBatch;
  productName: string;
  inspector: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [criteria, setCriteria] = useState<QCRecord["criteria"]>({
    appearance: 4,
    aroma: 4,
    crunch: 4,
    taste: 4,
    packaging: 4,
  });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const total = Object.values(criteria).reduce((s, v) => s + v, 0);
  const max = CRITERIA.length * 5;
  const pct = Math.round((total / max) * 100);
  const willPass = pct >= 60 && Object.values(criteria).every((v) => v > 0);

  const submit = async () => {
    setBusy(true);
    try {
      await recordQCInspection({
        inventoryBatchId: batch.id,
        batchCode: batch.batchCode,
        productName,
        inspector,
        criteria,
        notes,
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Inspect ${batch.batchCode}`}
      onClose={onClose}
      footer={
        <div className="flex justify-between gap-2 items-center">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              willPass
                ? "bg-green-50 text-green-700 ring-1 ring-green-100"
                : "bg-[#FFE9D6] text-[#B23E0E] ring-1 ring-[#F4A36A]"
            }`}
          >
            {pct}% — will {willPass ? "PASS" : "FAIL"}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button onClick={submit} disabled={busy} className="btn-primary">
              {busy ? "Saving…" : "Submit inspection"}
            </button>
          </div>
        </div>
      }
    >
      <p className="text-sm text-charcoal-500 mb-4">
        Score each criterion from 0 (unacceptable) to 5 (excellent). A 0 in any
        criterion forces a fail.
      </p>
      <div className="space-y-3">
        {CRITERIA.map((c) => (
          <div key={c.key}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-semibold text-charcoal-600">
                {c.label}
              </span>
              <span className="text-sm font-bold text-charcoal-700">
                {criteria[c.key]} / 5
              </span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() =>
                    setCriteria((cur) => ({ ...cur, [c.key]: n }))
                  }
                  className={`flex-1 h-9 rounded-md text-sm font-semibold transition-colors ring-1 ${
                    criteria[c.key] === n
                      ? n === 0
                        ? "bg-[#B23E0E] text-white ring-[#B23E0E]"
                        : "bg-green-500 text-white ring-green-500"
                      : "bg-cream-100 text-charcoal-500 ring-charcoal-100 hover:bg-cream-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <label className="block mt-4">
        <span className="block text-xs font-semibold text-charcoal-500 mb-1">
          Notes
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any defects or observations."
          className="input"
        />
      </label>
    </Modal>
  );
}
