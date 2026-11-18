
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/features/auth/utils/safe-redirect";

type UserRole = "CUSTOMER" | "VENDOR" | "ADMIN";

const PROTECTED_ROUTES: {
  prefix: string;
  roles: UserRole[];
}[] = [
    { prefix: "/customer/orders", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
    { prefix: "/customer/profile", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
    { prefix: "/customer/addresses", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
    { prefix: "/customer/password", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
    { prefix: "/customer/reviews", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
    { prefix: "/customer/followed-vendors", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
    { prefix: "/customer/checkout", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
    { prefix: "/vendor/register", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
    { prefix: "/vendor/dashboard", roles: ["VENDOR", "ADMIN"] },
    { prefix: "/vendor/products", roles: ["VENDOR", "ADMIN"] },
    { prefix: "/vendor/orders", roles: ["VENDOR", "ADMIN"] },
    { prefix: "/vendor/statistics", roles: ["VENDOR", "ADMIN"] },
    { prefix: "/vendor/settings", roles: ["VENDOR", "ADMIN"] },
    { prefix: "/admin", roles: ["ADMIN"] },
  ];

const AUTH_PAGES = ["/customer/login", "/customer/register"];

const ADMIN_LOGIN = "/admin/login";

function matchesRoute(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isUserRole(role: string | undefined): role is UserRole {
  return role === "CUSTOMER" || role === "VENDOR" || role === "ADMIN";
}

function getDashboardPath(role: UserRole): string {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "VENDOR") return "/vendor/dashboard";
  return "/";
}

/**
 * The admin site's address, e.g. https://admin.haisanexpress.vn. When it is not
 * set, everything is served from one host and /admin lives beside the shop.
 */
function getAdminOrigin(): URL | null {
  const value = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Two hosts, one app: the admin host serves only /admin, and the shop host
  // hands /admin over to it. Sessions are stored per host, so signing in on
  // one never signs you in on the other.
  const adminOrigin = getAdminOrigin();
  if (adminOrigin) {
    const onAdminHost = request.headers.get("host") === adminOrigin.host;

    if (onAdminHost && !matchesRoute(pathname, "/admin")) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }

    // On the shop host /admin does not exist, so nobody learns where the admin site is.
    if (!onAdminHost && matchesRoute(pathname, "/admin")) {
      return NextResponse.rewrite(new URL("/__not-found", request.url));
    }
  }

  const token = request.cookies.get("haisan_token")?.value;
  const roleValue = request.cookies.get("haisan_role")?.value;

  // These cookies are only hints for frontend navigation.
  // They do not prove that a JWT is valid.
  const hasTokenCookie = Boolean(token);
  const validRole = isUserRole(roleValue) ? roleValue : null;

  // The admin sign-in page itself must stay reachable while signed out.
  const matchingRule = matchesRoute(pathname, ADMIN_LOGIN)
    ? undefined
    : PROTECTED_ROUTES.find((rule) => matchesRoute(pathname, rule.prefix));

  if (matchingRule) {
    if (!hasTokenCookie || !validRole) {
      const loginPath = matchesRoute(pathname, "/admin")
        ? ADMIN_LOGIN
        : "/customer/login";
      const loginUrl = new URL(loginPath, request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);

      return NextResponse.redirect(loginUrl);
    }

    if (!matchingRule.roles.includes(validRole)) {
      return NextResponse.redirect(
        new URL("/unauthorized", request.url),
      );
    }
  }

  // An admin who is already signed in has no use for the admin sign-in page.
  // Other roles stay on it, so they can switch to an admin account.
  if (pathname === ADMIN_LOGIN && hasTokenCookie && validRole === "ADMIN") {
    const redirectPath = getSafeRedirectPath(
      request.nextUrl.searchParams.get("redirect"),
      request.nextUrl.origin,
    );
    return NextResponse.redirect(
      new URL(
        redirectPath?.startsWith("/admin") ? redirectPath : getDashboardPath("ADMIN"),
        request.url,
      ),
    );
  }

  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (hasTokenCookie && validRole && isAuthPage) {
    const redirectPath = getSafeRedirectPath(
      request.nextUrl.searchParams.get("redirect"),
      request.nextUrl.origin,
    );

    if (redirectPath) {
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    return NextResponse.redirect(
      new URL(getDashboardPath(validRole), request.url),
    );
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  // Every page, so the admin host can keep shop pages out; files and Next.js internals are skipped.
  matcher: ["/((?!_next/|favicon\\.ico|.*\\..*).*)"],
};
