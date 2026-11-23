# Demo guide

A script for showing the shop in about **15 minutes**, with what to prepare and what to do when something fails.
Accounts are in the [README](../README.md#demo-accounts).

## Before the demo

| Do | Why |
|---|---|
| Open the address on your laptop **and on a phone using mobile data** (not the home Wi-Fi) | Proves a visitor from outside can reach it |
| Make sure the sample data is loaded (the home page shows products) | A new server starts empty: `bash deploy/deploy.sh --seed` |
| Rebuild the search index if "tom hum" finds nothing | Data loaded outside the API is not indexed: `POST /api/admin/search/reindex` as admin |
| Check the optional services you will show: chatbot answers, mail arrives (also look in Spam), Google button appears | Each is off until its key is set ([configuration](configuration.md)) |
| Sign out everywhere, clear the cart | A clean start |
| Keep a **plan B**: the same shop on `http://localhost:8088` (`docker compose up -d`) | If the network or the server fails |
| Stop the server afterwards (Azure portal → Stop, "deallocated") | It uses free credit while it runs |

## Script

### 1. The storefront (2 min)
1. Open the home page. Point out the categories, the vendors and the search by photo.
2. Search **`tom hum`** (no accents) and then **`tom hun`** (a typo): both find *Tôm Hùm*. *(Elasticsearch.)*
3. Open a product: price per kg, stock, the vendor, reviews, the preparation options.
4. Show it on the **phone** (the layout adapts).

### 2. The assistant (1 min)
Open **Chat với Cá Voi**: ask *"Chính sách đổi trả thế nào?"* (answers from the help documents) and *"Giá tôm hùm bao nhiêu?"*
(it looks the products up; it never invents a price). *If it says it is busy, the key or the region is wrong: see
[configuration](configuration.md#9-ai-features).*

### 3. One order from two vendors (3 min)
1. Sign in as the customer `nam.le@example.com`.
2. Add a **Tôm Sú** (Vựa Phú Quốc Xanh) and a **Ghẹ Xanh** (Vựa Duyên Hải Phan Thiết) to the cart.
3. Open the cart: the lines are grouped by vendor. **Tiến hành đặt hàng**.
4. Fill in the address, choose **cash on delivery** (or **QR** if PayOS is set), **Xác nhận đặt hàng**.
5. On the order page: **one order, two parts**, one shipping fee for each vendor.

### 4. The vendor side (3 min)
1. In another window sign in as the vendor `phuquocxanh@haisanexpress.vn` (the sign-in page takes you to the **vendor console**).
2. **Đơn hàng**: the new order is first. Open it and press **Nhận đơn** → **Bắt đầu chuẩn bị** → **Giao cho vận chuyển** → **Đã giao xong**.
3. Back in the customer window the status follows (refresh). For QR payment: the vendor cannot accept before it is paid.
4. Show **Sản phẩm** (stock and price) and **Thống kê** (revenue).

### 5. Reviews (1 min)
The customer opens the delivered order → writes a review. Point out that **only a delivered purchase can be reviewed, once**.

### 6. The admin side (2 min)
1. Sign in at `/admin/login` as the admin (a customer or vendor is refused, with the same message as a wrong password).
2. **Tổng quan**: revenue, orders by status. **Phê duyệt vựa**: open a waiting application and approve it (this changes
   the sample data for good: the applicant becomes a vendor).
3. **Chatbot AI**: latency, tokens, daily budget, incidents.

### 7. Security in one minute
- As the customer, open `/admin/dashboard` → *unauthorized*. Open `/vendor/dashboard` → *unauthorized*.
- Open another customer's order number → *not found*.
- Mention that the role is checked on the server for every request and that this is tested (the permission matrix in
  the Playwright suite).

### 8. Forgot password and Google (optional, 2 min)
- `/customer/forgot-password` with a real address: the mail arrives; the link works once; the old password stops working.
- **Tiếp tục với Google** (only with test users while the app is in Testing mode).

### 9. Behind the scenes (if asked)
| Show | Command or place |
|---|---|
| Containers: web, 2 API processes, PostgreSQL, Redis, Elasticsearch, nginx, Caddy | `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` on the server |
| Load balancing | Stop one API container: the shop keeps working |
| CI/CD | The GitHub **Actions** tab: CI (lint, tests, migrations, build, E2E), Publish images, Deploy |
| Tests | `cd frontend && npm run e2e` (8 minutes) or the Playwright report |
| API reference | `/api/docs` (development) |

## If something goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| No products | Sample data not loaded | `bash deploy/deploy.sh --seed` |
| Search finds nothing | Index empty | `POST /api/admin/search/reindex` (admin) |
| Chatbot "Trợ lý đang bận" | Key missing, quota, or the server's region is refused by Gemini | Check the API log; `CHAT_PROVIDER=groq` |
| No mail | `SMTP_USER`/`SMTP_PASS` not set, or in Spam | Mails are in the API log meanwhile |
| Google `origin_mismatch` | The address is not in the client's *Authorized JavaScript origins* | Add it, wait a few minutes |
| "Bạn thao tác quá nhanh" | Rate limit (5 sign-ups, 10 sign-ins a minute) | Wait a minute |
| Server unreachable | Machine stopped or deploy failed | Use plan B (`localhost:8088`) |
