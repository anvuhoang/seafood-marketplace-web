import { expect, test } from "@playwright/test";
import { API_URL } from "./support/env";
import { adminViaApi, authHeaders, registerViaApi, uniqueEmail } from "./support/api";

/**
 * From customer to vendor and back. A role is read from the database on every request, not from the token, so an
 * approval opens the vendor area at once and a suspension closes it at once, without signing in again.
 */
test.describe("Vendor lifecycle", () => {
  test("an application is approved, then the store is suspended and restored", async ({ request }) => {
    const admin = await adminViaApi(request);
    const customer = await registerViaApi(request, uniqueEmail("vendor"));
    const area = () => request.get(`${API_URL}/vendors/me/store`, { headers: authHeaders(customer) });

    // Before applying: a customer is not a vendor.
    expect((await area()).status()).toBe(403);

    // Apply for a store (Hà Nội, quận Ba Đình). It waits for an admin.
    const provinces = (await (await request.get(`${API_URL}/administrative-units/provinces`)).json()) as Array<{ code: string; name: string }>;
    const province = provinces.find((item) => item.name === "Hà Nội") ?? provinces[0];
    const districts = (await (await request.get(`${API_URL}/administrative-units/provinces/${province.code}/districts`)).json()) as Array<{ code: string }>;
    const storeName = `Vựa Kiểm Thử ${Date.now()}`;
    const applied = await request.post(`${API_URL}/vendors/registration`, {
      headers: authHeaders(customer),
      data: {
        name: storeName,
        contactPhone: "0912345678",
        provinceCode: province.code,
        districtCode: districts[0].code,
        streetAddress: "1 Đường Kiểm Thử",
        description: "Cửa hàng tạo bởi bộ kiểm thử tự động.",
      },
    });
    expect(applied.ok(), await applied.text()).toBeTruthy();
    expect((await area()).status()).toBe(403);

    // Find the application in the admin's list. A customer cannot use that list.
    const asCustomer = await request.get(`${API_URL}/admin/vendors?status=PENDING`, { headers: authHeaders(customer) });
    expect(asCustomer.status()).toBe(403);
    const pending = await request.get(`${API_URL}/admin/vendors?status=PENDING&q=${encodeURIComponent(storeName)}&limit=50`, { headers: authHeaders(admin) });
    const vendor = ((await pending.json()) as { items: Array<{ id: string; name: string }> }).items.find((item) => item.name === storeName);
    expect(vendor, "the application is in the admin list").toBeTruthy();

    // Whatever happens next, the test store is not left behind in the shop.
    try {
      // Approved: the vendor area opens with the same token.
      const approve = await request.post(`${API_URL}/admin/vendors/${vendor!.id}/approve`, { headers: authHeaders(admin), data: {} });
      expect(approve.ok(), await approve.text()).toBeTruthy();
      expect((await area()).status()).toBe(200);

      // Suspended: it closes again at once.
      const suspend = await request.post(`${API_URL}/admin/vendors/${vendor!.id}/suspend`, {
        headers: authHeaders(admin),
        data: { reason: "Kiểm tra quy trình đình chỉ bằng bộ test tự động." },
      });
      expect(suspend.ok(), await suspend.text()).toBeTruthy();
      expect((await area()).status()).toBe(403);

      // Restored.
      const reactivate = await request.post(`${API_URL}/admin/vendors/${vendor!.id}/reactivate`, { headers: authHeaders(admin), data: {} });
      expect(reactivate.ok(), await reactivate.text()).toBeTruthy();
      expect((await area()).status()).toBe(200);
    } finally {
      const now = await request.get(`${API_URL}/admin/vendors/${vendor!.id}`, { headers: authHeaders(admin) });
      const status = ((await now.json()) as { status?: string }).status;
      if (status === "PENDING") {
        await request.post(`${API_URL}/admin/vendors/${vendor!.id}/reject`, { headers: authHeaders(admin), data: { reason: "Dọn dẹp sau khi kiểm thử." } });
      } else if (status === "ACTIVE") {
        await request.post(`${API_URL}/admin/vendors/${vendor!.id}/suspend`, { headers: authHeaders(admin), data: { reason: "Dọn dẹp sau khi kiểm thử." } });
      }
    }
  });
});
