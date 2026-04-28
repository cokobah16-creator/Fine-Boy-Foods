import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import logoUrl from "@/assets/fbf-logo.png";
import { TodaysOrderOfBusiness } from "@/components/dashboard/TodaysOrderOfBusiness";

type SupabaseStatus =
  | { state: "checking" }
  | { state: "not_configured" }
  | { state: "connected"; rowCount: number }
  | { state: "error"; message: string };

type EdgeFunctionStatus =
  | { state: "waiting_supabase" }
  | { state: "checking" }
  | { state: "deployed"; aiEnabled: boolean }
  | { state: "missing" }
  | { state: "error"; message: string };

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
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus>(
    supabaseConfigured ? { state: "checking" } : { state: "not_configured" }
  );
  const [edgeFunctionStatus, setEdgeFunctionStatus] = useState<EdgeFunctionStatus>(
    supabaseConfigured ? { state: "checking" } : { state: "waiting_supabase" }
  );

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;
    let cancelled = false;
    supabase
      .from("retailers")
      .select("id", { count: "exact", head: true })
      .then(({ error, count }) => {
        if (cancelled) return;
        if (error) {
          setSupabaseStatus({ state: "error", message: error.message });
        } else {
          setSupabaseStatus({ state: "connected", rowCount: count ?? 0 });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setEdgeFunctionStatus({ state: "waiting_supabase" });
      return;
    }
    let cancelled = false;
    setEdgeFunctionStatus({ state: "checking" });
    supabase.functions
      .invoke("find-retailers", { body: { health: true } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          const status = (error as { status?: number; context?: { status?: number } }).status
            ?? (error as { context?: { status?: number } }).context?.status;
          if (status === 404) {
            setEdgeFunctionStatus({ state: "missing" });
          } else {
            setEdgeFunctionStatus({ state: "error", message: error.message });
          }
          return;
        }
        const payload = data as { status?: string; anthropicConfigured?: boolean } | null;
        if (payload?.status === "ok") {
          setEdgeFunctionStatus({
            state: "deployed",
            aiEnabled: Boolean(payload.anthropicConfigured),
          });
        } else {
          setEdgeFunctionStatus({ state: "error", message: "Unexpected health response" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Only surface a system-status block when something is actively broken or
  // unconfigured. Healthy probes render nothing — the dashboard stays focused
  // on the day's work, not always-green checkmarks.
  const systemIssues: { label: string; detail: string }[] = [];

  if (supabaseStatus.state === "not_configured") {
    systemIssues.push({
      label: "Connect Supabase for cloud storage",
      detail: "Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env, then redeploy.",
    });
  } else if (supabaseStatus.state === "error") {
    systemIssues.push({
      label: "Supabase configured but query failed",
      detail: supabaseStatus.message,
    });
  }

  if (edgeFunctionStatus.state === "missing") {
    systemIssues.push({
      label: "Deploy Edge Function for live AI search",
      detail: "Run `supabase functions deploy find-retailers` after setting GOOGLE_MAPS_API_KEY.",
    });
  } else if (edgeFunctionStatus.state === "error") {
    systemIssues.push({
      label: "Edge Function probe failed",
      detail: edgeFunctionStatus.message,
    });
  }

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
        {/* Subtle gold accent shape, top-right */}
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

      {/* Today's order of business — editorial briefing built from real
          retailers data, replaces the static Getting Started checklist. */}
      <TodaysOrderOfBusiness />

      {/* System status — only render when something is actually broken so the
          dashboard isn't cluttered with always-green checkmarks. */}
      {systemIssues.length > 0 && (
        <div className="mt-6 card">
          <h2 className="eyebrow mb-3">System status</h2>
          <ul className="space-y-3">
            {systemIssues.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <ExclamationTriangleIcon
                  className="h-5 w-5 flex-shrink-0 mt-0.5 text-tier-maybe-fg"
                  strokeWidth={2}
                />
                <div>
                  <p className="text-sm font-medium text-charcoal-700">{item.label}</p>
                  <p className="text-xs text-charcoal-400 mt-0.5">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
