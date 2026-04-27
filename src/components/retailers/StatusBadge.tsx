import type { RetailerStatus } from "@/types/retailer";
import { RETAILER_STATUS_LABELS } from "@/types/retailer";

const STATUS_STYLES: Record<RetailerStatus, string> = {
  not_contacted:
    "bg-charcoal-50 text-charcoal-500 ring-1 ring-inset ring-charcoal-200",
  contacted:
    "bg-[#DCEBFB] text-[#1B4F8A] ring-1 ring-inset ring-[#BFD8F2]",
  interested:
    "bg-[#FBF1D2] text-gold-600 ring-1 ring-inset ring-gold-300",
  sample_delivered:
    "bg-[#E5DAF1] text-[#5B348C] ring-1 ring-inset ring-[#CCB7E6]",
  negotiating:
    "bg-[#FFE2C7] text-[#9C4A0A] ring-1 ring-inset ring-[#F4A36A]",
  supplied:
    "bg-green-100 text-green-700 ring-1 ring-inset ring-green-200",
  rejected:
    "bg-[#F9DEDC] text-[#8B1F1A] ring-1 ring-inset ring-[#F2BFBC]",
  do_not_contact:
    "bg-charcoal-700 text-cream-100 ring-1 ring-inset ring-charcoal-700 font-semibold",
};

interface Props {
  status: RetailerStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: Props) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${STATUS_STYLES[status]}`}
    >
      {RETAILER_STATUS_LABELS[status]}
    </span>
  );
}
