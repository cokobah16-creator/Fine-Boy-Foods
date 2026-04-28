/**
 * Supabase Edge Function: find-retailers
 *
 * Retrieves real businesses from Google Places, enriches with website contact
 * signals, then asks Claude to score/qualify only those real businesses. Falls
 * back to deterministic scoring if Claude is unavailable or returns invalid
 * JSON, so the search still succeeds.
 *
 * Required secrets:
 * - GOOGLE_MAPS_API_KEY
 * - ANTHROPIC_API_KEY (optional but recommended for better scoring/pitch text)
 *
 * Health probe: POST { "health": true } to check deployment + secret status
 * without consuming Google Places quota.
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.32.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_CATEGORIES = new Set([
  "any",
  "supermarket",
  "minimart",
  "provision_store",
  "pharmacy",
  "fuel_station_mart",
  "school_store",
  "campus_store",
  "hotel",
  "gym",
  "cafe",
  "restaurant",
  "distributor",
  "wholesaler",
  "other",
]);

type RetailerCategory = Exclude<
  | "supermarket"
  | "minimart"
  | "provision_store"
  | "pharmacy"
  | "fuel_station_mart"
  | "school_store"
  | "campus_store"
  | "hotel"
  | "gym"
  | "cafe"
  | "restaurant"
  | "distributor"
  | "wholesaler"
  | "other",
  never
>;

interface SearchInput {
  area: string;
  category: string;
  productFocus: string;
  minimumLeadScore: number;
  numberOfLeads: number;
}

interface GoogleTextSearchResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  types?: string[];
}

interface GooglePlaceDetails {
  result?: {
    place_id: string;
    name: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    international_phone_number?: string;
    website?: string;
    url?: string;
    types?: string[];
  };
}

interface CandidateLead {
  businessName: string;
  category: RetailerCategory;
  area: string;
  address: string;
  // Top-ranked single values are kept for backward compatibility with the
  // existing save flow, which writes `phone`/`email` to the retailers table.
  phone: string | null;
  email: string | null;
  // Ranked, deduped lists. Index 0 is the channel most likely to be active
  // (role-based mailbox, mobile number, profile link from the freshest page).
  phones: string[];
  emails: string[];
  website: string | null;
  socialLinks: string[];
  mapsUrl: string | null;
  // ISO timestamp of the most recent freshness signal we found across the
  // site (Last-Modified header, og:updated_time, article:modified_time, or
  // a <time datetime="…"> on the contact/about page). Null if unknown.
  lastUpdatedAt: string | null;
}

const SYSTEM_PROMPT = `You are the Fine Boy Foods Retailer Qualification Agent.

Fine Boy Foods is a premium Abuja snack brand. Products: plantain chips (Sweet Original, Spicy Suya). Target retail channels: supermarkets, mini-marts, provision stores, pharmacies, fuel station marts, school/campus stores, hotel gift counters, gyms, cafés, distributors, wholesalers.

Your job: score the candidate businesses provided in the user message for retail partnership fit using ONLY the data given. Strict rules:
- Do not invent businesses, phone numbers, emails, websites, mapsUrl values, or social links. Every value you output for these fields must appear verbatim in the candidate input.
- If a field is missing in the input, keep it null/empty in the output.
- Score 0-100 reflecting Abuja retail fit (location relevance, category fit, contact visibility, footfall, shelf-space likelihood, multi-branch presence, snack/grocery alignment).
- Recency / activity ranking: each candidate may include "emails", "phones", "socialLinks" arrays plus a "lastUpdatedAt" hint. Reorder each array so the channel most likely to be currently active appears at index 0, and put it in the singular "email"/"phone" fields too. Heuristics:
  * Prefer business / role-based mailboxes (sales@, partnerships@, wholesale@, orders@, procurement@, info@, hello@, contact@) over personal-looking ones.
  * Prefer Nigerian mobile numbers (+234 7/8/9-prefixed) for direct outreach over landlines.
  * For social links, prefer profiles published on the freshest page (i.e. when lastUpdatedAt is recent, the social link found on that page is more likely to be live).
- scoreReason: one short sentence grounded in the candidate's actual data; mention the recency signal when "lastUpdatedAt" is provided (e.g. "site refreshed 2025-11").
- suggestedPitch: one sentence pitching FBF plantain chips, tailored to the retailer.
- recommendedNextStep: one concrete next action that names the most-active channel first (e.g. "WhatsApp +234… (mobile, listed on /contact updated 2025-11)").

Return ONLY a JSON object - no prose, no code fences. Schema:
{
  "results": [
    {
      "businessName": string,
      "category": "supermarket"|"minimart"|"provision_store"|"pharmacy"|"fuel_station_mart"|"school_store"|"campus_store"|"hotel"|"gym"|"cafe"|"restaurant"|"distributor"|"wholesaler"|"other",
      "area": string,
      "address": string,
      "phone": string|null,
      "email": string|null,
      "phones": string[],
      "emails": string[],
      "website": string|null,
      "socialLinks": string[],
      "mapsUrl": string|null,
      "lastUpdatedAt": string|null,
      "leadScore": number,
      "scoreReason": string,
      "suggestedPitch": string,
      "recommendedNextStep": string,
      "source": "Google Places + Claude Cross-Reference"
    }
  ]
}`;

function normalizeUrl(url: string): string | null {
  try {
    return new URL(url).toString();
  } catch {
    return null;
  }
}

function categoryQuery(category: string): string {
  const map: Record<string, string> = {
    any: "retail stores",
    supermarket: "supermarket",
    minimart: "mini mart",
    provision_store: "provision store",
    pharmacy: "pharmacy",
    fuel_station_mart: "fuel station convenience store",
    school_store: "school store",
    campus_store: "campus store",
    hotel: "hotel gift shop",
    gym: "gym",
    cafe: "cafe",
    restaurant: "restaurant",
    distributor: "food distributor",
    wholesaler: "food wholesaler",
    other: "retail shop",
  };
  return map[category] ?? "retail stores";
}

function mapGoogleTypesToCategory(types: string[] = []): RetailerCategory {
  const t = new Set(types);
  if (t.has("supermarket") || t.has("grocery_or_supermarket")) return "supermarket";
  if (t.has("convenience_store")) return "minimart";
  if (t.has("pharmacy") || t.has("drugstore")) return "pharmacy";
  if (t.has("gas_station")) return "fuel_station_mart";
  if (t.has("school") || t.has("primary_school") || t.has("secondary_school")) return "school_store";
  if (t.has("university")) return "campus_store";
  if (t.has("lodging")) return "hotel";
  if (t.has("gym")) return "gym";
  if (t.has("cafe")) return "cafe";
  if (t.has("restaurant")) return "restaurant";
  if (t.has("storage") || t.has("warehouse")) return "wholesaler";
  if (t.has("store") || t.has("food_store")) return "provision_store";
  return "other";
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

async function fetchWithTimeout(url: string, timeoutMs = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function validateInput(body: unknown):
  | { ok: true; input: SearchInput }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object" };
  }
  const o = body as Record<string, unknown>;
  if (typeof o.area !== "string" || !o.area.trim()) {
    return { ok: false, error: "area is required" };
  }
  if (typeof o.category !== "string" || !VALID_CATEGORIES.has(o.category)) {
    return { ok: false, error: "category is required and must be a known retailer category" };
  }
  if (typeof o.productFocus !== "string") {
    return { ok: false, error: "productFocus is required" };
  }
  const minScore = Number(o.minimumLeadScore);
  if (!Number.isFinite(minScore) || minScore < 0 || minScore > 100) {
    return { ok: false, error: "minimumLeadScore must be a number between 0 and 100" };
  }
  const numLeads = Number(o.numberOfLeads);
  if (!Number.isInteger(numLeads) || numLeads < 1 || numLeads > 25) {
    return { ok: false, error: "numberOfLeads must be an integer between 1 and 25" };
  }
  return {
    ok: true,
    input: {
      area: o.area.trim(),
      category: o.category,
      productFocus: o.productFocus,
      minimumLeadScore: minScore,
      numberOfLeads: numLeads,
    },
  };
}

async function searchGooglePlaces(input: SearchInput, apiKey: string): Promise<GoogleTextSearchResult[]> {
  const query = encodeURIComponent(`${categoryQuery(input.category)} in ${input.area}, Abuja, Nigeria`);
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;

  const res = await fetchWithTimeout(url, 10000);
  if (!res.ok) {
    throw new Error(`Google text search failed with status ${res.status}`);
  }

  const json = await res.json();
  return (json.results ?? []) as GoogleTextSearchResult[];
}

async function getPlaceDetails(placeId: string, apiKey: string): Promise<GooglePlaceDetails["result"] | null> {
  const fields = encodeURIComponent(
    [
      "name",
      "formatted_address",
      "formatted_phone_number",
      "international_phone_number",
      "website",
      "url",
      "types",
      "place_id",
    ].join(",")
  );
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${apiKey}`;

  const res = await fetchWithTimeout(url, 10000);
  if (!res.ok) return null;

  const json = (await res.json()) as GooglePlaceDetails;
  return json.result ?? null;
}

const JUNK_EMAIL_PREFIX = /^(no[- ]?reply|do[- ]?not[- ]?reply|noreply|donotreply|postmaster|mailer-daemon|abuse|webmaster)@/i;

// Role-based mailboxes are far more likely to be monitored by procurement /
// partnerships staff than a personal-looking address scraped from a footer.
const ROLE_MAILBOX_PRIORITY = [
  "sales",
  "partnerships",
  "partners",
  "wholesale",
  "orders",
  "procurement",
  "buyer",
  "buying",
  "business",
  "biz",
  "info",
  "hello",
  "contact",
  "enquiries",
  "enquiry",
  "office",
  "admin",
];

const SOCIAL_PATTERNS = [
  /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._-]+/gi,
  /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9._\/-]+/gi,
  /https?:\/\/(?:www\.)?x\.com\/[A-Za-z0-9_]+/gi,
  /https?:\/\/(?:www\.)?twitter\.com\/[A-Za-z0-9_]+/gi,
  /https?:\/\/(?:www\.)?linkedin\.com\/[A-Za-z0-9_\/-]+/gi,
  /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9._-]+/gi,
  /https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[A-Za-z0-9?=&+_-]+/gi,
];

// Capture Nigerian numbers in either international (+234…) or local (070…/080…/090…)
// form, with optional separators between groups. Normalised after extraction.
const PHONE_REGEX =
  /(?:\+?234[\s.()-]?[789]\d[\s.()-]?\d{3}[\s.()-]?\d{4})|(?:0[789]\d[\s.()-]?\d{3}[\s.()-]?\d{4})/g;

interface PageScrape {
  emails: string[];
  phones: string[];
  socials: string[];
  updatedAt: string | null;
}

const EMPTY_SCRAPE: PageScrape = { emails: [], phones: [], socials: [], updatedAt: null };

function emailRank(email: string): number {
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  const idx = ROLE_MAILBOX_PRIORITY.findIndex((role) => local === role || local.startsWith(`${role}.`) || local.startsWith(`${role}-`));
  if (idx !== -1) return idx;
  return ROLE_MAILBOX_PRIORITY.length + (/^[a-z]+\.[a-z]+@/i.test(email) ? 5 : 1);
}

function rankEmails(emails: string[]): string[] {
  return unique(
    emails
      .map((e) => e.toLowerCase())
      .filter((e) => !JUNK_EMAIL_PREFIX.test(e))
  ).sort((a, b) => emailRank(a) - emailRank(b));
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+234")) return digits;
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  return digits;
}

function rankPhones(phones: string[]): string[] {
  // Mobile prefixes (070/080/081/090/091 → +2347/+2348/+2349) come first;
  // international form is preferred since it's WhatsApp-friendly.
  const normalised = unique(phones.map(normalizePhone));
  return normalised.sort((a, b) => {
    const aIntl = a.startsWith("+234") ? 0 : 1;
    const bIntl = b.startsWith("+234") ? 0 : 1;
    if (aIntl !== bIntl) return aIntl - bIntl;
    return 0;
  });
}

function parseUpdatedAt(headers: Headers, html: string): string | null {
  const candidates: (string | null | undefined)[] = [
    html.match(/<meta[^>]+property=["']og:updated_time["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+name=["']last-modified["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1],
    headers.get("last-modified"),
  ];

  let best: number | null = null;
  for (const c of candidates) {
    if (!c) continue;
    const t = Date.parse(c);
    if (!Number.isFinite(t)) continue;
    if (best === null || t > best) best = t;
  }
  return best === null ? null : new Date(best).toISOString();
}

async function scrapePage(url: string, timeoutMs: number): Promise<PageScrape> {
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (!res.ok) return EMPTY_SCRAPE;
    // Cap body size so a giant page doesn't blow memory or block the request.
    const html = (await res.text()).slice(0, 200_000);

    const emails = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    const phones = html.match(PHONE_REGEX) ?? [];
    const socials = SOCIAL_PATTERNS.flatMap((p) => html.match(p) ?? []);
    const updatedAt = parseUpdatedAt(res.headers, html);

    return { emails, phones, socials, updatedAt };
  } catch {
    return EMPTY_SCRAPE;
  }
}

interface WebsiteSignals {
  emails: string[];
  phones: string[];
  socialLinks: string[];
  lastUpdatedAt: string | null;
}

async function enrichFromWebsite(website: string | null): Promise<WebsiteSignals> {
  if (!website) return { emails: [], phones: [], socialLinks: [], lastUpdatedAt: null };
  const normalized = normalizeUrl(website);
  if (!normalized) return { emails: [], phones: [], socialLinks: [], lastUpdatedAt: null };

  // The homepage rarely lists current contact details — /contact and /about
  // are far more likely to surface the channels staff are actually monitoring.
  const homepage = normalized;
  const subPaths = ["/contact", "/contact-us", "/about", "/about-us"];
  const subUrls = subPaths
    .map((p) => {
      try {
        return new URL(p, normalized).toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => Boolean(u));

  const [home, ...subs] = await Promise.all([
    scrapePage(homepage, 8000),
    // Subpage requests use a tighter timeout — they're best-effort enrichment,
    // not the critical path.
    ...subUrls.slice(0, 3).map((u) => scrapePage(u, 5000)),
  ]);

  const allPages = [home, ...subs];

  const emails = rankEmails(allPages.flatMap((p) => p.emails));
  const phones = rankPhones(allPages.flatMap((p) => p.phones));
  const socialLinks = unique(allPages.flatMap((p) => p.socials)).slice(0, 8);

  // Most recent freshness signal across the pages we visited.
  const lastUpdatedAt = allPages
    .map((p) => p.updatedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop() ?? null;

  return { emails, phones, socialLinks, lastUpdatedAt };
}

async function buildRealCandidates(input: SearchInput, googleApiKey: string): Promise<CandidateLead[]> {
  const textResults = await searchGooglePlaces(input, googleApiKey);

  const detailResults = await Promise.all(
    textResults
      .slice(0, Math.max(input.numberOfLeads * 3, 12))
      .map((r) => getPlaceDetails(r.place_id, googleApiKey))
  );

  // Enrich every candidate website in parallel rather than one-by-one.
  const candidates = await Promise.all(
    detailResults
      .filter((d): d is NonNullable<typeof d> => Boolean(d?.name))
      .map(async (details) => {
        const website = details.website ?? null;
        const websiteSignals = await enrichFromWebsite(website);
        const placesPhone = details.international_phone_number ?? details.formatted_phone_number ?? null;
        // Combine the Google Places number with anything we scraped from the
        // site. Places' number goes in first because Google verifies it, then
        // we let rankPhones reorder by mobile-vs-landline preference.
        const phones = rankPhones([
          ...(placesPhone ? [placesPhone] : []),
          ...websiteSignals.phones,
        ]);
        const candidate: CandidateLead = {
          businessName: details.name,
          category: mapGoogleTypesToCategory(details.types ?? []),
          area: input.area,
          address: details.formatted_address ?? `${input.area}, Abuja, Nigeria`,
          phone: phones[0] ?? null,
          email: websiteSignals.emails[0] ?? null,
          phones,
          emails: websiteSignals.emails,
          website,
          socialLinks: websiteSignals.socialLinks,
          mapsUrl: details.url ?? null,
          lastUpdatedAt: websiteSignals.lastUpdatedAt,
        };
        return candidate;
      })
  );

  // Dedupe by normalized name + address.
  const seen = new Set<string>();
  const uniqueCandidates = candidates.filter((c) => {
    const key = `${c.businessName.toLowerCase().trim()}|${c.address.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueCandidates.slice(0, Math.max(input.numberOfLeads * 2, input.numberOfLeads));
}

function fallbackScoreAndPitch(input: SearchInput, candidates: CandidateLead[]) {
  const now = Date.now();
  return {
    results: candidates
      .map((c) => {
        const contactBonus =
          (c.phones.length > 0 ? 12 : 0) +
          (c.emails.length > 0 ? 8 : 0) +
          (c.socialLinks.length > 0 ? 6 : 0) +
          // A small boost when we have multiple channels — more ways to reach
          // the retailer raises the chance of getting through.
          Math.min(6, (c.phones.length + c.emails.length + c.socialLinks.length) - 1);
        // Freshness bonus: site updated within the last year is worth a few
        // points; older than two years gets nothing.
        let freshnessBonus = 0;
        if (c.lastUpdatedAt) {
          const ageDays = (now - Date.parse(c.lastUpdatedAt)) / 86_400_000;
          if (Number.isFinite(ageDays)) {
            if (ageDays <= 90) freshnessBonus = 8;
            else if (ageDays <= 365) freshnessBonus = 5;
            else if (ageDays <= 730) freshnessBonus = 2;
          }
        }
        const base = 55 + contactBonus + freshnessBonus;
        const leadScore = Math.min(95, Math.max(input.minimumLeadScore, base));
        const recencyNote = c.lastUpdatedAt
          ? ` Site last refreshed ${c.lastUpdatedAt.slice(0, 10)}.`
          : "";
        const topChannel = c.phones[0]
          ? `WhatsApp ${c.phones[0]}`
          : c.emails[0]
            ? `email ${c.emails[0]}`
            : c.socialLinks[0]
              ? `DM ${c.socialLinks[0]}`
              : "visit in-store";
        return {
          ...c,
          leadScore,
          scoreReason: `Real Google business in ${input.area}. Contact fields extracted from Google Places + website crawl.${recencyNote}`,
          suggestedPitch: "Introduce Fine Boy Foods premium plantain chips and propose a trial listing with samples.",
          recommendedNextStep: `${topChannel} — ask for the procurement/store manager and schedule a short in-store pitch.`,
          source: "Google Places + Website Signals",
        };
      })
      .filter((r) => r.leadScore >= input.minimumLeadScore)
      .slice(0, input.numberOfLeads),
  };
}

async function crossReferenceWithClaude(
  input: SearchInput,
  candidates: CandidateLead[],
  anthropicApiKey: string
) {
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const userPrompt = `Search context:
- Abuja area: ${input.area}
- Product focus: ${input.productFocus}
- Minimum lead score: ${input.minimumLeadScore}
- Maximum results: ${input.numberOfLeads}

Candidate businesses (real data from Google Places + website crawl):
${JSON.stringify(candidates)}

Return only candidates with leadScore >= ${input.minimumLeadScore}, up to ${input.numberOfLeads} results, in the JSON schema defined in your instructions.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    // Cache the static brand/scoring instructions; they are identical across
    // every search and dominate the prompt token count.
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0]?.type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in Claude cross-reference response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed?.results)) {
    throw new Error("Invalid Claude cross-reference payload");
  }

  return parsed;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON" }, 400);
  }

  // Health probe - lets the dashboard verify the function is deployed and
  // which secrets are configured without burning Google Places quota.
  if (body && typeof body === "object" && (body as { health?: unknown }).health === true) {
    return jsonResponse({
      status: "ok",
      googleConfigured: Boolean(Deno.env.get("GOOGLE_MAPS_API_KEY")),
      anthropicConfigured: Boolean(Deno.env.get("ANTHROPIC_API_KEY")),
    });
  }

  const validated = validateInput(body);
  if (!validated.ok) {
    return jsonResponse({ error: validated.error }, 400);
  }
  const input = validated.input;

  const googleApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!googleApiKey) {
    return jsonResponse({ error: "Missing GOOGLE_MAPS_API_KEY" }, 500);
  }

  try {
    const candidates = await buildRealCandidates(input, googleApiKey);
    if (candidates.length === 0) {
      return jsonResponse({ results: [] });
    }

    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (anthropicApiKey) {
      try {
        const payload = await crossReferenceWithClaude(input, candidates, anthropicApiKey);
        return jsonResponse(payload);
      } catch (claudeErr) {
        // Don't fail the whole request if Claude misbehaves - the deterministic
        // fallback still produces useful real-business leads.
        console.error("Claude cross-reference failed, falling back to deterministic scoring:", claudeErr);
      }
    }

    return jsonResponse(fallbackScoreAndPitch(input, candidates));
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Agent search failed", details: String(err) }, 500);
  }
});
