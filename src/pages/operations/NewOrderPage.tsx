import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeftIcon,
  CheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { listProducts } from "@/services/productService";
import { getStockSummary } from "@/services/inventoryService";
import { getAllRetailers } from "@/services/retailerService";
import { createOrder } from "@/services/orderService";
import { recomputeAlerts } from "@/services/alertsService";
import { formatNaira, formatNumber } from "@/lib/format";
import type { OrderItem, Product } from "@/types/operations";
import type { Retailer } from "@/types/retailer";
import type { ProductStockSummary } from "@/services/inventoryService";

type ProductWithStock = Product & { available: number };

export function NewOrderPage() {
  const navigate = useNavigate();
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [retailerId, setRetailerId] = useState<string>("");
  const [items, setItems] = useState<Record<string, number>>({});
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAllRetailers(), listProducts(), getStockSummary()]).then(
      ([rs, ps, summary]: [Retailer[], Product[], ProductStockSummary[]]) => {
        const stockMap = new Map(
          summary.map((s) => [s.product.id, s.totalQuantity])
        );
        setRetailers(rs);
        setProducts(
          ps.map((p) => ({ ...p, available: stockMap.get(p.id) ?? 0 }))
        );
        if (rs.length > 0) setRetailerId(rs[0].id);
      }
    );
  }, []);

  const total = useMemo(() => {
    return products.reduce((sum, p) => {
      const qty = items[p.id] ?? 0;
      return sum + qty * p.unitPrice;
    }, 0);
  }, [items, products]);

  const orderItems: OrderItem[] = products
    .filter((p) => (items[p.id] ?? 0) > 0)
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      quantity: items[p.id],
      unitPrice: p.unitPrice,
      lineTotal: items[p.id] * p.unitPrice,
    }));

  const setQty = (productId: string, qty: number) => {
    setItems((cur) => {
      const next = { ...cur };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  };

  const submit = async () => {
    setError(null);
    if (!retailerId) {
      setError("Pick a retailer.");
      return;
    }
    if (orderItems.length === 0) {
      setError("Add at least one product.");
      return;
    }
    const retailer = retailers.find((r) => r.id === retailerId);
    if (!retailer) return;
    setBusy(true);
    try {
      const order = await createOrder({
        retailerId,
        retailerName: retailer.businessName,
        items: orderItems,
        amountPaid: Math.min(total, amountPaid),
        notes: notes || null,
      });
      await recomputeAlerts();
      navigate(`/orders/${order.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div>
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-sm text-charcoal-500 hover:text-charcoal-700 mb-3"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to orders
      </Link>

      <PageHeader
        eyebrow="Operations"
        title="New order"
        subtitle="Create an order for a retailer. Stock is allocated when you mark it as Processing."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <section className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
            <h2 className="text-sm font-semibold text-charcoal-700 mb-3">
              1. Choose retailer
            </h2>
            {retailers.length === 0 ? (
              <p className="text-sm text-charcoal-400">
                No retailers in your CRM yet.{" "}
                <Link
                  to="/retailers/import"
                  className="text-green-700 underline"
                >
                  Add one first
                </Link>
                .
              </p>
            ) : (
              <select
                value={retailerId}
                onChange={(e) => setRetailerId(e.target.value)}
                className="input"
              >
                {retailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.businessName} — {r.area}
                  </option>
                ))}
              </select>
            )}
          </section>

          <section className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
            <h2 className="text-sm font-semibold text-charcoal-700 mb-3">
              2. Add products
            </h2>
            <div className="space-y-2">
              {products.map((p) => {
                const qty = items[p.id] ?? 0;
                const insufficient = qty > p.available;
                return (
                  <div
                    key={p.id}
                    className={`rounded-md ring-1 px-4 py-3 flex items-center gap-3 ${
                      insufficient
                        ? "ring-[#F4A36A] bg-[#FFE9D6]/40"
                        : "ring-charcoal-100 bg-cream-50/60"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-charcoal-700 text-sm">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-charcoal-400">
                        {p.sku} · {formatNaira(p.unitPrice)} ea ·{" "}
                        <span
                          className={
                            p.available < 50
                              ? "text-[#B23E0E] font-semibold"
                              : ""
                          }
                        >
                          {formatNumber(p.available)} in stock
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setQty(p.id, Math.max(0, qty - 5))}
                        className="h-8 w-8 rounded-md bg-white ring-1 ring-charcoal-200 text-charcoal-500 hover:bg-cream-100"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => setQty(p.id, Number(e.target.value))}
                        className="input w-20 text-center"
                      />
                      <button
                        onClick={() => setQty(p.id, qty + 5)}
                        className="h-8 w-8 rounded-md bg-white ring-1 ring-charcoal-200 text-charcoal-500 hover:bg-cream-100"
                      >
                        +
                      </button>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs text-charcoal-400">Line</p>
                      <p className="font-bold text-charcoal-700 text-sm">
                        {formatNaira(qty * p.unitPrice)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
            <h2 className="text-sm font-semibold text-charcoal-700 mb-3">
              3. Notes
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything the driver or finance should know."
              className="input"
            />
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5 sticky top-4">
            <h2 className="text-sm font-semibold text-charcoal-700 mb-3">
              Summary
            </h2>
            {orderItems.length === 0 ? (
              <p className="text-xs text-charcoal-400 mb-4">
                No products added yet.
              </p>
            ) : (
              <ul className="space-y-2 mb-4">
                {orderItems.map((i) => (
                  <li
                    key={i.productId}
                    className="flex items-center text-sm gap-2"
                  >
                    <button
                      onClick={() => setQty(i.productId, 0)}
                      className="text-charcoal-300 hover:text-[#B23E0E]"
                      title="Remove"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex-1 text-charcoal-600 truncate">
                      {i.productName}
                    </span>
                    <span className="text-charcoal-400 text-xs">
                      ×{i.quantity}
                    </span>
                    <span className="text-charcoal-700 font-semibold w-20 text-right">
                      {formatNaira(i.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-charcoal-100 pt-3 space-y-1 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-500">Total</span>
                <span className="font-bold text-charcoal-700">
                  {formatNaira(total)}
                </span>
              </div>
            </div>

            <label className="block mb-3">
              <span className="block text-xs font-semibold text-charcoal-500 mb-1">
                Amount paid now (₦)
              </span>
              <input
                type="number"
                min={0}
                max={total}
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                className="input"
              />
              {amountPaid > 0 && amountPaid < total && (
                <p className="text-[11px] text-gold-600 mt-1">
                  Outstanding: {formatNaira(total - amountPaid)}
                </p>
              )}
            </label>

            {error && (
              <p className="text-xs text-[#B23E0E] bg-[#FFE9D6] rounded px-3 py-2 mb-3 ring-1 ring-[#F4A36A]">
                {error}
              </p>
            )}

            <button
              onClick={submit}
              disabled={busy || orderItems.length === 0}
              className="btn-primary w-full"
            >
              <CheckIcon className="h-4 w-4" />
              {busy ? "Creating…" : "Create order"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
