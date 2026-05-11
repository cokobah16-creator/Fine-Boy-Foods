import { useEffect, useState } from "react";
import {
  CloudIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  SignalSlashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  subscribeSyncStatus,
  retryAll,
  type SyncStatusSnapshot,
} from "@/lib/sync";

interface Props {
  compact?: boolean;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

interface BadgeState {
  label: string;
  detail: string;
  Icon: React.ElementType;
  tone: "ok" | "warn" | "error" | "muted";
  showRetry: boolean;
}

function deriveBadge(s: SyncStatusSnapshot): BadgeState {
  if (!s.configured) {
    return {
      label: "Local only",
      detail: "Cloud sync not configured",
      Icon: CloudIcon,
      tone: "muted",
      showRetry: false,
    };
  }
  if (!s.online) {
    return {
      label: "Offline",
      detail:
        s.pending > 0
          ? `${s.pending} change${s.pending === 1 ? "" : "s"} waiting`
          : "Changes will sync when you're back online",
      Icon: SignalSlashIcon,
      tone: "warn",
      showRetry: false,
    };
  }
  if (s.failed > 0) {
    return {
      label: "Sync failed",
      detail: `${s.failed} item${s.failed === 1 ? "" : "s"} couldn't sync — tap to retry`,
      Icon: ExclamationTriangleIcon,
      tone: "error",
      showRetry: true,
    };
  }
  if (s.pending > 0 || s.draining) {
    return {
      label: "Syncing",
      detail: `${s.pending} pending`,
      Icon: CloudArrowUpIcon,
      tone: "warn",
      showRetry: false,
    };
  }
  return {
    label: "Synced",
    detail: `Last sync ${formatRelative(s.lastSyncedAt)}`,
    Icon: CloudIcon,
    tone: "ok",
    showRetry: false,
  };
}

const TONE_STYLES: Record<BadgeState["tone"], string> = {
  ok: "bg-green-50 text-green-700 ring-green-100",
  warn: "bg-cream-100 text-charcoal-600 ring-charcoal-100",
  error: "bg-[#FFE9D6] text-[#B23E0E] ring-[#F4A36A]",
  muted: "bg-charcoal-50 text-charcoal-500 ring-charcoal-100",
};

export function SyncBadge({ compact = false }: Props) {
  const [snap, setSnap] = useState<SyncStatusSnapshot | null>(null);

  useEffect(() => subscribeSyncStatus(setSnap), []);
  if (!snap) return null;

  const badge = deriveBadge(snap);
  const { Icon } = badge;

  if (compact) {
    return (
      <button
        type="button"
        onClick={badge.showRetry ? () => void retryAll() : undefined}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${TONE_STYLES[badge.tone]} ${
          badge.showRetry ? "cursor-pointer hover:brightness-95" : "cursor-default"
        }`}
        title={`${badge.label} — ${badge.detail}`}
        aria-label={`Sync status: ${badge.label}. ${badge.detail}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span>{badge.label}</span>
      </button>
    );
  }

  return (
    <div
      className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ring-1 ring-inset ${TONE_STYLES[badge.tone]}`}
    >
      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">{badge.label}</p>
        <p className="text-[11px] opacity-80 leading-tight mt-0.5 truncate">
          {badge.detail}
        </p>
      </div>
      {badge.showRetry && (
        <button
          type="button"
          onClick={() => void retryAll()}
          className="flex-shrink-0 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold hover:bg-white/40"
          aria-label="Retry failed sync items"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
