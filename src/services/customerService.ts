import { db } from "@/lib/db";
import type { CustomerCredit, Order } from "@/types/operations";
import type { Retailer } from "@/types/retailer";
import { getAllRetailers } from "@/services/retailerService";

export interface CustomerSummary {
  retailer: Retailer;
  credit: CustomerCredit;
  orderCount: number;
  lastOrderAt: string | null;
}

export async function getCredit(
  retailerId: string
): Promise<CustomerCredit | null> {
  return (await db.customerCredits.get(retailerId)) ?? null;
}

export async function ensureCredit(
  retailerId: string
): Promise<CustomerCredit> {
  const existing = await db.customerCredits.get(retailerId);
  if (existing) return existing;
  const fresh: CustomerCredit = {
    retailerId,
    balance: 0,
    totalPurchased: 0,
    totalPaid: 0,
    lastOrderAt: null,
    updatedAt: new Date().toISOString(),
  };
  await db.customerCredits.put(fresh);
  return fresh;
}

export async function recordOrderOnCredit(order: Order): Promise<void> {
  const credit = await ensureCredit(order.retailerId);
  const next: CustomerCredit = {
    ...credit,
    balance: credit.balance + (order.totalAmount - order.amountPaid),
    totalPurchased: credit.totalPurchased + order.totalAmount,
    totalPaid: credit.totalPaid + order.amountPaid,
    lastOrderAt: order.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await db.customerCredits.put(next);
}

export async function recordPayment(
  retailerId: string,
  amount: number
): Promise<void> {
  const credit = await ensureCredit(retailerId);
  const next: CustomerCredit = {
    ...credit,
    balance: Math.max(0, credit.balance - amount),
    totalPaid: credit.totalPaid + amount,
    updatedAt: new Date().toISOString(),
  };
  await db.customerCredits.put(next);
}

export async function recoverCreditFromCancellation(
  order: Order
): Promise<void> {
  const credit = await ensureCredit(order.retailerId);
  const owed = order.totalAmount - order.amountPaid;
  const next: CustomerCredit = {
    ...credit,
    balance: Math.max(0, credit.balance - owed),
    totalPurchased: Math.max(0, credit.totalPurchased - order.totalAmount),
    totalPaid: Math.max(0, credit.totalPaid - order.amountPaid),
    updatedAt: new Date().toISOString(),
  };
  await db.customerCredits.put(next);
}

export async function listCustomers(): Promise<CustomerSummary[]> {
  const retailers = await getAllRetailers();
  const credits = await db.customerCredits.toArray();
  const orders = await db.orders.toArray();
  const creditMap = new Map(credits.map((c) => [c.retailerId, c]));

  return retailers.map((r) => {
    const credit = creditMap.get(r.id) ?? {
      retailerId: r.id,
      balance: 0,
      totalPurchased: 0,
      totalPaid: 0,
      lastOrderAt: null,
      updatedAt: r.updatedAt,
    };
    const customerOrders = orders.filter((o) => o.retailerId === r.id);
    const lastOrder = customerOrders.sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )[0];
    return {
      retailer: r,
      credit,
      orderCount: customerOrders.length,
      lastOrderAt: lastOrder?.createdAt ?? null,
    };
  });
}

export async function getCustomerOrders(retailerId: string): Promise<Order[]> {
  const orders = await db.orders
    .where("retailerId")
    .equals(retailerId)
    .toArray();
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
