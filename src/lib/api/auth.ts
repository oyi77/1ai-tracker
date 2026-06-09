import { NextRequest } from "next/server";

const API_KEYS = new Set(
  (process.env.NEXUS_API_KEYS || "").split(",").filter(Boolean)
);

export function validateApiKey(request: NextRequest): boolean {
  if (API_KEYS.size === 0) {
    console.warn('[AUTH] No NEXUS_API_KEYS configured — denying access. Set NEXUS_API_KEYS env var.');
    return false;
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const key = authHeader.slice(7);
  return API_KEYS.has(key);
}
