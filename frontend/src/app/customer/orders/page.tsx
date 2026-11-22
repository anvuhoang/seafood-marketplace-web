import { AccountShell } from "@/features/account/components/AccountShell";
import { CustomerOrdersView } from "@/features/order/components/CustomerOrdersView";

export const metadata = {
  title: "Đơn mua của tôi | HaiSan Express",
  description: "Theo dõi trạng thái các đơn hàng hải sản của bạn.",
};

/** Part of the account area, so it shares the account sidebar with the other account pages. */
export default function CustomerOrdersPage() {
  return (
    <AccountShell>
      <CustomerOrdersView />
    </AccountShell>
  );
}
