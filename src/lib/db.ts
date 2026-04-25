import Dexie, { type Table } from "dexie";
import type {
  Retailer,
  RetailerContact,
  RetailerNote,
  RetailerOutreachLog,
  RetailerFollowup,
} from "@/types/retailer";

export class FBFDatabase extends Dexie {
  retailers!: Table<Retailer>;
  retailerContacts!: Table<RetailerContact>;
  retailerNotes!: Table<RetailerNote>;
  retailerOutreachLogs!: Table<RetailerOutreachLog>;
  retailerFollowups!: Table<RetailerFollowup>;

  constructor() {
    super("FineBoyfoodsDB");
    this.version(1).stores({
      retailers:
        "id, businessName, area, category, status, leadScore, createdAt, updatedAt",
      retailerContacts: "id, retailerId, createdAt",
      retailerNotes: "id, retailerId, createdAt",
      retailerOutreachLogs: "id, retailerId, contactedAt",
      retailerFollowups: "id, retailerId, followupDate, completed",
    });
  }
}

export const db = new FBFDatabase();
