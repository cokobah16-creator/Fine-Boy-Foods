import { db } from "@/lib/db";
import type {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
} from "@/types/operations";
import { consumeProductStock } from "@/services/inventoryService";
import {
  recordOrderOnCredit,
  recordPayment,
  recoverCreditFromCancellation,
} from "@/services/customerService";
import { addRevenueEntry } from "@/services/financeService";

function uuid(): string {
  return crypto.randomUUID();
}

function generateOrderCode(): string {
  const stamp = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${stamp}-${rand}`;
}

function computePaymentStatus(
  total: number,
  paid: number
): PaymentStatus {
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

export async function listOrders(): Promise<Order[]> {
  const orders = await db.orders.toArray();
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrder(id: string): Promise<Order | undefined> {
  return db.orders.get(id);
}

export async function listOrdersForRetailer(
  retailerId: string
): Promise<Order[]> {
  const orders = await db.orders
    .where("retailerId")
    .equals(retailerId)
    .toArray();
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createOrder(input: {
  retailerId: string;
  retailerName: string;
  items: OrderItem[];
  amountPaid: number;
  notes?: string | null;
}): Promise<Order> {
  const totalAmount = input.items.reduce((s, i) => s + i.lineTotal, 0);
  const now = new Date().toISOString();
  const order: Order = {
    id: uuid(),
    orderCode: generateOrderCode(),
    retailerId: input.retailerId,
    retailerName: input.retailerName,
    items: input.items,
    totalAmount,
    amountPaid: Math.min(totalAmount, Math.max(0, input.amountPaid)),
    status: "pending",
    paymentStatus: computePaymentStatus(totalAmount, input.amountPaid),
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.orders.add(order);
  await recordOrderOnCredit(order);

  if (order.amountPaid > 0) {
    await addRevenueEntry({
      amount: order.amountPaid,
      description: `Order ${order.orderCode} — ${order.retailerName}`,
      orderId: order.id,
      occurredAt: now,
      recordedBy: "system",
    });
  }

  return order;
}

export async function setOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<Order | undefined> {
  const order = await db.orders.get(orderId);
  if (!order) return;

  // Moving from pending → processing consumes stock (FIFO).
  if (order.status === "pending" && status === "processing") {
    for (const item of order.items) {
      const { shortfall } = await consumeProductStock(
        item.productId,
        item.quantity
      );
      if (shortfall > 0) {
        throw new Error(
          `Not enough stock for ${item.productName} (short by ${shortfall} units).`
        );
      }
    }
  }

  // Moving back from processing/delivered → cancelled returns stock + reverses credit
  if (
    status === "cancelled" &&
    (order.status === "processing" || order.status === "delivered")
  ) {
    // Note: we don't reverse stock here — operationally, returns should be a
    // separate flow with explicit batches. We just unwind the credit.
    await recoverCreditFromCancellation(order);
  }

  await db.orders.update(orderId, {
    status,
    updatedAt: new Date().toISOString(),
  });
  return db.orders.get(orderId);
}

export async function recordOrderPayment(
  orderId: string,
  amount: number,
  recordedBy: string
): Promise<Order | undefined> {
  const order = await db.orders.get(orderId);
  if (!order) return;
  const newPaid = Math.min(order.totalAmount, order.amountPaid + amount);
  const actualDelta = newPaid - order.amountPaid;
  await db.orders.update(orderId, {
    amountPaid: newPaid,
    paymentStatus: computePaymentStatus(order.totalAmount, newPaid),
    updatedAt: new Date().toISOString(),
  });
  if (actualDelta > 0) {
    await recordPayment(order.retailerId, actualDelta);
    await addRevenueEntry({
      amount: actualDelta,
      description: `Payment for ${order.orderCode}`,
      orderId: order.id,
      occurredAt: new Date().toISOString(),
      recordedBy,
    });
  }
  return db.orders.get(orderId);
}

export async function deleteOrder(id: string): Promise<void> {
  await db.orders.delete(id);
}
