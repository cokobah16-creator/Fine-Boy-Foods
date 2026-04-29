import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  CreditCardIcon,
  CheckCircleIcon,
  TruckIcon,
  XCircleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/operations/PageHeader";
import { Modal } from "@/components/operations/Modal";
import {
  OrderStatusPill,
  PaymentStatusPill,
  DeliveryStatusPill,
} from "@/components/operations/StatusPill";
import {
  getOrder,
  recordOrderPayment,
  setOrderStatus,
} from "@/services/orderService";
import {
  getDeliveryForOrder,
  listDrivers,
  scheduleDelivery,
} from "@/services/distributionService";
import { recomputeAlerts } from "@/services/alertsService";
import { formatDateTime, formatNaira, formatNumber, todayISO } from "@/lib/format";
import type {
  Delivery,
  Driver,
  Order,
  OrderStatus,
} from "@/types/operations";
import { useAuth } from "@/contexts/AuthContext";

const FLOW: OrderStatus[] = [
  "pending",
  "processing",
  "delivered",
];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole, session } = useAuth();
  const canManage = hasRole(["admin"]);
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [paying, setPaying] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const [o, d, ds] = await Promise.all([
      getOrder(id),
      getDeliveryForOrder(id),
      listDrivers(),
    ]);
    setOrder(o ?? null);
    setDelivery(d ?? null);
    setDrivers(ds);
  }

  useEffect(() => {
    load();
  }, [id]);

  if (!order) {
    return (
      <div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1 text-sm text-charcoal-500 hover:text-charcoal-700 mb-3"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Link>
        <p className="text-sm text-charcoal-400">Loading order…</p>
      </div>
    );
  }

  const advance = async (next: OrderStatus) => {
    setError(null);
    try {
      await setOrderStatus(order.id, next);
      await recomputeAlerts();
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-sm text-charcoal-500 hover:text-charcoal-700 mb-3"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to orders
      </Link>

      <PageHeader
        eyebrow={order.orderCode}
        title={order.retailerName}
        subtitle={`Created ${formatDateTime(order.createdAt)}`}
        actions={
          <div className="flex gap-2">
            <OrderStatusPill status={order.status} />
            <PaymentStatusPill status={order.paymentStatus} />
          </div>
        }
      />

      {/* Status pipeline */}
      <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5 mb-5">
        <p className="eyebrow mb-3">Status</p>
        <div className="flex items-center gap-2">
          {FLOW.map((status, i) => {
            const reached =
              FLOW.indexOf(order.status) >= i ||
              order.status === "delivered";
            return (
              <div key={status} className="flex items-center gap-2 flex-1">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    reached
                      ? "bg-green-500 text-white"
                      : "bg-cream-100 text-charcoal-400 ring-1 ring-charcoal-200"
                  }`}
                >
                  {i + 1}
                </div>
                <span
                  className={`text-xs font-semibold capitalize ${
                    reached ? "text-charcoal-700" : "text-charcoal-400"
                  }`}
                >
                  {status}
                </span>
                {i < FLOW.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 ${
                      reached ? "bg-green-200" : "bg-charcoal-100"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {canManage && (
          <div className="flex flex-wrap gap-2 mt-4">
            {order.status === "pending" && (
              <button
                onClick={() => advance("processing")}
                className="btn-primary"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Mark processing (allocate stock)
              </button>
            )}
            {order.status === "processing" && (
              <button
                onClick={() => advance("delivered")}
                className="btn-primary"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Mark delivered
              </button>
            )}
            {order.status !== "cancelled" &&
              order.status !== "delivered" && (
                <button
                  onClick={() => {
                    if (confirm("Cancel this order?")) advance("cancelled");
                  }}
                  className="btn-danger"
                >
                  <XCircleIcon className="h-4 w-4" />
                  Cancel
                </button>
              )}
          </div>
        )}

        {error && (
          <p className="text-xs text-[#B23E0E] bg-[#FFE9D6] rounded px-3 py-2 mt-3 ring-1 ring-[#F4A36A]">
            {error}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <section className="bg-white rounded-lg ring-1 ring-charcoal-100 overflow-hidden">
            <header className="px-5 py-3 border-b border-charcoal-100">
              <h3 className="text-sm font-semibold text-charcoal-700">
                Items
              </h3>
            </header>
            <table className="w-full text-sm">
              <thead className="bg-cream-50 text-[11px] uppercase tracking-wide text-charcoal-400">
                <tr>
                  <th className="text-left px-5 py-2">Product</th>
                  <th className="text-right px-5 py-2">Qty</th>
                  <th className="text-right px-5 py-2">Unit</th>
                  <th className="text-right px-5 py-2">Line</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr
                    key={i.productId}
                    className="border-t border-charcoal-50"
                  >
                    <td className="px-5 py-2 font-medium text-charcoal-700">
                      {i.productName}
                    </td>
                    <td className="px-5 py-2 text-right text-charcoal-600">
                      {formatNumber(i.quantity)}
                    </td>
                    <td className="px-5 py-2 text-right text-charcoal-500">
                      {formatNaira(i.unitPrice)}
                    </td>
                    <td className="px-5 py-2 text-right font-semibold text-charcoal-700">
                      {formatNaira(i.lineTotal)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-charcoal-100 bg-cream-50/60">
                  <td colSpan={3} className="px-5 py-2 text-right text-charcoal-500">
                    Total
                  </td>
                  <td className="px-5 py-2 text-right font-bold text-charcoal-700 text-base">
                    {formatNaira(order.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {order.notes && (
            <section className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
              <h3 className="text-sm font-semibold text-charcoal-700 mb-2">
                Notes
              </h3>
              <p className="text-sm text-charcoal-600 whitespace-pre-wrap">
                {order.notes}
              </p>
            </section>
          )}

          {/* Delivery */}
          <section className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-charcoal-700">
                Delivery
              </h3>
              {delivery && <DeliveryStatusPill status={delivery.status} />}
            </div>
            {delivery ? (
              <div className="text-sm space-y-1.5">
                <p className="text-charcoal-600">
                  Driver:{" "}
                  <strong className="text-charcoal-700">
                    {delivery.driverName}
                  </strong>
                </p>
                {delivery.vehicle && (
                  <p className="text-charcoal-500">
                    Vehicle: {delivery.vehicle}
                  </p>
                )}
                <p className="text-charcoal-500">
                  Scheduled: {formatDateTime(delivery.scheduledFor)}
                </p>
                {delivery.proofImage && (
                  <div className="mt-3">
                    <p className="eyebrow mb-1.5">Proof of delivery</p>
                    <img
                      src={delivery.proofImage}
                      alt="Proof of delivery"
                      className="rounded-md ring-1 ring-charcoal-100 max-h-48"
                    />
                  </div>
                )}
                <Link
                  to="/distribution"
                  className="text-xs text-green-700 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  Manage in distribution →
                </Link>
              </div>
            ) : canManage && order.status !== "cancelled" ? (
              <button
                onClick={() => setScheduling(true)}
                className="btn-secondary"
              >
                <TruckIcon className="h-4 w-4" />
                Schedule delivery
              </button>
            ) : (
              <p className="text-xs text-charcoal-400 italic">
                No delivery scheduled.
              </p>
            )}
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-5">
          <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
            <p className="eyebrow mb-2">Payment</p>
            <p className="text-2xl font-bold text-charcoal-700">
              {formatNaira(order.amountPaid)}
            </p>
            <p className="text-xs text-charcoal-400">
              of {formatNaira(order.totalAmount)}
            </p>
            {order.paymentStatus !== "paid" && order.status !== "cancelled" && (
              <button
                onClick={() => setPaying(true)}
                className="btn-primary w-full mt-4"
              >
                <CreditCardIcon className="h-4 w-4" />
                Record payment
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg ring-1 ring-charcoal-100 p-5">
            <p className="eyebrow mb-2">Retailer</p>
            <Link
              to={`/retailers/${order.retailerId}`}
              className="font-semibold text-charcoal-700 hover:text-green-700"
            >
              {order.retailerName}
            </Link>
          </div>
        </aside>
      </div>

      {paying && (
        <PaymentModal
          order={order}
          recordedBy={session?.name ?? "system"}
          onClose={() => setPaying(false)}
          onSaved={async () => {
            setPaying(false);
            await load();
          }}
        />
      )}

      {scheduling && (
        <ScheduleModal
          order={order}
          drivers={drivers}
          onClose={() => setScheduling(false)}
          onSaved={async () => {
            setScheduling(false);
            await load();
            navigate(`/orders/${order.id}`);
          }}
        />
      )}
    </div>
  );
}

function PaymentModal({
  order,
  recordedBy,
  onClose,
  onSaved,
}: {
  order: Order;
  recordedBy: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const outstanding = order.totalAmount - order.amountPaid;
  const [amount, setAmount] = useState(outstanding);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (amount <= 0) return;
    setBusy(true);
    try {
      await recordOrderPayment(order.id, amount, recordedBy);
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title="Record payment"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={busy} className="btn-primary">
            {busy ? "Saving…" : "Record"}
          </button>
        </div>
      }
    >
      <p className="text-sm text-charcoal-500 mb-3">
        Outstanding:{" "}
        <strong className="text-charcoal-700">
          {formatNaira(outstanding)}
        </strong>
      </p>
      <label className="block">
        <span className="block text-xs font-semibold text-charcoal-500 mb-1">
          Amount (₦)
        </span>
        <input
          type="number"
          min={1}
          max={outstanding}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="input"
        />
      </label>
    </Modal>
  );
}

function ScheduleModal({
  order,
  drivers,
  onClose,
  onSaved,
}: {
  order: Order;
  drivers: Driver[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [scheduledFor, setScheduledFor] = useState(`${todayISO()}T10:00`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!driverId) return;
    setBusy(true);
    setError(null);
    try {
      await scheduleDelivery({
        orderId: order.id,
        driverId,
        scheduledFor: new Date(scheduledFor).toISOString(),
      });
      await recomputeAlerts();
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={`Schedule delivery — ${order.orderCode}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={submit} disabled={busy || !driverId} className="btn-primary">
            {busy ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="block text-xs font-semibold text-charcoal-500 mb-1">
            Driver
          </span>
          <select
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            className="input"
          >
            {drivers.length === 0 && (
              <option value="">No drivers — add one in Distribution</option>
            )}
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.vehicle ? `(${d.vehicle})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-semibold text-charcoal-500 mb-1">
            Scheduled for
          </span>
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="input"
          />
        </label>
        {error && (
          <p className="text-xs text-[#B23E0E] bg-[#FFE9D6] rounded px-3 py-2 ring-1 ring-[#F4A36A]">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
