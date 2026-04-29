import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CubeIcon,
  ShoppingCartIcon,
  TruckIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  BellAlertIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import {
  OrderStatusPill,
  PaymentStatusPill,
} from "@/components/operations/StatusPill";
import {
  getStockSummary,
  type ProductStockSummary,
} from "@/services/inventoryService";
import { listOrders } from "@/services/orderService";
import { getFinanceSummary } from "@/services/financeService";
import { listOpenAlerts, recomputeAlerts } from "@/services/alertsService";
import { listDeliveries } from "@/services/distributionService";
import type { Alert, Delivery, Order } from "@/types/operations";
import { formatNaira, formatNumber, relativeTime } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

export function OperationsDashboardPage() {
  const { session } = useAuth();
  const [stock, setStock] = useState<ProductStockSummary[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [finance, setFinance] = useState({
    todayRevenue: 0,
    todayProfit: 0,
    outstandingReceivables: 0,
  });

  useEffect(() => {
    (async () => {
      await recomputeAlerts();
      const [s, o, d, a, f] = await Promise.all([
        getStockSummary(),
        listOrders(),
        listDeliveries(),
        listOpenAlerts(),
        getFinanceSummary(),
      ]);
      setStock(s);
      setOrders(o);
      setDeliveries(d);
      setAlerts(a);
      setFinance(f);
    })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => o.createdAt.startsWith(today));
  const totalUnits = stock.reduce((s, p) => s + p.totalQuantity, 0);
  const lowStockProducts = stock.filter((p) => p.lowStock);
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const inTransit = deliveries.filter((d) => d.status === "in_transit");

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders]);

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title={`Welcome${session ? `, ${session.name}` : ""}`}
        subtitle="Today at Fine Boy Foods at a glance."
        actions={
          <Link to="/orders/new" className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            New order
          </Link>
        }
      />

      {alerts.length > 0 && (
        <Link
          to="/alerts"
          className="bg-[#FFE9D6] ring-1 ring-[#F4A36A] rounded-lg p-3 mb-5 flex items-center gap-3 hover:bg-[#FFD9B6] transition-colors"
        >
          <BellAlertIcon className="h-5 w-5 text-[#B23E0E] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#B23E0E]">
              {alerts.length} open alert{alerts.length === 1 ? "" : "s"}
            </p>
            <p className="text-xs text-[#B23E0E]/80 truncate">
              {alerts[0].title}
              {alerts.length > 1 && ` · +${alerts.length - 1} more`}
            </p>
          </div>
          <span className="text-xs text-[#B23E0E] font-semibold">
            View all →
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total stock"
          value={formatNumber(totalUnits)}
          hint={`Across ${stock.length} product${stock.length === 1 ? "" : "s"}`}
          tone={totalUnits > 0 ? "neutral" : "warn"}
          icon={<CubeIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Today's orders"
          value={todayOrders.length}
          hint={formatNaira(todayOrders.reduce((s, o) => s + o.totalAmount, 0))}
          tone="good"
          icon={<ShoppingCartIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Today's revenue"
          value={formatNaira(finance.todayRevenue)}
          hint={`Profit ${formatNaira(finance.todayProfit)}`}
          tone={finance.todayProfit >= 0 ? "good" : "bad"}
          icon={<CurrencyDollarIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Low stock products"
          value={lowStockProducts.length}
          hint={`${alerts.length} active alerts`}
          tone={lowStockProducts.length > 0 ? "warn" : "good"}
          icon={<ExclamationTriangleIcon className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Stock by product */}
        <section className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-charcoal-700">
              Stock by product
            </h2>
            <Link
              to="/inventory"
              className="text-xs text-green-700 hover:underline"
            >
              Inventory →
            </Link>
          </div>
          {stock.length === 0 ? (
            <p className="text-xs text-charcoal-400 italic">No products yet.</p>
          ) : (
            <ul className="space-y-3">
              {stock.map((s) => (
                <li key={s.product.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-charcoal-700">
                      {s.product.name}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        s.lowStock ? "text-[#B23E0E]" : "text-charcoal-700"
                      }`}
                    >
                      {formatNumber(s.totalQuantity)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-cream-100 overflow-hidden">
                    <div
                      className={`h-full ${
                        s.lowStock ? "bg-[#B23E0E]" : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (s.totalQuantity /
                            Math.max(1, s.product.lowStockThreshold * 4)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-charcoal-400 mt-0.5">
                    {s.batches.length} batch
                    {s.batches.length === 1 ? "" : "es"}
                    {s.expiringSoonCount > 0 &&
                      ` · ${s.expiringSoonCount} expiring soon`}
                    {s.expiredCount > 0 &&
                      ` · ${s.expiredCount} expired`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pipeline */}
        <section className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-charcoal-700">
              Order pipeline
            </h2>
            <Link
              to="/orders"
              className="text-xs text-green-700 hover:underline"
            >
              All orders →
            </Link>
          </div>
          <div className="space-y-2">
            <PipelineRow
              label="Pending"
              count={pendingOrders.length}
              total={orders.length}
              color="bg-cream-200"
            />
            <PipelineRow
              label="Processing"
              count={orders.filter((o) => o.status === "processing").length}
              total={orders.length}
              color="bg-[#C2D6EE]"
            />
            <PipelineRow
              label="In transit"
              count={inTransit.length}
              total={Math.max(deliveries.length, 1)}
              color="bg-green-200"
            />
            <PipelineRow
              label="Delivered"
              count={orders.filter((o) => o.status === "delivered").length}
              total={orders.length}
              color="bg-green-500"
            />
          </div>
        </section>

        {/* Receivables */}
        <section className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-charcoal-700">Money</h2>
            <Link
              to="/finance"
              className="text-xs text-green-700 hover:underline"
            >
              Finance →
            </Link>
          </div>
          <div className="space-y-3">
            <div>
              <p className="eyebrow">Receivables</p>
              <p
                className={`text-2xl font-bold ${
                  finance.outstandingReceivables > 0
                    ? "text-[#B23E0E]"
                    : "text-green-700"
                }`}
              >
                {formatNaira(finance.outstandingReceivables)}
              </p>
              <p className="text-[11px] text-charcoal-400">
                Owed by customers
              </p>
            </div>
            <div className="border-t border-charcoal-100 pt-3">
              <p className="eyebrow">In transit</p>
              <p className="text-2xl font-bold text-charcoal-700">
                {inTransit.length}
              </p>
              <p className="text-[11px] text-charcoal-400">
                Currently being delivered
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Recent orders */}
      <section className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-hidden">
        <header className="px-5 py-3 border-b border-charcoal-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-charcoal-700">
            Recent orders
          </h2>
          <Link
            to="/orders"
            className="text-xs text-green-700 hover:underline"
          >
            View all →
          </Link>
        </header>
        {recentOrders.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-charcoal-400">No orders yet.</p>
            <Link to="/orders/new" className="btn-primary mt-3 inline-flex">
              <PlusIcon className="h-4 w-4" />
              Take first order
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
              <tr>
                <th className="text-left px-5 py-2">Order</th>
                <th className="text-left px-5 py-2">Retailer</th>
                <th className="text-right px-5 py-2">Amount</th>
                <th className="text-left px-5 py-2">Status</th>
                <th className="text-left px-5 py-2">Payment</th>
                <th className="text-left px-5 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-charcoal-50 hover:bg-cream-50/40"
                >
                  <td className="px-5 py-2">
                    <Link
                      to={`/orders/${o.id}`}
                      className="font-mono text-xs text-charcoal-700 hover:text-green-700 font-semibold"
                    >
                      {o.orderCode}
                    </Link>
                  </td>
                  <td className="px-5 py-2 font-medium text-charcoal-700">
                    {o.retailerName}
                  </td>
                  <td className="px-5 py-2 text-right font-semibold">
                    {formatNaira(o.totalAmount)}
                  </td>
                  <td className="px-5 py-2">
                    <OrderStatusPill status={o.status} />
                  </td>
                  <td className="px-5 py-2">
                    <PaymentStatusPill status={o.paymentStatus} />
                  </td>
                  <td className="px-5 py-2 text-charcoal-500">
                    {relativeTime(o.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Quick actions */}
      <h2 className="eyebrow mt-6 mb-3">Quick actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction
          to="/inventory"
          icon={<CubeIcon className="h-5 w-5" />}
          title="Inventory"
          subtitle="Track stock & batches"
        />
        <QuickAction
          to="/production"
          icon={<PlusIcon className="h-5 w-5" />}
          title="Production"
          subtitle="Record a batch"
        />
        <QuickAction
          to="/distribution"
          icon={<TruckIcon className="h-5 w-5" />}
          title="Distribution"
          subtitle="Schedule deliveries"
        />
        <QuickAction
          to="/finance"
          icon={<CurrencyDollarIcon className="h-5 w-5" />}
          title="Finance"
          subtitle="Revenue & expenses"
        />
      </div>
    </div>
  );
}

function PipelineRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs font-semibold text-charcoal-600">{label}</span>
        <span className="text-xs font-bold text-charcoal-700">{count}</span>
      </div>
      <div className="h-1.5 rounded-full bg-cream-100 overflow-hidden">
        <div
          className={`h-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      to={to}
      className="card hover:shadow-md hover:-translate-y-0.5 ease-standard group block"
    >
      <div className="h-10 w-10 rounded-md bg-green-50 flex items-center justify-center text-green-700 mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-charcoal-700 group-hover:text-green-600 transition-colors">
        {title}
      </h3>
      <p className="text-xs text-charcoal-400 mt-1">{subtitle}</p>
    </Link>
  );
}
