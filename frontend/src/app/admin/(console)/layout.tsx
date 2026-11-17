import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminShell } from "@/features/admin/components/AdminShell";

/** Every admin page except the sign-in lives here, so they share one guard and one frame. */
export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <AdminShell>{children}</AdminShell>
    </ProtectedRoute>
  );
}
