/** Where the shop runs and the demo accounts the seed creates (`npm run seed` in backend). */
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:8088";
export const API_URL = process.env.E2E_API_URL ?? `${BASE_URL}/api`;

export const ACCOUNTS = {
  customer: { email: "nam.le@example.com", password: "Customer@123456", name: "Lê Hoàng Nam" },
  vendor: { email: "phuquocxanh@haisanexpress.vn", password: "Vendor@123456" },
  admin: { email: "admin@haisanexpress.vn", password: "Admin@123456" },
  /** The owner of the crab vendor: a second vendor, to check that vendors cannot touch each other's data. */
  otherVendor: { email: "duyenhaiphanthiet@haisanexpress.vn", password: "Vendor@123456" },
} as const;

/** Seed products the flows buy. They belong to two different vendors, so one order has two parts. */
export const PRODUCTS = {
  shrimp: { search: "Tôm Sú Biển Tươi Sống", vendor: "Vựa Thủy Sản Phú Quốc Xanh" },
  crab: { search: "Ghẹ Xanh Phan Thiết", vendor: "Vựa Hải Sản Duyên Hải Phan Thiết" },
} as const;
