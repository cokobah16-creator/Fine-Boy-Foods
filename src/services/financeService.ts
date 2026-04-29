import { db } from "@/lib/db";
import type {
  ExpenseCategory,
  FinanceEntry,
  Order,
} from "@/types/operations";

function uuid(): string {
  return crypto.randomUUID();
}

export async function listFinanceEntries(): Promise<FinanceEntry[]> {
  const entries = await db.financeEntries.toArray();
  return entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export async function addRevenueEntry(input: {
  amount: number;
  description: string;
  orderId?: string | null;
  occurredAt: string;
  recordedBy: string;
}): Promise<FinanceEntry> {
  const entry: FinanceEntry = {
    id: uuid(),
    type: "revenue",
    amount: input.amount,
    description: input.description,
    category: null,
    orderId: input.orderId ?? null,
    recordedBy: input.recordedBy,
    occurredAt: input.occurredAt,
    createdAt: new Date().toISOString(),
  };
  await db.financeEntries.add(entry);
  return entry;
}

export async function addExpenseEntry(input: {
  amount: number;
  description: string;
  category: ExpenseCategory;
  occurredAt: string;
  recordedBy: string;
}): Promise<FinanceEntry> {
  const entry: FinanceEntry = {
    id: uuid(),
    type: "expense",
    amount: input.amount,
    description: input.description,
    category: input.category,
    orderId: null,
    recordedBy: input.recordedBy,
    occurredAt: input.occurredAt,
    createdAt: new Date().toISOString(),
  };
  await db.financeEntries.add(entry);
  return entry;
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  await db.financeEntries.delete(id);
}

export interface FinanceSummary {
  todayRevenue: number;
  todayExpenses: number;
  todayProfit: number;
  weekRevenue: number;
  weekExpenses: number;
  monthRevenue: number;
  monthExpenses: number;
  monthProfit: number;
  outstandingReceivables: number;
}

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const entries = await db.financeEntries.toArray();
  const orders = await db.orders.toArray();

  const todayStart = startOfDay();
  const weekStart = startOfDay();
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = startOfDay();
  monthStart.setDate(1);

  let todayRevenue = 0,
    todayExpenses = 0,
    weekRevenue = 0,
    weekExpenses = 0,
    monthRevenue = 0,
    monthExpenses = 0;

  for (const e of entries) {
    const d = new Date(e.occurredAt);
    if (e.type === "revenue") {
      if (d >= todayStart) todayRevenue += e.amount;
      if (d >= weekStart) weekRevenue += e.amount;
      if (d >= monthStart) monthRevenue += e.amount;
    } else {
      if (d >= todayStart) todayExpenses += e.amount;
      if (d >= weekStart) weekExpenses += e.amount;
      if (d >= monthStart) monthExpenses += e.amount;
    }
  }

  const outstandingReceivables = orders
    .filter((o: Order) => o.status !== "cancelled")
    .reduce((s, o) => s + Math.max(0, o.totalAmount - o.amountPaid), 0);

  return {
    todayRevenue,
    todayExpenses,
    todayProfit: todayRevenue - todayExpenses,
    weekRevenue,
    weekExpenses,
    monthRevenue,
    monthExpenses,
    monthProfit: monthRevenue - monthExpenses,
    outstandingReceivables,
  };
}

export interface DailyTotals {
  date: string;
  revenue: number;
  expenses: number;
}

export async function getDailyTotals(days = 14): Promise<DailyTotals[]> {
  const entries = await db.financeEntries.toArray();
  const out: DailyTotals[] = [];
  const today = startOfDay();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const dayEntries = entries.filter((e) =>
      e.occurredAt.startsWith(dateKey)
    );
    const revenue = dayEntries
      .filter((e) => e.type === "revenue")
      .reduce((s, e) => s + e.amount, 0);
    const expenses = dayEntries
      .filter((e) => e.type === "expense")
      .reduce((s, e) => s + e.amount, 0);
    out.push({ date: dateKey, revenue, expenses });
  }
  return out;
}
