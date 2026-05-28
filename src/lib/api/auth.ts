import { NextRequest } from "next/server";

const API_KEYS = new Set(
  (process.env.NEXUS_API_KEYS || "").split(",").filter(Boolean)
);

export function validateApiKey(request: NextRequest): boolean {
  if (API_KEYS.size === 0) return true; // No keys configured = open access (dev mode)
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const key = authHeader.slice(7);
  return API_KEYS.has(key);
}
