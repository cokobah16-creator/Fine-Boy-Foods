import { Link } from "react-router-dom";
import {
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

const QUICK_LINKS = [
  {
    to: "/retailers",
    icon: BuildingStorefrontIcon,
    label: "Retailer Pipeline",
    description: "View and manage your Abuja retailer leads",
    color: "bg-amber-50 text-amber-700",
    iconBg: "bg-amber-100",
  },
  {
    to: "/retailers/find",
    icon: MagnifyingGlassIcon,
    label: "Find New Leads",
    description: "Use AI to discover new Abuja retailers",
    color: "bg-blue-50 text-blue-700",
    iconBg: "bg-blue-100",
  },
  {
    to: "/retailers/import",
    icon: ArrowTrendingUpIcon,
    label: "Import Retailers",
    description: "Add retailers manually or via CSV upload",
    color: "bg-emerald-50 text-emerald-700",
    iconBg: "bg-emerald-100",
  },
];

export function DashboardPage() {
  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to Fine Boy Foods
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Your Abuja retail prospecting and CRM platform. Find, qualify, and supply retailers.
        </p>
      </div>

      {/* Brand context banner */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">🍟</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">Fine Boy Foods – Plantain Chips</h2>
            <p className="text-brand-100 text-sm mt-1 leading-relaxed">
              Premium Abuja-made plantain chips. Sweet Original &amp; Spicy Suya.
              Clean ingredients, proudly Nigerian, ready for retail shelves across Abuja.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {["Supermarkets", "Mini-Marts", "Hotels", "Pharmacies", "Fuel Stations", "Campus Stores"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="bg-white/20 rounded-full px-3 py-1 text-xs font-medium"
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="card hover:shadow-md transition-all hover:-translate-y-0.5 group"
          >
            <div className={`h-10 w-10 rounded-xl ${link.iconBg} flex items-center justify-center mb-3`}>
              <link.icon className={`h-5 w-5 ${link.color.split(" ")[1]}`} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
              {link.label}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{link.description}</p>
          </Link>
        ))}
      </div>

      {/* Setup checklist */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Getting Started
      </h2>
      <div className="card">
        <ul className="space-y-3">
          {[
            {
              done: true,
              label: "Retailer Finder Agent is live",
              detail: "AI-powered lead discovery for Abuja retailers",
            },
            {
              done: true,
              label: "Sample Abuja retailer leads loaded",
              detail: "12 seed retailers across categories and areas",
            },
            {
              done: false,
              label: "Connect Supabase for cloud storage",
              detail: "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env",
            },
            {
              done: false,
              label: "Deploy Edge Function for live AI search",
              detail: "supabase/functions/find-retailers/index.ts",
            },
            {
              done: false,
              label: "Add your first real Abuja retailer lead",
              detail: "Visit /retailers/import to add manually",
            },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircleIcon
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  item.done ? "text-emerald-500" : "text-gray-200"
                }`}
              />
              <div>
                <p
                  className={`text-sm font-medium ${
                    item.done ? "text-gray-900 line-through" : "text-gray-700"
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
