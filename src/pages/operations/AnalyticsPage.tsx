import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import { EmptyState } from "@/components/operations/EmptyState";
import { SimpleBarChart } from "@/components/operations/SimpleBarChart";
import { SimpleLineChart } from "@/components/operations/SimpleLineChart";
import { listOrders } from "@/services/orderService";
import { getStockSummary } from "@/services/inventoryService";
import { getDailyTotals } from "@/services/financeService";
import type { Order } from "@/types/operations";
import type { ProductStockSummary } from "@/services/inventoryService";
import { formatNaira, formatNumber } from "@/lib/format";

interface Insights {
  bestSellerByQty: { name: string; qty: number };
  bestSellerByRevenue: { name: string; revenue: number };
  productSales: { name: string; qty: number; revenue: number }[];
  ordersByDay: { date: string; revenue: number; orders: number }[];
  topRetailers: { name: string; revenue: number; orders: number }[];
  stockTurnover: { name: string; sold: number; remaining: number }[];
  totalRevenue: number;
  avgOrderValue: number;
}

export function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stock, setStock] = useState<ProductStockSummary[]>([]);
  const [daily, setDaily] = useState<
    { date: string; revenue: number; expenses: number }[]
  >([]);

  useEffect(() => {
    Promise.all([listOrders(), getStockSummary(), getDailyTotals(30)]).then(
      ([o, s, d]) => {
        setOrders(o);
        setStock(s);
        setDaily(d);
      }
    );
  }, []);

  const insights: Insights = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== "cancelled");

    const productMap = new Map<string, { qty: number; revenue: number }>();
    const retailerMap = new Map<string, { revenue: number; orders: number }>();

    for (const o of validOrders) {
      const r = retailerMap.get(o.retailerName) ?? { revenue: 0, orders: 0 };
      r.revenue += o.totalAmount;
      r.orders += 1;
      retailerMap.set(o.retailerName, r);

      for (const item of o.items) {
        const cur = productMap.get(item.productName) ?? {
          qty: 0,
          revenue: 0,
        };
        cur.qty += item.quantity;
        cur.revenue += item.lineTotal;
        productMap.set(item.productName, cur);
      }
    }

    const productSales = Array.from(productMap.entries())
      .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
      .sort((a, b) => b.qty - a.qty);

    const bestSellerByQty = productSales[0] ?? { name: "—", qty: 0 };
    const bestSellerByRevenue = [...productSales].sort(
      (a, b) => b.revenue - a.revenue
    )[0] ?? { name: "—", revenue: 0 };

    const topRetailers = Array.from(retailerMap.entries())
      .map(([name, v]) => ({ name, revenue: v.revenue, orders: v.orders }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const stockTurnover = stock.map((s) => {
      const sold = productMap.get(s.product.name)?.qty ?? 0;
      return {
        name: s.product.name,
        sold,
        remaining: s.totalQuantity,
      };
    });

    const totalRevenue = validOrders.reduce(
      (s, o) => s + o.totalAmount,
      0
    );
    const avgOrderValue =
      validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

    // Bucket orders by day from daily totals
    const ordersByDay = daily.map((d) => ({
      date: d.date,
      revenue: d.revenue,
      orders: validOrders.filter((o) => o.createdAt.startsWith(d.date)).length,
    }));

    return {
      bestSellerByQty: {
        name: bestSellerByQty.name,
        qty: bestSellerByQty.qty,
      },
      bestSellerByRevenue: {
        name: bestSellerByRevenue.name,
        revenue: bestSellerByRevenue.revenue,
      },
      productSales,
      ordersByDay,
      topRetailers,
      stockTurnover,
      totalRevenue,
      avgOrderValue,
    };
  }, [orders, stock, daily]);

  const hasData = orders.some((o) => o.status !== "cancelled");

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Analytics"
        subtitle="Best sellers, sales trends, stock turnover, and top retailers."
      />

      {!hasData ? (
        <EmptyState
          title="Not enough data yet"
          description="Once you process some orders, charts and best-seller insights will appear here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <StatCard
              label="Total revenue (all-time)"
              value={formatNaira(insights.totalRevenue)}
              tone="good"
            />
            <StatCard
              label="Avg order value"
              value={formatNaira(insights.avgOrderValue)}
            />
            <StatCard
              label="Best seller (qty)"
              value={insights.bestSellerByQty.name}
              hint={`${formatNumber(insights.bestSellerByQty.qty)} units`}
              tone="good"
            />
            <StatCard
              label="Best seller (revenue)"
              value={insights.bestSellerByRevenue.name}
              hint={formatNaira(insights.bestSellerByRevenue.revenue)}
            />
          </div>

          {insights.productSales.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
              <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
                <p className="eyebrow mb-3">Units sold by product</p>
                <SimpleBarChart
                  data={insights.productSales.map((p) => ({
                    label: p.name.split(" ")[0],
                    value: p.qty,
                    fill:
                      p.name === "Spicy Suya"
                        ? "bg-[#B23E0E]"
                        : "bg-green-500",
                  }))}
                  format={formatNumber}
                />
              </div>
              <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
                <p className="eyebrow mb-3">Revenue by product</p>
                <SimpleBarChart
                  data={insights.productSales.map((p) => ({
                    label: p.name.split(" ")[0],
                    value: p.revenue,
                    fill:
                      p.name === "Spicy Suya"
                        ? "bg-[#B23E0E]"
                        : "bg-green-500",
                  }))}
                  format={formatNaira}
                />
              </div>
            </div>
          )}

          {insights.ordersByDay.some((d) => d.revenue > 0) && (
            <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5 mb-5">
              <p className="eyebrow mb-3">Sales over time (30d)</p>
              <SimpleLineChart
                data={insights.ordersByDay.map((d) => ({
                  label: d.date.slice(5),
                  value: d.revenue,
                }))}
                format={formatNaira}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {insights.stockTurnover.length > 0 && (
              <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
                <p className="eyebrow mb-3">Stock turnover</p>
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase text-charcoal-400">
                    <tr>
                      <th className="text-left py-2">Product</th>
                      <th className="text-right py-2">Sold</th>
                      <th className="text-right py-2">In stock</th>
                      <th className="text-right py-2">Turnover</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.stockTurnover.map((p) => {
                      const total = p.sold + p.remaining;
                      const pct = total > 0 ? (p.sold / total) * 100 : 0;
                      return (
                        <tr
                          key={p.name}
                          className="border-t border-charcoal-50"
                        >
                          <td className="py-2 font-medium text-charcoal-700">
                            {p.name}
                          </td>
                          <td className="py-2 text-right text-charcoal-500">
                            {formatNumber(p.sold)}
                          </td>
                          <td className="py-2 text-right text-charcoal-500">
                            {formatNumber(p.remaining)}
                          </td>
                          <td className="py-2 text-right font-semibold text-charcoal-700">
                            {pct.toFixed(0)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {insights.topRetailers.length > 0 && (
              <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
                <p className="eyebrow mb-3">Top retailers</p>
                <ol className="space-y-2">
                  {insights.topRetailers.map((r, i) => (
                    <li
                      key={r.name}
                      className="flex items-center gap-3 py-1.5"
                    >
                      <span className="w-6 h-6 rounded-full bg-cream-100 text-charcoal-500 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-charcoal-700 truncate">
                        {r.name}
                      </span>
                      <span className="text-xs text-charcoal-400">
                        {r.orders} order{r.orders === 1 ? "" : "s"}
                      </span>
                      <span className="text-sm font-bold text-charcoal-700">
                        {formatNaira(r.revenue)}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
