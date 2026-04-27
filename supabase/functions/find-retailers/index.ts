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
  phone: string | null;
  email: string | null;
  website: string | null;
  socialLinks: string[];
  mapsUrl: string | null;
}

const SYSTEM_PROMPT = `You are the Fine Boy Foods Retailer Qualification Agent.

Fine Boy Foods is a premium Abuja snack brand. Products: plantain chips (Sweet Original, Spicy Suya). Target retail channels: supermarkets, mini-marts, provision stores, pharmacies, fuel station marts, school/campus stores, hotel gift counters, gyms, cafés, distributors, wholesalers.

Your job: score the candidate businesses provided in the user message for retail partnership fit using ONLY the data given. Strict rules:
- Do not invent businesses, phone numbers, emails, websites, mapsUrl values, or social links.
- If a field is missing in the input, keep it null/empty in the output.
- Score 0-100 reflecting Abuja retail fit (location relevance, category fit, contact visibility, footfall, shelf-space likelihood, multi-branch presence, snack/grocery alignment).
- scoreReason should be one short sentence grounded in the candidate's actual data.
- suggestedPitch: one sentence pitching FBF plantain chips, tailored to the retailer.
- recommendedNextStep: one concrete next action (call/WhatsApp/visit + who to ask for).

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
      "website": string|null,
      "socialLinks": string[],
      "mapsUrl": string|null,
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

async function enrichFromWebsite(website: string | null): Promise<{ email: string | null; socialLinks: string[] }> {
  if (!website) return { email: null, socialLinks: [] };
  const normalized = normalizeUrl(website);
  if (!normalized) return { email: null, socialLinks: [] };

  try {
    const res = await fetchWithTimeout(normalized, 8000);
    if (!res.ok) return { email: null, socialLinks: [] };
    // Cap body size so a giant page doesn't blow memory or block the request.
    const html = (await res.text()).slice(0, 200_000);

    const emailCandidates = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    const email = emailCandidates.find((e) => !JUNK_EMAIL_PREFIX.test(e)) ?? null;

    const socialPatterns = [
      /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._-]+/gi,
      /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9._\/-]+/gi,
      /https?:\/\/(?:www\.)?x\.com\/[A-Za-z0-9_]+/gi,
      /https?:\/\/(?:www\.)?twitter\.com\/[A-Za-z0-9_]+/gi,
      /https?:\/\/(?:www\.)?linkedin\.com\/[A-Za-z0-9_\/-]+/gi,
      /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9._-]+/gi,
      /https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[A-Za-z0-9?=&+_-]+/gi,
    ];

    const socials = unique(
      socialPatterns.flatMap((pattern) => html.match(pattern) ?? []).slice(0, 8)
    );

    return { email, socialLinks: socials };
  } catch {
    return { email: null, socialLinks: [] };
  }
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
        const candidate: CandidateLead = {
          businessName: details.name,
          category: mapGoogleTypesToCategory(details.types ?? []),
          area: input.area,
          address: details.formatted_address ?? `${input.area}, Abuja, Nigeria`,
          phone: details.international_phone_number ?? details.formatted_phone_number ?? null,
          email: websiteSignals.email,
          website,
          socialLinks: websiteSignals.socialLinks,
          mapsUrl: details.url ?? null,
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
  return {
    results: candidates
      .map((c) => {
        const contactBonus = (c.phone ? 12 : 0) + (c.email ? 8 : 0) + (c.socialLinks.length > 0 ? 6 : 0);
        const base = 55 + contactBonus;
        const leadScore = Math.min(95, Math.max(input.minimumLeadScore, base));
        return {
          ...c,
          leadScore,
          scoreReason: `Real Google business in ${input.area}. Contact fields were extracted from Google Places and website signals.`,
          suggestedPitch: "Introduce Fine Boy Foods premium plantain chips and propose a trial listing with samples.",
          recommendedNextStep: "Call or WhatsApp procurement/manager contact and schedule a short in-store pitch.",
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
