"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

interface VendorShareButtonProps {
  vendorName: string;
}

/**
 * Share the storefront with the native share sheet, falling back to copying the link.
 */
export function VendorShareButton({ vendorName }: VendorShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: vendorName, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The user dismissed the share sheet or clipboard access was denied.
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? "Đã sao chép liên kết" : "Chia sẻ gian hàng"}
      title={copied ? "Đã sao chép liên kết" : "Chia sẻ gian hàng"}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#0F3860] transition hover:bg-slate-50"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
    </button>
  );
}
