"use client";

import { useEffect, useRef, useState } from "react";
import { getAuthProvidersApi } from "../api/auth.api";

const GSI_SCRIPT = "https://accounts.google.com/gsi/client";

interface GoogleIdApi {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    ux_mode?: "popup" | "redirect";
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: Record<string, string | number | boolean>,
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

let scriptPromise: Promise<void> | null = null;

/** Loads Google's sign-in library once, however many buttons ask for it. */
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GSI_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Không tải được thư viện đăng nhập Google."));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

interface GoogleSignInButtonProps {
  /** Called with the ID token (the "credential") Google gives after the person chooses an account. */
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

/**
 * Google's own sign-in button. It appears only when the server has a Google client ID, so a site without one
 * shows nothing (no divider either) instead of a button that does not work. Google's library draws the button and gives back a signed
 * ID token; the server checks that token, so nothing here is trusted.
 */
export function GoogleSignInButton({ onCredential, onError, disabled = false }: GoogleSignInButtonProps) {
  const container = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const handlers = useRef({ onCredential, onError });

  useEffect(() => {
    handlers.current = { onCredential, onError };
  });

  useEffect(() => {
    let cancelled = false;
    getAuthProvidersApi()
      .then((providers) => {
        if (!cancelled && providers.google.enabled) setClientId(providers.google.clientId);
      })
      .catch(() => {
        // No providers answer: the page works with the password form alone.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const element = container.current;
        if (cancelled || !element || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: "popup",
          callback: (response) => {
            if (response.credential) handlers.current.onCredential(response.credential);
            else handlers.current.onError?.("Không nhận được phản hồi từ Google. Vui lòng thử lại.");
          },
        });
        window.google.accounts.id.renderButton(element, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: Math.min(element.clientWidth || 360, 400),
        });
      })
      .catch((error: unknown) => {
        if (!cancelled) handlers.current.onError?.(error instanceof Error ? error.message : "Không tải được Google.");
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;

  return (
    <>
      <div className="relative my-4 flex items-center justify-center">
        <div className="w-full border-t border-slate-200" />
        <span className="absolute bg-white px-3 text-[10px] font-bold text-slate-400">HOẶC ĐĂNG NHẬP VỚI</span>
      </div>
      <div className="relative" aria-label="Tiếp tục với Google">
        <div ref={container} className="flex w-full justify-center" />
        {disabled && <div className="absolute inset-0 cursor-not-allowed bg-white/60" aria-hidden="true" />}
      </div>
    </>
  );
}
