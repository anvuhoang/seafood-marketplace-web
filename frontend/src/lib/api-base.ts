const PUBLIC_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

/**
 * The address of the API.
 *
 * In the browser it is the public one (NEXT_PUBLIC_API_URL, fixed when the site is built). On the server, which
 * renders some pages by calling the API itself, it is API_INTERNAL_URL when that is set: inside Docker the
 * server reaches the API by a service name (for example http://nginx/api), not by the address a visitor uses.
 */
export const API_BASE_URL: string =
  typeof window === "undefined" ? process.env.API_INTERNAL_URL || PUBLIC_URL : PUBLIC_URL;
