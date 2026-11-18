/** Types shared by the customer and vendor order pages; they mirror the API DTOs. */

export type VendorOrderStatus = "PENDING" | "ACCEPTED" | "PREPARING" | "SHIPPING" | "COMPLETED" | "CANCELLED";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPING" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "COD" | "BANK_TRANSFER" | "E_WALLET" | "CARD";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface OrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
}

export interface OrderShipment {
  status: VendorOrderStatus;
  carrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

/** One order line, named and priced as it was when ordered. Amounts are decimal strings. */
export interface OrderItem {
  id: string;
  productName: string;
  variantName: string;
  unit: string;
  imageUrl: string | null;
  productSlug: string;
  unitPrice: string;
  quantity: string;
  lineTotal: string;
}

export interface OrderRecipient {
  name: string;
  phone: string;
  address: string;
  ward: string | null;
  district: string;
  province: string;
}

export interface Pagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CustomerOrderItem extends OrderItem {
  reviewed: boolean;
}

export interface CustomerVendorOrder {
  id: string;
  vendor: { name: string; slug: string };
  status: VendorOrderStatus;
  subtotal: string;
  shippingFee: string;
  grandTotal: string;
  vendorNote: string | null;
  shipment: OrderShipment | null;
  items: CustomerOrderItem[];
}

export interface CustomerOrderSummary {
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  grandTotal: string;
  payment: OrderPayment | null;
  canCancel: boolean;
  vendorOrders: CustomerVendorOrder[];
}

export interface CustomerOrderList {
  items: CustomerOrderSummary[];
  pagination: Pagination;
}

export interface CustomerOrderDetail extends CustomerOrderSummary {
  recipient: OrderRecipient;
  customerNote: string | null;
  subtotal: string;
  shippingTotal: string;
}
