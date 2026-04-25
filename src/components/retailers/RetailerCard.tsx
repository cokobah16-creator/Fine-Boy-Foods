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
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-brand-100 flex items-center justify-center">
            <BuildingStorefrontIcon className="h-5 w-5 text-brand-600" />
          </div>
          <div className="min-w-0">
            <Link
              to={`/retailers/${retailer.id}`}
              className="text-sm font-semibold text-gray-900 hover:text-brand-600 truncate block"
            >
              {retailer.businessName}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">
              {RETAILER_CATEGORY_LABELS[retailer.category]}
            </p>
          </div>
        </div>
        <ScoreBadge score={retailer.leadScore} showLabel={false} />
      </div>

      {retailer.address && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{retailer.area} · {retailer.address}</span>
        </div>
      )}
      {!retailer.address && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{retailer.area}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <StatusBadge status={retailer.status} size="sm" />
      </div>

      <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-50">
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" />
            WhatsApp
          </a>
        ) : (
          <span className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400 cursor-not-allowed">
            <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" />
            WhatsApp
          </span>
        )}

        {callUrl ? (
          <a
            href={callUrl}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <PhoneIcon className="h-3.5 w-3.5" />
            Call
          </a>
        ) : (
          <span className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400 cursor-not-allowed">
            <PhoneIcon className="h-3.5 w-3.5" />
            Call
          </span>
        )}

        {emailUrl ? (
          <a
            href={emailUrl}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-purple-50 px-3 py-2 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
          >
            <EnvelopeIcon className="h-3.5 w-3.5" />
            Email
          </a>
        ) : (
          <Link
            to={`/retailers/${retailer.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
}
