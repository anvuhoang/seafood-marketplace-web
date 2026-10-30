"use client";

import type { ButtonHTMLAttributes } from "react";

interface AlertActionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type"> {
  message: string;
}

/**
 * Placeholder action button for server-rendered pages: shows a browser alert
 * until the real backend action is wired up.
 */
export function AlertActionButton({ message, children, ...props }: AlertActionButtonProps) {
  return (
    <button type="button" onClick={() => alert(message)} {...props}>
      {children}
    </button>
  );
}
