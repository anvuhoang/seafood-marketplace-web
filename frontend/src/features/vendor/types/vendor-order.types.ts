import type {
  OrderItem,
  OrderPayment,
  OrderRecipient,
  OrderShipment,
  Pagination,
  VendorOrderStatus,
} from "@/features/order/types/order.types";

/** Statuses a vendor can move an order to; PENDING is never one. */
export type VendorOrderTarget = Exclude<VendorOrderStatus, "PENDING">;

export interface VendorOrderListItem {
  id: string;
  orderNumber: string;
  createdAt: string;
  recipientName: string;
  recipientPhone: string;
  itemCount: number;
  firstItem: { productName: string; variantName: string; quantity: string; unit: string } | null;
  grandTotal: string;
  status: VendorOrderStatus;
  payment: OrderPayment | null;
}

export type VendorOrderSummary = Record<VendorOrderStatus, number> & { total: number };

export interface VendorOrderList {
  items: VendorOrderListItem[];
  summary: VendorOrderSummary;
  pagination: Pagination;
}

export interface VendorOrderQuery {
  status?: VendorOrderStatus;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

/** Only this store's part of the customer's order. */
export interface VendorOrderDetail {
  id: string;
  orderNumber: string;
  createdAt: string;
  updatedAt: string;
  status: VendorOrderStatus;
  customerNote: string | null;
  vendorNote: string | null;
  recipient: OrderRecipient;
  items: OrderItem[];
  subtotal: string;
  shippingFee: string;
  grandTotal: string;
  payment: OrderPayment | null;
  shipment: OrderShipment | null;
  /** Computed by the API; the page shows a button for each and nothing else. */
  allowedActions: VendorOrderTarget[];
  acceptBlockedReason: string | null;
}
