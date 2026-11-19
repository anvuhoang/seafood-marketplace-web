interface BrandLogoProps {
  /** "dark" is the white version for navy backgrounds (footer, sidebars). */
  variant?: "light" | "dark";
  /** Size it with a height class, e.g. "h-10"; the width follows the artwork. */
  className?: string;
}

/**
 * The HaiSan Express logo. The artwork lives in public/brand (SVG, text already
 * outlined), so it looks the same on every device and needs no font.
 */
export function BrandLogo({ variant = "light", className = "h-10" }: BrandLogoProps) {
  return (
    // A plain <img>: next/image adds nothing for a small SVG.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={variant === "dark" ? "/brand/logo-dark.svg" : "/brand/logo.svg"}
      alt="HaiSan Express"
      className={`block w-auto ${className}`}
      draggable={false}
    />
  );
}
