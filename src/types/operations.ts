// Fine Boy Foods — Retail Operations Types
// Offline-first inventory, orders, production, distribution, QC, and finance.

export type ProductFlavour = "Sweet Original" | "Spicy Suya";

export interface Product {
  id: string;
  name: ProductFlavour;
  sku: string;
  // Wholesale price per unit in NGN
  unitPrice: number;
  // Threshold below which low-stock alerts fire (in finished units)
  lowStockThreshold: number;
  // Visual style key — used to colour cards/badges
  colorKey: "sweet" | "spicy";
  createdAt: string;
  updatedAt: string;
}

// One physical batch of finished goods. Tracks expiry + remaining quantity.
export interface InventoryBatch {
  id: string;
  productId: string;
  // Human-readable batch number (e.g. FBF-SO-2026-0001)
  batchCode: string;
  initialQuantity: number;
  // Current remaining quantity after sales/wastage
  quantity: number;
  productionDate: string;
  expiryDate: string;
  // Optional QC link — set once QC has passed
  qcStatus: "pending" | "pass" | "fail";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Raw materials (plantains, oil, salt, suya spice, packaging, etc.)
export interface RawMaterial {
  id: string;
  name: string;
  unit: "kg" | "litre" | "piece" | "pack";
  quantity: number;
  lowStockThreshold: number;
  costPerUnit: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = "pending" | "processing" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  // line total snapshotted at time of order (qty * unitPrice)
  lineTotal: number;
}

export interface Order {
  id: string;
  orderCode: string;
  retailerId: string;
  retailerName: string;
  items: OrderItem[];
  totalAmount: number;
  amountPaid: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus =
  | "scheduled"
  | "in_transit"
  | "delivered"
  | "failed";

export interface Delivery {
  id: string;
  orderId: string;
  orderCode: string;
  retailerName: string;
  driverId: string;
  driverName: string;
  vehicle?: string | null;
  scheduledFor: string;
  status: DeliveryStatus;
  // Base64 data-URL of the proof-of-delivery image, kept locally.
  proofImage?: string | null;
  proofNotes?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle?: string | null;
  active: boolean;
  createdAt: string;
}

// A single production run that turns raw materials into finished goods.
export interface ProductionBatch {
  id: string;
  batchCode: string;
  productId: string;
  productName: string;
  // What raw materials were consumed
  rawUsed: { rawMaterialId: string; rawName: string; quantity: number }[];
  outputQuantity: number;
  wasteQuantity: number;
  productionDate: string;
  expiryDate: string;
  operator: string;
  // ID of the InventoryBatch automatically created when this batch finished
  inventoryBatchId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type QCStatus = "pass" | "fail";

export interface QCRecord {
  id: string;
  inventoryBatchId: string;
  batchCode: string;
  productName: string;
  status: QCStatus;
  inspector: string;
  // Quality criteria checks — score per criterion (0-5)
  criteria: {
    appearance: number;
    aroma: number;
    crunch: number;
    taste: number;
    packaging: number;
  };
  notes: string;
  inspectedAt: string;
}

export type FinanceEntryType = "revenue" | "expense";
export type ExpenseCategory =
  | "raw_materials"
  | "packaging"
  | "labour"
  | "transport"
  | "utilities"
  | "marketing"
  | "rent"
  | "other";

export interface FinanceEntry {
  id: string;
  type: FinanceEntryType;
  amount: number;
  description: string;
  category?: ExpenseCategory | null;
  // For revenue entries linked to an order
  orderId?: string | null;
  recordedBy: string;
  occurredAt: string;
  createdAt: string;
}

// Tracked credit balance for a retailer (computed but cached for fast reads).
export interface CustomerCredit {
  retailerId: string;
  // Outstanding amount the customer owes (positive = owed to FBF)
  balance: number;
  totalPurchased: number;
  totalPaid: number;
  lastOrderAt?: string | null;
  updatedAt: string;
}

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertKind =
  | "low_stock"
  | "expiry_near"
  | "expiry_passed"
  | "raw_low"
  | "qc_fail"
  | "retailer_inactive"
  | "delivery_failed";

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  message: string;
  entityId?: string | null;
  acknowledged: boolean;
  createdAt: string;
}

export type EmployeeDepartment =
  | "production"
  | "quality"
  | "distribution"
  | "sales"
  | "admin"
  | "other";

export type EmployeeStatus = "active" | "on_leave" | "terminated";
export type PayFrequency = "weekly" | "biweekly" | "monthly";

export interface Employee {
  id: string;
  fullName: string;
  role: string;
  department: EmployeeDepartment;
  phone?: string | null;
  email?: string | null;
  // Base salary in NGN per pay period (matches payFrequency)
  baseSalary: number;
  payFrequency: PayFrequency;
  // Optional bank details
  bankName?: string | null;
  bankAccount?: string | null;
  hireDate: string;
  status: EmployeeStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PayrollRunStatus = "draft" | "approved" | "paid";

export interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  role: string;
  department: EmployeeDepartment;
  baseSalary: number;
  bonuses: number;
  // Total pre-tax/deduction additions (e.g. allowances, overtime)
  allowances: number;
  // Total deductions (loan, advance, lateness, tax)
  deductions: number;
  // Snapshot of net pay = base + bonuses + allowances - deductions
  netPay: number;
  notes?: string | null;
}

export interface PayrollRun {
  id: string;
  // Human-readable code like FBF-PAY-2026-05
  runCode: string;
  // Period start/end ISO dates (yyyy-mm-dd)
  periodStart: string;
  periodEnd: string;
  // Date salaries should be paid on
  payDate: string;
  status: PayrollRunStatus;
  entries: PayrollEntry[];
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  notes?: string | null;
  preparedBy: string;
  approvedBy?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = "admin" | "production" | "delivery";

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  // SHA-256 hash of the PIN; never stored as plaintext.
  pinHash: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  name: string;
  role: UserRole;
  signedInAt: string;
}

export const PRODUCT_FLAVOURS: ProductFlavour[] = [
  "Sweet Original",
  "Spicy Suya",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  production: "Production",
  delivery: "Delivery",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  scheduled: "Scheduled",
  in_transit: "In Transit",
  delivered: "Delivered",
  failed: "Failed",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  raw_materials: "Raw Materials",
  packaging: "Packaging",
  labour: "Labour",
  transport: "Transport",
  utilities: "Utilities",
  marketing: "Marketing",
  rent: "Rent",
  other: "Other",
};

export const EMPLOYEE_DEPARTMENT_LABELS: Record<EmployeeDepartment, string> = {
  production: "Production",
  quality: "Quality Control",
  distribution: "Distribution",
  sales: "Sales",
  admin: "Admin",
  other: "Other",
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Active",
  on_leave: "On Leave",
  terminated: "Terminated",
};

export const PAY_FREQUENCY_LABELS: Record<PayFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
};

export const PAYROLL_STATUS_LABELS: Record<PayrollRunStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  paid: "Paid",
};

export const ALERT_KIND_LABELS: Record<AlertKind, string> = {
  low_stock: "Low Stock",
  expiry_near: "Expiry Near",
  expiry_passed: "Expired",
  raw_low: "Raw Material Low",
  qc_fail: "QC Failed",
  retailer_inactive: "Retailer Inactive",
  delivery_failed: "Delivery Failed",
};
