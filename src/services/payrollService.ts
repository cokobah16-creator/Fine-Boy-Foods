import { db } from "@/lib/db";
import { addExpenseEntry } from "@/services/financeService";
import type {
  Employee,
  EmployeeDepartment,
  EmployeeStatus,
  PayFrequency,
  PayrollEntry,
  PayrollRun,
  PayrollRunStatus,
} from "@/types/operations";

function uuid(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

// ── Employees ──────────────────────────────────────────────────────────────

export async function listEmployees(): Promise<Employee[]> {
  const rows = await db.employees.toArray();
  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function getEmployee(id: string): Promise<Employee | undefined> {
  return db.employees.get(id);
}

export interface EmployeeInput {
  fullName: string;
  role: string;
  department: EmployeeDepartment;
  phone?: string | null;
  email?: string | null;
  baseSalary: number;
  payFrequency: PayFrequency;
  bankName?: string | null;
  bankAccount?: string | null;
  hireDate: string;
  status?: EmployeeStatus;
  notes?: string | null;
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const employee: Employee = {
    id: uuid(),
    fullName: input.fullName.trim(),
    role: input.role.trim(),
    department: input.department,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    baseSalary: Math.max(0, input.baseSalary),
    payFrequency: input.payFrequency,
    bankName: input.bankName?.trim() || null,
    bankAccount: input.bankAccount?.trim() || null,
    hireDate: input.hireDate,
    status: input.status ?? "active",
    notes: input.notes?.trim() || null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await db.employees.add(employee);
  return employee;
}

export async function updateEmployee(
  id: string,
  patch: Partial<EmployeeInput>
): Promise<void> {
  const existing = await db.employees.get(id);
  if (!existing) return;
  const merged: Employee = {
    ...existing,
    ...patch,
    fullName: patch.fullName?.trim() ?? existing.fullName,
    role: patch.role?.trim() ?? existing.role,
    phone: patch.phone === undefined ? existing.phone : patch.phone?.trim() || null,
    email: patch.email === undefined ? existing.email : patch.email?.trim() || null,
    bankName:
      patch.bankName === undefined ? existing.bankName : patch.bankName?.trim() || null,
    bankAccount:
      patch.bankAccount === undefined
        ? existing.bankAccount
        : patch.bankAccount?.trim() || null,
    notes: patch.notes === undefined ? existing.notes : patch.notes?.trim() || null,
    updatedAt: nowISO(),
  };
  await db.employees.put(merged);
}

export async function deleteEmployee(id: string): Promise<void> {
  await db.employees.delete(id);
}

// ── Payroll Runs ───────────────────────────────────────────────────────────

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const rows = await db.payrollRuns.toArray();
  return rows.sort((a, b) => b.payDate.localeCompare(a.payDate));
}

export async function getPayrollRun(
  id: string
): Promise<PayrollRun | undefined> {
  return db.payrollRuns.get(id);
}

function computeEntryNet(entry: PayrollEntry): number {
  return Math.max(
    0,
    entry.baseSalary + entry.bonuses + entry.allowances - entry.deductions
  );
}

function computeRunTotals(entries: PayrollEntry[]) {
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  for (const e of entries) {
    totalGross += e.baseSalary + e.bonuses + e.allowances;
    totalDeductions += e.deductions;
    totalNet += computeEntryNet(e);
  }
  return { totalGross, totalDeductions, totalNet };
}

function generateRunCode(payDate: string): string {
  const d = new Date(payDate);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const seq = Math.floor(Math.random() * 900 + 100);
  return `FBF-PAY-${y}-${m}-${seq}`;
}

export interface PayrollRunDraftInput {
  periodStart: string;
  periodEnd: string;
  payDate: string;
  preparedBy: string;
  notes?: string | null;
  // If omitted, all active employees are seeded with their base salary
  employeeIds?: string[];
}

export async function createPayrollDraft(
  input: PayrollRunDraftInput
): Promise<PayrollRun> {
  const allEmployees = await listEmployees();
  const candidates = input.employeeIds
    ? allEmployees.filter((e) => input.employeeIds!.includes(e.id))
    : allEmployees.filter((e) => e.status === "active");

  const entries: PayrollEntry[] = candidates.map((emp) => ({
    employeeId: emp.id,
    employeeName: emp.fullName,
    role: emp.role,
    department: emp.department,
    baseSalary: emp.baseSalary,
    bonuses: 0,
    allowances: 0,
    deductions: 0,
    netPay: emp.baseSalary,
    notes: null,
  }));

  const totals = computeRunTotals(entries);

  const run: PayrollRun = {
    id: uuid(),
    runCode: generateRunCode(input.payDate),
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    payDate: input.payDate,
    status: "draft",
    entries,
    ...totals,
    notes: input.notes ?? null,
    preparedBy: input.preparedBy,
    approvedBy: null,
    paidAt: null,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  await db.payrollRuns.add(run);
  return run;
}

export async function updatePayrollEntry(
  runId: string,
  employeeId: string,
  patch: Partial<Pick<PayrollEntry, "bonuses" | "allowances" | "deductions" | "notes">>
): Promise<PayrollRun | undefined> {
  const run = await db.payrollRuns.get(runId);
  if (!run) return undefined;
  if (run.status === "paid") return run;

  const entries = run.entries.map((e) => {
    if (e.employeeId !== employeeId) return e;
    const merged: PayrollEntry = {
      ...e,
      bonuses: patch.bonuses ?? e.bonuses,
      allowances: patch.allowances ?? e.allowances,
      deductions: patch.deductions ?? e.deductions,
      notes: patch.notes === undefined ? e.notes : patch.notes,
    };
    merged.netPay = computeEntryNet(merged);
    return merged;
  });

  const totals = computeRunTotals(entries);
  const updated: PayrollRun = {
    ...run,
    entries,
    ...totals,
    updatedAt: nowISO(),
  };
  await db.payrollRuns.put(updated);
  return updated;
}

export async function removePayrollEntry(
  runId: string,
  employeeId: string
): Promise<PayrollRun | undefined> {
  const run = await db.payrollRuns.get(runId);
  if (!run) return undefined;
  if (run.status === "paid") return run;
  const entries = run.entries.filter((e) => e.employeeId !== employeeId);
  const totals = computeRunTotals(entries);
  const updated: PayrollRun = {
    ...run,
    entries,
    ...totals,
    updatedAt: nowISO(),
  };
  await db.payrollRuns.put(updated);
  return updated;
}

export async function addEmployeeToRun(
  runId: string,
  employeeId: string
): Promise<PayrollRun | undefined> {
  const run = await db.payrollRuns.get(runId);
  if (!run) return undefined;
  if (run.status === "paid") return run;
  if (run.entries.some((e) => e.employeeId === employeeId)) return run;
  const emp = await db.employees.get(employeeId);
  if (!emp) return run;
  const entry: PayrollEntry = {
    employeeId: emp.id,
    employeeName: emp.fullName,
    role: emp.role,
    department: emp.department,
    baseSalary: emp.baseSalary,
    bonuses: 0,
    allowances: 0,
    deductions: 0,
    netPay: emp.baseSalary,
    notes: null,
  };
  const entries = [...run.entries, entry];
  const totals = computeRunTotals(entries);
  const updated: PayrollRun = {
    ...run,
    entries,
    ...totals,
    updatedAt: nowISO(),
  };
  await db.payrollRuns.put(updated);
  return updated;
}

export async function setPayrollStatus(
  runId: string,
  status: PayrollRunStatus,
  actor: string
): Promise<PayrollRun | undefined> {
  const run = await db.payrollRuns.get(runId);
  if (!run) return undefined;

  const updated: PayrollRun = {
    ...run,
    status,
    approvedBy: status === "approved" || status === "paid" ? actor : run.approvedBy,
    paidAt: status === "paid" ? nowISO() : status === "draft" ? null : run.paidAt,
    updatedAt: nowISO(),
  };

  // When marking paid, log a single labour expense in finance.
  if (status === "paid" && run.status !== "paid" && updated.totalNet > 0) {
    await addExpenseEntry({
      amount: updated.totalNet,
      description: `Payroll ${updated.runCode} (${run.entries.length} staff)`,
      category: "labour",
      occurredAt: new Date(updated.payDate).toISOString(),
      recordedBy: actor,
    });
  }

  await db.payrollRuns.put(updated);
  return updated;
}

export async function deletePayrollRun(id: string): Promise<void> {
  await db.payrollRuns.delete(id);
}

// ── Summary / monitoring ───────────────────────────────────────────────────

export interface PayrollSummary {
  activeEmployees: number;
  totalEmployees: number;
  monthlySalaryCommitment: number;
  pendingRuns: number;
  approvedRuns: number;
  paidThisMonth: number;
  paidThisYear: number;
  upcomingPayDate?: string | null;
  upcomingRunNet: number;
}

function annualisedFromFrequency(amount: number, freq: PayFrequency): number {
  switch (freq) {
    case "weekly":
      return amount * 52;
    case "biweekly":
      return amount * 26;
    case "monthly":
      return amount * 12;
  }
}

function monthlyFromFrequency(amount: number, freq: PayFrequency): number {
  return annualisedFromFrequency(amount, freq) / 12;
}

export async function getPayrollSummary(): Promise<PayrollSummary> {
  const [employees, runs] = await Promise.all([
    db.employees.toArray(),
    db.payrollRuns.toArray(),
  ]);

  const active = employees.filter((e) => e.status === "active");
  const monthlyCommitment = active.reduce(
    (s, e) => s + monthlyFromFrequency(e.baseSalary, e.payFrequency),
    0
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  let paidThisMonth = 0;
  let paidThisYear = 0;
  let pendingRuns = 0;
  let approvedRuns = 0;

  for (const r of runs) {
    if (r.status === "draft") pendingRuns += 1;
    if (r.status === "approved") approvedRuns += 1;
    if (r.status === "paid" && r.paidAt) {
      const d = new Date(r.paidAt);
      if (d >= yearStart) paidThisYear += r.totalNet;
      if (d >= monthStart) paidThisMonth += r.totalNet;
    }
  }

  const upcoming = runs
    .filter((r) => r.status !== "paid")
    .sort((a, b) => a.payDate.localeCompare(b.payDate))[0];

  return {
    activeEmployees: active.length,
    totalEmployees: employees.length,
    monthlySalaryCommitment: monthlyCommitment,
    pendingRuns,
    approvedRuns,
    paidThisMonth,
    paidThisYear,
    upcomingPayDate: upcoming?.payDate ?? null,
    upcomingRunNet: upcoming?.totalNet ?? 0,
  };
}

export interface MonthlyPayrollTotals {
  month: string;
  net: number;
}

export async function getMonthlyPayrollTotals(
  months = 6
): Promise<MonthlyPayrollTotals[]> {
  const runs = await db.payrollRuns.toArray();
  const out: MonthlyPayrollTotals[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const total = runs
      .filter((r) => r.status === "paid" && r.paidAt && r.paidAt.startsWith(key))
      .reduce((s, r) => s + r.totalNet, 0);
    out.push({ month: key, net: total });
  }
  return out;
}
