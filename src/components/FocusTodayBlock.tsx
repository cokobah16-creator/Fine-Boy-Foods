import { Link } from "react-router-dom";
import {
  MapPinIcon,
  ClockIcon,
  ChatBubbleOvalLeftIcon,
  PhoneIcon,
  FireIcon,
  BellAlertIcon,
  CheckCircleIcon,
  UserIcon,
  ArchiveBoxIcon,
  SparklesIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  MapIcon,
} from "@heroicons/react/24/outline";

type FocusItem = {
  numeral: "I." | "II." | "III.";
  position: "FIRST" | "NEXT" | "FINALLY";
  verb: string;
  business: string;
  area: string;
  channelIcon: typeof ClockIcon;
  channelLabel: string;
  reason: React.ReactNode;
  tags: { label: string; tone: "hot" | "due" | "ready" | "neutral"; icon: typeof ClockIcon }[];
  metaTop: string;
  metaLabel: "SCORE" | "SILENT" | "RIPENED";
  arrowLabel: "Open file" | "Open thread";
  urgent: boolean;
  priority: boolean;
  href: string;
};

const TODAYS_FOCUS: FocusItem[] = [
  {
    numeral: "I.",
    position: "FIRST",
    verb: "Visit",
    business: "Next Cash and Carry",
    area: "Jahi District",
    channelIcon: ClockIcon,
    channelLabel: "9:00 – 11:00 am window",
    reason: (
      <>
        Mr. Adeyemi, purchasing manager, is in the building this morning only.
        Score <b className="text-charcoal-700 font-semibold">92</b> —{" "}
        <span className="bg-gradient-to-b from-transparent from-[60%] to-gold-300/50 to-[60%] px-px font-semibold text-charcoal-700">
          our hottest unworked lead.
        </span>{" "}
        Walk in with the Sweet Original sample tin.
      </>
    ),
    tags: [
      { label: "Hot lead", tone: "hot", icon: FireIcon },
      { label: "Decision-maker on-site", tone: "neutral", icon: UserIcon },
      { label: "Bring sample", tone: "neutral", icon: ArchiveBoxIcon },
    ],
    metaTop: "92",
    metaLabel: "SCORE",
    arrowLabel: "Open file",
    urgent: true,
    priority: true,
    href: "/retailers",
  },
  {
    numeral: "II.",
    position: "NEXT",
    verb: "Follow up",
    business: "with Sahad Stores",
    area: "Central Business District",
    channelIcon: ChatBubbleOvalLeftIcon,
    channelLabel: "WhatsApp",
    reason: (
      <>
        They said yes to samples five days ago and the trail's gone quiet.
        Suggested message is drafted —{" "}
        <span className="bg-gradient-to-b from-transparent from-[60%] to-gold-300/50 to-[60%] px-px font-semibold text-charcoal-700">
          just press send before lunch.
        </span>
      </>
    ),
    tags: [
      { label: "Overdue 5 days", tone: "due", icon: BellAlertIcon },
      { label: "Draft ready", tone: "neutral", icon: SparklesIcon },
    ],
    metaTop: "5d",
    metaLabel: "SILENT",
    arrowLabel: "Open thread",
    urgent: false,
    priority: false,
    href: "/retailers",
  },
  {
    numeral: "III.",
    position: "FINALLY",
    verb: "Close",
    business: "Ebeano Supermarket",
    area: "Gwarinpa Estate",
    channelIcon: PhoneIcon,
    channelLabel: "Call or drop-in",
    reason: (
      <>
        Samples landed seven days ago — long enough for the team to taste-test.{" "}
        <span className="bg-gradient-to-b from-transparent from-[60%] to-gold-300/50 to-[60%] px-px font-semibold text-charcoal-700">
          Time to ask for the order.
        </span>{" "}
        Pitch script and pricing sheet attached to the file.
      </>
    ),
    tags: [
      { label: "Ready to close", tone: "ready", icon: CheckCircleIcon },
      { label: "Pitch script", tone: "neutral", icon: DocumentTextIcon },
    ],
    metaTop: "7d",
    metaLabel: "RIPENED",
    arrowLabel: "Open file",
    urgent: false,
    priority: false,
    href: "/retailers",
  },
];

