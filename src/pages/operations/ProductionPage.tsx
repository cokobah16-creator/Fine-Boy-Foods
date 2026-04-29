import { useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  CubeIcon,
  ArchiveBoxXMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import { EmptyState } from "@/components/operations/EmptyState";
import { Modal } from "@/components/operations/Modal";
import { SimpleBarChart } from "@/components/operations/SimpleBarChart";
import {
  getProductionStats,
  listProductionBatches,
  recordProductionBatch,
  type RawConsumption,
} from "@/services/productionService";
import { listProducts } from "@/services/productService";
import { listRawMaterials } from "@/services/inventoryService";
import { recomputeAlerts } from "@/services/alertsService";
import type {
  Product,
  ProductionBatch,
  RawMaterial,
} from "@/types/operations";
import {
  addDaysISO,
  formatDate,
  formatNumber,
  todayISO,
} from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

export function ProductionPage() {
  const { hasRole, session } = useAuth();
  const canCreate = hasRole(["admin", "production"]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [stats, setStats] = useState({
    totalBatches: 0,
    totalOutput: 0,
    totalWaste: 0,
    wasteRate: 0,
    perProduct: [] as { productName: string; output: number; waste: number }[],
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [raws, setRaws] = useState<RawMaterial[]>([]);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    const [b, s, p, r] = await Promise.all([
      listProductionBatches(),
      getProductionStats(),
      listProducts(),
      listRawMaterials(),
    ]);
    setBatches(b);
    setStats(s);
    setProducts(p);
    setRaws(r);
  }
  useEffect(() => {
    load();
  }, []);

  const wastePct = `${(stats.wasteRate * 100).toFixed(1)}%`;

  const chartData = useMemo(
    () =>
      stats.perProduct.map((p) => ({
        label: p.productName.split(" ")[0],
        value: p.output,
        fill:
          p.productName === "Spicy Suya"
            ? "bg-[#B23E0E]"
            : "bg-green-500",
      })),
    [stats.perProduct]
  );

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Production"
        subtitle="Record production runs. Raw materials are deducted and finished stock is created automatically."
        actions={
          canCreate && (
            <button onClick={() => setShowNew(true)} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              New batch
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total batches"
          value={stats.totalBatches}
          icon={<CubeIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Total output"
          value={formatNumber(stats.totalOutput)}
          hint="Units produced"
          tone="good"
        />
        <StatCard
          label="Total waste"
          value={formatNumber(stats.totalWaste)}
          tone={stats.wasteRate > 0.05 ? "warn" : "neutral"}
          icon={<ArchiveBoxXMarkIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Waste rate"
          value={wastePct}
          tone={stats.wasteRate > 0.05 ? "warn" : "good"}
        />
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5 mb-5">
          <p className="eyebrow mb-3">Output by product</p>
          <SimpleBarChart data={chartData} format={formatNumber} />
        </div>
      )}

      {batches.length === 0 ? (
        <EmptyState
          title="No production runs yet"
          description="Record your first batch to start building stock."
          action={
            canCreate && (
              <button onClick={() => setShowNew(true)} className="btn-primary">
                <PlusIcon className="h-4 w-4" />
                New batch
              </button>
            )
          }
        />
      ) : (
        <div className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
              <tr>
                <th className="text-left px-4 py-2">Batch</th>
                <th className="text-left px-4 py-2">Product</th>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Operator</th>
                <th className="text-right px-4 py-2">Output</th>
                <th className="text-right px-4 py-2">Waste</th>
                <th className="text-left px-4 py-2">Expires</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t border-charcoal-50">
                  <td className="px-4 py-2 font-mono text-xs">{b.batchCode}</td>
                  <td className="px-4 py-2 font-medium text-charcoal-700">
                    {b.productName}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {formatDate(b.productionDate)}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">{b.operator}</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-700">
                    {formatNumber(b.outputQuantity)}
                  </td>
                  <td className="px-4 py-2 text-right text-[#B23E0E]">
                    {formatNumber(b.wasteQuantity)}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {formatDate(b.expiryDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewBatchModal
          products={products}
          raws={raws}
          operator={session?.name ?? "Operator"}
          onClose={() => setShowNew(false)}
          onSaved={async () => {
            setShowNew(false);
            await recomputeAlerts();
            await load();
          }}
        />
      )}
    </div>
  );
}

function NewBatchModal({
  products,
  raws,
  operator,
  onClose,
  onSaved,
}: {
  products: Product[];
  raws: RawMaterial[];
  operator: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [productionDate, setProductionDate] = useState(todayISO());
  const [expiryDate, setExpiryDate] = useState(addDaysISO(120));
  const [outputQuantity, setOutputQuantity] = useState(100);
  const [wasteQuantity, setWasteQuantity] = useState(0);
  const [rawUsed, setRawUsed] = useState<RawConsumption[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRawQty = (id: string, qty: number) => {
    setRawUsed((cur) => {
      const without = cur.filter((r) => r.rawMaterialId !== id);
      if (qty <= 0) return without;
      return [...without, { rawMaterialId: id, quantity: qty }];
    });
  };

  const submit = async () => {
    setError(null);
    if (!productId || outputQuantity <= 0) {
      setError("Enter output quantity.");
      return;
    }
    setBusy(true);
    try {
      await recordProductionBatch({
        productId,
        rawUsed,
        outputQuantity,
        wasteQuantity,
        productionDate,
        expiryDate,
        operator,
        notes: notes || null,
      });
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="New production batch"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || outputQuantity <= 0}
            className="btn-primary"
          >
            {busy ? "Saving…" : "Save batch"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
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
          <Field label="Operator">
            <input value={operator} disabled className="input opacity-70" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Production date">
            <input
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Expiry date">
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Output quantity (units)">
            <input
              type="number"
              min={1}
              value={outputQuantity}
              onChange={(e) => setOutputQuantity(Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Waste (units)">
            <input
              type="number"
              min={0}
              value={wasteQuantity}
              onChange={(e) => setWasteQuantity(Number(e.target.value))}
              className="input"
            />
          </Field>
        </div>

        <div>
          <p className="text-xs font-semibold text-charcoal-500 mb-2">
            Raw materials consumed
          </p>
          <div className="space-y-2">
            {raws.map((r) => {
              const used =
                rawUsed.find((x) => x.rawMaterialId === r.id)?.quantity ?? 0;
              const insufficient = used > r.quantity;
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 rounded-md ring-1 px-3 py-2 ${
                    insufficient
                      ? "ring-[#F4A36A] bg-[#FFE9D6]/40"
                      : "ring-charcoal-100 bg-cream-50/60"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-700">
                      {r.name}
                    </p>
                    <p className="text-[11px] text-charcoal-400">
                      Available: {formatNumber(r.quantity)} {r.unit}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={used}
                    onChange={(e) => setRawQty(r.id, Number(e.target.value))}
                    className="input w-24 text-right"
                    placeholder="0"
                  />
                  <span className="text-xs text-charcoal-400 w-10">
                    {r.unit}
                  </span>
                  {used > 0 && (
                    <button
                      onClick={() => setRawQty(r.id, 0)}
                      className="text-charcoal-300 hover:text-[#B23E0E]"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input"
          />
        </Field>

        {error && (
          <p className="text-xs text-[#B23E0E] bg-[#FFE9D6] rounded px-3 py-2 ring-1 ring-[#F4A36A]">
            {error}
          </p>
        )}
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
