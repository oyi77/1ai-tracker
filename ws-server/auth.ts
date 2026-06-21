import type { Socket } from "socket.io";

const API_KEYS = (process.env.NEXUS_API_KEYS || "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

export function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const authHeader =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization;

  if (!authHeader) {
    return next(new Error("Authentication required"));
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (API_KEYS.length === 0) {
    console.error("[Auth] CRITICAL: No NEXUS_API_KEYS configured — denying all connections. Set NEXUS_API_KEYS env var.");
    return next(new Error("Server misconfigured: no API keys set"));
  }

  if (!API_KEYS.includes(token)) {
    return next(new Error("Invalid API key"));
  }

  next();
}
