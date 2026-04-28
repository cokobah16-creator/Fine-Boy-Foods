import { Link } from "react-router-dom";
import {
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import logoUrl from "@/assets/fbf-logo.png";
import { FocusTodayBlock } from "@/components/FocusTodayBlock";

const QUICK_LINKS = [
  {
    to: "/retailers",
    icon: BuildingStorefrontIcon,
    label: "Retailer pipeline",
    description: "View and manage your Abuja retailer leads.",
    iconBg: "bg-green-50",
    iconFg: "text-green-700",
  },
  {
    to: "/retailers/find",
    icon: MagnifyingGlassIcon,
    label: "Find new leads",
    description: "Use AI to discover Abuja retailers worth pitching.",
    iconBg: "bg-cream-200",
    iconFg: "text-gold-600",
  },
  {
    to: "/retailers/import",
    icon: ArrowUpTrayIcon,
    label: "Add a retailer",
    description: "Save a lead manually after a visit or call.",
    iconBg: "bg-cream-100",
    iconFg: "text-charcoal-600",
  },
];

const RETAIL_TAGS = [
  "Supermarkets",
  "Mini-marts",
  "Hotels",
  "Pharmacies",
  "Fuel stations",
  "Campus stores",
];

export function DashboardPage() {
  return (
    <div>
      {/* Welcome */}
      <div className="mb-7">
        <p className="eyebrow mb-2">Retailer Finder Agent</p>
        <h1 className="heading-h1 text-[32px] leading-tight">
          Welcome back to Fine Boy Foods
        </h1>
        <p className="text-charcoal-500 mt-2 text-sm leading-relaxed">
          Your Abuja prospecting CRM. Find, qualify, and supply retailers with FBF plantain chips.
        </p>
      </div>

      {/* Brand context banner — flat forest green hero with cream text and gold accent */}
      <div className="mb-8 rounded-xl bg-green-700 p-6 text-white relative overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-gold-400/20 blur-2xl"
        />
        <div className="relative flex items-start gap-4">
          <img
            src={logoUrl}
            alt=""
            className="h-14 w-14 rounded-full ring-2 ring-cream-50/40 bg-cream-50 flex-shrink-0"
          />
          <div className="min-w-0">
            <h2 className="heading-display text-xl text-cream-50">
              Fine Boy Foods — plantain chips
            </h2>
            <p className="text-cream-100/90 text-sm mt-1.5 leading-relaxed">
              Premium Abuja-made plantain chips. Sweet Original &amp; Spicy Suya.
              Clean ingredients, proudly Nigerian, ready for retail shelves.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {RETAIL_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="bg-cream-50/15 ring-1 ring-cream-50/20 rounded-full px-2.5 py-1 text-[11px] font-medium text-cream-50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 className="eyebrow mb-3">Quick actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="card hover:shadow-md hover:-translate-y-0.5 ease-standard group block"
          >
            <div className={`h-10 w-10 rounded-md ${link.iconBg} flex items-center justify-center mb-3`}>
              <link.icon className={`h-5 w-5 ${link.iconFg}`} strokeWidth={2} />
            </div>
            <h3 className="text-sm font-semibold text-charcoal-700 group-hover:text-green-600 transition-colors">
              {link.label}
            </h3>
            <p className="text-xs text-charcoal-400 mt-1 leading-relaxed">{link.description}</p>
          </Link>
        ))}
      </div>

      {/* Focus Today — almanac-style morning dispatch (replaces Getting Started) */}
      <FocusTodayBlock />
    </div>
  );
}
