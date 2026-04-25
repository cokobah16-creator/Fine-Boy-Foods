/**
 * Supabase Edge Function: find-retailers
 *
 * Calls the Claude API to generate structured Abuja retailer leads for
 * Fine Boy Foods. Deploy with: supabase functions deploy find-retailers
 *
 * Required secret: ANTHROPIC_API_KEY
 * Set with: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.27.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchInput {
  area: string;
  category: string;
  productFocus: string;
  minimumLeadScore: number;
  numberOfLeads: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const input: SearchInput = await req.json();

    const client = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    const categoryNote =
      input.category === "any"
        ? "any suitable retail category"
        : `specifically ${input.category.replace("_", " ")} outlets`;

    const prompt = `You are the Fine Boy Foods Retailer Finder Agent.

Your job is to find and qualify Abuja-based retailers that may stock Fine Boy Foods packaged snacks.

Fine Boy Foods brand context:
- Abuja-based Nigerian snack brand
- Products: premium plantain chips
- Flavors: Sweet Original and Spicy Suya
- Positioning: premium, clean, proudly Nigerian, youth-friendly, retail-ready
- Target outlets: supermarkets, minimarts, provision stores, fuel station marts, pharmacies with snack shelves, school shops, hotel counters, gyms, cafés, distributors, wholesalers

Search request:
- Area: ${input.area}, Abuja, Nigeria
- Category: ${categoryNote}
- Product focus: ${input.productFocus}
- Minimum lead score: ${input.minimumLeadScore}
- Number of leads needed: ${input.numberOfLeads}

Generate exactly ${input.numberOfLeads} realistic Abuja retailer leads in ${input.area}.
Only return retailers likely to be found in ${input.area}, Abuja.
Only include retailers with lead score >= ${input.minimumLeadScore}.

Lead score rules:
80-100 = Hot Lead. Strong retail fit, great location, sells snacks, visible contact.
60-79  = Good Lead. Likely fit but needs verification.
40-59  = Maybe. Some fit but weak data.
0-39   = Weak. Poor fit or insufficient details.

Return ONLY valid JSON in this exact structure:
{
  "results": [
    {
      "businessName": "string",
      "category": "supermarket|minimart|provision_store|pharmacy|fuel_station_mart|school_store|campus_store|hotel|gym|cafe|restaurant|distributor|wholesaler|other",
      "area": "string",
      "address": "string",
      "phone": null,
      "email": null,
      "website": null,
      "socialLinks": [],
      "mapsUrl": null,
      "leadScore": 0,
      "scoreReason": "string",
      "suggestedPitch": "string",
      "recommendedNextStep": "string",
      "source": "Claude AI Agent"
    }
  ]
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in AI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Agent search failed", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
