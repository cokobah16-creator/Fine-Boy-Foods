import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPinIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  ArrowRightIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { getAllRetailers } from "@/services/retailerService";
import type { Retailer, RetailerStatus } from "@/types/retailer";
import { RETAILER_CATEGORY_LABELS } from "@/types/retailer";

const ROMAN = ["I.", "II.", "III."];
const ORDINAL = ["FIRST", "NEXT", "FINALLY"];
const TERMINAL_STATUSES: RetailerStatus[] = ["supplied", "rejected", "do_not_contact"];
const ACTIONED_STATUSES: RetailerStatus[] = [
  "contacted",
  "interested",
  "sample_delivered",
  "negotiating",
];

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

function verbForStatus(status: RetailerStatus): string {
  switch (status) {
    case "not_contacted":
      return "Visit";
    case "contacted":
      return "Follow up";
    case "interested":
    case "sample_delivered":
    case "negotiating":
      return "Close";
    default:
      return "Open";
  }
}

function channelHint(r: Retailer): { label: string; icon: React.ElementType } {
  const phones = r.phones ?? (r.phone ? [r.phone] : []);
  if (phones[0]) return { label: "WhatsApp", icon: ChatBubbleLeftRightIcon };
  const emails = r.emails ?? (r.email ? [r.email] : []);
  if (emails[0]) return { label: "Email", icon: EnvelopeIcon };
  return { label: "Walk-in", icon: MapPinIcon };
}

function rightMetric(r: Retailer): { value: string; label: string; tone: "score" | "silent" | "ripened" | "working" } {
  const days = daysSince(r.updatedAt);
  switch (r.status) {
    case "not_contacted":
      return { value: String(r.leadScore), label: "SCORE", tone: "score" };
    case "sample_delivered":
      return { value: days !== null ? `${days}d` : "—", label: "RIPENED", tone: "ripened" };
    case "negotiating":
      return { value: days !== null ? `${days}d` : "—", label: "WORKING", tone: "working" };
    case "contacted":
    case "interested":
    default:
      return { value: days !== null ? `${days}d` : "—", label: "SILENT", tone: "silent" };
  }
}

function tagsFor(r: Retailer): { label: string; tone: "hot" | "neutral" | "good" | "warn" }[] {
  const tags: { label: string; tone: "hot" | "neutral" | "good" | "warn" }[] = [];

  if (r.leadScore >= 85) tags.push({ label: "HOT LEAD", tone: "hot" });

  const phones = r.phones ?? (r.phone ? [r.phone] : []);
  const emails = r.emails ?? (r.email ? [r.email] : []);
  if (phones[0]) tags.push({ label: "WHATSAPP READY", tone: "neutral" });
  else if (emails[0]) tags.push({ label: "EMAIL READY", tone: "neutral" });

  if (r.status === "interested") tags.push({ label: "INTERESTED", tone: "good" });
  if (r.status === "sample_delivered") tags.push({ label: "SAMPLE OUT", tone: "good" });
  if (r.status === "negotiating") tags.push({ label: "NEGOTIATING", tone: "good" });

  const days = daysSince(r.updatedAt);
  if (
    r.status !== "not_contacted" &&
    days !== null &&
    days >= 7 &&
    !tags.some((t) => t.tone === "warn")
  ) {
    tags.push({ label: `SILENT ${days}D`, tone: "warn" });
  }

  return tags.slice(0, 3);
}

function bodyFor(r: Retailer): string {
  const phones = r.phones ?? (r.phone ? [r.phone] : []);
  const emails = r.emails ?? (r.email ? [r.email] : []);
  const channel = phones[0]
    ? `WhatsApp ${phones[0]}`
    : emails[0]
      ? `email ${emails[0]}`
      : "drop in at the address";

  const reason = r.scoreReason?.trim();
  const next = r.recommendedNextStep?.trim();

  if (reason && next) return `${reason} ${next}`;
  if (next) return `${next}`;
  if (reason) return `${reason} Reach out via ${channel}.`;
  return `Reach out via ${channel}.`;
}

function rightToneClasses(tone: "score" | "silent" | "ripened" | "working"): string {
  switch (tone) {
    case "score":
      return "text-tier-hot-fg";
    case "silent":
      return "text-charcoal-700";
    case "ripened":
      return "text-gold-600";
    case "working":
      return "text-green-700";
  }
}

function tagClasses(tone: "hot" | "neutral" | "good" | "warn"): string {
  switch (tone) {
    case "hot":
      return "bg-tier-hot-bg text-tier-hot-fg ring-tier-hot-ring";
    case "good":
      return "bg-tier-good-bg text-tier-good-fg ring-tier-good-ring";
    case "warn":
      return "bg-tier-maybe-bg text-tier-maybe-fg ring-tier-maybe-ring";
    case "neutral":
    default:
      return "bg-cream-50 text-charcoal-500 ring-charcoal-100";
  }
}

function pickPrioritized(retailers: Retailer[], n = 3): Retailer[] {
  return retailers
    .filter((r) => !TERMINAL_STATUSES.includes(r.status))
    .sort((a, b) => {
      // Higher score first, then freshness (more recent updates first).
      if (b.leadScore !== a.leadScore) return b.leadScore - a.leadScore;
      const at = Date.parse(a.updatedAt);
      const bt = Date.parse(b.updatedAt);
      return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
    })
    .slice(0, n);
}

