import { useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CheckBadgeIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import { EmptyState } from "@/components/operations/EmptyState";
import { Modal } from "@/components/operations/Modal";
import { SimpleLineChart } from "@/components/operations/SimpleLineChart";
import {
  addEmployeeToRun,
  createEmployee,
  createPayrollDraft,
  deleteEmployee,
  deletePayrollRun,
  getMonthlyPayrollTotals,
  getPayrollSummary,
  listEmployees,
  listPayrollRuns,
  removePayrollEntry,
  setPayrollStatus,
  updateEmployee,
  updatePayrollEntry,
  type EmployeeInput,
  type PayrollSummary,
} from "@/services/payrollService";
import {
  EMPLOYEE_DEPARTMENT_LABELS,
  EMPLOYEE_STATUS_LABELS,
  PAYROLL_STATUS_LABELS,
  PAY_FREQUENCY_LABELS,
  type Employee,
  type EmployeeDepartment,
  type EmployeeStatus,
  type PayFrequency,
  type PayrollEntry,
  type PayrollRun,
  type PayrollRunStatus,
} from "@/types/operations";
import { formatDate, formatNaira, todayISO } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "overview" | "employees" | "runs";

const STATUS_TONE: Record<PayrollRunStatus, string> = {
  draft: "bg-cream-100 text-charcoal-600 ring-charcoal-200",
  approved: "bg-[#E4EEF9] text-[#1B4F8A] ring-[#C2D6EE]",
  paid: "bg-green-50 text-green-700 ring-green-200",
};

const EMP_STATUS_TONE: Record<EmployeeStatus, string> = {
  active: "bg-green-50 text-green-700 ring-green-200",
  on_leave: "bg-cream-100 text-gold-600 ring-gold-300",
  terminated: "bg-[#F4F2EE] text-charcoal-500 ring-charcoal-200",
};

const EMPTY_SUMMARY: PayrollSummary = {
  activeEmployees: 0,
  totalEmployees: 0,
  monthlySalaryCommitment: 0,
  pendingRuns: 0,
  approvedRuns: 0,
  paidThisMonth: 0,
  paidThisYear: 0,
  upcomingPayDate: null,
  upcomingRunNet: 0,
};

export function PayrollPage() {
  const { hasRole, session } = useAuth();
  const canEdit = hasRole(["admin"]);

  const [tab, setTab] = useState<Tab>("overview");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [summary, setSummary] = useState<PayrollSummary>(EMPTY_SUMMARY);
  const [monthly, setMonthly] = useState<{ month: string; net: number }[]>([]);

  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [showRunModal, setShowRunModal] = useState(false);
  const [openRunId, setOpenRunId] = useState<string | null>(null);

  async function load() {
    const [emps, rs, sm, m] = await Promise.all([
      listEmployees(),
      listPayrollRuns(),
      getPayrollSummary(),
      getMonthlyPayrollTotals(6),
    ]);
    setEmployees(emps);
    setRuns(rs);
    setSummary(sm);
    setMonthly(m);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Payroll"
        subtitle="Monitor staff salaries, prepare payroll runs, and track what's been paid."
        actions={
          canEdit && (
            <>
              <button
                onClick={() => {
                  setEditEmployee(null);
                  setShowEmpModal(true);
                }}
                className="btn-secondary"
              >
                <PlusIcon className="h-4 w-4" />
                Add employee
              </button>
              <button
                onClick={() => setShowRunModal(true)}
                className="btn-primary"
                disabled={employees.filter((e) => e.status === "active").length === 0}
                title={
                  employees.filter((e) => e.status === "active").length === 0
                    ? "Add at least one active employee first"
                    : ""
                }
              >
                <CalendarDaysIcon className="h-4 w-4" />
                New payroll run
              </button>
            </>
          )
        }
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-charcoal-100">
        {(
          [
            { key: "overview", label: "Overview" },
            { key: "employees", label: `Employees (${employees.length})` },
            { key: "runs", label: `Payroll runs (${runs.length})` },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-green-500 text-charcoal-700"
                : "border-transparent text-charcoal-400 hover:text-charcoal-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab summary={summary} monthly={monthly} runs={runs} />
      )}

      {tab === "employees" && (
        <EmployeesTab
          employees={employees}
          canEdit={canEdit}
          onEdit={(emp) => {
            setEditEmployee(emp);
            setShowEmpModal(true);
          }}
          onDelete={async (emp) => {
            if (
              confirm(
                `Remove ${emp.fullName}? Past payroll runs will keep their record.`
              )
            ) {
              await deleteEmployee(emp.id);
              await load();
            }
          }}
        />
      )}

      {tab === "runs" && (
        <RunsTab
          runs={runs}
          canEdit={canEdit}
          openRunId={openRunId}
          onToggle={(id) => setOpenRunId((cur) => (cur === id ? null : id))}
          onChange={load}
          actor={session?.name ?? "Admin"}
          allEmployees={employees}
        />
      )}

      {showEmpModal && (
        <EmployeeModal
          employee={editEmployee}
          onClose={() => setShowEmpModal(false)}
          onSaved={async () => {
            setShowEmpModal(false);
            setEditEmployee(null);
            await load();
          }}
        />
      )}

      {showRunModal && (
        <NewRunModal
          preparedBy={session?.name ?? "Admin"}
          onClose={() => setShowRunModal(false)}
          onSaved={async () => {
            setShowRunModal(false);
            setTab("runs");
            await load();
          }}
        />
      )}
    </div>
  );
}

// ── Overview tab ────────────────────────────────────────────────────────────

function OverviewTab({
  summary,
  monthly,
  runs,
}: {
  summary: PayrollSummary;
  monthly: { month: string; net: number }[];
  runs: PayrollRun[];
}) {
  const recent = runs.slice(0, 5);
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="Active employees"
          value={summary.activeEmployees}
          hint={`${summary.totalEmployees} total on file`}
          icon={<UsersIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Monthly commitment"
          value={formatNaira(summary.monthlySalaryCommitment)}
          hint="Sum of base salaries (annualised ÷ 12)"
          tone="warn"
          icon={<CurrencyDollarIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Paid this month"
          value={formatNaira(summary.paidThisMonth)}
          tone={summary.paidThisMonth > 0 ? "good" : "neutral"}
          icon={<CheckBadgeIcon className="h-4 w-4" />}
        />
        <StatCard
          label="Pending / approved runs"
          value={`${summary.pendingRuns} / ${summary.approvedRuns}`}
          hint={
            summary.upcomingPayDate
              ? `Next pay date ${formatDate(summary.upcomingPayDate)} · ${formatNaira(
                  summary.upcomingRunNet
                )}`
              : "No upcoming runs"
          }
          tone={summary.pendingRuns > 0 ? "warn" : "neutral"}
          icon={<CalendarDaysIcon className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Paid YTD" value={formatNaira(summary.paidThisYear)} />
        <StatCard
          label="Avg net / employee"
          value={formatNaira(
            summary.activeEmployees > 0
              ? summary.monthlySalaryCommitment / summary.activeEmployees
              : 0
          )}
          hint="Monthly basis"
        />
        <StatCard
          label="Headcount status"
          value={
            summary.totalEmployees === 0
              ? "—"
              : `${Math.round(
                  (summary.activeEmployees / summary.totalEmployees) * 100
                )}% active`
          }
        />
      </div>

      {monthly.some((m) => m.net > 0) && (
        <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5 mb-5">
          <p className="eyebrow mb-3">Last 6 months — net paid</p>
          <SimpleLineChart
            data={monthly.map((m) => ({ label: m.month.slice(5), value: m.net }))}
            format={formatNaira}
          />
        </div>
      )}

      <h2 className="text-sm font-semibold text-charcoal-700 mb-2">
        Recent payroll runs
      </h2>
      {recent.length === 0 ? (
        <EmptyState
          title="No payroll runs yet"
          description="Add employees and prepare your first payroll run to start monitoring salary spend."
        />
      ) : (
        <div className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
              <tr>
                <th className="text-left px-4 py-2">Run</th>
                <th className="text-left px-4 py-2">Period</th>
                <th className="text-left px-4 py-2">Pay date</th>
                <th className="text-right px-4 py-2">Staff</th>
                <th className="text-right px-4 py-2">Net</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-charcoal-50">
                  <td className="px-4 py-2 font-mono text-[12px] text-charcoal-700">
                    {r.runCode}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                  </td>
                  <td className="px-4 py-2 text-charcoal-500">
                    {formatDate(r.payDate)}
                  </td>
                  <td className="px-4 py-2 text-right text-charcoal-600">
                    {r.entries.length}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-charcoal-700">
                    {formatNaira(r.totalNet)}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Employees tab ───────────────────────────────────────────────────────────

function EmployeesTab({
  employees,
  canEdit,
  onEdit,
  onDelete,
}: {
  employees: Employee[];
  canEdit: boolean;
  onEdit: (emp: Employee) => void;
  onDelete: (emp: Employee) => void;
}) {
  if (employees.length === 0) {
    return (
      <EmptyState
        title="No employees yet"
        description="Add staff to start monitoring payroll. Their base salary feeds new payroll runs automatically."
      />
    );
  }

  return (
    <div className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
          <tr>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-left px-4 py-2">Role</th>
            <th className="text-left px-4 py-2">Department</th>
            <th className="text-left px-4 py-2">Frequency</th>
            <th className="text-right px-4 py-2">Base salary</th>
            <th className="text-left px-4 py-2">Status</th>
            <th className="text-left px-4 py-2">Hired</th>
            {canEdit && <th className="px-2 py-2 w-24" />}
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id} className="border-t border-charcoal-50">
              <td className="px-4 py-2 text-charcoal-700 font-medium">
                {e.fullName}
                {e.phone && (
                  <p className="text-[11px] text-charcoal-400">{e.phone}</p>
                )}
              </td>
              <td className="px-4 py-2 text-charcoal-500">{e.role || "—"}</td>
              <td className="px-4 py-2 text-charcoal-500">
                {EMPLOYEE_DEPARTMENT_LABELS[e.department]}
              </td>
              <td className="px-4 py-2 text-charcoal-500">
                {PAY_FREQUENCY_LABELS[e.payFrequency]}
              </td>
              <td className="px-4 py-2 text-right font-semibold text-charcoal-700">
                {formatNaira(e.baseSalary)}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${EMP_STATUS_TONE[e.status]}`}
                >
                  {EMPLOYEE_STATUS_LABELS[e.status]}
                </span>
              </td>
              <td className="px-4 py-2 text-charcoal-500">
                {formatDate(e.hireDate)}
              </td>
              {canEdit && (
                <td className="px-2 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => onEdit(e)}
                      className="p-1 text-charcoal-400 hover:text-charcoal-700"
                      title="Edit"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(e)}
                      className="p-1 text-charcoal-300 hover:text-[#B23E0E]"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Runs tab ────────────────────────────────────────────────────────────────

function RunsTab({
  runs,
  canEdit,
  openRunId,
  onToggle,
  onChange,
  actor,
  allEmployees,
}: {
  runs: PayrollRun[];
  canEdit: boolean;
  openRunId: string | null;
  onToggle: (id: string) => void;
  onChange: () => Promise<void> | void;
  actor: string;
  allEmployees: Employee[];
}) {
  if (runs.length === 0) {
    return (
      <EmptyState
        title="No payroll runs yet"
        description="Click 'New payroll run' to draft one for the current period. You can adjust bonuses and deductions before approving."
      />
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((r) => {
        const open = openRunId === r.id;
        return (
          <div
            key={r.id}
            className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-hidden"
          >
            <button
              onClick={() => onToggle(r.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cream-50/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-mono text-sm text-charcoal-700">
                    {r.runCode}
                  </p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="text-[12px] text-charcoal-500 mt-0.5">
                  {formatDate(r.periodStart)} – {formatDate(r.periodEnd)} · pay{" "}
                  {formatDate(r.payDate)} · {r.entries.length} staff
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] text-charcoal-400">Net</p>
                  <p className="text-base font-bold text-charcoal-700">
                    {formatNaira(r.totalNet)}
                  </p>
                </div>
                {open ? (
                  <ChevronUpIcon className="h-5 w-5 text-charcoal-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-charcoal-400" />
                )}
              </div>
            </button>

            {open && (
              <RunDetail
                run={r}
                canEdit={canEdit}
                actor={actor}
                allEmployees={allEmployees}
                onChange={onChange}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RunDetail({
  run,
  canEdit,
  actor,
  allEmployees,
  onChange,
}: {
  run: PayrollRun;
  canEdit: boolean;
  actor: string;
  allEmployees: Employee[];
  onChange: () => Promise<void> | void;
}) {
  const editable = canEdit && run.status !== "paid";
  const candidates = useMemo(
    () =>
      allEmployees.filter(
        (e) =>
          e.status === "active" &&
          !run.entries.some((entry) => entry.employeeId === e.id)
      ),
    [allEmployees, run.entries]
  );
  const [addPick, setAddPick] = useState("");

  const exportCSV = () => {
    const header = [
      "Employee",
      "Role",
      "Department",
      "Base",
      "Bonuses",
      "Allowances",
      "Deductions",
      "Net",
    ];
    const rows = run.entries.map((e) => [
      e.employeeName,
      e.role,
      e.department,
      e.baseSalary,
      e.bonuses,
      e.allowances,
      e.deductions,
      e.netPay,
    ]);
    const csv = [header, ...rows]
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${run.runCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border-t border-charcoal-100">
      <div className="px-4 py-3 bg-cream-50/40 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[12px]">
        <div>
          <p className="text-charcoal-400">Gross</p>
          <p className="font-semibold text-charcoal-700">
            {formatNaira(run.totalGross)}
          </p>
        </div>
        <div>
          <p className="text-charcoal-400">Deductions</p>
          <p className="font-semibold text-[#B23E0E]">
            {formatNaira(run.totalDeductions)}
          </p>
        </div>
        <div>
          <p className="text-charcoal-400">Net</p>
          <p className="font-semibold text-green-700">
            {formatNaira(run.totalNet)}
          </p>
        </div>
        <div>
          <p className="text-charcoal-400">Prepared by</p>
          <p className="font-semibold text-charcoal-700">{run.preparedBy}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
            <tr>
              <th className="text-left px-3 py-2">Employee</th>
              <th className="text-right px-3 py-2">Base</th>
              <th className="text-right px-3 py-2">Bonus</th>
              <th className="text-right px-3 py-2">Allowance</th>
              <th className="text-right px-3 py-2">Deduction</th>
              <th className="text-right px-3 py-2">Net</th>
              {editable && <th className="px-2 py-2 w-12" />}
            </tr>
          </thead>
          <tbody>
            {run.entries.map((e) => (
              <EntryRow
                key={e.employeeId}
                runId={run.id}
                entry={e}
                editable={editable}
                onChange={onChange}
              />
            ))}
            {run.entries.length === 0 && (
              <tr>
                <td
                  colSpan={editable ? 7 : 6}
                  className="px-4 py-6 text-center text-charcoal-400 text-xs"
                >
                  No staff in this run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editable && candidates.length > 0 && (
        <div className="px-4 py-3 border-t border-charcoal-100 flex items-center gap-2 flex-wrap">
          <label className="text-[12px] text-charcoal-500">Add employee:</label>
          <select
            value={addPick}
            onChange={(e) => setAddPick(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">Select…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} — {formatNaira(c.baseSalary)}
              </option>
            ))}
          </select>
          <button
            disabled={!addPick}
            onClick={async () => {
              await addEmployeeToRun(run.id, addPick);
              setAddPick("");
              await onChange();
            }}
            className="btn-secondary"
          >
            Add
          </button>
        </div>
      )}

      <div className="px-4 py-3 border-t border-charcoal-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button onClick={exportCSV} className="btn-secondary">
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </button>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2 justify-end">
            {run.status === "draft" && (
              <button
                onClick={async () => {
                  await setPayrollStatus(run.id, "approved", actor);
                  await onChange();
                }}
                className="btn-secondary"
              >
                Approve
              </button>
            )}
            {run.status === "approved" && (
              <button
                onClick={async () => {
                  await setPayrollStatus(run.id, "draft", actor);
                  await onChange();
                }}
                className="btn-secondary"
              >
                Revert to draft
              </button>
            )}
            {run.status !== "paid" && (
              <button
                onClick={async () => {
                  if (
                    confirm(
                      `Mark ${run.runCode} as paid? This logs ${formatNaira(
                        run.totalNet
                      )} as a labour expense and cannot be edited after.`
                    )
                  ) {
                    await setPayrollStatus(run.id, "paid", actor);
                    await onChange();
                  }
                }}
                className="btn-primary"
              >
                Mark paid
              </button>
            )}
            {run.status !== "paid" && (
              <button
                onClick={async () => {
                  if (confirm(`Delete payroll run ${run.runCode}?`)) {
                    await deletePayrollRun(run.id);
                    await onChange();
                  }
                }}
                className="text-charcoal-400 hover:text-[#B23E0E] p-2"
                title="Delete run"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EntryRow({
  runId,
  entry,
  editable,
  onChange,
}: {
  runId: string;
  entry: PayrollEntry;
  editable: boolean;
  onChange: () => Promise<void> | void;
}) {
  const [bonuses, setBonuses] = useState(entry.bonuses);
  const [allowances, setAllowances] = useState(entry.allowances);
  const [deductions, setDeductions] = useState(entry.deductions);

  useEffect(() => {
    setBonuses(entry.bonuses);
    setAllowances(entry.allowances);
    setDeductions(entry.deductions);
  }, [entry.bonuses, entry.allowances, entry.deductions]);

  const commit = async (
    patch: Partial<Pick<PayrollEntry, "bonuses" | "allowances" | "deductions">>
  ) => {
    await updatePayrollEntry(runId, entry.employeeId, patch);
    await onChange();
  };

  return (
    <tr className="border-t border-charcoal-50">
      <td className="px-3 py-2">
        <p className="font-medium text-charcoal-700">{entry.employeeName}</p>
        <p className="text-[11px] text-charcoal-400">
          {entry.role} · {EMPLOYEE_DEPARTMENT_LABELS[entry.department]}
        </p>
      </td>
      <td className="px-3 py-2 text-right text-charcoal-600">
        {formatNaira(entry.baseSalary)}
      </td>
      <td className="px-3 py-2 text-right">
        {editable ? (
          <input
            type="number"
            min={0}
            value={bonuses}
            onChange={(e) => setBonuses(Number(e.target.value) || 0)}
            onBlur={() => bonuses !== entry.bonuses && commit({ bonuses })}
            className="input w-24 text-right"
          />
        ) : (
          formatNaira(entry.bonuses)
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {editable ? (
          <input
            type="number"
            min={0}
            value={allowances}
            onChange={(e) => setAllowances(Number(e.target.value) || 0)}
            onBlur={() => allowances !== entry.allowances && commit({ allowances })}
            className="input w-24 text-right"
          />
        ) : (
          formatNaira(entry.allowances)
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {editable ? (
          <input
            type="number"
            min={0}
            value={deductions}
            onChange={(e) => setDeductions(Number(e.target.value) || 0)}
            onBlur={() => deductions !== entry.deductions && commit({ deductions })}
            className="input w-24 text-right"
          />
        ) : (
          formatNaira(entry.deductions)
        )}
      </td>
      <td className="px-3 py-2 text-right font-semibold text-green-700">
        {formatNaira(entry.netPay)}
      </td>
      {editable && (
        <td className="px-2 py-2 text-right">
          <button
            onClick={async () => {
              if (confirm(`Remove ${entry.employeeName} from this run?`)) {
                await removePayrollEntry(runId, entry.employeeId);
                await onChange();
              }
            }}
            className="text-charcoal-300 hover:text-[#B23E0E]"
            title="Remove from run"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </td>
      )}
    </tr>
  );
}

function StatusBadge({ status }: { status: PayrollRunStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset capitalize ${STATUS_TONE[status]}`}
    >
      {PAYROLL_STATUS_LABELS[status]}
    </span>
  );
}

// ── Modals ──────────────────────────────────────────────────────────────────

function EmployeeModal({
  employee,
  onClose,
  onSaved,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const isEdit = Boolean(employee);
  const [form, setForm] = useState<EmployeeInput & { status: EmployeeStatus }>({
    fullName: employee?.fullName ?? "",
    role: employee?.role ?? "",
    department: employee?.department ?? "production",
    phone: employee?.phone ?? "",
    email: employee?.email ?? "",
    baseSalary: employee?.baseSalary ?? 0,
    payFrequency: employee?.payFrequency ?? "monthly",
    bankName: employee?.bankName ?? "",
    bankAccount: employee?.bankAccount ?? "",
    hireDate: employee?.hireDate ?? todayISO(),
    status: employee?.status ?? "active",
    notes: employee?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);

  const valid = form.fullName.trim().length > 0 && form.baseSalary > 0;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      if (isEdit && employee) {
        await updateEmployee(employee.id, form);
      } else {
        await createEmployee(form);
      }
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={isEdit ? "Edit employee" : "Add employee"}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={!valid || busy} className="btn-primary">
            {busy ? "Saving…" : isEdit ? "Save changes" : "Add employee"}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Full name *">
          <input
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="input"
            placeholder="e.g. Adaeze Okonkwo"
          />
        </Field>
        <Field label="Role">
          <input
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input"
            placeholder="e.g. Line operator"
          />
        </Field>
        <Field label="Department">
          <select
            value={form.department}
            onChange={(e) =>
              setForm({
                ...form,
                department: e.target.value as EmployeeDepartment,
              })
            }
            className="input"
          >
            {Object.entries(EMPLOYEE_DEPARTMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as EmployeeStatus })
            }
            className="input"
          >
            {Object.entries(EMPLOYEE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Base salary (₦) *">
          <input
            type="number"
            min={0}
            value={form.baseSalary}
            onChange={(e) =>
              setForm({ ...form, baseSalary: Number(e.target.value) || 0 })
            }
            className="input"
          />
        </Field>
        <Field label="Pay frequency">
          <select
            value={form.payFrequency}
            onChange={(e) =>
              setForm({ ...form, payFrequency: e.target.value as PayFrequency })
            }
            className="input"
          >
            {Object.entries(PAY_FREQUENCY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phone">
          <input
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
            placeholder="08012345678"
          />
        </Field>
        <Field label="Email">
          <input
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
            placeholder="name@example.com"
          />
        </Field>
        <Field label="Bank name">
          <input
            value={form.bankName ?? ""}
            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Bank account">
          <input
            value={form.bankAccount ?? ""}
            onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Hire date">
          <input
            type="date"
            value={form.hireDate}
            onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="Notes" full>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input min-h-[60px]"
            rows={2}
          />
        </Field>
      </div>
    </Modal>
  );
}

function NewRunModal({
  preparedBy,
  onClose,
  onSaved,
}: {
  preparedBy: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [periodStart, setPeriodStart] = useState(monthStart);
  const [periodEnd, setPeriodEnd] = useState(monthEnd);
  const [payDate, setPayDate] = useState(monthEnd);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!periodStart || !periodEnd || !payDate) return;
    setBusy(true);
    try {
      await createPayrollDraft({
        periodStart,
        periodEnd,
        payDate,
        preparedBy,
        notes: notes.trim() || null,
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="New payroll run"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? "Creating…" : "Create draft"}
          </button>
        </div>
      }
    >
      <p className="text-xs text-charcoal-500 mb-3">
        A draft run is created with all active employees at their current base
        salary. You can adjust bonuses and deductions per person before approving.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Period start">
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Period end">
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Pay date" full>
          <input
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Notes" full>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input min-h-[60px]"
            rows={2}
            placeholder="Optional notes for this run"
          />
        </Field>
      </div>
    </Modal>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="block text-xs font-semibold text-charcoal-500 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
