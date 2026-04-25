export type RetailerStatus =
  | "not_contacted"
  | "contacted"
  | "interested"
  | "sample_delivered"
  | "negotiating"
  | "supplied"
  | "rejected"
  | "do_not_contact";

export type RetailerCategory =
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
  | "other";

export interface Retailer {
  id: string;
  businessName: string;
  category: RetailerCategory;
  area: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  socialLinks: string[];
  mapsUrl?: string | null;
  leadScore: number;
  scoreReason?: string | null;
  suggestedPitch?: string | null;
  recommendedNextStep?: string | null;
  source?: string | null;
  status: RetailerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RetailerContact {
  id: string;
  retailerId: string;
  contactName?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  createdAt: string;
}

export interface RetailerNote {
  id: string;
  retailerId: string;
  note: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface RetailerOutreachLog {
  id: string;
  retailerId: string;
  channel: "whatsapp" | "sms" | "call" | "email" | "in_person" | "other";
  message?: string | null;
  outcome?: string | null;
  contactedAt: string;
}

export interface RetailerFollowup {
  id: string;
  retailerId: string;
  followupDate: string;
  followupReason?: string | null;
  completed: boolean;
  createdAt: string;
}

export interface RetailerSearchInput {
  area: string;
  category: RetailerCategory | "any";
  productFocus: string;
  minimumLeadScore: number;
  numberOfLeads: number;
}

export interface RetailerAgentResult {
  businessName: string;
  category: RetailerCategory;
  area: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  socialLinks: string[];
  mapsUrl: string | null;
  leadScore: number;
  scoreReason: string;
  suggestedPitch: string;
  recommendedNextStep: string;
  source: string;
}

export const RETAILER_STATUS_LABELS: Record<RetailerStatus, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  interested: "Interested",
  sample_delivered: "Sample Delivered",
  negotiating: "Negotiating",
  supplied: "Supplied",
  rejected: "Rejected",
  do_not_contact: "Do Not Contact",
};

export const RETAILER_CATEGORY_LABELS: Record<RetailerCategory, string> = {
  supermarket: "Supermarket",
  minimart: "Mini-Mart",
  provision_store: "Provision Store",
  pharmacy: "Pharmacy",
  fuel_station_mart: "Fuel Station Mart",
  school_store: "School Store",
  campus_store: "Campus Store",
  hotel: "Hotel",
  gym: "Gym",
  cafe: "Café",
  restaurant: "Restaurant",
  distributor: "Distributor",
  wholesaler: "Wholesaler",
  other: "Other",
};

export const ABUJA_AREAS = [
  "Wuse 2",
  "Wuse Market",
  "Garki",
  "Gwarinpa",
  "Maitama",
  "Asokoro",
  "Jabi",
  "Utako",
  "Kubwa",
  "Lugbe",
  "Apo",
  "Lokogoma",
  "Katampe",
  "Gudu",
  "Area 11",
  "Central Business District",
  "Jahi",
  "Life Camp",
  "Dawaki",
  "Galadimawa",
  "Kado",
  "Durumi",
] as const;

export type AbujaArea = (typeof ABUJA_AREAS)[number];
