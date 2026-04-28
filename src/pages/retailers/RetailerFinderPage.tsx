import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import type { RetailerAgentResult, RetailerCategory } from "@/types/retailer";
import { ABUJA_AREAS, RETAILER_CATEGORY_LABELS } from "@/types/retailer";
import { findRetailersWithAI, saveAgentResults } from "@/services/retailerService";
import { ScoreBadge, ScoreBar } from "@/components/retailers/ScoreBadge";
import { supabaseConfigured } from "@/lib/supabase";

function formatRelativeUpdated(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days < 0) return "updated just now";
  if (days === 0) return "updated today";
  if (days === 1) return "updated yesterday";
  if (days < 30) return `updated ${days}d ago`;
  if (days < 365) return `updated ${Math.floor(days / 30)}mo ago`;
  return `updated ${Math.floor(days / 365)}y ago`;
}

function whatsappHref(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

const CATEGORY_OPTIONS: { value: RetailerCategory | "any"; label: string }[] = [
  { value: "any", label: "Any category" },
  { value: "supermarket", label: "Supermarket" },
  { value: "minimart", label: "Mini-mart" },
  { value: "provision_store", label: "Provision store" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "fuel_station_mart", label: "Fuel station mart" },
  { value: "school_store", label: "School store" },
  { value: "campus_store", label: "Campus store" },
  { value: "hotel", label: "Hotel" },
  { value: "gym", label: "Gym" },
  { value: "cafe", label: "Café" },
  { value: "restaurant", label: "Restaurant" },
  { value: "distributor", label: "Distributor" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "other", label: "Other" },
];

export function RetailerFinderPage() {
  const [area, setArea] = useState<string>(ABUJA_AREAS[0]);
  const [category, setCategory] = useState<RetailerCategory | "any">("any");
  const [productFocus, setProductFocus] = useState("premium plantain chips");
  const [minimumLeadScore, setMinimumLeadScore] = useState(50);
  const [numberOfLeads, setNumberOfLeads] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<RetailerAgentResult[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    saved: number;
    skipped: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFind() {
    setLoading(true);
    setResults(null);
    setSaveResult(null);
    setSelected(new Set());
    setError(null);
    try {
      const found = await findRetailersWithAI({
        area,
        category,
        productFocus,
        minimumLeadScore,
        numberOfLeads,
      });
      setResults(found);
      setSelected(new Set(found.map((_, i) => i)));
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Agent search failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!results || selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const toSave = results.filter((_, i) => selected.has(i));
      const { saved, skipped } = await saveAgentResults(toSave);
      setSaveResult({ saved: saved.length, skipped });
      setResults(null);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to save retailers. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-center gap-3">
        <div className="h-11 w-11 rounded-md bg-cream-200 flex items-center justify-center">
          <SparklesIcon className="h-5 w-5 text-gold-600" strokeWidth={2} />
        </div>
        <div>
          <p className="eyebrow mb-1">AI agent</p>
          <h1 className="heading-h1 text-[26px] leading-tight">Find retailers</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            Discover Abuja retailers worth pitching for FBF plantain chips.
          </p>
        </div>
      </div>

      {/* Supabase config warning */}
      {!supabaseConfigured && (
        <div
          role="alert"
          className="mb-6 rounded-md bg-tier-maybe-bg ring-1 ring-tier-maybe-ring p-4"
        >
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-gold-600 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div>
              <p className="text-sm font-semibold text-gold-600">
                Supabase isn’t configured
              </p>
              <p className="text-xs text-tier-maybe-fg mt-1 leading-relaxed">
                The retailer finder needs <code className="font-mono">VITE_SUPABASE_URL</code> and{" "}
                <code className="font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> set in your
                Vercel project (Settings → Environment Variables) for both Production and Preview,
                then redeploy.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inline error */}
      {error && (
        <div
          role="alert"
          className="mb-6 rounded-md bg-[#F9DEDC] ring-1 ring-[#F2BFBC] p-4"
        >
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-[#8B1F1A] flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#8B1F1A]">
                Something went wrong
              </p>
              <p className="text-xs text-[#8B1F1A]/90 mt-1">{error}</p>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-[#8B1F1A] hover:opacity-80"
              aria-label="Dismiss error"
            >
              <XMarkIcon className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Search Form */}
      <div className="card mb-6">
        <p className="eyebrow mb-4">Search parameters</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
              Abuja area
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="input"
            >
              {ABUJA_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
              Retailer type
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RetailerCategory | "any")}
              className="input"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
              Product focus
            </label>
            <input
              type="text"
              value={productFocus}
              onChange={(e) => setProductFocus(e.target.value)}
              placeholder="e.g. premium plantain chips, Spicy Suya flavour"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
              Min lead score:{" "}
              <span className="text-green-600 tabular-nums">{minimumLeadScore}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={minimumLeadScore}
              onChange={(e) => setMinimumLeadScore(Number(e.target.value))}
              className="w-full accent-green-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-600 mb-1.5">
              Number of leads
            </label>
            <select
              value={numberOfLeads}
              onChange={(e) => setNumberOfLeads(Number(e.target.value))}
              className="input"
            >
              {[3, 5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>{n} leads</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={handleFind}
            disabled={loading || !supabaseConfigured}
            className="btn-primary w-full sm:w-auto shadow-pop"
            title={
              !supabaseConfigured
                ? "Supabase environment variables are not set"
                : undefined
            }
          >
            {loading ? (
              <>
                <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                Searching Abuja…
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-4 w-4" strokeWidth={2} />
                Find retailers
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save result */}
      {saveResult && (
        <div className="mb-6 rounded-md bg-green-50 ring-1 ring-green-200 p-4">
          <div className="flex items-center gap-2 text-green-700 font-semibold text-sm mb-1">
            <CheckIcon className="h-5 w-5" strokeWidth={2} />
            {saveResult.saved} retailer{saveResult.saved !== 1 ? "s" : ""} saved to your pipeline
          </div>
          {saveResult.skipped.length > 0 && (
            <p className="text-xs text-green-700/80 mt-1">
              Skipped (duplicates): {saveResult.skipped.join(", ")}
            </p>
          )}
          <Link to="/retailers" className="text-xs text-green-700 underline mt-2 inline-block font-semibold">
            View all retailers →
          </Link>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-charcoal-700">
              {results.length} lead{results.length !== 1 ? "s" : ""} found
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set(results.map((_, i) => i)))}
                className="text-xs font-semibold text-green-700 hover:underline"
              >
                Select all
              </button>
              <span className="text-charcoal-200">|</span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-charcoal-500 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {results.map((r, i) => (
              <div
                key={i}
                className={`card transition-all duration-200 ease-standard cursor-pointer ${
                  selected.has(i)
                    ? "ring-2 ring-green-500"
                    : "opacity-70 hover:opacity-100"
                }`}
                onClick={() => toggleSelect(i)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-sm border-2 flex items-center justify-center transition-colors ${
                      selected.has(i)
                        ? "border-green-500 bg-green-500"
                        : "border-charcoal-200"
                    }`}
                  >
                    {selected.has(i) && <CheckIcon className="h-3 w-3 text-white" strokeWidth={3} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-charcoal-700">
                          {r.businessName}
                        </h3>
                        <p className="text-xs text-charcoal-400 mt-0.5">
                          {RETAILER_CATEGORY_LABELS[r.category]} · {r.area}
                        </p>
                      </div>
                      <ScoreBadge score={r.leadScore} />
                    </div>

                    {r.address && (
                      <p className="text-xs text-charcoal-500 mt-1">{r.address}</p>
                    )}

                    <div className="mt-2.5">
                      <ScoreBar score={r.leadScore} />
                    </div>

                    {(() => {
                      const phones = r.phones ?? (r.phone ? [r.phone] : []);
                      const emails = r.emails ?? (r.email ? [r.email] : []);
                      const socials = r.socialLinks ?? [];
                      const updatedLabel = formatRelativeUpdated(r.lastUpdatedAt);
                      if (phones.length === 0 && emails.length === 0 && socials.length === 0 && !updatedLabel) {
                        return null;
                      }
                      return (
                        <div
                          className="mt-3 bg-cream-50 rounded-md p-2.5 ring-1 ring-charcoal-100/60"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="eyebrow">Active channels</p>
                            {updatedLabel && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-charcoal-500">
                                <ClockIcon className="h-3 w-3" strokeWidth={2} />
                                {updatedLabel}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {phones[0] && (
                              <div className="flex items-center gap-1.5 text-xs text-charcoal-700">
                                <PhoneIcon className="h-3.5 w-3.5 text-green-700" strokeWidth={2} />
                                <a
                                  href={whatsappHref(phones[0])}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-green-700 hover:underline"
                                >
                                  {phones[0]}
                                </a>
                                {phones.length > 1 && (
                                  <span className="text-[11px] text-charcoal-400">
                                    +{phones.length - 1} more
                                  </span>
                                )}
                              </div>
                            )}
                            {emails[0] && (
                              <div className="flex items-center gap-1.5 text-xs text-charcoal-700">
                                <EnvelopeIcon className="h-3.5 w-3.5 text-green-700" strokeWidth={2} />
                                <a
                                  href={`mailto:${emails[0]}`}
                                  className="font-semibold text-green-700 hover:underline truncate"
                                >
                                  {emails[0]}
                                </a>
                                {emails.length > 1 && (
                                  <span className="text-[11px] text-charcoal-400">
                                    +{emails.length - 1} more
                                  </span>
                                )}
                              </div>
                            )}
                            {socials[0] && (
                              <div className="flex items-center gap-1.5 text-xs text-charcoal-700">
                                <GlobeAltIcon className="h-3.5 w-3.5 text-green-700" strokeWidth={2} />
                                <a
                                  href={socials[0]}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-semibold text-green-700 hover:underline truncate"
                                >
                                  {socials[0]}
                                </a>
                                {socials.length > 1 && (
                                  <span className="text-[11px] text-charcoal-400">
                                    +{socials.length - 1} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="bg-cream-100 rounded-md p-2.5 ring-1 ring-charcoal-100/60">
                        <p className="eyebrow mb-1">Score reason</p>
                        <p className="text-xs text-charcoal-700">{r.scoreReason}</p>
                      </div>
                      <div className="bg-green-50 rounded-md p-2.5 ring-1 ring-green-100">
                        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-green-700 mb-1">
                          Next step
                        </p>
                        <p className="text-xs text-green-800">{r.recommendedNextStep}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || selected.size === 0}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" strokeWidth={2} />
                  Save {selected.size} selected
                </>
              )}
            </button>
            <button onClick={() => setResults(null)} className="btn-secondary">
              <XMarkIcon className="h-4 w-4" strokeWidth={2} />
              Clear
            </button>
          </div>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="card text-center py-12">
          <BuildingStorefrontIcon className="h-12 w-12 text-charcoal-200 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-charcoal-700">No leads matched your criteria</p>
          <p className="text-xs text-charcoal-500 mt-1">
            Try lowering the minimum lead score or selecting a different area.
          </p>
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 card-cream">
        <p className="eyebrow mb-2">How the agent works</p>
        <ol className="text-xs text-charcoal-600 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Searches for Abuja retailers matching your criteria.</li>
          <li>Scores each retailer 0–100 based on FBF fit.</li>
          <li>Returns structured leads with pitch and next steps.</li>
          <li>Checks for duplicates before saving to your CRM.</li>
          <li>Connect a Supabase Edge Function for live AI-powered search.</li>
        </ol>
      </div>
    </div>
  );
}
