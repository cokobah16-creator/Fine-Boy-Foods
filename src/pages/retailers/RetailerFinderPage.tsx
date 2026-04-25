import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MagnifyingGlassIcon,
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import type { RetailerAgentResult, RetailerCategory } from "@/types/retailer";
import { ABUJA_AREAS, RETAILER_CATEGORY_LABELS } from "@/types/retailer";
import { findRetailersWithAI, saveAgentResults } from "@/services/retailerService";
import { ScoreBadge, ScoreBar } from "@/components/retailers/ScoreBadge";

const CATEGORY_OPTIONS: { value: RetailerCategory | "any"; label: string }[] = [
  { value: "any", label: "Any Category" },
  { value: "supermarket", label: "Supermarket" },
  { value: "minimart", label: "Mini-Mart" },
  { value: "provision_store", label: "Provision Store" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "fuel_station_mart", label: "Fuel Station Mart" },
  { value: "school_store", label: "School Store" },
  { value: "campus_store", label: "Campus Store" },
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

  async function handleFind() {
    setLoading(true);
    setResults(null);
    setSaveResult(null);
    setSelected(new Set());
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
      alert("Agent search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!results || selected.size === 0) return;
    setSaving(true);
    try {
      const toSave = results.filter((_, i) => selected.has(i));
      const { saved, skipped } = await saveAgentResults(toSave);
      setSaveResult({ saved: saved.length, skipped });
      setResults(null);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      alert("Failed to save retailers. Please try again.");
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
        <div className="h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
          <SparklesIcon className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retailer Finder Agent</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI-powered lead discovery for Abuja retailers
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Search Parameters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Abuja Area
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
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Retailer Type
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
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Product Focus
            </label>
            <input
              type="text"
              value={productFocus}
              onChange={(e) => setProductFocus(e.target.value)}
              placeholder="e.g. premium plantain chips, Spicy Suya flavor"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Minimum Lead Score:{" "}
              <span className="text-brand-600 font-bold">{minimumLeadScore}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={minimumLeadScore}
              onChange={(e) => setMinimumLeadScore(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Number of Leads
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
            disabled={loading}
            className="btn-primary w-full sm:w-auto"
          >
            {loading ? (
              <>
                <span className="animate-spin h-4 w-4 rounded-full border-2 border-white border-t-transparent" />
                Searching Abuja...
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="h-4 w-4" />
                Find Retailers
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save result */}
      {saveResult && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm mb-1">
            <CheckIcon className="h-5 w-5" />
            {saveResult.saved} retailer{saveResult.saved !== 1 ? "s" : ""} saved
          </div>
          {saveResult.skipped.length > 0 && (
            <p className="text-xs text-emerald-600 mt-1">
              Skipped (duplicates): {saveResult.skipped.join(", ")}
            </p>
          )}
          <Link to="/retailers" className="text-xs text-emerald-700 underline mt-2 block">
            View all retailers →
          </Link>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              {results.length} Lead{results.length !== 1 ? "s" : ""} Found
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected(new Set(results.map((_, i) => i)))}
                className="text-xs text-brand-600 hover:underline"
              >
                Select all
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => setSelected(new Set())}
                className="text-xs text-gray-500 hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {results.map((r, i) => (
              <div
                key={i}
                className={`card transition-all cursor-pointer ${
                  selected.has(i)
                    ? "ring-2 ring-brand-500"
                    : "opacity-70 hover:opacity-90"
                }`}
                onClick={() => toggleSelect(i)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                      selected.has(i)
                        ? "border-brand-600 bg-brand-600"
                        : "border-gray-300"
                    }`}
                  >
                    {selected.has(i) && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {r.businessName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {RETAILER_CATEGORY_LABELS[r.category]} · {r.area}
                        </p>
                      </div>
                      <ScoreBadge score={r.leadScore} />
                    </div>

                    {r.address && (
                      <p className="text-xs text-gray-500 mt-1">{r.address}</p>
                    )}

                    <div className="mt-2">
                      <ScoreBar score={r.leadScore} />
                    </div>

                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Score Reason</p>
                        <p className="text-xs text-gray-700">{r.scoreReason}</p>
                      </div>
                      <div className="bg-brand-50 rounded-lg p-2">
                        <p className="text-xs text-brand-700 font-medium mb-0.5">Next Step</p>
                        <p className="text-xs text-brand-800">{r.recommendedNextStep}</p>
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
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Save {selected.size} Selected
                </>
              )}
            </button>
            <button
              onClick={() => setResults(null)}
              className="btn-secondary"
            >
              <XMarkIcon className="h-4 w-4" />
              Clear
            </button>
          </div>
        </div>
      )}

      {results && results.length === 0 && (
        <div className="card text-center py-12">
          <BuildingStorefrontIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">No leads matched your criteria</p>
          <p className="text-xs text-gray-500 mt-1">
            Try lowering the minimum lead score or selecting a different area.
          </p>
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 rounded-xl bg-blue-50 border border-blue-100 p-4">
        <h3 className="text-xs font-semibold text-blue-800 mb-2">How the Agent Works</h3>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Agent searches for Abuja retailers matching your criteria</li>
          <li>Scores each retailer 0–100 based on FBF fit</li>
          <li>Returns structured leads with pitch and next steps</li>
          <li>Checks for duplicates before saving to your CRM</li>
          <li>Connect a Supabase Edge Function for live AI-powered search</li>
        </ol>
      </div>
    </div>
  );
}
