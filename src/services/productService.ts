import { db } from "@/lib/db";
import type { Product, ProductFlavour } from "@/types/operations";

function uuid(): string {
  return crypto.randomUUID();
}

const SEED_PRODUCTS: Omit<Product, "id" | "createdAt" | "updatedAt">[] = [
  {
    name: "Sweet Original",
    sku: "FBF-SO-150G",
    unitPrice: 800,
    lowStockThreshold: 50,
    colorKey: "sweet",
  },
  {
    name: "Spicy Suya",
    sku: "FBF-SS-150G",
    unitPrice: 850,
    lowStockThreshold: 50,
    colorKey: "spicy",
  },
];

const SEED_RAW_MATERIALS = [
  { name: "Plantains (unripe)", unit: "kg" as const, quantity: 200, lowStockThreshold: 50, costPerUnit: 600 },
  { name: "Vegetable Oil", unit: "litre" as const, quantity: 80, lowStockThreshold: 20, costPerUnit: 1800 },
  { name: "Salt", unit: "kg" as const, quantity: 25, lowStockThreshold: 5, costPerUnit: 400 },
  { name: "Suya Spice", unit: "kg" as const, quantity: 12, lowStockThreshold: 3, costPerUnit: 4500 },
  { name: "Packaging (150g pouch)", unit: "pack" as const, quantity: 1500, lowStockThreshold: 200, costPerUnit: 35 },
];

export async function ensureProductsSeeded(): Promise<void> {
  const count = await db.products.count();
  if (count === 0) {
    const now = new Date().toISOString();
    await db.products.bulkAdd(
      SEED_PRODUCTS.map((p) => ({
        ...p,
        id: uuid(),
        createdAt: now,
        updatedAt: now,
      }))
    );
  }

  const rawCount = await db.rawMaterials.count();
  if (rawCount === 0) {
    const now = new Date().toISOString();
    await db.rawMaterials.bulkAdd(
      SEED_RAW_MATERIALS.map((r) => ({
        ...r,
        id: uuid(),
        createdAt: now,
        updatedAt: now,
      }))
    );
  }
}

export async function listProducts(): Promise<Product[]> {
  return db.products.orderBy("createdAt").toArray();
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return db.products.get(id);
}

export async function getProductByFlavour(
  flavour: ProductFlavour
): Promise<Product | undefined> {
  return db.products.where("name").equals(flavour).first();
}

export async function updateProduct(
  id: string,
  patch: Partial<Omit<Product, "id" | "createdAt">>
): Promise<void> {
  await db.products.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}
