import { useEffect, useState } from "react";
import {
  PlusIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CubeIcon,
  BeakerIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import { Modal } from "@/components/operations/Modal";
import { EmptyState } from "@/components/operations/EmptyState";
import { QCStatusPill } from "@/components/operations/StatusPill";
import {
  addInventoryBatch,
  addRawMaterial,
  adjustRawMaterial,
  deleteBatch,
  generateBatchCode,
  getStockSummary,
  listRawMaterials,
  type ProductStockSummary,
} from "@/services/inventoryService";
import { listProducts } from "@/services/productService";
import { recomputeAlerts } from "@/services/alertsService";
import type { Product, RawMaterial } from "@/types/operations";
import { addDaysISO, formatDate, formatNumber, todayISO } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

export function InventoryPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole(["admin", "production"]);
  const [summary, setSummary] = useState<ProductStockSummary[]>([]);
  const [raws, setRaws] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showAddRaw, setShowAddRaw] = useState(false);
  const [tab, setTab] = useState<"finished" | "raw">("finished");

  async function load() {
    const [s, r, p] = await Promise.all([
      getStockSummary(),
      listRawMaterials(),
      listProducts(),
    ]);
    setSummary(s);
    setRaws(r);
    setProducts(p);
  }

  useEffect(() => {
    load();
  }, []);

  const totalUnits = summary.reduce((s, p) => s + p.totalQuantity, 0);
  const lowStockProducts = summary.filter((s) => s.lowStock).length;
  const expiringSoon = summary.reduce(
    (s, p) => s + p.expiringSoonCount,
    0
  );
  const expired = summary.reduce((s, p) => s + p.expiredCount, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Inventory"
        subtitle="Track finished stock by batch, expiry, and raw material levels."
        actions={
          canEdit && (
            <>
              <button
                onClick={() => setShowAddRaw(true)}
                className="btn-secondary"
              >
                <BeakerIcon className="h-4 w-4" />
                Add raw material
              </button>
              <button
                onClick={() => setShowAddBatch(true)}
                className="btn-primary"
              >
                <PlusIcon className="h-4 w-4" />
                Add batch
              </button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Finished units"
          value={formatNumber(totalUnits)}
          hint="Across all batches"
          icon={<CubeIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Low stock products"
          value={lowStockProducts}
          tone={lowStockProducts > 0 ? "warn" : "good"}
          hint={`${products.length} SKU${products.length === 1 ? "" : "s"}`}
          icon={<ExclamationTriangleIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Expiring (14d)"
          value={expiringSoon}
          tone={expiringSoon > 0 ? "warn" : "neutral"}
          hint="Batches near expiry"
          icon={<ClockIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Expired"
          value={expired}
          tone={expired > 0 ? "bad" : "good"}
          hint="Pull from shelves"
          icon={<ExclamationTriangleIcon className="h-4 w-4" />}
        />
      </div>

      <div className="flex gap-1 border-b border-charcoal-100 mb-5">
        {(
          [
            ["finished", "Finished goods"],
            ["raw", "Raw materials"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === key
                ? "border-green-500 text-green-700"
                : "border-transparent text-charcoal-400 hover:text-charcoal-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "finished" && (
        <FinishedGoodsView
          summary={summary}
          canEdit={canEdit}
          onChange={async () => {
            await recomputeAlerts();
            await load();
          }}
        />
      )}

      {tab === "raw" && (
        <RawMaterialsView
          raws={raws}
          canEdit={canEdit}
          onChange={async () => {
            await recomputeAlerts();
            await load();
          }}
        />
      )}

      {showAddBatch && (
        <AddBatchModal
          products={products}
          onClose={() => setShowAddBatch(false)}
          onSaved={async () => {
            setShowAddBatch(false);
            await recomputeAlerts();
            await load();
          }}
        />
      )}

      {showAddRaw && (
        <AddRawModal
          onClose={() => setShowAddRaw(false)}
          onSaved={async () => {
            setShowAddRaw(false);
            await recomputeAlerts();
            await load();
          }}
        />
      )}
    </div>
  );
}

// ── Finished goods table ───────────────────────────────────────────────────

function FinishedGoodsView({
  summary,
  canEdit,
  onChange,
}: {
  summary: ProductStockSummary[];
  canEdit: boolean;
  onChange: () => Promise<void> | void;
}) {
  if (summary.length === 0) {
    return (
      <EmptyState
        title="No products yet"
        description="Add products in settings to start tracking stock."
      />
    );
  }

  return (
    <div className="space-y-5">
      {summary.map((s) => (
        <div
          key={s.product.id}
          className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-hidden"
        >
          <div
            className={`px-4 py-3 flex items-center justify-between border-b border-charcoal-100 ${
              s.product.colorKey === "spicy"
                ? "bg-[#FFE9D6]"
                : "bg-cream-100"
            }`}
          >
            <div>
              <p className="text-xs font-semibold text-charcoal-500">
                {s.product.sku}
              </p>
              <h3 className="text-base font-bold text-charcoal-700">
                {s.product.name}
              </h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-charcoal-700 leading-tight">
                {formatNumber(s.totalQuantity)}
              </p>
              <p className="text-[11px] text-charcoal-500">units in stock</p>
            </div>
          </div>

          {s.batches.length === 0 ? (
            <p className="p-4 text-sm text-charcoal-400 italic text-center">
              No batches recorded for this product yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
                  <tr>
                    <th className="text-left px-4 py-2">Batch</th>
                    <th className="text-left px-4 py-2">Produced</th>
                    <th className="text-left px-4 py-2">Expires</th>
                    <th className="text-left px-4 py-2">QC</th>
                    <th className="text-right px-4 py-2">Qty</th>
                    {canEdit && <th className="px-2 py-2 w-16" />}
                  </tr>
                </thead>
                <tbody>
                  {s.batches.map((b) => {
                    const days = Math.floor(
                      (new Date(b.expiryDate).getTime() - Date.now()) /
                        86_400_000
                    );
                    const expiryTone =
                      days < 0
                        ? "text-[#B23E0E]"
                        : days <= 14
                        ? "text-gold-600"
                        : "text-charcoal-500";
                    return (
                      <tr
                        key={b.id}
                        className="border-t border-charcoal-50 hover:bg-cream-50/40"
                      >
                        <td className="px-4 py-2 font-mono text-xs text-charcoal-700">
                          {b.batchCode}
                        </td>
                        <td className="px-4 py-2 text-charcoal-500">
                          {formatDate(b.productionDate)}
                        </td>
                        <td className={`px-4 py-2 ${expiryTone}`}>
                          {formatDate(b.expiryDate)}
                          {days < 0 && (
                            <span className="ml-1 text-[10px]">
                              ({Math.abs(days)}d ago)
                            </span>
                          )}
                          {days >= 0 && days <= 14 && (
                            <span className="ml-1 text-[10px]">
                              (in {days}d)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <QCStatusPill status={b.qcStatus} />
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-charcoal-700">
                          {formatNumber(b.quantity)}
                        </td>
                        {canEdit && (
                          <td className="px-2 py-2 text-right">
                            <button
                              onClick={async () => {
                                if (
                                  confirm(`Delete batch ${b.batchCode}?`)
                                ) {
                                  await deleteBatch(b.id);
                                  await onChange();
                                }
                              }}
                              className="text-[11px] text-[#B23E0E] hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {s.lowStock && (
            <div className="px-4 py-2 bg-[#FFE9D6] text-[#B23E0E] text-xs font-semibold flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Below low-stock threshold ({s.product.lowStockThreshold} units)
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Raw materials view ─────────────────────────────────────────────────────

function RawMaterialsView({
  raws,
  canEdit,
  onChange,
}: {
  raws: RawMaterial[];
  canEdit: boolean;
  onChange: () => Promise<void> | void;
}) {
  if (raws.length === 0) {
    return (
      <EmptyState
        title="No raw materials"
        description="Add plantains, oil, salt, packaging, etc. to track stock."
      />
    );
  }

  return (
    <div className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
          <tr>
            <th className="text-left px-4 py-2">Material</th>
            <th className="text-left px-4 py-2">Unit</th>
            <th className="text-right px-4 py-2">Quantity</th>
            <th className="text-right px-4 py-2">Threshold</th>
            <th className="text-right px-4 py-2">Cost / unit</th>
            {canEdit && <th className="px-2 py-2 w-32" />}
          </tr>
        </thead>
        <tbody>
          {raws.map((r) => {
            const low = r.quantity < r.lowStockThreshold;
            return (
              <tr
                key={r.id}
                className="border-t border-charcoal-50 hover:bg-cream-50/40"
              >
                <td className="px-4 py-2 font-medium text-charcoal-700">
                  {r.name}
                </td>
                <td className="px-4 py-2 text-charcoal-500">{r.unit}</td>
                <td
                  className={`px-4 py-2 text-right font-semibold ${
                    low ? "text-[#B23E0E]" : "text-charcoal-700"
                  }`}
                >
                  {formatNumber(r.quantity)} {r.unit}
                </td>
                <td className="px-4 py-2 text-right text-charcoal-500">
                  {formatNumber(r.lowStockThreshold)} {r.unit}
                </td>
                <td className="px-4 py-2 text-right text-charcoal-500">
                  ₦{r.costPerUnit.toLocaleString()}
                </td>
                {canEdit && (
                  <td className="px-2 py-2">
                    <RestockControls
                      raw={r}
                      onDone={onChange}
                    />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RestockControls({
  raw,
  onDone,
}: {
  raw: RawMaterial;
  onDone: () => Promise<void> | void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        onClick={async () => {
          const v = prompt(
            `Add ${raw.unit} to ${raw.name} (current ${raw.quantity}${raw.unit})`
          );
          const n = Number(v);
          if (Number.isFinite(n) && n > 0) {
            await adjustRawMaterial(raw.id, n);
            await onDone();
          }
        }}
        className="text-[11px] px-2 py-1 rounded bg-green-50 text-green-700 ring-1 ring-green-100"
      >
        + Add
      </button>
      <button
        onClick={async () => {
          const v = prompt(
            `Use ${raw.unit} from ${raw.name} (current ${raw.quantity}${raw.unit})`
          );
          const n = Number(v);
          if (Number.isFinite(n) && n > 0) {
            await adjustRawMaterial(raw.id, -n);
            await onDone();
          }
        }}
        className="text-[11px] px-2 py-1 rounded bg-cream-100 text-charcoal-600 ring-1 ring-charcoal-100"
      >
        − Use
      </button>
    </div>
  );
}

// ── Modals ─────────────────────────────────────────────────────────────────

function AddBatchModal({
  products,
  onClose,
  onSaved,
}: {
  products: Product[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(100);
  const [productionDate, setProductionDate] = useState(todayISO());
  const [expiryDate, setExpiryDate] = useState(addDaysISO(120));
  const [notes, setNotes] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = products.find((p) => p.id === productId);
    if (p) setBatchCode(generateBatchCode(p.sku));
  }, [productId, products]);

  const submit = async () => {
    if (!productId || quantity <= 0) return;
    setBusy(true);
    try {
      await addInventoryBatch({
        productId,
        batchCode,
        quantity,
        productionDate,
        expiryDate,
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
      title="Add inventory batch"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !productId || quantity <= 0}
            className="btn-primary"
          >
            {busy ? "Saving…" : "Save batch"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Product">
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="input"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.sku}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Batch code">
          <input
            value={batchCode}
            onChange={(e) => setBatchCode(e.target.value)}
            className="input font-mono text-xs"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Quantity">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Produced">
            <input
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Expires">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input"
            rows={2}
          />
        </Field>
      </div>
    </Modal>
  );
}

function AddRawModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<RawMaterial["unit"]>("kg");
  const [quantity, setQuantity] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addRawMaterial({
        name: name.trim(),
        unit,
        quantity,
        lowStockThreshold: threshold,
        costPerUnit,
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Add raw material"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="btn-primary"
          >
            {busy ? "Saving…" : "Save material"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. Plantains, Salt, Vegetable Oil"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit">
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as RawMaterial["unit"])}
              className="input"
            >
              <option value="kg">kg</option>
              <option value="litre">litre</option>
              <option value="piece">piece</option>
              <option value="pack">pack</option>
            </select>
          </Field>
          <Field label="Initial quantity">
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Low-stock threshold">
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Cost per unit (₦)">
            <input
              type="number"
              min={0}
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(Number(e.target.value))}
              className="input"
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-charcoal-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
