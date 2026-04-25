import type { Retailer } from "@/types/retailer";

export function generateWhatsAppPitch(retailer: Retailer): string {
  return `Good day ${retailer.businessName} team. My name is [Your Name] from Fine Boy Foods, an Abuja-based snack brand producing premium plantain chips in Sweet Original and Spicy Suya flavors. We would love to supply your store with clean, tasty, retail-ready snacks your customers can enjoy. Please who can I speak with about stocking our products?`;
}

export function generateSmsPitch(_retailer: Retailer): string {
  return `Good day. This is Fine Boy Foods, Abuja. We supply premium plantain chips in Sweet Original and Spicy Suya. Can we speak to your purchasing/store manager? – Fine Boy Foods`;
}

export function generateCallScript(retailer: Retailer): string {
  return `Good day, my name is [Your Name] from Fine Boy Foods.

We are an Abuja-based snack brand producing premium plantain chips, starting with Sweet Original and Spicy Suya flavors.

I'm calling because we believe ${retailer.businessName} could be a strong retail partner for our products.

Please, who handles purchasing or supplier onboarding for your store?

Our goal is simple — we would like to bring samples, discuss pricing, and see if our products can fit on your snack shelf.

Thank you so much for your time. When would be a good time for a visit?`;
}

export function generateEmailPitch(retailer: Retailer): {
  subject: string;
  body: string;
} {
  return {
    subject: `Supply Partnership Proposal – Fine Boy Foods × ${retailer.businessName}`,
    body: `Dear ${retailer.businessName} Team,

My name is [Your Name], and I represent Fine Boy Foods, an Abuja-based snack brand producing premium plantain chips.

We are currently introducing our first product line — Sweet Original and Spicy Suya plantain chips — and we believe your store would be an excellent retail partner.

Our products are:
• Clean, naturally-made plantain chips
• Professionally packaged and shelf-ready
• Proudly Nigerian, made in Abuja
• Priced competitively for retail margins

We would appreciate the opportunity to bring samples, discuss wholesale pricing, and explore how Fine Boy Foods can supply your outlet.

Please let us know who handles new supplier inquiries, and we will get in touch immediately.

Kind regards,

[Your Name]
Fine Boy Foods
[Phone Number]
[Email Address]`,
  };
}

export function generateInPersonPitch(retailer: Retailer): string {
  return `Good day. My name is [Your Name] from Fine Boy Foods.

We are a new Abuja-based snack brand producing premium plantain chips. Our first flavors are Sweet Original and Spicy Suya.

We are currently speaking with selected retailers in ${retailer.area}, and we believe ${retailer.businessName} is a great fit because of your location and the customers you serve.

We have samples here we would love to leave with you. We can also quickly go over our pricing and minimum order quantities.

Who is the best person to speak with about stocking our products on your shelves?`;
}

export type OutreachChannel = "whatsapp" | "sms" | "call" | "email" | "in_person";

export interface OutreachScript {
  channel: OutreachChannel;
  label: string;
  content: string;
  subject?: string;
}

export function getAllOutreachScripts(retailer: Retailer): OutreachScript[] {
  const email = generateEmailPitch(retailer);
  return [
    {
      channel: "whatsapp",
      label: "WhatsApp Message",
      content: generateWhatsAppPitch(retailer),
    },
    {
      channel: "sms",
      label: "SMS",
      content: generateSmsPitch(retailer),
    },
    {
      channel: "call",
      label: "Phone Call Script",
      content: generateCallScript(retailer),
    },
    {
      channel: "email",
      label: "Email",
      content: email.body,
      subject: email.subject,
    },
    {
      channel: "in_person",
      label: "In-Person Pitch",
      content: generateInPersonPitch(retailer),
    },
  ];
}
