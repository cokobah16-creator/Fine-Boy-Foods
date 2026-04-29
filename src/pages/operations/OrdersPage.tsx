import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PlusIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import { EmptyState } from "@/components/operations/EmptyState";
import {
  OrderStatusPill,
  PaymentStatusPill,
} from "@/components/operations/StatusPill";
import { listOrders } from "@/services/orderService";
import { formatNaira, relativeTime } from "@/lib/format";
import type { Order, OrderStatus } from "@/types/operations";

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    listOrders().then(setOrders);
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((o) => o.createdAt.startsWith(today));
    return {
      total: orders.length,
      todayCount: todayOrders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      processing: orders.filter((o) => o.status === "processing").length,
      todayRevenue: todayOrders.reduce(
        (s, o) => s + o.amountPaid,
        0
      ),
    };
  }, [orders]);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !o.orderCode.toLowerCase().includes(q) &&
        !o.retailerName.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Orders"
        subtitle="Take and track retailer orders from creation through delivery."
        actions={
          <Link to="/orders/new" className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            New order
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total orders" value={stats.total} />
        <StatCard
          label="Today"
          value={stats.todayCount}
          hint={formatNaira(stats.todayRevenue)}
          tone="good"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          tone={stats.pending > 0 ? "warn" : "neutral"}
        />
        <StatCard
          label="Processing"
          value={stats.processing}
          hint="Stock allocated"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          placeholder="Search by code or retailer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <div className="flex flex-wrap bg-cream-100 ring-1 ring-charcoal-100 rounded-md p-0.5">
          {(
            [
              "all",
              "pending",
              "processing",
              "delivered",
              "cancelled",
            ] as const
          ).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-semibold capitalize ${
                statusFilter === s
                  ? "bg-white text-charcoal-700 shadow-xs"
                  : "text-charcoal-500"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Take your first order to start tracking sales."
          action={
            <Link to="/orders/new" className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              New order
            </Link>
          }
        />
      ) : (
        <div className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
              <tr>
                <th className="text-left px-4 py-2">Order</th>
                <th className="text-left px-4 py-2">Retailer</th>
                <th className="text-right px-4 py-2">Items</th>
                <th className="text-right px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">Payment</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-charcoal-50 hover:bg-cream-50/40"
                >
                  <td className="px-4 py-2">
                    <Link
                      to={`/orders/${o.id}`}
                      className="font-mono text-xs text-charcoal-700 hover:text-green-700 font-semibold"
                    >
                      {o.orderCode}
                    </Link>
                  </td>
                  <td className="px-4 py-2 font-medium text-charcoal-700">
                    {o.retailerName}
                  </td>
                  <td className="px-4 py-2 text-right text-charcoal-500">
                    {o.items.reduce((s, i) => s + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-charcoal-700">
                    {formatNaira(o.totalAmount)}
                  </td>
                  <td className="px-4 py-2">
                    <PaymentStatusPill status={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-2">
                    <OrderStatusPill status={o.status} />
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {relativeTime(o.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
