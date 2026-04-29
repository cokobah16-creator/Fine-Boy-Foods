import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  TruckIcon,
  PlusIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  PhotoIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { StatCard } from "@/components/operations/StatCard";
import { EmptyState } from "@/components/operations/EmptyState";
import { Modal } from "@/components/operations/Modal";
import { DeliveryStatusPill } from "@/components/operations/StatusPill";
import {
  addDriver,
  deleteDriver,
  listDeliveries,
  listDrivers,
  setDeliveryStatus,
} from "@/services/distributionService";
import { recomputeAlerts } from "@/services/alertsService";
import type { Delivery, Driver } from "@/types/operations";
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/contexts/AuthContext";

export function DistributionPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(["admin", "delivery"]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tab, setTab] = useState<"deliveries" | "drivers">("deliveries");
  const [proofFor, setProofFor] = useState<Delivery | null>(null);
  const [showAddDriver, setShowAddDriver] = useState(false);

  async function load() {
    const [d, dr] = await Promise.all([listDeliveries(), listDrivers()]);
    setDeliveries(d);
    setDrivers(dr);
  }
  useEffect(() => {
    load();
  }, []);

  const stats = {
    scheduled: deliveries.filter((d) => d.status === "scheduled").length,
    inTransit: deliveries.filter((d) => d.status === "in_transit").length,
    delivered: deliveries.filter((d) => d.status === "delivered").length,
    failed: deliveries.filter((d) => d.status === "failed").length,
  };

  const advance = async (delivery: Delivery) => {
    if (delivery.status === "scheduled") {
      await setDeliveryStatus(delivery.id, "in_transit");
    } else if (delivery.status === "in_transit") {
      // Need proof for delivered
      setProofFor(delivery);
      return;
    }
    await load();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Distribution"
        subtitle="Schedule deliveries, track drivers, and capture proof of delivery."
        actions={
          tab === "drivers" &&
          canManage && (
            <button
              onClick={() => setShowAddDriver(true)}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4" />
              Add driver
            </button>
          )
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Scheduled" value={stats.scheduled} />
        <StatCard label="In transit" value={stats.inTransit} tone="good" />
        <StatCard label="Delivered" value={stats.delivered} />
        <StatCard
          label="Failed"
          value={stats.failed}
          tone={stats.failed > 0 ? "bad" : "good"}
        />
      </div>

      <div className="flex gap-1 border-b border-charcoal-100 mb-5">
        {(
          [
            ["deliveries", "Deliveries"],
            ["drivers", "Drivers"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              tab === key
                ? "border-green-500 text-green-700"
                : "border-transparent text-charcoal-400 hover:text-charcoal-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "deliveries" && (
        <>
          {deliveries.length === 0 ? (
            <EmptyState
              icon={<TruckIcon className="h-10 w-10" />}
              title="No deliveries scheduled"
              description="Schedule a delivery from any order detail page."
            />
          ) : (
            <div className="space-y-3">
              {deliveries.map((d) => (
                <div
                  key={d.id}
                  className="bg-white rounded-lg ring-1 ring-charcoal-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={`/orders/${d.orderId}`}
                        className="font-mono text-xs font-semibold text-charcoal-700 hover:text-green-700"
                      >
                        {d.orderCode}
                      </Link>
                      <DeliveryStatusPill status={d.status} />
                    </div>
                    <p className="text-sm font-semibold text-charcoal-700">
                      {d.retailerName}
                    </p>
                    <p className="text-[11px] text-charcoal-500 mt-0.5">
                      {d.driverName}
                      {d.vehicle && ` · ${d.vehicle}`} ·{" "}
                      {formatDateTime(d.scheduledFor)}
                    </p>
                  </div>

                  {d.proofImage && (
                    <button
                      onClick={() => setProofFor(d)}
                      className="text-[11px] text-green-700 hover:underline inline-flex items-center gap-1"
                    >
                      <PhotoIcon className="h-4 w-4" />
                      View proof
                    </button>
                  )}

                  {canManage &&
                    d.status !== "delivered" &&
                    d.status !== "failed" && (
                      <div className="flex gap-2">
                        {d.status === "scheduled" && (
                          <button
                            onClick={() => advance(d)}
                            className="btn-secondary text-xs"
                          >
                            <ArrowRightIcon className="h-4 w-4" />
                            Start
                          </button>
                        )}
                        {d.status === "in_transit" && (
                          <button
                            onClick={() => advance(d)}
                            className="btn-primary text-xs"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                            Mark delivered
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            if (confirm("Mark this delivery as failed?")) {
                              await setDeliveryStatus(d.id, "failed");
                              await recomputeAlerts();
                              await load();
                            }
                          }}
                          className="text-xs text-[#B23E0E] hover:underline"
                        >
                          Mark failed
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "drivers" && (
        <DriversView
          drivers={drivers}
          canManage={canManage}
          onChange={load}
        />
      )}

      {proofFor && (
        <ProofModal
          delivery={proofFor}
          onClose={() => setProofFor(null)}
          onSaved={async () => {
            setProofFor(null);
            await recomputeAlerts();
            await load();
          }}
        />
      )}

      {showAddDriver && (
        <AddDriverModal
          onClose={() => setShowAddDriver(false)}
          onSaved={async () => {
            setShowAddDriver(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function DriversView({
  drivers,
  canManage,
  onChange,
}: {
  drivers: Driver[];
  canManage: boolean;
  onChange: () => Promise<void> | void;
}) {
  if (drivers.length === 0) {
    return (
      <EmptyState
        icon={<UserIcon className="h-10 w-10" />}
        title="No drivers yet"
        description="Add a driver before scheduling deliveries."
      />
    );
  }
  return (
    <div className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
          <tr>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-left px-4 py-2">Phone</th>
            <th className="text-left px-4 py-2">Vehicle</th>
            <th className="text-left px-4 py-2">Status</th>
            {canManage && <th className="px-2 py-2 w-16" />}
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.id} className="border-t border-charcoal-50">
              <td className="px-4 py-2 font-medium text-charcoal-700">
                {d.name}
              </td>
              <td className="px-4 py-2 text-charcoal-500">{d.phone}</td>
              <td className="px-4 py-2 text-charcoal-500">
                {d.vehicle ?? "—"}
              </td>
              <td className="px-4 py-2">
                {d.active ? (
                  <span className="text-[11px] font-semibold text-green-700 bg-green-50 ring-1 ring-green-100 rounded-full px-2 py-0.5">
                    Active
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-charcoal-500">
                    Off-duty
                  </span>
                )}
              </td>
              {canManage && (
                <td className="px-2 py-2 text-right">
                  <button
                    onClick={async () => {
                      if (confirm(`Remove ${d.name}?`)) {
                        await deleteDriver(d.id);
                        await onChange();
                      }
                    }}
                    className="text-[11px] text-[#B23E0E] hover:underline"
                  >
                    Remove
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddDriverModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    try {
      await addDriver({
        name: name.trim(),
        phone: phone.trim(),
        vehicle: vehicle.trim() || undefined,
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Add driver"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Add driver"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. Musa Ibrahim"
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input"
            placeholder="+234 ..."
          />
        </Field>
        <Field label="Vehicle (optional)">
          <input
            value={vehicle}
            onChange={(e) => setVehicle(e.target.value)}
            className="input"
            placeholder="Hilux ABJ-123XA"
          />
        </Field>
      </div>
    </Modal>
  );
}

function ProofModal({
  delivery,
  onClose,
  onSaved,
}: {
  delivery: Delivery;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [proof, setProof] = useState<string | null>(delivery.proofImage ?? null);
  const [notes, setNotes] = useState(delivery.proofNotes ?? "");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isViewOnly = delivery.status === "delivered" && delivery.proofImage;

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setProof(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    setBusy(true);
    try {
      await setDeliveryStatus(delivery.id, "delivered", {
        proofImage: proof,
        proofNotes: notes,
      });
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={
        isViewOnly
          ? `Proof — ${delivery.orderCode}`
          : `Mark delivered — ${delivery.orderCode}`
      }
      onClose={onClose}
      footer={
        isViewOnly ? (
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="btn-primary"
            >
              {busy ? "Saving…" : "Confirm delivery"}
            </button>
          </div>
        )
      }
    >
      <p className="text-sm text-charcoal-500 mb-3">
        {delivery.retailerName} · driven by {delivery.driverName}
      </p>

      {proof ? (
        <div className="mb-3">
          <img
            src={proof}
            alt="Proof of delivery"
            className="rounded-md ring-1 ring-charcoal-100 max-h-64 mx-auto"
          />
          {!isViewOnly && (
            <button
              onClick={() => setProof(null)}
              className="text-xs text-[#B23E0E] mt-2 hover:underline"
            >
              Remove image
            </button>
          )}
        </div>
      ) : !isViewOnly ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-md border-2 border-dashed border-charcoal-200 bg-cream-50 py-8 text-sm text-charcoal-500 hover:bg-cream-100 mb-3 flex flex-col items-center gap-2"
        >
          <PhotoIcon className="h-8 w-8 text-charcoal-300" />
          Tap to upload proof of delivery
        </button>
      ) : (
        <p className="text-xs text-charcoal-400 italic mb-3">No image saved.</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />

      <label className="block">
        <span className="block text-xs font-semibold text-charcoal-500 mb-1">
          Notes
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          disabled={Boolean(isViewOnly)}
          placeholder="Anything to flag (damage, partial drop, etc.)"
          className="input"
        />
      </label>
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
