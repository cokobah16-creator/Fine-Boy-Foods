import type { RetailerStatus } from "@/types/retailer";
import { RETAILER_STATUS_LABELS } from "@/types/retailer";

const STATUS_STYLES: Record<RetailerStatus, string> = {
  not_contacted:
    "bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300",
  contacted:
    "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  interested:
    "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  sample_delivered:
    "bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-200",
  negotiating:
    "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  supplied:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  rejected:
    "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200",
  do_not_contact:
    "bg-red-100 text-red-800 ring-1 ring-inset ring-red-300 font-semibold",
};

interface Props {
  status: RetailerStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${STATUS_STYLES[status]}`}
    >
      {RETAILER_STATUS_LABELS[status]}
    </span>
  );
}
