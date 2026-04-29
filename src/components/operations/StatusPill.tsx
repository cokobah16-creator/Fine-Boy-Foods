import type {
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
  QCStatus,
} from "@/types/operations";

const ORDER_TONE: Record<OrderStatus, string> = {
  pending: "bg-cream-100 text-charcoal-600 ring-charcoal-200",
  processing: "bg-[#E4EEF9] text-[#1B4F8A] ring-[#C2D6EE]",
  delivered: "bg-green-50 text-green-700 ring-green-200",
  cancelled: "bg-[#F4F2EE] text-charcoal-500 ring-charcoal-200",
};

const PAY_TONE: Record<PaymentStatus, string> = {
  unpaid: "bg-[#FFE9D6] text-[#B23E0E] ring-[#F4A36A]",
  partial: "bg-cream-100 text-gold-600 ring-gold-300",
  paid: "bg-green-50 text-green-700 ring-green-200",
};

const DELIVERY_TONE: Record<DeliveryStatus, string> = {
  scheduled: "bg-cream-100 text-charcoal-600 ring-charcoal-200",
  in_transit: "bg-[#E4EEF9] text-[#1B4F8A] ring-[#C2D6EE]",
  delivered: "bg-green-50 text-green-700 ring-green-200",
  failed: "bg-[#FFE9D6] text-[#B23E0E] ring-[#F4A36A]",
};

const QC_TONE: Record<QCStatus | "pending", string> = {
  pass: "bg-green-50 text-green-700 ring-green-200",
  fail: "bg-[#FFE9D6] text-[#B23E0E] ring-[#F4A36A]",
  pending: "bg-cream-100 text-charcoal-600 ring-charcoal-200",
};

const BASE =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset capitalize";

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`${BASE} ${ORDER_TONE[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return <span className={`${BASE} ${PAY_TONE[status]}`}>{status}</span>;
}

export function DeliveryStatusPill({ status }: { status: DeliveryStatus }) {
  return (
    <span className={`${BASE} ${DELIVERY_TONE[status]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export function QCStatusPill({
  status,
}: {
  status: QCStatus | "pending";
}) {
  return <span className={`${BASE} ${QC_TONE[status]}`}>{status}</span>;
}
