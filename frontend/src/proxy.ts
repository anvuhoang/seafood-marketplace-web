
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

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get("haisan_token")?.value;
  const roleValue = request.cookies.get("haisan_role")?.value;

  // These cookies are only hints for frontend navigation.
  // They do not prove that a JWT is valid.
  const hasTokenCookie = Boolean(token);
  const validRole = isUserRole(roleValue) ? roleValue : null;

  const matchingRule = PROTECTED_ROUTES.find((rule) =>
    matchesRoute(pathname, rule.prefix),
  );

  if (matchingRule) {
    if (!hasTokenCookie || !validRole) {
      const loginUrl = new URL("/customer/login", request.url);
      loginUrl.searchParams.set("redirect", `${pathname}${search}`);

      return NextResponse.redirect(loginUrl);
    }

    if (!matchingRule.roles.includes(validRole)) {
      return NextResponse.redirect(
        new URL("/unauthorized", request.url),
      );
    }
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
  matcher: [
    "/customer/:path*",
    "/vendor/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
