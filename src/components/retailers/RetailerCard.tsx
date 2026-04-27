import { Link } from "react-router-dom";
import {
  PhoneIcon,
  ChatBubbleLeftEllipsisIcon,
  EnvelopeIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import type { Retailer } from "@/types/retailer";
import { RETAILER_CATEGORY_LABELS } from "@/types/retailer";
import { StatusBadge } from "./StatusBadge";
import { ScoreBadge } from "./ScoreBadge";

interface Props {
  retailer: Retailer;
  onStatusChange?: (id: string, status: Retailer["status"]) => void;
}

export function RetailerCard({ retailer }: Props) {
  const whatsappUrl = retailer.phone
    ? `https://wa.me/${retailer.phone.replace(/\D/g, "")}`
    : null;
  const callUrl = retailer.phone ? `tel:${retailer.phone}` : null;
  const emailUrl = retailer.email ? `mailto:${retailer.email}` : null;

  return (
    <div className="card hover:shadow-md hover:-translate-y-0.5 ease-standard">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 h-10 w-10 rounded-md bg-cream-100 ring-1 ring-charcoal-100/70 flex items-center justify-center">
            <BuildingStorefrontIcon className="h-5 w-5 text-green-600" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <Link
              to={`/retailers/${retailer.id}`}
              className="text-sm font-semibold text-charcoal-700 hover:text-green-600 truncate block"
            >
              {retailer.businessName}
            </Link>
            <p className="text-xs text-charcoal-400 mt-0.5">
              {RETAILER_CATEGORY_LABELS[retailer.category]}
            </p>
          </div>
        </div>
        <ScoreBadge score={retailer.leadScore} showLabel={false} />
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs text-charcoal-400">
        <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
        <span className="truncate">
          {retailer.address ? `${retailer.area} · ${retailer.address}` : retailer.area}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={retailer.status} size="sm" />
      </div>

      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-charcoal-100">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-whatsapp flex-1"
          >
            <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" strokeWidth={2} />
            WhatsApp
          </a>
        ) : (
          <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-cream-100 px-3 py-2 text-xs text-charcoal-300 cursor-not-allowed">
            <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" strokeWidth={2} />
            WhatsApp
          </span>
        )}

        {callUrl ? (
          <a href={callUrl} className="btn-call flex-1">
            <PhoneIcon className="h-3.5 w-3.5" strokeWidth={2} />
            Call
          </a>
        ) : (
          <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-cream-100 px-3 py-2 text-xs text-charcoal-300 cursor-not-allowed">
            <PhoneIcon className="h-3.5 w-3.5" strokeWidth={2} />
            Call
          </span>
        )}

        {emailUrl ? (
          <a href={emailUrl} className="btn-email flex-1">
            <EnvelopeIcon className="h-3.5 w-3.5" strokeWidth={2} />
            Email
          </a>
        ) : (
          <Link
            to={`/retailers/${retailer.id}`}
            className="btn-email flex-1"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
}
