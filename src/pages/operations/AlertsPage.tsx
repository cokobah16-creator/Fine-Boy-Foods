import { useEffect, useState } from "react";
import {
  BellAlertIcon,
  CheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { EmptyState } from "@/components/operations/EmptyState";
import {
  acknowledgeAlert,
  clearAcknowledged,
  listAlerts,
} from "@/services/alertsService";
import { recomputeAlerts } from "@/services/alertsService";
import {
  ALERT_KIND_LABELS,
  type Alert,
  type AlertSeverity,
} from "@/types/operations";
import { relativeTime } from "@/lib/format";

const SEVERITY_TONE: Record<AlertSeverity, string> = {
  info: "bg-cream-100 text-charcoal-600 ring-charcoal-200",
  warning: "bg-cream-200 text-gold-600 ring-gold-300",
  critical: "bg-[#FFE9D6] text-[#B23E0E] ring-[#F4A36A]",
};

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<"open" | "all">("open");

  async function load() {
    await recomputeAlerts();
    setAlerts(await listAlerts());
  }

  useEffect(() => {
    load();
  }, []);

  const visible = alerts.filter((a) => {
    if (filter === "open") return !a.acknowledged;
    return true;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Alerts"
        subtitle="Low stock, near-expiry batches, inactive retailers, and more."
        actions={
          <>
            <button
              onClick={async () => {
                await clearAcknowledged();
                await load();
              }}
              className="btn-secondary"
            >
              <TrashIcon className="h-4 w-4" />
              Clear cleared
            </button>
            <button onClick={load} className="btn-primary">
              Recheck
            </button>
          </>
        }
      />

      <div className="flex bg-cream-100 ring-1 ring-charcoal-100 rounded-md p-0.5 mb-4 w-fit">
        {(["open", "all"] as const).map((f) => (
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

      {visible.length === 0 ? (
        <EmptyState
          icon={<BellAlertIcon className="h-10 w-10" />}
          title="All clear"
          description="No alerts to show right now."
        />
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <div
              key={a.id}
              className={`bg-white rounded-lg ring-1 ring-charcoal-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
                a.acknowledged ? "opacity-60" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full ring-1 ${
                      SEVERITY_TONE[a.severity]
                    }`}
                  >
                    {ALERT_KIND_LABELS[a.kind]}
                  </span>
                  <span className="text-[11px] text-charcoal-400">
                    {relativeTime(a.createdAt)}
                  </span>
                </div>
                <p className="font-semibold text-charcoal-700 text-sm">
                  {a.title}
                </p>
                <p className="text-sm text-charcoal-500 mt-0.5">
                  {a.message}
                </p>
              </div>
              {!a.acknowledged && (
                <button
                  onClick={async () => {
                    await acknowledgeAlert(a.id);
                    await load();
                  }}
                  className="btn-secondary text-xs"
                >
                  <CheckIcon className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
