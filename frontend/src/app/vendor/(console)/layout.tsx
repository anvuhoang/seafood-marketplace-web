import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VendorShell } from "@/features/vendor/components/VendorShell";

/** Every vendor console page lives here, so they share one guard and one frame. The public storefront does not. */
export default function VendorConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["VENDOR"]}>
      <VendorShell>{children}</VendorShell>
    </ProtectedRoute>
  );
}