export function TodaysOrderOfBusiness() {
  const [retailers, setRetailers] = useState<Retailer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllRetailers()
      .then((rs) => {
        if (!cancelled) setRetailers(rs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date();
  const dateLabel = today.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const issueNumber = dayOfYear(today);

  const cards = retailers ? pickPrioritized(retailers, 3) : [];
  const topScore = cards[0]?.leadScore ?? null;
  const actioned = cards.filter((r) => ACTIONED_STATUSES.includes(r.status)).length;

  return (
    <section className="card-cream p-0 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 grid grid-cols-3 items-center gap-4 border-b border-charcoal-100/60">
        <div className="text-xs">
          <p className="heading-display italic text-charcoal-700">
            FBF /{" "}
            <span className="underline decoration-green-500/60 decoration-2 underline-offset-2">
              Field Desk
            </span>
          </p>
          <p className="eyebrow mt-1.5">No. {issueNumber}</p>
        </div>
        <h2 className="heading-display text-[28px] sm:text-[32px] leading-tight text-center text-charcoal-700">
          Today&rsquo;s <em className="text-green-700 not-italic font-bold italic">order</em>{" "}
          of business
        </h2>
        <div className="text-right text-xs">
          <p className="heading-display italic font-bold text-charcoal-700">{dateLabel}</p>
          <p className="eyebrow mt-1.5">Abuja · Field</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-6 py-3 grid grid-cols-3 items-center gap-4 bg-cream-200/60 border-b border-charcoal-100/60">
        <p className="eyebrow">
          {cards.length || "0"} call{cards.length === 1 ? "" : "s"} · in priority order
        </p>
        <p className="eyebrow text-center">
          {topScore !== null ? (
            <>
              Top score{" "}
              <span className="text-tier-hot-fg font-bold tabular-nums">{topScore}</span>
            </>
          ) : (
            <span className="text-charcoal-300">— · —</span>
          )}
        </p>
        <p className="eyebrow text-right">
          <span className="inline-flex items-center gap-2">
            <span className="inline-flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-full ring-1 ${
                    i < actioned
                      ? "bg-green-500 ring-green-500"
                      : "bg-transparent ring-charcoal-300"
                  }`}
                />
              ))}
            </span>
            <span className="tabular-nums">
              {actioned} / {cards.length || 0}
            </span>{" "}
            actioned
          </span>
        </p>
      </div>

      {/* Body */}
      {error && (
        <div className="px-6 py-6 text-sm text-tier-hot-fg">
          Couldn&rsquo;t load your pipeline: {error}
        </div>
      )}

      {!error && retailers === null && (
        <div className="px-6 py-12 text-center text-sm text-charcoal-400">
          Loading today&rsquo;s priorities…
        </div>
      )}

      {!error && retailers !== null && cards.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="heading-display text-xl text-charcoal-700 mb-1">
            No leads in your pipeline yet
          </p>
          <p className="text-sm text-charcoal-500 mb-4">
            Add real Abuja retailers to see them prioritised here.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/retailers/find" className="btn-primary">
              <FireIcon className="h-4 w-4" strokeWidth={2} />
              Find retailers
            </Link>
            <Link to="/retailers/import" className="btn-secondary">
              Add retailer
            </Link>
          </div>
        </div>
      )}

      {!error &&
        cards.map((r, i) => {
          const verb = verbForStatus(r.status);
          const channel = channelHint(r);
          const metric = rightMetric(r);
          const tags = tagsFor(r);
          return (
            <article
              key={r.id}
              className={`px-6 py-5 grid grid-cols-[3rem_1fr_8rem] gap-4 ${
                i < cards.length - 1 ? "border-b border-charcoal-100/60" : ""
              }`}
            >
              <div className="text-center">
                <p className="heading-display text-3xl text-green-700">{ROMAN[i]}</p>
                <p className="eyebrow mt-1">{ORDINAL[i]}</p>
              </div>

              <div className="min-w-0">
                <h3 className="heading-display text-xl leading-tight text-charcoal-700">
                  <em className="text-green-700 not-italic font-bold italic">{verb}</em>{" "}
                  {r.businessName}
                </h3>

                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-charcoal-400 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3" strokeWidth={2} />
                    {r.area}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <channel.icon className="h-3 w-3" strokeWidth={2} />
                    {channel.label}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{RETAILER_CATEGORY_LABELS[r.category]}</span>
                </p>

                <p className="text-sm text-charcoal-700 mt-2.5 leading-relaxed">{bodyFor(r)}</p>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {tags.map((t) => (
                      <span
                        key={t.label}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide ring-1 ${tagClasses(t.tone)}`}
                      >
                        {t.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-right flex flex-col items-end justify-between">
                <div>
                  <p
                    className={`heading-display text-3xl leading-none italic ${rightToneClasses(metric.tone)}`}
                  >
                    {metric.value}
                  </p>
                  <p className="eyebrow mt-1">{metric.label}</p>
                </div>
                <Link
                  to={`/retailers/${r.id}`}
                  className="heading-display italic text-sm text-green-700 underline decoration-green-500/60 decoration-2 underline-offset-2 hover:decoration-green-700 inline-flex items-center gap-1"
                >
                  Open file
                  <ArrowRightIcon className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              </div>
            </article>
          );
        })}
    </section>
  );
}
