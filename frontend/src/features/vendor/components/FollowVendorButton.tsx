"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Heart, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { followVendor, getFollowState, unfollowVendor } from "../api/vendor.api";

interface FollowVendorButtonProps {
  slug: string;
  initialFollowerCount: number;
}

/** Follow / unfollow toggle for a storefront. Guests are sent to sign in first. */
export function FollowVendorButton({ slug, initialFollowerCount }: FollowVendorButtonProps) {
  const { accessToken, isLoading } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    getFollowState(accessToken, slug)
      .then((state) => {
        if (cancelled) return;
        setIsFollowing(state.isFollowing);
        setFollowerCount(state.followerCount);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accessToken, slug]);

  if (isLoading) {
    return <div className="h-10 w-32 animate-pulse rounded-lg bg-slate-100" aria-hidden />;
  }

  if (!accessToken) {
    return (
      <Link
        href={`/customer/login?redirect=${encodeURIComponent(`/vendor/${slug}`)}`}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-[#0F3860] hover:text-[#0F3860]"
      >
        <Heart className="h-4 w-4" />
        Theo dõi
        <span className="font-normal text-slate-500">({followerCount})</span>
      </Link>
    );
  }

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = isFollowing
        ? await unfollowVendor(accessToken, slug)
        : await followVendor(accessToken, slug);
      setIsFollowing(next.isFollowing);
      setFollowerCount(next.followerCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật theo dõi. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={isFollowing}
        className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
          isFollowing
            ? "border-[#0F3860] bg-[#0F3860] text-white hover:bg-[#0A2744]"
            : "border-slate-300 bg-white text-slate-800 hover:border-[#0F3860] hover:text-[#0F3860]"
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <Check className="h-4 w-4" />
        ) : (
          <Heart className="h-4 w-4" />
        )}
        {isFollowing ? "Đang theo dõi" : "Theo dõi"}
        <span className={isFollowing ? "font-normal text-sky-200" : "font-normal text-slate-500"}>
          ({followerCount})
        </span>
      </button>
      {error && (
        <p role="alert" className="text-xs text-[#C62835]">
          {error}
        </p>
      )}
    </div>
  );
}
