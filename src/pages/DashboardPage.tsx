import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import logoUrl from "@/assets/fbf-logo.png";

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

  const supabaseChecklistItem = (() => {
    switch (supabaseStatus.state) {
      case "connected":
        return {
          done: true,
          label: "Supabase connected",
          detail: `Live connection to retailers table (${supabaseStatus.rowCount} rows).`,
        };
      case "checking":
        return {
          done: false,
          label: "Checking Supabase connection…",
          detail: "Running smoke test against the retailers table.",
        };
      case "error":
        return {
          done: false,
          label: "Supabase configured but query failed",
          detail: supabaseStatus.message,
        };
      case "not_configured":
      default:
        return {
          done: false,
          label: "Connect Supabase for cloud storage",
          detail: "Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env",
        };
    }
  })();

  const edgeFunctionChecklistItem = (() => {
    switch (edgeFunctionStatus.state) {
      case "deployed":
        return {
          done: true,
          label: edgeFunctionStatus.aiEnabled
            ? "Edge Function deployed (Claude scoring enabled)"
            : "Edge Function deployed (deterministic scoring)",
          detail: edgeFunctionStatus.aiEnabled
            ? "find-retailers is live with GOOGLE_MAPS_API_KEY and ANTHROPIC_API_KEY set."
            : "find-retailers is live. Set ANTHROPIC_API_KEY for Claude-powered scoring.",
        };
      case "checking":
        return {
          done: false,
          label: "Checking Edge Function deployment…",
          detail: "Probing supabase/functions/find-retailers.",
        };
      case "missing":
        return {
          done: false,
          label: "Deploy Edge Function for live AI search",
          detail: "Run `supabase functions deploy find-retailers` after setting GOOGLE_MAPS_API_KEY.",
        };
      case "error":
        return {
          done: false,
          label: "Edge Function probe failed",
          detail: edgeFunctionStatus.message,
        };
      case "waiting_supabase":
      default:
        return {
          done: false,
          label: "Deploy Edge Function for live AI search",
          detail: "Connect Supabase first so deployment checks can run.",
        };
    }
  })();

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

      {/* Setup checklist */}
      <h2 className="eyebrow mb-3">Getting started</h2>
      <div className="card">
        <ul className="space-y-3">
          {[
            {
              done: true,
              label: "Retailer Finder Agent is live",
              detail: "AI-powered lead discovery for Abuja retailers.",
            },
            {
              done: true,
              label: "Sample Abuja retailer leads loaded",
              detail: "12 seed retailers across categories and areas.",
            },
            supabaseChecklistItem,
            edgeFunctionChecklistItem,
            {
              done: false,
              label: "Add your first real Abuja retailer lead",
              detail: "Visit Add retailer to add manually.",
            },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircleIcon
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  item.done ? "text-green-500" : "text-charcoal-100"
                }`}
                strokeWidth={2}
              />
              <div>
                <p
                  className={`text-sm font-medium ${
                    item.done ? "text-charcoal-400 line-through" : "text-charcoal-700"
                  }`}
                >
                  {item.label}
                </p>
                <p className="text-xs text-charcoal-400 mt-0.5">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
