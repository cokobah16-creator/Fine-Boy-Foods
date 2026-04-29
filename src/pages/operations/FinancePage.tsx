import { useEffect, useState } from "react";
import {
  CurrencyDollarIcon,
  TrashIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import { EmptyState } from "@/components/operations/EmptyState";
import { Modal } from "@/components/operations/Modal";
import { SimpleLineChart } from "@/components/operations/SimpleLineChart";
import {
  addExpenseEntry,
  addRevenueEntry,
  deleteFinanceEntry,
  getDailyTotals,
  getFinanceSummary,
  listFinanceEntries,
  type FinanceSummary,
} from "@/services/financeService";
import { recomputeAlerts } from "@/services/alertsService";
import {
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
  type FinanceEntry,
} from "@/types/operations";
import { formatDate, formatNaira, todayISO } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

export function FinancePage() {
  const { hasRole, session } = useAuth();
  const canEdit = hasRole(["admin"]);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    todayRevenue: 0,
    todayExpenses: 0,
    todayProfit: 0,
    weekRevenue: 0,
    weekExpenses: 0,
    monthRevenue: 0,
    monthExpenses: 0,
    monthProfit: 0,
    outstandingReceivables: 0,
  });
  const [daily, setDaily] = useState<
    { date: string; revenue: number; expenses: number }[]
  >([]);
  const [showRevenue, setShowRevenue] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  async function load() {
    const [e, s, d] = await Promise.all([
      listFinanceEntries(),
      getFinanceSummary(),
      getDailyTotals(14),
    ]);
    setEntries(e);
    setSummary(s);
    setDaily(d);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Finance"
        subtitle="Daily revenue, expenses, profit, and outstanding receivables."
        actions={
          canEdit && (
            <>
              <button
                onClick={() => setShowExpense(true)}
                className="btn-secondary"
              >
                <ArrowTrendingDownIcon className="h-4 w-4" />
                Add expense
              </button>
              <button
                onClick={() => setShowRevenue(true)}
                className="btn-primary"
              >
                <ArrowTrendingUpIcon className="h-4 w-4" />
                Add revenue
              </button>
            </>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Today revenue"
          value={formatNaira(summary.todayRevenue)}
          tone="good"
          icon={<ArrowTrendingUpIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Today expenses"
          value={formatNaira(summary.todayExpenses)}
          tone={summary.todayExpenses > 0 ? "warn" : "neutral"}
          icon={<ArrowTrendingDownIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Today profit"
          value={formatNaira(summary.todayProfit)}
          tone={summary.todayProfit >= 0 ? "good" : "bad"}
        />
        <StatCard
          label="Receivables"
          value={formatNaira(summary.outstandingReceivables)}
          hint="Owed by customers"
          tone={summary.outstandingReceivables > 0 ? "warn" : "good"}
          icon={<CurrencyDollarIcon className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Last 7 days revenue"
          value={formatNaira(summary.weekRevenue)}
        />
        <StatCard
          label="Month revenue"
          value={formatNaira(summary.monthRevenue)}
        />
        <StatCard
          label="Month profit"
          value={formatNaira(summary.monthProfit)}
          tone={summary.monthProfit >= 0 ? "good" : "bad"}
        />
      </div>

      {daily.some((d) => d.revenue > 0 || d.expenses > 0) && (
        <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5 mb-5">
          <p className="eyebrow mb-3">Last 14 days — revenue</p>
          <SimpleLineChart
            data={daily.map((d) => ({
              label: d.date.slice(5),
              value: d.revenue,
            }))}
            format={formatNaira}
          />
          <p className="eyebrow mb-3 mt-5">Last 14 days — expenses</p>
          <SimpleLineChart
            data={daily.map((d) => ({
              label: d.date.slice(5),
              value: d.expenses,
            }))}
            format={formatNaira}
            stroke="#B23E0E"
          />
        </div>
      )}

      <h2 className="text-sm font-semibold text-charcoal-700 mb-2">
        Recent entries
      </h2>
      {entries.length === 0 ? (
        <EmptyState
          title="No finance entries yet"
          description="Revenue is logged automatically when payments are received. Add expenses manually."
        />
      ) : (
        <div className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
              <tr>
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Category</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-right px-4 py-2">Amount</th>
                <th className="text-left px-4 py-2">By</th>
                {canEdit && <th className="px-2 py-2 w-16" />}
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 100).map((e) => (
                <tr key={e.id} className="border-t border-charcoal-50">
                  <td className="px-4 py-2 text-charcoal-500">
                    {formatDate(e.occurredAt)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ring-1 ${
                        e.type === "revenue"
                          ? "bg-green-50 text-green-700 ring-green-100"
                          : "bg-[#FFE9D6] text-[#B23E0E] ring-[#F4A36A]"
                      }`}
                    >
                      {e.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {e.category
                      ? EXPENSE_CATEGORY_LABELS[e.category]
                      : e.orderId
                      ? "Order"
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-charcoal-700">
                    {e.description}
                  </td>
                  <td
                    className={`px-4 py-2 text-right font-semibold ${
                      e.type === "revenue" ? "text-green-700" : "text-[#B23E0E]"
                    }`}
                  >
                    {e.type === "expense" ? "-" : "+"}
                    {formatNaira(e.amount)}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {e.recordedBy}
                  </td>
                  {canEdit && (
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={async () => {
                          if (confirm("Delete this entry?")) {
                            await deleteFinanceEntry(e.id);
                            await load();
                          }
                        }}
                        className="text-charcoal-300 hover:text-[#B23E0E]"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showRevenue && (
        <RevenueModal
          recordedBy={session?.name ?? "Admin"}
          onClose={() => setShowRevenue(false)}
          onSaved={async () => {
            setShowRevenue(false);
            await recomputeAlerts();
            await load();
          }}
        />
      )}

      {showExpense && (
        <ExpenseModal
          recordedBy={session?.name ?? "Admin"}
          onClose={() => setShowExpense(false)}
          onSaved={async () => {
            setShowExpense(false);
            await recomputeAlerts();
            await load();
          }}
        />
      )}
    </div>
  );
}

function RevenueModal({
  recordedBy,
  onClose,
  onSaved,
}: {
  recordedBy: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (amount <= 0 || !description.trim()) return;
    setBusy(true);
    try {
      await addRevenueEntry({
        amount,
        description,
        occurredAt: new Date(date).toISOString(),
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
      title="Add revenue"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Add"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Amount (₦)">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            placeholder="e.g. Cash sale at Wuse market"
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </Field>
      </div>
    </Modal>
  );
}

function ExpenseModal({
  recordedBy,
  onClose,
  onSaved,
}: {
  recordedBy: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("raw_materials");
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (amount <= 0 || !description.trim()) return;
    setBusy(true);
    try {
      await addExpenseEntry({
        amount,
        description,
        category,
        occurredAt: new Date(date).toISOString(),
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
      title="Add expense"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-danger">
            {busy ? "Saving…" : "Record expense"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Amount (₦)">
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input"
          />
        </Field>
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            className="input"
          >
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
            placeholder="e.g. 50kg plantains from Garki market"
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </Field>
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
