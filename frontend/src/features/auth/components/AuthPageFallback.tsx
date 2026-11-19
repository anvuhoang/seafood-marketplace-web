import { Loader2 } from "lucide-react";

/**
 * Shown while the sign-in or register form is being prepared. It has the same
 * split layout as the real page (navy panel on the left, white on the right),
 * so the screen does not jump from a bare white page with a spinner to the form.
 */
export function AuthPageFallback() {
  return (
    <div className="grid min-h-screen w-full bg-white lg:grid-cols-[1fr_1.1fr]" role="status" aria-label="Đang tải">
      <div className="hidden bg-[#0B2540] lg:block" aria-hidden />
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0F3860]" aria-hidden />
      </div>
    </div>
  );
}
