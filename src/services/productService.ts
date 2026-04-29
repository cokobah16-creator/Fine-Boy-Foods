import { db } from "@/lib/db";
import type { Product } from "@/types/operations";

function uuid(): string {
  return crypto.randomUUID();
}

export async function listProducts(): Promise<Product[]> {
  return db.products.orderBy("createdAt").toArray();
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return db.products.get(id);
}

export async function createProduct(input: {
  name: Product["name"];
  sku: string;
  unitPrice: number;
  lowStockThreshold: number;
  colorKey: Product["colorKey"];
}): Promise<Product> {
  const trimmedSku = input.sku.trim();
  if (!trimmedSku) throw new Error("SKU is required");

  const duplicateSku = await db.products
    .where("sku")
    .equalsIgnoreCase(trimmedSku)
    .first();
  if (duplicateSku) {
    throw new Error(`SKU ${trimmedSku} already exists`);
  }

  const now = new Date().toISOString();
  const product: Product = {
    id: uuid(),
    name: input.name,
    sku: trimmedSku.toUpperCase(),
    unitPrice: input.unitPrice,
    lowStockThreshold: input.lowStockThreshold,
    colorKey: input.colorKey,
    createdAt: now,
    updatedAt: now,
  };
  await db.products.add(product);
  return product;
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

export async function deleteProduct(id: string): Promise<void> {
  // Refuse to delete a product that has any inventory or production history,
  // since orders and reports still reference it by id.
  const inventory = await db.inventoryBatches
    .where("productId")
    .equals(id)
    .count();
  if (inventory > 0) {
    throw new Error(
      "Can't delete a product that still has inventory batches recorded."
    );
  }
  const productionRuns = await db.productionBatches
    .where("productId")
    .equals(id)
    .count();
  if (productionRuns > 0) {
    throw new Error(
      "Can't delete a product with production history. Archive it instead."
    );
  }
  await db.products.delete(id);
}
