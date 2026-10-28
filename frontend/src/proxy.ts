import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Route paths configuration for authentication and role-based access.
 */
const PROTECTED_ROUTES = [
  { prefix: "/customer/orders", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
  { prefix: "/customer/profile", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
  { prefix: "/customer/checkout", roles: ["CUSTOMER", "VENDOR", "ADMIN"] },
  { prefix: "/vendor/dashboard", roles: ["VENDOR", "ADMIN"] },
  { prefix: "/vendor/products", roles: ["VENDOR", "ADMIN"] },
  { prefix: "/vendor/orders", roles: ["VENDOR", "ADMIN"] },
  { prefix: "/vendor/settings", roles: ["VENDOR", "ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

const AUTH_PAGES = [
  "/login",
  "/register",
  "/customer/login",
  "/customer/register",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const tokenCookie = request.cookies.get("haisan_token")?.value;
  const roleCookie = request.cookies.get("haisan_role")?.value || "CUSTOMER";

  const isAuthenticated = !!tokenCookie;

  // 1. Check if the current route matches any protected path
  const matchingRule = PROTECTED_ROUTES.find((rule) =>
    pathname.startsWith(rule.prefix)
  );

  if (matchingRule) {
    // Unauthenticated user attempting to access protected route
    if (!isAuthenticated) {
      const redirectTarget = encodeURIComponent(`${pathname}${search}`);
      const loginUrl = new URL(
        `/customer/login?redirect=${redirectTarget}`,
        request.url
      );
      return NextResponse.redirect(loginUrl);
    }

    // Role-based authorization check
    if (!matchingRule.roles.includes(roleCookie)) {
      const requiredRole = matchingRule.roles[0];
      const unauthorizedUrl = new URL(
        `/unauthorized?required=${requiredRole}&current=${roleCookie}`,
        request.url
      );
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // 2. Redirect already authenticated users away from login/register pages
  if (isAuthenticated && AUTH_PAGES.some((authPath) => pathname === authPath)) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      return NextResponse.redirect(new URL(redirectParam, request.url));
    }

    if (roleCookie === "ADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    if (roleCookie === "VENDOR") {
      return NextResponse.redirect(new URL("/vendor/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Support both proxy and default export
export default proxy;

export const config = {
  matcher: [
    "/customer/:path*",
    "/vendor/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};

