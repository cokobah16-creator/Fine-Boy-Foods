import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import { EmptyState } from "@/components/operations/EmptyState";
import { Modal } from "@/components/operations/Modal";
import {
  listCustomers,
  recordPayment,
  type CustomerSummary,
} from "@/services/customerService";
import { addRevenueEntry } from "@/services/financeService";
import { recomputeAlerts } from "@/services/alertsService";
import { formatNaira, relativeTime } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

export function CustomersPage() {
  const { hasRole, session } = useAuth();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [filter, setFilter] = useState<"all" | "owing" | "active">("all");
  const [search, setSearch] = useState("");
  const [paymentFor, setPaymentFor] = useState<CustomerSummary | null>(null);
  const canAcceptPayment = hasRole(["admin"]);

  async function load() {
    setCustomers(await listCustomers());
  }
  useEffect(() => {
    load();
  }, []);

  const totalReceivable = customers.reduce((s, c) => s + c.credit.balance, 0);
  const owingCount = customers.filter((c) => c.credit.balance > 0).length;
  const activeCount = customers.filter((c) => c.orderCount > 0).length;

  const filtered = customers.filter((c) => {
    if (filter === "owing" && c.credit.balance <= 0) return false;
    if (filter === "active" && c.orderCount === 0) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !c.retailer.businessName.toLowerCase().includes(q) &&
        !c.retailer.area.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Customers"
        subtitle="Active retailer accounts buying FBF products. Track credit and order history."
        actions={
          <Link to="/retailers/import" className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Add retailer
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Total customers"
          value={customers.length}
          icon={<BuildingStorefrontIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Active (with orders)"
          value={activeCount}
          tone="good"
        />
        <StatCard
          label="Owing"
          value={owingCount}
          tone={owingCount > 0 ? "warn" : "good"}
        />
        <StatCard
          label="Receivables"
          value={formatNaira(totalReceivable)}
          tone={totalReceivable > 0 ? "warn" : "good"}
          icon={<CurrencyDollarIcon className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          placeholder="Search by name or area"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <div className="flex bg-cream-100 ring-1 ring-charcoal-100 rounded-md p-0.5">
          {(["all", "active", "owing"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded text-xs font-semibold capitalize ${
                filter === f
                  ? "bg-white text-charcoal-700 shadow-xs"
                  : "text-charcoal-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Add a retailer or change your filter."
        />
      ) : (
        <div className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
              <tr>
                <th className="text-left px-4 py-2">Customer</th>
                <th className="text-left px-4 py-2">Area</th>
                <th className="text-right px-4 py-2">Orders</th>
                <th className="text-right px-4 py-2">Total bought</th>
                <th className="text-right px-4 py-2">Owes</th>
                <th className="text-left px-4 py-2">Last order</th>
                <th className="px-4 py-2 w-32" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.retailer.id}
                  className="border-t border-charcoal-50 hover:bg-cream-50/40"
                >
                  <td className="px-4 py-2">
                    <Link
                      to={`/retailers/${c.retailer.id}`}
                      className="font-semibold text-charcoal-700 hover:text-green-700"
                    >
                      {c.retailer.businessName}
                    </Link>
                    {c.retailer.phone && (
                      <p className="text-[11px] text-charcoal-400">
                        {c.retailer.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {c.retailer.area}
                  </td>
                  <td className="px-4 py-2 text-right text-charcoal-700 font-semibold">
                    {c.orderCount}
                  </td>
                  <td className="px-4 py-2 text-right text-charcoal-500">
                    {formatNaira(c.credit.totalPurchased)}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      c.credit.balance > 0
                        ? "text-[#B23E0E]"
                        : "text-green-700"
                    }`}
                  >
                    {formatNaira(c.credit.balance)}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {relativeTime(c.lastOrderAt)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canAcceptPayment && c.credit.balance > 0 && (
                      <button
                        onClick={() => setPaymentFor(c)}
                        className="text-[11px] px-2 py-1 rounded bg-green-50 text-green-700 ring-1 ring-green-100 inline-flex items-center gap-1"
                      >
                        <CreditCardIcon className="h-3 w-3" />
                        Record payment
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paymentFor && (
        <PaymentModal
          customer={paymentFor}
          recordedBy={session?.name ?? "system"}
          onClose={() => setPaymentFor(null)}
          onSaved={async () => {
            setPaymentFor(null);
            await recomputeAlerts();
            await load();
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({
  customer,
  recordedBy,
  onClose,
  onSaved,
}: {
  customer: CustomerSummary;
  recordedBy: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [amount, setAmount] = useState(customer.credit.balance);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (amount <= 0) return;
    setBusy(true);
    try {
      await recordPayment(customer.retailer.id, amount);
      await addRevenueEntry({
        amount,
        description: `Payment from ${customer.retailer.businessName}`,
        occurredAt: new Date().toISOString(),
        recordedBy,
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Record payment — ${customer.retailer.businessName}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || amount <= 0}
            className="btn-primary"
          >
            {busy ? "Saving…" : "Record"}
          </button>
        </div>
      }
    >
      <p className="text-sm text-charcoal-500 mb-3">
        Outstanding balance:{" "}
        <strong className="text-charcoal-700">
          {formatNaira(customer.credit.balance)}
        </strong>
      </p>
      <label className="block">
        <span className="block text-xs font-semibold text-charcoal-500 mb-1">
          Amount paid (₦)
        </span>
        <input
          type="number"
          min={1}
          max={customer.credit.balance}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="input"
        />
      </label>
    </Modal>
  );
}