const TAG_TONES: Record<FocusItem["tags"][number]["tone"], string> = {
  hot:     "text-tier-hot-fg border-tier-hot-ring bg-tier-hot-bg",
  due:     "text-gold-600 border-gold-400 bg-cream-100",
  ready:   "text-green-700 border-green-300 bg-green-50",
  neutral: "text-charcoal-500 border-charcoal-300 bg-cream-50",
};

export function FocusTodayBlock() {
  const today = new Date();
  const day = today.toLocaleDateString("en-GB", { weekday: "long" });
  const dateNum = today.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const issueNumber = String(
    Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
  ).padStart(3, "0");
  const done = 0;
  const total = TODAYS_FOCUS.length;

  return (
    <section
      aria-labelledby="focus-today-heading"
      className="bg-cream-50 rounded-[4px] border border-charcoal-700 shadow-[0_2px_0_0_var(--charcoal-700)] overflow-hidden"
      style={{ boxShadow: "0 2px 0 0 #1F1D17, 0 4px 12px -2px rgba(20,19,14,0.08), 0 2px 4px rgba(20,19,14,0.04)" }}
    >
      {/* Masthead — three-column lockup / title / date */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-end px-8 pt-[18px] pb-4 border-b border-charcoal-700">
        <div className="self-end">
          <p className="font-display italic font-bold text-[13px] leading-none text-green-700 tracking-wide pb-1 border-b-2 border-gold-400">
            FBF / Field Desk
          </p>
          <p className="not-italic font-semibold text-[9.5px] tracking-[0.18em] text-charcoal-500 mt-1">
            NO. {issueNumber}
          </p>
        </div>
        <h2
          id="focus-today-heading"
          className="font-display font-bold text-[44px] leading-[0.95] tracking-[-0.025em] text-charcoal-700 text-center m-0"
        >
          Today's <em className="italic font-semibold text-green-600">order</em> of business
        </h2>
        <div className="text-right self-end pb-1">
          <p className="font-display italic font-semibold text-[14px] leading-tight text-charcoal-600">
            {day}, {dateNum}
          </p>
          <p className="not-italic font-sans font-semibold text-[9.5px] tracking-[0.18em] text-charcoal-500 mt-1">
            ABUJA · FIELD
          </p>
        </div>
      </div>

      {/* Sub strip */}
      <div className="bg-cream-100 border-b border-charcoal-300 px-8 py-2 flex items-center justify-between font-mono text-[10.5px] tracking-[0.12em] uppercase text-charcoal-500">
        <span>Three calls · in priority order</span>
        <span className="text-green-700 font-semibold">
          Pipeline at stake{" "}
          <b className="font-display italic text-gold-600 text-[13px] tracking-normal normal-case mx-0.5">
            ₦240,000
          </b>
        </span>
        <span className="inline-flex items-center gap-1.5 text-cream-300 font-mono text-[10px] tracking-[0.1em]">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full border-[1.5px] ${
                i < done ? "bg-gold-300 border-gold-300" : "border-charcoal-300 bg-transparent"
              }`}
            />
          ))}
          <span className="text-charcoal-500">{done} / {total} done</span>
        </span>
      </div>

      {/* Order list */}
      <div className="px-8 pt-2 pb-1">
        {TODAYS_FOCUS.map((item, i) => {
          const last = i === TODAYS_FOCUS.length - 1;
          const ChannelIcon = item.channelIcon;
          return (
            <Link
              key={item.numeral}
              to={item.href}
              className={`grid grid-cols-[56px_1fr_auto] gap-6 items-start py-[22px] -mx-4 px-4 rounded-sm group transition-colors duration-200 ease-standard hover:bg-gold-300/10 ${
                last ? "" : "border-b border-charcoal-100"
              }`}
            >
              {/* Numeral */}
              <div className="text-center">
                <div
                  className={`font-display italic font-bold text-[56px] leading-[0.85] tracking-[-0.04em] ${
                    item.priority ? "text-green-600" : "text-charcoal-700"
                  }`}
                >
                  {item.numeral}
                </div>
                <div className="not-italic font-sans font-bold text-[8.5px] tracking-[0.16em] text-charcoal-400 mt-1.5">
                  {item.position}
                </div>
              </div>

              {/* Body */}
              <div className="min-w-0">
                <h3 className="font-display font-bold text-[22px] leading-[1.15] tracking-[-0.015em] text-charcoal-700 mb-1.5">
                  <span className="italic font-semibold text-green-600">{item.verb}</span>{" "}
                  {item.business}
                </h3>
                <div className="text-[12px] uppercase tracking-[0.12em] font-semibold text-charcoal-400 mb-2.5 flex items-center gap-2 flex-wrap">
                  <MapPinIcon className="h-3 w-3 text-charcoal-300" strokeWidth={2} />
                  {item.area}
                  <span className="h-[3px] w-[3px] rounded-full bg-charcoal-300" />
                  <ChannelIcon className="h-3 w-3 text-charcoal-300" strokeWidth={2} />
                  {item.channelLabel}
                </div>
                <p className="text-[14px] leading-[1.55] text-charcoal-500 max-w-[56ch] m-0">
                  {item.reason}
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {item.tags.map((tag) => {
                    const TagIcon = tag.icon;
                    return (
                      <span
                        key={tag.label}
                        className={`inline-flex items-center gap-1.5 h-[22px] px-2.5 rounded-full border text-[10.5px] font-semibold tracking-wide uppercase ${TAG_TONES[tag.tone]}`}
                      >
                        <TagIcon className="h-[11px] w-[11px]" strokeWidth={2} />
                        {tag.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Meta */}
              <div className="text-right pt-1 min-w-[92px]">
                <div
                  className={`font-display font-bold italic text-[32px] leading-none tracking-[-0.02em] tabular-nums ${
                    item.urgent ? "text-tier-hot-fg" : "text-charcoal-700"
                  }`}
                >
                  {item.metaTop}
                </div>
                <div className="text-[9.5px] font-bold tracking-[0.16em] text-charcoal-400 mt-1">
                  {item.metaLabel}
                </div>
                <div className="mt-3.5 inline-flex items-center gap-1 font-display italic font-semibold text-[13px] text-green-600 group-hover:text-green-700 border-b border-green-300 group-hover:border-green-600 pb-0.5 transition-colors">
                  {item.arrowLabel}
                  <ArrowRightIcon className="h-3.5 w-3.5" strokeWidth={2} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Star ornament rule */}
      <div className="flex items-center justify-center gap-3 px-8 pt-1.5 text-charcoal-300 before:content-[''] before:flex-1 before:h-px before:bg-charcoal-200 after:content-[''] after:flex-1 after:h-px after:bg-charcoal-200">
        <span className="font-display text-base leading-none">✺</span>
      </div>

      {/* Foot */}
      <div className="bg-charcoal-700 text-cream-100 px-8 py-3.5 flex items-center justify-between gap-5 rounded-b-[3px]">
        <p className="font-display italic text-[14px] leading-snug text-cream-200 m-0">
          A loop through{" "}
          <b className="not-italic font-sans font-bold text-gold-300 tracking-wide">Wuse 2</b>
          <span className="text-cream-300 mx-1">→</span>
          <b className="not-italic font-sans font-bold text-gold-300 tracking-wide">CBD</b>
          <span className="text-cream-300 mx-1">→</span>
          <b className="not-italic font-sans font-bold text-gold-300 tracking-wide">Gwarinpa</b>{" "}
          — about forty-five minutes on the road.
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-[4px] bg-gold-400 hover:bg-gold-300 text-charcoal-800 text-[12.5px] font-bold uppercase tracking-wide font-sans shadow-[0_2px_0_0_#9F7A06] hover:shadow-[0_3px_0_0_#9F7A06] hover:-translate-y-px active:translate-y-px active:shadow-[0_1px_0_0_#9F7A06] transition-all duration-200 ease-standard"
        >
          <MapIcon className="h-3.5 w-3.5" strokeWidth={2} />
          Open as route
        </button>
      </div>
    </section>
  );
}
